import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-hotmart-hottok",
};

/**
 * Verify HMAC-SHA256 signature from Hotmart webhook.
 * If HOTMART_WEBHOOK_SECRET is configured, validates the X-Hotmart-Hmac-SHA256 header.
 */
async function verifyHmac(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * hotmart-webhook: Receives Hotmart payment events.
 * Handles: PURCHASE_APPROVED, PURCHASE_CANCELED, SUBSCRIPTION_CANCELLATION, SUBSCRIPTION_RENEWAL
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: any = null;
  let eventType: string | null = null;

  try {
    // Read raw body for HMAC verification before parsing
    const rawBody = await req.text();
    payload = JSON.parse(rawBody);
    eventType = payload?.event || payload?.data?.event || null;

    // SECURITY: HMAC-SHA256 verification (preferred, if secret is configured)
    const webhookSecret = Deno.env.get("HOTMART_WEBHOOK_SECRET");
    if (webhookSecret) {
      const hmacHeader = req.headers.get("X-Hotmart-Hmac-SHA256");
      const isValid = await verifyHmac(rawBody, hmacHeader, webhookSecret);
      if (!isValid) {
        console.error("Invalid HMAC signature");
        await logWebhook(supabase, "hotmart", eventType, payload, "rejected", "Invalid HMAC signature");
        return new Response(JSON.stringify({ status: "rejected" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: validate hottok (legacy token validation)
    const hottok = Deno.env.get("HOTMART_HOTTOK");
    const receivedToken = payload?.hottok || req.headers.get("x-hotmart-hottok") || "";

    if (!webhookSecret && hottok && receivedToken !== hottok) {
      console.error("Invalid hottok received");
      await logWebhook(supabase, "hotmart", eventType, payload, "rejected", "Invalid hottok");
      // Return 200 so Hotmart doesn't retry
      return new Response(JSON.stringify({ status: "rejected" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the event
    await logWebhook(supabase, "hotmart", eventType, payload, "received", null);

    console.log(`Hotmart webhook: event=${eventType}`);

    const buyerEmail = extractEmail(payload);
    if (!buyerEmail) {
      console.error("No buyer email found in payload");
      await logWebhook(supabase, "hotmart", eventType, payload, "error", "No buyer email");
      return new Response(JSON.stringify({ status: "ok", message: "No email found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = extractProductId(payload);
    console.log(`Buyer: ${buyerEmail}, Product: ${productId}`);

    switch (eventType) {
      case "PURCHASE_APPROVED":
        await handlePurchaseApproved(supabase, buyerEmail, productId, payload);
        break;
      case "PURCHASE_CANCELED":
      case "SUBSCRIPTION_CANCELLATION":
        await handleCancellation(supabase, buyerEmail, productId, payload);
        break;
      case "SUBSCRIPTION_RENEWAL":
        await handleRenewal(supabase, buyerEmail, productId, payload);
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    await logWebhook(supabase, "hotmart", eventType, payload, "processed", null);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in hotmart-webhook:", error);
    if (supabase) {
      await logWebhook(supabase, "hotmart", eventType, payload, "error", error instanceof Error ? error.message : "Unknown error");
    }
    // Always return 200 to prevent Hotmart retries
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// RFC 5321: max 254 chars; only safe characters allowed
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const EMAIL_MAX_LENGTH = 254;

function extractEmail(payload: any): string | null {
  const raw =
    payload?.data?.buyer?.email ||
    payload?.buyer?.email ||
    payload?.data?.subscriber?.email ||
    null;

  if (!raw || typeof raw !== "string") return null;

  const email = raw.toLowerCase().trim();

  // Length check (RFC 5321)
  if (email.length > EMAIL_MAX_LENGTH) {
    console.error(`Email too long (${email.length} chars), rejecting`);
    return null;
  }

  // Format validation
  if (!EMAIL_REGEX.test(email)) {
    console.error(`Invalid email format, rejecting`);
    return null;
  }

  // Reject null bytes and control characters
  if (/[\x00-\x1F\x7F]/.test(email)) {
    console.error("Email contains control characters, rejecting");
    return null;
  }

  return email;
}

function extractProductId(payload: any): string | null {
  return (
    String(payload?.data?.product?.id || payload?.product?.id || payload?.data?.subscription?.product?.id || "")
  ) || null;
}

async function logWebhook(supabase: any, source: string, eventType: string | null, payload: any, status: string, errorMessage: string | null) {
  try {
    await supabase.from("webhook_logs").insert({
      source,
      event_type: eventType,
      payload,
      status,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error("Failed to log webhook:", e);
  }
}

async function handlePurchaseApproved(supabase: any, email: string, productId: string | null, payload: any) {
  if (!productId) {
    console.log("No product ID, skipping");
    return;
  }

  // Check if it's a PLAN
  const { data: plan } = await supabase
    .from("plan_types")
    .select("*")
    .eq("hotmart_product_id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (plan) {
    console.log(`Product is a plan: ${plan.name}`);
    await activatePlan(supabase, email, plan);
    return;
  }

  // Check if it's a CREDIT PACKAGE
  const { data: pkg } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("hotmart_product_id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (pkg) {
    console.log(`Product is a credit package: ${pkg.name}`);
    await activateCreditPackage(supabase, email, pkg);
    return;
  }

  console.log(`Product ${productId} not found in plan_types or credit_packages`);
}

async function activatePlan(supabase: any, email: string, plan: any) {
  // Find user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, plan_type_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    console.log(`User ${email} not found in profiles`);
    return;
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({
      plan_type: plan.slug,
      plan_type_id: plan.id,
      plan_activated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  // Setup credits
  const cycleEnd = new Date();
  cycleEnd.setDate(cycleEnd.getDate() + 30);

  let expireAt: string | null = null;
  if (plan.credits_expire_days && !plan.has_monthly_renewal) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + plan.credits_expire_days);
    expireAt = expDate.toISOString();
  }

  const { data: existingCredits } = await supabase
    .from("user_credits")
    .select("id, bonus_credits, subscription_credits")
    .eq("user_id", profile.id)
    .maybeSingle();

  const initialCredits = plan.initial_credits || 0;

  if (existingCredits) {
    await supabase.from("user_credits").update({
      plan_credits: initialCredits,
      cycle_start_date: plan.has_monthly_renewal ? new Date().toISOString() : null,
      cycle_end_date: plan.has_monthly_renewal ? cycleEnd.toISOString() : (expireAt || null),
      plan_credits_expire_at: expireAt,
    }).eq("user_id", profile.id);
  } else {
    await supabase.from("user_credits").insert({
      user_id: profile.id,
      plan_credits: initialCredits,
      subscription_credits: 0,
      bonus_credits: 0,
      cycle_start_date: plan.has_monthly_renewal ? new Date().toISOString() : null,
      cycle_end_date: plan.has_monthly_renewal ? cycleEnd.toISOString() : (expireAt || null),
      plan_credits_expire_at: expireAt,
    });
  }

  const totalAfter = initialCredits + (existingCredits?.subscription_credits || 0) + (existingCredits?.bonus_credits || 0);

  await supabase.from("credit_transactions").insert({
    user_id: profile.id,
    type: "plan_renewal",
    amount: initialCredits,
    source: "plan_renewal",
    balance_after: totalAfter,
    metadata: { plan_slug: plan.slug, plan_id: plan.id, source: "hotmart" },
  });

  console.log(`Plan ${plan.name} activated for ${email}`);
}

async function activateCreditPackage(supabase: any, email: string, pkg: any) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    console.log(`User ${email} not found`);
    return;
  }

  const { data: credits } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!credits) {
    console.log(`No user_credits for ${email}`);
    return;
  }

  if (pkg.package_type === "one_time") {
    // Add to bonus_credits (don't expire)
    const newBonus = (credits.bonus_credits || 0) + pkg.credits_amount;
    await supabase.from("user_credits")
      .update({ bonus_credits: newBonus })
      .eq("user_id", profile.id);

    const totalAfter = (credits.plan_credits || 0) + (credits.subscription_credits || 0) + newBonus;

    await supabase.from("credit_transactions").insert({
      user_id: profile.id,
      type: "bonus_purchase",
      amount: pkg.credits_amount,
      source: `package_${pkg.id}`,
      balance_after: totalAfter,
      metadata: { package_name: pkg.name, package_id: pkg.id, source: "hotmart" },
    });

    // Record purchase
    await supabase.from("credit_purchases").insert({
      user_id: profile.id,
      package: pkg.name,
      credits: pkg.credits_amount,
      price_brl: pkg.price_brl,
      payment_status: "completed",
    });
  } else if (pkg.package_type === "recurring") {
    // Add to subscription_credits
    const newSub = (credits.subscription_credits || 0) + pkg.credits_amount;
    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + 30);

    await supabase.from("user_credits")
      .update({ subscription_credits: newSub })
      .eq("user_id", profile.id);

    // Create/update subscription record
    await supabase.from("credit_subscriptions").upsert({
      user_id: profile.id,
      tier: pkg.name,
      credits_per_month: pkg.credits_amount,
      price_brl: pkg.price_brl,
      status: "active",
      next_renewal_at: nextRenewal.toISOString(),
    }, { onConflict: "user_id" }).select();

    const totalAfter = (credits.plan_credits || 0) + newSub + (credits.bonus_credits || 0);

    await supabase.from("credit_transactions").insert({
      user_id: profile.id,
      type: "subscription_renewal",
      amount: pkg.credits_amount,
      source: `subscription_${pkg.id}`,
      balance_after: totalAfter,
      metadata: { package_name: pkg.name, package_id: pkg.id, source: "hotmart" },
    });
  }

  console.log(`Credit package ${pkg.name} activated for ${email}`);
}

async function handleCancellation(supabase: any, email: string, productId: string | null, payload: any) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, plan_type_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) return;

  // Check if it's a plan cancellation
  if (productId) {
    const { data: plan } = await supabase
      .from("plan_types")
      .select("id, slug")
      .eq("hotmart_product_id", productId)
      .maybeSingle();

    if (plan && profile.plan_type_id === plan.id) {
      // Downgrade to none
      await supabase.from("profiles").update({
        plan_type: "none",
        plan_type_id: null,
      }).eq("id", profile.id);

      console.log(`Plan cancelled for ${email}`);
      return;
    }

    // Check if it's a credit subscription cancellation
    const { data: pkg } = await supabase
      .from("credit_packages")
      .select("id, name")
      .eq("hotmart_product_id", productId)
      .maybeSingle();

    if (pkg) {
      await supabase.from("credit_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("user_id", profile.id)
        .eq("status", "active");

      console.log(`Credit subscription cancelled for ${email}`);
    }
  }
}

async function handleRenewal(supabase: any, email: string, productId: string | null, payload: any) {
  if (!productId) return;

  const { data: pkg } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("hotmart_product_id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (!pkg || pkg.package_type !== "recurring") {
    console.log("Renewal for non-recurring or unknown product");
    return;
  }

  // Same logic as activating recurring
  await activateCreditPackage(supabase, email, pkg);
  console.log(`Subscription renewed for ${email}: ${pkg.name}`);
}
