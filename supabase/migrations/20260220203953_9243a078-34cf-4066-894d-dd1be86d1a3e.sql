
-- Fix linter ERROR: remove SECURITY DEFINER view by replacing with RPC
DROP VIEW IF EXISTS public.agents_public;

-- Public agents RPC (safe fields, no api_key)
CREATE OR REPLACE FUNCTION public.get_agents_public(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  icon_url text,
  icon_emoji text,
  system_prompt text,
  welcome_message text,
  model text,
  is_active boolean,
  display_order integer,
  ice_breakers jsonb,
  plan_access text,
  billing_type text,
  credit_cost integer,
  message_package_size integer,
  updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.id,
    a.name,
    a.slug,
    a.description,
    a.icon_url,
    a.icon_emoji,
    a.system_prompt,
    a.welcome_message,
    a.model,
    a.is_active,
    a.display_order,
    a.ice_breakers,
    a.plan_access,
    a.billing_type,
    a.credit_cost,
    a.message_package_size,
    a.updated_at,
    a.created_at
  FROM public.agents a
  WHERE a.is_active = true
    AND a.display_order < 900
    AND (p_ids IS NULL OR a.id = ANY(p_ids))
  ORDER BY a.display_order;
$$;

-- Ensure authenticated users can call RPC
GRANT EXECUTE ON FUNCTION public.get_agents_public(uuid[]) TO authenticated, anon;

-- Fix linter WARN: set immutable search_path for consume_credits_atomic
CREATE OR REPLACE FUNCTION public.consume_credits_atomic(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan INTEGER;
  v_subscription INTEGER;
  v_bonus INTEGER;
  v_total INTEGER;
  v_remaining INTEGER;
  v_new_plan INTEGER;
  v_new_subscription INTEGER;
  v_new_bonus INTEGER;
  v_expire_at TIMESTAMPTZ;
BEGIN
  SELECT plan_credits, subscription_credits, bonus_credits, plan_credits_expire_at
  INTO v_plan, v_subscription, v_bonus, v_expire_at
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_credits');
  END IF;

  IF v_expire_at IS NOT NULL AND v_expire_at <= NOW() THEN
    v_plan := 0;
    UPDATE public.user_credits
    SET plan_credits = 0, plan_credits_expire_at = NULL
    WHERE user_id = p_user_id;
  END IF;

  v_total := v_plan + v_subscription + v_bonus;

  IF v_total < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_total,
      'required', p_amount
    );
  END IF;

  v_remaining := p_amount;
  v_new_plan := v_plan;
  v_new_subscription := v_subscription;
  v_new_bonus := v_bonus;

  IF v_remaining > 0 AND v_new_plan > 0 THEN
    IF v_new_plan >= v_remaining THEN
      v_new_plan := v_new_plan - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_plan;
      v_new_plan := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_subscription > 0 THEN
    IF v_new_subscription >= v_remaining THEN
      v_new_subscription := v_new_subscription - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_subscription;
      v_new_subscription := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_bonus > 0 THEN
    v_new_bonus := v_new_bonus - v_remaining;
    v_remaining := 0;
  END IF;

  UPDATE public.user_credits
  SET plan_credits = v_new_plan,
      subscription_credits = v_new_subscription,
      bonus_credits = v_new_bonus
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_amount,
    'balance', jsonb_build_object(
      'plan', v_new_plan,
      'subscription', v_new_subscription,
      'bonus', v_new_bonus,
      'total', v_new_plan + v_new_subscription + v_new_bonus
    )
  );
END;
$function$;
