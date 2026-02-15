import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyStudentRequest {
  email: string;
}

type ActiveCampaignTag = {
  id: string;
  tag: string;
};

async function fetchJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: {
      "Api-Token": apiKey,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ActiveCampaign API error ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

function parseTagInputs(input: string) {
  return input.split(",").map((t) => t.trim()).filter(Boolean);
}

function isNumericTagId(value: string) {
  return /^\d+$/.test(value);
}

async function resolveTagIds(baseUrl: string, acApiKey: string, tagInput: string): Promise<Set<string>> {
  const inputs = parseTagInputs(tagInput);
  const ids = new Set<string>();

  for (const input of inputs) {
    if (isNumericTagId(input)) {
      ids.add(input);
      continue;
    }

    const searchData = await fetchJson(
      `${baseUrl}/api/3/tags?search=${encodeURIComponent(input)}`,
      acApiKey
    );
    const tags: ActiveCampaignTag[] = searchData.tags || [];
    const normalizedNeedle = input.toLowerCase();
    const match = tags.find((t) => (t.tag || "").toLowerCase() === normalizedNeedle) || tags[0];

    if (match?.id) {
      ids.add(String(match.id));
      console.log(`Resolved tag "${input}" -> id ${match.id} (${match.tag})`);
    } else {
      console.log(`Could not resolve tag "${input}"`);
    }
  }

  return ids;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email }: VerifyStudentRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, plan_type, plan_type_id")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile) {
      // Resolve slug from plan_type_id if available
      let planSlug = existingProfile.plan_type || "none";
      if (existingProfile.plan_type_id) {
        const { data: pt } = await supabase
          .from("plan_types")
          .select("slug, id")
          .eq("id", existingProfile.plan_type_id)
          .single();
        if (pt) planSlug = pt.slug;
      }

      console.log(`User ${normalizedEmail} already exists (plan: ${planSlug}) - granting access`);
      return new Response(
        JSON.stringify({
          isVerified: true,
          source: "database",
          planType: planSlug,
          planId: existingProfile.plan_type_id,
          message: "User exists in database - access granted",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User not in database, check ActiveCampaign
    const acApiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const acApiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");

    if (!acApiKey || !acApiUrl) {
      console.error("ActiveCampaign configuration missing");
      return new Response(
        JSON.stringify({ error: "ActiveCampaign configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = acApiUrl.replace(/\/$/, "");

    // Step 1: Find contact by email
    console.log(`Searching for contact: ${normalizedEmail}`);
    const contactData = await fetchJson(
      `${baseUrl}/api/3/contacts?email=${encodeURIComponent(normalizedEmail)}`,
      acApiKey
    );
    const contacts = contactData.contacts || [];

    if (contacts.length === 0) {
      console.log(`Contact not found in ActiveCampaign: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          isVerified: false,
          source: "activecampaign",
          planType: "none",
          planId: null,
          message: "Email not found in ActiveCampaign",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contactId = contacts[0].id;
    console.log(`Found contact ID: ${contactId}`);

    // Step 2: Get contact tag IDs
    const tagsData = await fetchJson(
      `${baseUrl}/api/3/contacts/${contactId}/contactTags`,
      acApiKey
    );
    const contactTags = tagsData.contactTags || [];
    const contactTagIds = new Set<string>(contactTags.map((ct: { tag: string }) => String(ct.tag)));
    console.log(`Contact tag IDs: ${Array.from(contactTagIds).join(",") || "(none)"}`);

    // Step 3: Fetch ALL active plan_types from DB, ordered by display_order DESC (highest priority first)
    const { data: planTypes, error: ptError } = await supabase
      .from("plan_types")
      .select("id, slug, ac_tag, display_order, name")
      .eq("is_active", true)
      .order("display_order", { ascending: false });

    if (ptError || !planTypes || planTypes.length === 0) {
      console.error("Error fetching plan_types or none found:", ptError);
      // Fallback: deny access
      return new Response(
        JSON.stringify({
          isVerified: false,
          source: "activecampaign",
          planType: "none",
          planId: null,
          message: "No plan types configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: For each plan (highest first), check if contact has the ac_tag
    let detectedPlan: { slug: string; id: string; name: string } | null = null;

    for (const plan of planTypes) {
      const tagIds = await resolveTagIds(baseUrl, acApiKey, plan.ac_tag);
      const hasTag = Array.from(tagIds).some((id) => contactTagIds.has(id));
      if (hasTag) {
        detectedPlan = { slug: plan.slug, id: plan.id, name: plan.name };
        console.log(`User has tag for plan: ${plan.name} (${plan.slug})`);
        break;
      }
    }

    if (!detectedPlan) {
      console.log(`No plan tag found for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          isVerified: false,
          source: "activecampaign",
          planType: "none",
          planId: null,
          message: "Student tag not found",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verification result for ${normalizedEmail}: verified=true, plan=${detectedPlan.slug}`);

    return new Response(
      JSON.stringify({
        isVerified: true,
        source: "activecampaign",
        planType: detectedPlan.slug,
        planId: detectedPlan.id,
        message: `Student verified - plan: ${detectedPlan.slug}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-student function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
