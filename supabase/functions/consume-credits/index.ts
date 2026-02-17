import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConsumeRequest {
  action: "script_generation" | "script_adjustment" | "chat_messages";
  metadata?: {
    agent_id?: string;
    conversation_id?: string;
    script_id?: string;
  };
}

const DEFAULT_COSTS: Record<string, number> = {
  script_generation: 3,
  script_adjustment: 1,
  chat_messages: 1,
};

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, metadata }: ConsumeRequest = await req.json();
    console.log(`Consume credits: user=${user.id}, action=${action}`);

    // Determine cost server-side only (never trust client)
    let cost = DEFAULT_COSTS[action] || 1;

    // If agent_id provided, read cost from agents table
    if (metadata?.agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("credit_cost, message_package_size")
        .eq("id", metadata.agent_id)
        .single();
      if (agent?.credit_cost) {
        cost = agent.credit_cost;
      }
    }

    // For chat_messages, check if we need to bill based on message count
    if (action === "chat_messages" && metadata?.conversation_id) {
      // Read package size from agent config, default to 5
      let packageSize = 5;
      if (metadata?.agent_id) {
        const { data: agentConfig } = await supabase
          .from("agents")
          .select("message_package_size")
          .eq("id", metadata.agent_id)
          .single();
        if (agentConfig?.message_package_size) {
          packageSize = agentConfig.message_package_size;
        }
      }
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", metadata.conversation_id)
        .eq("role", "user");

      const messageCount = count || 0;
      // AJUSTE 6: Charge on 1st message AND every packageSize messages after that
      // Message 1 → charge, 2-5 → skip, 6 → charge, 7-10 → skip, 11 → charge...
      const shouldCharge = messageCount === 0 || (messageCount > 0 && messageCount % packageSize === 0);
      if (!shouldCharge) {
        console.log(`Message ${messageCount + 1} - not a billing point (every ${packageSize}). Skipping charge.`);
        const { data: credits } = await supabase
          .from("user_credits")
          .select("plan_credits, subscription_credits, bonus_credits")
          .eq("user_id", user.id)
          .single();

        const balance = credits
          ? {
              plan: credits.plan_credits,
              subscription: credits.subscription_credits,
              bonus: credits.bonus_credits,
              total: credits.plan_credits + credits.subscription_credits + credits.bonus_credits,
            }
          : { plan: 0, subscription: 0, bonus: 0, total: 0 };

        return new Response(
          JSON.stringify({ success: true, credits_consumed: 0, balance }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(
        JSON.stringify({
          error: "no_credits",
          message: "Você não tem créditos configurados. Entre em contato com o suporte.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ** NEW: Check plan_credits expiration **
    let planCredits = credits.plan_credits || 0;
    if (credits.plan_credits_expire_at) {
      const expireDate = new Date(credits.plan_credits_expire_at);
      if (expireDate <= new Date()) {
        console.log(`Plan credits expired at ${credits.plan_credits_expire_at}, zeroing out.`);
        planCredits = 0;
        // Zero out in DB immediately
        await supabase
          .from("user_credits")
          .update({ plan_credits: 0, plan_credits_expire_at: null })
          .eq("user_id", user.id);
      }
    }

    const totalBalance = planCredits + (credits.subscription_credits || 0) + (credits.bonus_credits || 0);

    if (totalBalance < cost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Seus créditos acabaram!",
          balance: {
            plan: planCredits,
            subscription: credits.subscription_credits || 0,
            bonus: credits.bonus_credits || 0,
            total: totalBalance,
          },
          required: cost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Debit in priority order: plan → subscription → bonus
    let remaining = cost;
    let newPlan = planCredits;
    let newSubscription = credits.subscription_credits || 0;
    let newBonus = credits.bonus_credits || 0;

    if (remaining > 0 && newPlan > 0) {
      const debit = Math.min(remaining, newPlan);
      newPlan -= debit;
      remaining -= debit;
    }
    if (remaining > 0 && newSubscription > 0) {
      const debit = Math.min(remaining, newSubscription);
      newSubscription -= debit;
      remaining -= debit;
    }
    if (remaining > 0 && newBonus > 0) {
      const debit = Math.min(remaining, newBonus);
      newBonus -= debit;
      remaining -= debit;
    }

    const newTotal = newPlan + newSubscription + newBonus;

    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        plan_credits: newPlan,
        subscription_credits: newSubscription,
        bonus_credits: newBonus,
      })
      .eq("user_id", user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "consumption",
      amount: -cost,
      source: action,
      balance_after: newTotal,
      metadata: metadata || {},
    });

    console.log(`Credits consumed: ${cost}, remaining: ${newTotal}`);

    return new Response(
      JSON.stringify({
        success: true,
        credits_consumed: cost,
        balance: { plan: newPlan, subscription: newSubscription, bonus: newBonus, total: newTotal },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in consume-credits:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
