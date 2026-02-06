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

function parseRequiredTagInputs(input: string) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isNumericTagId(value: string) {
  return /^\d+$/.test(value);
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile) {
      console.log(`User ${normalizedEmail} already exists in database - granting access`);
      return new Response(
        JSON.stringify({
          isVerified: true,
          source: "database",
          message: "User exists in database - access granted",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User not in database, check ActiveCampaign
    const acApiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const acApiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    const acTagName = Deno.env.get("ACTIVECAMPAIGN_TAG_NAME");

    if (!acApiKey || !acApiUrl || !acTagName) {
      console.error("ActiveCampaign configuration missing");
      return new Response(
        JSON.stringify({ error: "ActiveCampaign configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean API URL (remove trailing slash)
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
          message: "Email not found in ActiveCampaign",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contactId = contacts[0].id;
    console.log(`Found contact ID: ${contactId}`);

    // Step 2: Get contact tag IDs (contactTags[].tag)
    const tagsData = await fetchJson(
      `${baseUrl}/api/3/contacts/${contactId}/contactTags`,
      acApiKey
    );
    const contactTags = tagsData.contactTags || [];

    const contactTagIds = new Set<string>(contactTags.map((ct: { tag: string }) => String(ct.tag)));
    console.log(`Contact tag IDs for ${normalizedEmail}: ${Array.from(contactTagIds).join(",") || "(none)"}`);

    // Step 3: Resolve required tag(s) -> tag IDs, then compare by ID
    // Supports either:
    // - ACTIVECAMPAIGN_TAG_NAME="Minha Tag"
    // - ACTIVECAMPAIGN_TAG_NAME="Minha Tag,Outra Tag"
    // - ACTIVECAMPAIGN_TAG_NAME="123" (tag ID)
    const requiredInputs = parseRequiredTagInputs(acTagName);
    const requiredTagIds = new Set<string>();

    for (const input of requiredInputs) {
      if (isNumericTagId(input)) {
        requiredTagIds.add(input);
        continue;
      }

      // Use AC search to avoid pagination/limit issues
      const searchData = await fetchJson(
        `${baseUrl}/api/3/tags?search=${encodeURIComponent(input)}`,
        acApiKey
      );

      const tags: ActiveCampaignTag[] = searchData.tags || [];
      const normalizedNeedle = input.toLowerCase();
      const match = tags.find((t) => (t.tag || "").toLowerCase() === normalizedNeedle) || tags[0];

      if (match?.id) {
        requiredTagIds.add(String(match.id));
        console.log(`Resolved required tag "${input}" -> id ${match.id} (${match.tag})`);
      } else {
        console.log(`Could not resolve required tag "${input}" via /tags?search`);
      }
    }

    console.log(`Required tag IDs: ${Array.from(requiredTagIds).join(",") || "(none)"}`);
    const hasRequiredTag = Array.from(requiredTagIds).some((id) => contactTagIds.has(id));

    console.log(`Tag verification result for ${normalizedEmail}: ${hasRequiredTag}`);

    return new Response(
      JSON.stringify({
        isVerified: hasRequiredTag,
        source: "activecampaign",
        message: hasRequiredTag
          ? "Student verified via ActiveCampaign tag"
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
