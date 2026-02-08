import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * setup-user-plan: Called after login to set up the user's plan and credits.
 * 
 * POST body: { planType: 'basic' | 'magnetic' }
 * 
 * Logic:
 * - Updates profiles.plan_type if different
 * - Creates user_credits row if it doesn't exist
 * - For magnetic: 30 plan_credits/month with cycle
 * - For basic: 10 trial credits (one-time, stored as bonus)
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

    const { planType } = await req.json();
    
    if (!planType || !["basic", "magnetic"].includes(planType)) {
      return new Response(
        JSON.stringify({ error: "Invalid planType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Setting up plan for user ${user.id}: ${planType}`);

    // Get current profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, plan_activated_at")
      .eq("id", user.id)
      .single();

    const currentPlan = profile?.plan_type || "none";
    const now = new Date().toISOString();

    // Update plan_type if different
    if (currentPlan !== planType) {
      console.log(`Updating plan: ${currentPlan} -> ${planType}`);
      
      const updateData: Record<string, any> = { plan_type: planType };
      
      // Set activation date only on first activation or plan change
      if (currentPlan === "none" || currentPlan !== planType) {
        updateData.plan_activated_at = now;
      }

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
    }

    // Check if user_credits exists
    const { data: existingCredits } = await supabase
      .from("user_credits")
      .select("id, plan_credits, bonus_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingCredits) {
      // Create credits row
      const cycleStart = new Date();
      const cycleEnd = new Date();
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      if (planType === "magnetic") {
        // Magnetic: 30 plan credits per month
        console.log("Creating magnetic credits: 30 plan_credits");
        await supabase.from("user_credits").insert({
          user_id: user.id,
          plan_credits: 30,
          subscription_credits: 0,
          bonus_credits: 0,
          cycle_start_date: cycleStart.toISOString(),
          cycle_end_date: cycleEnd.toISOString(),
        });

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "plan_renewal",
          amount: 30,
          source: "plan_renewal",
          balance_after: 30,
          metadata: { plan: "magnetic", initial: true },
        });
      } else {
        // Basic: 10 trial credits (as bonus - non-expiring one-time)
        console.log("Creating basic credits: 10 bonus (trial)");
        await supabase.from("user_credits").insert({
          user_id: user.id,
          plan_credits: 0,
          subscription_credits: 0,
          bonus_credits: 10,
          cycle_start_date: null,
          cycle_end_date: null,
        });

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "bonus_purchase",
          amount: 10,
          source: "trial_credits",
          balance_after: 10,
          metadata: { plan: "basic", trial: true },
        });
      }
    } else if (currentPlan !== planType && planType === "magnetic" && currentPlan === "basic") {
      // Upgrading from basic to magnetic
      console.log("Upgrading basic -> magnetic: setting 30 plan_credits");
      const cycleStart = new Date();
      const cycleEnd = new Date();
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      await supabase
        .from("user_credits")
        .update({
          plan_credits: 30,
          cycle_start_date: cycleStart.toISOString(),
          cycle_end_date: cycleEnd.toISOString(),
        })
        .eq("user_id", user.id);

      const newTotal = 30 + (existingCredits.bonus_credits || 0);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "plan_renewal",
        amount: 30,
        source: "plan_renewal",
        balance_after: newTotal,
        metadata: { plan: "magnetic", upgrade: true },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        planType,
        message: `Plan set to ${planType}` 
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
