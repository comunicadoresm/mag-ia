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

async function detectPlanFromAC(
  baseUrl: string,
  acApiKey: string,
  email: string,
  planTypes: Array<{ id: string; slug: string; ac_tag: string; display_order: number; name: string; initial_credits?: number; monthly_credits?: number; has_monthly_renewal?: boolean; credits_expire_days?: number | null }>
): Promise<{ slug: string; id: string; name: string } | null> {
  // Step 1: Find contact by email
  console.log(`Searching AC for contact: ${email}`);
  const contactData = await fetchJson(
    `${baseUrl}/api/3/contacts?email=${encodeURIComponent(email)}`,
    acApiKey
  );
  const contacts = contactData.contacts || [];

  if (contacts.length === 0) {
    console.log(`Contact not found in ActiveCampaign: ${email}`);
    return null;
  }

  const contactId = contacts[0].id;
  console.log(`Found AC contact ID: ${contactId}`);

  // Step 2: Get contact tag IDs
  const tagsData = await fetchJson(
    `${baseUrl}/api/3/contacts/${contactId}/contactTags`,
    acApiKey
  );
  const contactTags = tagsData.contactTags || [];
  const contactTagIds = new Set<string>(contactTags.map((ct: { tag: string }) => String(ct.tag)));
  console.log(`Contact tag IDs: ${Array.from(contactTagIds).join(",") || "(none)"}`);

  // Step 3: For each plan (highest display_order first), check if contact has the ac_tag
  for (const plan of planTypes) {
    const tagIds = await resolveTagIds(baseUrl, acApiKey, plan.ac_tag);
    const hasTag = Array.from(tagIds).some((id) => contactTagIds.has(id));
    if (hasTag) {
      console.log(`User has tag for plan: ${plan.name} (${plan.slug})`);
      return { slug: plan.slug, id: plan.id, name: plan.name };
    }
  }

  return null;
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

    // Step 1: Fetch ALL active plan_types from DB, ordered by display_order DESC (highest priority first)
    const { data: planTypes, error: ptError } = await supabase
      .from("plan_types")
      .select("id, slug, ac_tag, display_order, name, initial_credits, monthly_credits, has_monthly_renewal, credits_expire_days")
      .eq("is_active", true)
      .order("display_order", { ascending: false });

    if (ptError || !planTypes || planTypes.length === 0) {
      console.error("Error fetching plan_types or none found:", ptError);
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

    // Step 2: Always verify against ActiveCampaign (to detect plan changes)
    const detectedPlan = await detectPlanFromAC(baseUrl, acApiKey, normalizedEmail, planTypes);

    if (!detectedPlan) {
      // Not in AC — only allow if the user was manually created by an admin
      // (identified by having a plan_type_id but NO last_ac_verification record)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, plan_type, plan_type_id, last_ac_verification")
        .eq("email", normalizedEmail)
        .single();

      const isManuallyCreated =
        existingProfile?.plan_type_id &&
        !existingProfile?.last_ac_verification;

      if (isManuallyCreated) {
        const matchedPlan = planTypes.find(p => p.id === existingProfile.plan_type_id);
        const planSlug = matchedPlan?.slug || existingProfile.plan_type || "none";

        if (planSlug !== "none") {
          console.log(`User ${normalizedEmail} was manually created (no AC history) — granting access with plan ${planSlug}`);
          return new Response(
            JSON.stringify({
              isVerified: true,
              source: "manual",
              planType: planSlug,
              planId: existingProfile.plan_type_id,
              message: "Manually created user - access granted",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // User either not in system, or was in AC before but tag was removed → block access
      console.log(`No plan tag found for ${normalizedEmail} in ActiveCampaign — access denied`);
      return new Response(
        JSON.stringify({
          isVerified: false,
          source: "activecampaign",
          planType: "none",
          planId: null,
          message: "Student tag not found in ActiveCampaign",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Plan detected in AC — update profile immediately (no localStorage dependency)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, plan_type_id, plan_activated_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existingProfile) {
      const currentPlanId = existingProfile.plan_type_id;
      const planChanged = currentPlanId !== detectedPlan.id;

      // Fetch current plan order to avoid downgrade
      let currentPlanOrder = 0;
      if (currentPlanId) {
        const { data: oldPlan } = await supabase
          .from("plan_types")
          .select("display_order")
          .eq("id", currentPlanId)
          .single();
        currentPlanOrder = oldPlan?.display_order || 0;
      }

      const planConfig = planTypes.find(p => p.id === detectedPlan.id);
      const newPlanOrder = planConfig?.display_order || 0;
      const isUpgradeOrSame = newPlanOrder >= currentPlanOrder;

      if (isUpgradeOrSame) {
        const updateData: Record<string, any> = {
          last_ac_verification: now,
          plan_type: detectedPlan.slug,
          plan_type_id: detectedPlan.id,
        };
        if (planChanged || !existingProfile.plan_activated_at) {
          updateData.plan_activated_at = now;
        }
        await supabase.from("profiles").update(updateData).eq("id", existingProfile.id);
        console.log(`Updated profile plan: ${detectedPlan.slug} (changed: ${planChanged})`);

        // Set up credits if plan changed or no credits exist yet
        if (planChanged || !currentPlanId) {
          const { data: existingCredits } = await supabase
            .from("user_credits")
            .select("id")
            .eq("user_id", existingProfile.id)
            .maybeSingle();

          if (!existingCredits && planConfig) {
            const initialCredits = (planConfig as any).initial_credits || 0;
            const cycleStart = new Date();
            const cycleEnd = new Date();
            cycleEnd.setDate(cycleEnd.getDate() + 30);

            let expireAt: string | null = null;
            if ((planConfig as any).credits_expire_days && !(planConfig as any).has_monthly_renewal) {
              const expDate = new Date();
              expDate.setDate(expDate.getDate() + (planConfig as any).credits_expire_days);
              expireAt = expDate.toISOString();
            }

            await supabase.from("user_credits").insert({
              user_id: existingProfile.id,
              plan_credits: initialCredits,
              subscription_credits: 0,
              bonus_credits: 0,
              cycle_start_date: (planConfig as any).has_monthly_renewal ? cycleStart.toISOString() : null,
              cycle_end_date: (planConfig as any).has_monthly_renewal ? cycleEnd.toISOString() : (expireAt || null),
              plan_credits_expire_at: expireAt,
            });
            console.log(`Created user_credits: ${initialCredits} credits for plan ${detectedPlan.slug}`);
          }
        }
      } else {
        // Current plan is higher — just update verification timestamp
        await supabase.from("profiles").update({ last_ac_verification: now }).eq("id", existingProfile.id);
        console.log(`Kept higher plan ${currentPlanId}, just updated last_ac_verification`);
      }
    }

    console.log(`Verification result for ${normalizedEmail}: verified=true, plan=${detectedPlan.slug}`);

    return new Response(
      JSON.stringify({
        isVerified: true,
        source: "activecampaign",
        planType: detectedPlan.slug,
        planId: detectedPlan.id,
        message: `Student verified - plan: ${detectedPlan.name}`,
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
