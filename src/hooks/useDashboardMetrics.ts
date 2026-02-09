import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserMetrics {
  id: string;
  user_id: string;
  profile_photo_url: string | null;
  display_name: string | null;
  handle: string | null;
  current_followers: number;
  current_revenue: number;
  current_clients: number;
  initial_followers: number;
  initial_revenue: number;
  initial_clients: number;
  initial_views: number;
  initial_setup_done: boolean;
}

export interface PostAggregates {
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_shares: number;
  total_followers_from_posts: number;
}

export function useDashboardMetrics() {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [postAggregates, setPostAggregates] = useState<PostAggregates>({
    total_posts: 0, total_views: 0, total_likes: 0, total_comments: 0,
    total_saves: 0, total_shares: 0, total_followers_from_posts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch user metrics + posted scripts in parallel
      const [metricsRes, scriptsRes] = await Promise.all([
        supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_scripts').select('views, likes, comments, saves, shares, followers, status').eq('user_id', user.id).eq('status', 'posted'),
      ]);

      if (metricsRes.data) {
        setMetrics(metricsRes.data as unknown as UserMetrics);
      }

      // Aggregate post data
      const posts = scriptsRes.data || [];
      setPostAggregates({
        total_posts: posts.length,
        total_views: posts.reduce((s, p) => s + (p.views || 0), 0),
        total_likes: posts.reduce((s, p) => s + (p.likes || 0), 0),
        total_comments: posts.reduce((s, p) => s + (p.comments || 0), 0),
        total_saves: posts.reduce((s, p) => s + (p.saves || 0), 0),
        total_shares: posts.reduce((s, p) => s + (p.shares || 0), 0),
        total_followers_from_posts: posts.reduce((s, p) => s + (p.followers || 0), 0),
      });
    } catch (err) {
      console.error('Dashboard metrics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const initializeMetrics = useCallback(async (data: {
    display_name?: string; handle?: string; profile_photo_url?: string;
    current_followers: number; current_revenue: number; current_clients: number;
    initial_followers: number; initial_revenue: number; initial_clients: number; initial_views: number;
  }) => {
    if (!user) return;
    const { error } = await supabase.from('user_metrics').upsert({
      user_id: user.id,
      ...data,
      initial_setup_done: true,
    }, { onConflict: 'user_id' });
    if (!error) await fetchAll();
    return error;
  }, [user, fetchAll]);

  const updateManualMetrics = useCallback(async (data: {
    current_followers?: number; current_revenue?: number; current_clients?: number;
    display_name?: string; handle?: string; profile_photo_url?: string;
  }) => {
    if (!user) return;
    const { error } = await supabase.from('user_metrics')
      .update(data)
      .eq('user_id', user.id);
    if (!error) await fetchAll();
    return error;
  }, [user, fetchAll]);

  return {
    metrics,
    postAggregates,
    isLoading,
    refresh: fetchAll,
    initializeMetrics,
    updateManualMetrics,
  };
}
