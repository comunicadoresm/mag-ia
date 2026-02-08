import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Verify admin or cron caller
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      // If auth header present but invalid, reject
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const now = new Date().toISOString();
    let renewedPlans = 0;
    let renewedSubscriptions = 0;

    console.log(`Starting credit renewal at ${now}`);

    // 1. Renew plan credits for 'magnetic' users whose cycle has ended
    const { data: expiredCredits, error: expiredError } = await supabase
      .from("user_credits")
      .select("id, user_id, plan_credits, subscription_credits, bonus_credits, cycle_end_date")
      .lte("cycle_end_date", now);

    if (expiredError) {
      console.error("Error fetching expired credits:", expiredError);
    } else if (expiredCredits && expiredCredits.length > 0) {
      for (const credit of expiredCredits) {
        // Check if user is magnetic
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_type")
          .eq("id", credit.user_id)
          .single();

        if (profile?.plan_type === "magnetic") {
          const newCycleStart = new Date();
          const newCycleEnd = new Date();
          newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);

          // Reset plan credits to 30, subscription credits are handled separately
          const { error: updateError } = await supabase
            .from("user_credits")
            .update({
              plan_credits: 30,
              subscription_credits: 0, // Reset subscription credits too
              cycle_start_date: newCycleStart.toISOString(),
              cycle_end_date: newCycleEnd.toISOString(),
            })
            .eq("id", credit.id);

          if (!updateError) {
            renewedPlans++;

            // Log transaction for plan renewal
            await supabase.from("credit_transactions").insert({
              user_id: credit.user_id,
              type: "plan_renewal",
              amount: 30,
              source: "plan_renewal",
              balance_after: 30 + credit.bonus_credits,
              metadata: {
                old_plan_credits: credit.plan_credits,
                old_subscription_credits: credit.subscription_credits,
                cycle_start: newCycleStart.toISOString(),
                cycle_end: newCycleEnd.toISOString(),
              },
            });
          } else {
            console.error(`Error renewing credits for user ${credit.user_id}:`, updateError);
          }
        } else if (profile?.plan_type === "basic") {
          // Basic plan: one-time trial credits — expire after 30 days, NO renewal ever
          console.log(`Basic user ${credit.user_id}: trial expired after 30 days, zeroing credits permanently`);

          const { error: updateError } = await supabase
            .from("user_credits")
            .update({
              plan_credits: 0,
              subscription_credits: 0,
            })
            .eq("id", credit.id);

          if (!updateError) {
            // Log expiration
            await supabase.from("credit_transactions").insert({
              user_id: credit.user_id,
              type: "consumption",
              amount: -(credit.plan_credits || 0),
              source: "trial_expired",
              balance_after: credit.bonus_credits || 0,
              metadata: {
                plan: "basic",
                expired_credits: credit.plan_credits,
              },
            });
          }
        }
      }
    }

    // 2. Renew subscription credits
    const { data: activeSubscriptions, error: subError } = await supabase
      .from("credit_subscriptions")
      .select("*")
      .eq("status", "active")
      .lte("next_renewal_at", now);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
    } else if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const sub of activeSubscriptions) {
        // Add subscription credits to user's wallet
        const { data: currentCredits } = await supabase
          .from("user_credits")
          .select("subscription_credits, plan_credits, bonus_credits")
          .eq("user_id", sub.user_id)
          .single();

        if (currentCredits) {
          const newSubscriptionCredits = sub.credits_per_month; // Reset, not accumulate
          const newTotal = currentCredits.plan_credits + newSubscriptionCredits + currentCredits.bonus_credits;

          await supabase
            .from("user_credits")
            .update({ subscription_credits: newSubscriptionCredits })
            .eq("user_id", sub.user_id);

          // Update next renewal date
          const nextRenewal = new Date(sub.next_renewal_at);
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);

          await supabase
            .from("credit_subscriptions")
            .update({ next_renewal_at: nextRenewal.toISOString() })
            .eq("id", sub.id);

          // Log transaction
          await supabase.from("credit_transactions").insert({
            user_id: sub.user_id,
            type: "subscription_renewal",
            amount: sub.credits_per_month,
            source: "subscription_renewal",
            balance_after: newTotal,
            metadata: {
              subscription_id: sub.id,
              tier: sub.tier,
              next_renewal: nextRenewal.toISOString(),
            },
          });

          renewedSubscriptions++;
        }
      }
    }

    console.log(`Renewal complete: ${renewedPlans} plans, ${renewedSubscriptions} subscriptions`);

    return new Response(
      JSON.stringify({
        success: true,
        renewed_plans: renewedPlans,
        renewed_subscriptions: renewedSubscriptions,
        processed_at: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in renew-credits:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
