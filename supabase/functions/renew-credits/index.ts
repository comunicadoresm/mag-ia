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

    const now = new Date().toISOString();
    let renewedPlans = 0;
    let renewedSubscriptions = 0;
    let expiredTrials = 0;

    console.log(`Starting credit renewal at ${now}`);

    // 1. Fetch all expired user_credits (cycle_end_date <= now)
    const { data: expiredCredits, error: expiredError } = await supabase
      .from("user_credits")
      .select("id, user_id, plan_credits, subscription_credits, bonus_credits, cycle_end_date, plan_credits_expire_at")
      .lte("cycle_end_date", now);

    if (expiredError) {
      console.error("Error fetching expired credits:", expiredError);
    } else if (expiredCredits && expiredCredits.length > 0) {
      for (const credit of expiredCredits) {
        // Get user profile with plan_type_id to fetch dynamic plan config
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_type, plan_type_id")
          .eq("id", credit.user_id)
          .single();

        if (!profile?.plan_type_id) {
          console.log(`User ${credit.user_id}: no plan_type_id, skipping`);
          continue;
        }

        // Fetch plan config from plan_types table
        const { data: planConfig } = await supabase
          .from("plan_types")
          .select("slug, monthly_credits, has_monthly_renewal, initial_credits, credits_expire_days")
          .eq("id", profile.plan_type_id)
          .single();

        if (!planConfig) {
          console.log(`User ${credit.user_id}: plan_type_id not found in plan_types`);
          continue;
        }

        if (planConfig.has_monthly_renewal) {
          // Monthly renewal plan: reset plan_credits to monthly_credits
          const monthlyCredits = planConfig.monthly_credits || 0;
          const newCycleStart = new Date();
          const newCycleEnd = new Date();
          newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);

          const { error: updateError } = await supabase
            .from("user_credits")
            .update({
              plan_credits: monthlyCredits,
              subscription_credits: 0, // Reset subscription credits (handled separately)
              cycle_start_date: newCycleStart.toISOString(),
              cycle_end_date: newCycleEnd.toISOString(),
              plan_credits_expire_at: null,
            })
            .eq("id", credit.id);

          if (!updateError) {
            renewedPlans++;
            await supabase.from("credit_transactions").insert({
              user_id: credit.user_id,
              type: "plan_renewal",
              amount: monthlyCredits,
              source: "plan_renewal",
              balance_after: monthlyCredits + (credit.bonus_credits || 0),
              metadata: {
                plan_slug: planConfig.slug,
                old_plan_credits: credit.plan_credits,
                old_subscription_credits: credit.subscription_credits,
                cycle_start: newCycleStart.toISOString(),
                cycle_end: newCycleEnd.toISOString(),
              },
            });
          } else {
            console.error(`Error renewing credits for user ${credit.user_id}:`, updateError);
          }
        } else {
          // Non-renewal plan (e.g. basic trial): credits expire, zero them out permanently
          console.log(`User ${credit.user_id} (${planConfig.slug}): trial expired, zeroing credits`);

          const { error: updateError } = await supabase
            .from("user_credits")
            .update({
              plan_credits: 0,
              subscription_credits: 0,
              plan_credits_expire_at: null,
            })
            .eq("id", credit.id);

          if (!updateError) {
            expiredTrials++;
            await supabase.from("credit_transactions").insert({
              user_id: credit.user_id,
              type: "consumption",
              amount: -(credit.plan_credits || 0),
              source: "trial_expired",
              balance_after: credit.bonus_credits || 0,
              metadata: {
                plan_slug: planConfig.slug,
                expired_credits: credit.plan_credits,
              },
            });
          }
        }
      }
    }

    // 2. Handle plan_credits_expire_at separately (for users whose plan_credits_expire_at <= now but cycle_end_date hasn't been reached)
    const { data: expiredPlanCredits } = await supabase
      .from("user_credits")
      .select("id, user_id, plan_credits, bonus_credits")
      .lte("plan_credits_expire_at", now)
      .gt("plan_credits", 0);

    if (expiredPlanCredits) {
      for (const credit of expiredPlanCredits) {
        await supabase
          .from("user_credits")
          .update({ plan_credits: 0, plan_credits_expire_at: null })
          .eq("id", credit.id);

        await supabase.from("credit_transactions").insert({
          user_id: credit.user_id,
          type: "consumption",
          amount: -(credit.plan_credits || 0),
          source: "credits_expired",
          balance_after: credit.bonus_credits || 0,
          metadata: { reason: "plan_credits_expire_at reached" },
        });

        expiredTrials++;
      }
    }

    // 3. Renew subscription credits
    const { data: activeSubscriptions, error: subError } = await supabase
      .from("credit_subscriptions")
      .select("*")
      .eq("status", "active")
      .lte("next_renewal_at", now);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
    } else if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const sub of activeSubscriptions) {
        const { data: currentCredits } = await supabase
          .from("user_credits")
          .select("subscription_credits, plan_credits, bonus_credits")
          .eq("user_id", sub.user_id)
          .single();

        if (currentCredits) {
          const newSubscriptionCredits = sub.credits_per_month;
          const newTotal = (currentCredits.plan_credits || 0) + newSubscriptionCredits + (currentCredits.bonus_credits || 0);

          await supabase
            .from("user_credits")
            .update({ subscription_credits: newSubscriptionCredits })
            .eq("user_id", sub.user_id);

          const nextRenewal = new Date(sub.next_renewal_at);
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);

          await supabase
            .from("credit_subscriptions")
            .update({ next_renewal_at: nextRenewal.toISOString() })
            .eq("id", sub.id);

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

    console.log(`Renewal complete: ${renewedPlans} plans, ${renewedSubscriptions} subscriptions, ${expiredTrials} expired`);

    return new Response(
      JSON.stringify({
        success: true,
        renewed_plans: renewedPlans,
        renewed_subscriptions: renewedSubscriptions,
        expired_trials: expiredTrials,
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
