import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * recheck-user-plans: Periodic ActiveCampaign re-verification (cron every 2 days).
 * For each user with a plan, checks if their AC tags still match.
 * If TAG removed → downgrade to 'none'.
 * If TAG changed → update plan_type.
 */

type ActiveCampaignTag = { id: string; tag: string };

async function fetchJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: { "Api-Token": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AC API error ${res.status}: ${text}`);
  }
  return res.json();
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
    if (match?.id) ids.add(String(match.id));
  }
  return ids;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Cron authentication: require CRON_SECRET header
  const cronSecret = Deno.env.get("CRON_SECRET");
  const requestSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || requestSecret !== cronSecret) {
    console.error("Unauthorized cron request: invalid or missing x-cron-secret header");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const acApiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const acApiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");

    if (!acApiKey || !acApiUrl) {
      return new Response(
        JSON.stringify({ error: "ActiveCampaign not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = acApiUrl.replace(/\/$/, "");
    const now = new Date().toISOString();

    // Fetch all active plan_types ordered by display_order DESC (highest priority first)
    const { data: planTypes } = await supabase
      .from("plan_types")
      .select("id, slug, ac_tag, display_order, name, initial_credits, has_monthly_renewal, credits_expire_days, monthly_credits")
      .eq("is_active", true)
      .order("display_order", { ascending: false });

    if (!planTypes || planTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No plan types configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pre-resolve all plan tag IDs
    const planTagMap = new Map<string, Set<string>>();
    for (const plan of planTypes) {
      const tagIds = await resolveTagIds(baseUrl, acApiKey, plan.ac_tag);
      planTagMap.set(plan.id, tagIds);
    }

    // Fetch users with a plan (plan_type_id is not null)
    const { data: usersWithPlan } = await supabase
      .from("profiles")
      .select("id, email, plan_type, plan_type_id, last_ac_verification")
      .not("plan_type_id", "is", null);

    if (!usersWithPlan || usersWithPlan.length === 0) {
      console.log("No users with plans to recheck");
      return new Response(
        JSON.stringify({ success: true, checked: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let checked = 0;
    let updated = 0;
    let downgraded = 0;
    let errors = 0;

    for (const user of usersWithPlan) {
      try {
        // Find AC contact
        const contactData = await fetchJson(
          `${baseUrl}/api/3/contacts?email=${encodeURIComponent(user.email)}`,
          acApiKey
        );
        const contacts = contactData.contacts || [];

        if (contacts.length === 0) {
          // Contact not found in AC — downgrade
          console.log(`User ${user.email}: not found in AC, downgrading`);
          await supabase.from("profiles").update({
            plan_type: "none",
            plan_type_id: null,
            last_ac_verification: now,
          }).eq("id", user.id);
          downgraded++;
          checked++;
          continue;
        }

        const contactId = contacts[0].id;
        const tagsData = await fetchJson(
          `${baseUrl}/api/3/contacts/${contactId}/contactTags`,
          acApiKey
        );
        const contactTagIds = new Set<string>(
          (tagsData.contactTags || []).map((ct: { tag: string }) => String(ct.tag))
        );

        // Find the highest-priority plan the user has a tag for
        let detectedPlan: typeof planTypes[0] | null = null;
        for (const plan of planTypes) {
          const planTagIds = planTagMap.get(plan.id)!;
          const hasTag = Array.from(planTagIds).some((id) => contactTagIds.has(id));
          if (hasTag) {
            detectedPlan = plan;
            break;
          }
        }

        if (!detectedPlan) {
          // No plan tag found — downgrade
          console.log(`User ${user.email}: no plan tags, downgrading`);
          await supabase.from("profiles").update({
            plan_type: "none",
            plan_type_id: null,
            last_ac_verification: now,
          }).eq("id", user.id);
          downgraded++;
        } else if (detectedPlan.id !== user.plan_type_id) {
          // Plan changed
          console.log(`User ${user.email}: plan changed from ${user.plan_type} to ${detectedPlan.slug}`);
          await supabase.from("profiles").update({
            plan_type: detectedPlan.slug,
            plan_type_id: detectedPlan.id,
            last_ac_verification: now,
          }).eq("id", user.id);

          // If upgrading to a plan with more credits, set up credits
          const currentPlanOrder = planTypes.find(p => p.id === user.plan_type_id)?.display_order || 0;
          if (detectedPlan.display_order > currentPlanOrder && detectedPlan.has_monthly_renewal) {
            const cycleEnd = new Date();
            cycleEnd.setDate(cycleEnd.getDate() + 30);
            const monthlyCredits = detectedPlan.monthly_credits || detectedPlan.initial_credits || 0;

            await supabase.from("user_credits").update({
              plan_credits: monthlyCredits,
              cycle_start_date: new Date().toISOString(),
              cycle_end_date: cycleEnd.toISOString(),
              plan_credits_expire_at: null,
            }).eq("user_id", user.id);
          }

          updated++;
        } else {
          // Same plan — just update verification timestamp
          await supabase.from("profiles").update({
            last_ac_verification: now,
          }).eq("id", user.id);
        }

        checked++;
      } catch (err) {
        console.error(`Error rechecking user ${user.email}:`, err);
        errors++;
      }
    }

    console.log(`Recheck complete: ${checked} checked, ${updated} updated, ${downgraded} downgraded, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, checked, updated, downgraded, errors, processed_at: now }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in recheck-user-plans:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
