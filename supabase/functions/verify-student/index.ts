import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

serve(async (req: Request): Promise<Response> => {
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
      .select("id, plan_type")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile) {
      console.log(`User ${normalizedEmail} already exists (plan: ${existingProfile.plan_type}) - granting access`);
      return new Response(
        JSON.stringify({
          isVerified: true,
          source: "database",
          planType: existingProfile.plan_type || "none",
          message: "User exists in database - access granted",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User not in database, check ActiveCampaign
    const acApiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const acApiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    
    // New: separate tag env vars for each plan
    const acTagBasic = Deno.env.get("ACTIVECAMPAIGN_TAG_BASIC");
    const acTagMagnetic = Deno.env.get("ACTIVECAMPAIGN_TAG_MAGNETIC");
    // Fallback to legacy single tag
    const acTagLegacy = Deno.env.get("ACTIVECAMPAIGN_TAG_NAME");

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

    // Step 3: Resolve tag IDs for each plan
    let detectedPlan: "none" | "basic" | "magnetic" = "none";
    const allMatchedTags: string[] = [];

    // Check for MAGNETIC plan first (higher priority)
    if (acTagMagnetic) {
      const magneticIds = await resolveTagIds(baseUrl, acApiKey, acTagMagnetic);
      const hasMagnetic = Array.from(magneticIds).some((id) => contactTagIds.has(id));
      if (hasMagnetic) {
        detectedPlan = "magnetic";
        allMatchedTags.push("magnetic");
        console.log(`User has MAGNETIC tag`);
      }
    }

    // Check for BASIC plan
    if (detectedPlan === "none" && acTagBasic) {
      const basicIds = await resolveTagIds(baseUrl, acApiKey, acTagBasic);
      const hasBasic = Array.from(basicIds).some((id) => contactTagIds.has(id));
      if (hasBasic) {
        detectedPlan = "basic";
        allMatchedTags.push("basic");
        console.log(`User has BASIC tag`);
      }
    }

    // Fallback: legacy single tag → treat as basic
    if (detectedPlan === "none" && acTagLegacy && !acTagBasic && !acTagMagnetic) {
      const legacyIds = await resolveTagIds(baseUrl, acApiKey, acTagLegacy);
      const hasLegacy = Array.from(legacyIds).some((id) => contactTagIds.has(id));
      if (hasLegacy) {
        detectedPlan = "basic";
        allMatchedTags.push("legacy");
        console.log(`User has LEGACY tag - defaulting to basic`);
      }
    }

    const isVerified = detectedPlan !== "none";

    console.log(`Verification result for ${normalizedEmail}: verified=${isVerified}, plan=${detectedPlan}`);

    return new Response(
      JSON.stringify({
        isVerified,
        source: "activecampaign",
        planType: detectedPlan,
        matchedTags: allMatchedTags,
        message: isVerified
          ? `Student verified - plan: ${detectedPlan}`
          : "Student tag not found",
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
