import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * setup-user-plan: Called after login to set up the user's plan and credits.
 * Now reads config from plan_types table instead of hardcoded values.
 *
 * POST body: { planType: string, planId?: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const planSlug: string = body.planType;
    const planId: string | undefined = body.planId;

    if (!planSlug) {
      return new Response(
        JSON.stringify({ error: "planType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Setting up plan for user ${user.id}: slug=${planSlug}, planId=${planId}`);

    // Fetch plan config from plan_types table
    let planConfig: any = null;
    if (planId) {
      const { data } = await supabase
        .from("plan_types")
        .select("*")
        .eq("id", planId)
        .single();
      planConfig = data;
    }
    if (!planConfig) {
      const { data } = await supabase
        .from("plan_types")
        .select("*")
        .eq("slug", planSlug)
        .eq("is_active", true)
        .single();
      planConfig = data;
    }

    if (!planConfig) {
      console.log(`Plan "${planSlug}" not found in plan_types table`);
      return new Response(
        JSON.stringify({ error: "Plan not found", planType: planSlug }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Plan config: ${planConfig.name}, initial=${planConfig.initial_credits}, monthly=${planConfig.monthly_credits}, renewal=${planConfig.has_monthly_renewal}`);

    // Get current profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, plan_type_id, plan_activated_at")
      .eq("id", user.id)
      .single();

    const currentPlanTypeId = profile?.plan_type_id || null;
    const now = new Date().toISOString();

    // Determine if plan changed
    const planChanged = currentPlanTypeId !== planConfig.id;

    // Check if this would be a downgrade — never downgrade automatically
    let currentPlanOrder = 0;
    if (currentPlanTypeId) {
      const { data: oldPlan } = await supabase
        .from("plan_types")
        .select("display_order")
        .eq("id", currentPlanTypeId)
        .single();
      currentPlanOrder = oldPlan?.display_order || 0;
    }

    if (planChanged && currentPlanTypeId && planConfig.display_order < currentPlanOrder) {
      console.log(`Skipping downgrade from order ${currentPlanOrder} to ${planConfig.display_order}`);
      return new Response(
        JSON.stringify({ success: true, planType: profile?.plan_type, skipped: "no_downgrade" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with plan_type and plan_type_id
    if (planChanged || !currentPlanTypeId) {
      console.log(`Updating plan: ${profile?.plan_type || 'none'} -> ${planConfig.slug}`);
      await supabase
        .from("profiles")
        .update({
          plan_type: planConfig.slug,
          plan_type_id: planConfig.id,
          plan_activated_at: now,
        })
        .eq("id", user.id);
    }

    // Check if user_credits exists
    const { data: existingCredits } = await supabase
      .from("user_credits")
      .select("id, plan_credits, bonus_credits, subscription_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    const initialCredits = planConfig.initial_credits || 0;

    if (!existingCredits) {
      // Create new credits row
      const cycleStart = new Date();
      const cycleEnd = new Date();
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      // Calculate expiration for trial credits
      let expireAt: string | null = null;
      if (planConfig.credits_expire_days && !planConfig.has_monthly_renewal) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + planConfig.credits_expire_days);
        expireAt = expDate.toISOString();
      }

      console.log(`Creating credits: ${initialCredits} plan_credits, renewal=${planConfig.has_monthly_renewal}, expire=${expireAt}`);

      await supabase.from("user_credits").insert({
        user_id: user.id,
        plan_credits: initialCredits,
        subscription_credits: 0,
        bonus_credits: 0,
        cycle_start_date: planConfig.has_monthly_renewal ? cycleStart.toISOString() : null,
        cycle_end_date: planConfig.has_monthly_renewal ? cycleEnd.toISOString() : (expireAt || null),
        plan_credits_expire_at: expireAt,
      });

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: planConfig.has_monthly_renewal ? "plan_renewal" : "bonus_purchase",
        amount: initialCredits,
        source: planConfig.has_monthly_renewal ? "plan_renewal" : "trial_credits",
        balance_after: initialCredits,
        metadata: {
          plan_slug: planConfig.slug,
          plan_id: planConfig.id,
          initial: true,
          ...(expireAt ? { expires_at: expireAt } : {}),
        },
      });
    } else if (planChanged && currentPlanTypeId) {
      // Upgrading plan — check if new plan is higher
      let currentPlanOrder = 0;
      if (currentPlanTypeId) {
        const { data: oldPlan } = await supabase
          .from("plan_types")
          .select("display_order")
          .eq("id", currentPlanTypeId)
          .single();
        currentPlanOrder = oldPlan?.display_order || 0;
      }

      if (planConfig.display_order > currentPlanOrder) {
        // Upgrading to higher plan
        console.log(`Upgrading plan: adding ${initialCredits} plan_credits`);
        const cycleStart = new Date();
        const cycleEnd = new Date();
        cycleEnd.setDate(cycleEnd.getDate() + 30);

        const updateData: Record<string, any> = {
          plan_credits: initialCredits,
          plan_credits_expire_at: null, // Clear expiration on upgrade
        };

        if (planConfig.has_monthly_renewal) {
          updateData.cycle_start_date = cycleStart.toISOString();
          updateData.cycle_end_date = cycleEnd.toISOString();
        }

        await supabase
          .from("user_credits")
          .update(updateData)
          .eq("user_id", user.id);

        const newTotal = initialCredits + (existingCredits.subscription_credits || 0) + (existingCredits.bonus_credits || 0);

        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "plan_renewal",
          amount: initialCredits,
          source: "plan_renewal",
          balance_after: newTotal,
          metadata: { plan_slug: planConfig.slug, plan_id: planConfig.id, upgrade: true },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        planType: planConfig.slug,
        planId: planConfig.id,
        message: `Plan set to ${planConfig.name}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in setup-user-plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
