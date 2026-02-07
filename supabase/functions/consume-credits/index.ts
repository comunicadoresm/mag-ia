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
    credit_cost?: number;
    message_package_size?: number;
  };
}

// Default costs per action
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

    const { action, metadata }: ConsumeRequest = await req.json();
    console.log(`Consume credits: user=${user.id}, action=${action}`);

    // Determine cost - use agent-specific cost if provided, otherwise default
    const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1;

    // For chat_messages, check if we need to bill based on message count
    if (action === "chat_messages" && metadata?.conversation_id) {
      const packageSize = metadata?.message_package_size || 5;

      // Count user messages in this conversation
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", metadata.conversation_id)
        .eq("role", "user");

      if (countError) {
        console.error("Error counting messages:", countError);
      } else {
        const messageCount = count || 0;
        // Only charge on every Nth message (package size)
        if (messageCount > 0 && messageCount % packageSize !== 0) {
          console.log(`Message ${messageCount} - not a billing point (every ${packageSize}). Skipping charge.`);

          // Get current balance to return
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
    }

    // Get user credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      console.error("Credits not found for user:", user.id);
      return new Response(
        JSON.stringify({
          error: "no_credits",
          message: "Você não tem créditos configurados. Entre em contato com o suporte.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalBalance = credits.plan_credits + credits.subscription_credits + credits.bonus_credits;

    if (totalBalance < cost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Seus créditos acabaram!",
          balance: {
            plan: credits.plan_credits,
            subscription: credits.subscription_credits,
            bonus: credits.bonus_credits,
            total: totalBalance,
          },
          required: cost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Debit in priority order: plan → subscription → bonus
    let remaining = cost;
    let newPlan = credits.plan_credits;
    let newSubscription = credits.subscription_credits;
    let newBonus = credits.bonus_credits;

    // 1. Debit from plan_credits first
    if (remaining > 0 && newPlan > 0) {
      const debit = Math.min(remaining, newPlan);
      newPlan -= debit;
      remaining -= debit;
    }

    // 2. Then subscription_credits
    if (remaining > 0 && newSubscription > 0) {
      const debit = Math.min(remaining, newSubscription);
      newSubscription -= debit;
      remaining -= debit;
    }

    // 3. Finally bonus_credits
    if (remaining > 0 && newBonus > 0) {
      const debit = Math.min(remaining, newBonus);
      newBonus -= debit;
      remaining -= debit;
    }

    const newTotal = newPlan + newSubscription + newBonus;

    // Update credits
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        plan_credits: newPlan,
        subscription_credits: newSubscription,
        bonus_credits: newBonus,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating credits:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log transaction
    const { error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        type: "consumption",
        amount: -cost,
        source: action,
        balance_after: newTotal,
        metadata: metadata || {},
      });

    if (txError) {
      console.error("Error logging transaction:", txError);
      // Non-blocking - credits were already deducted
    }

    console.log(`Credits consumed: ${cost}, remaining: ${newTotal}`);

    return new Response(
      JSON.stringify({
        success: true,
        credits_consumed: cost,
        balance: {
          plan: newPlan,
          subscription: newSubscription,
          bonus: newBonus,
          total: newTotal,
        },
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
