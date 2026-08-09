import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useToken, MealHistoryItem, expandHistoryWithRefundPairs } from '../context/TokenContext';
import { getCurrentUserIdentity } from '../utils/userSession';

export interface LedgerPassStats {
  planName: string;
  totalTokens: number;
  remainingTokens: number;
  totalSkips: number;
  remainingSkips: number;
}

export function useLedgerData() {
  const tokenContext = useToken();
  const [passStats, setPassStats] = useState<LedgerPassStats>({
    planName: tokenContext.subscriptionPlan || 'No Active Subscription',
    totalTokens: tokenContext.totalTokens || 0,
    remainingTokens: tokenContext.remainingTokens || 0,
    totalSkips: tokenContext.totalSkips || 0,
    remainingSkips: tokenContext.remainingSkips || 0,
  });

  const [historyList, setHistoryList] = useState<MealHistoryItem[]>(expandHistoryWithRefundPairs(tokenContext.mealHistory));
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with tokenContext
  useEffect(() => {
    setPassStats({
      planName: tokenContext.subscriptionPlan,
      totalTokens: tokenContext.totalTokens,
      remainingTokens: tokenContext.remainingTokens,
      totalSkips: tokenContext.totalSkips,
      remainingSkips: tokenContext.remainingSkips,
    });
    setHistoryList(expandHistoryWithRefundPairs(tokenContext.mealHistory));
  }, [
    tokenContext.subscriptionPlan,
    tokenContext.totalTokens,
    tokenContext.remainingTokens,
    tokenContext.totalSkips,
    tokenContext.remainingSkips,
    tokenContext.mealHistory,
  ]);

  const fetchLedgerData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUserIdentity();

      // 1. Fetch Pass Stats for THIS user ONLY
      try {
        const { data: pass } = await supabase
          .from('meal_passes')
          .select('*')
          .eq('user_id', user.userId)
          .eq('status', 'active')
          .maybeSingle();

        if (pass) {
          setPassStats({
            planName: pass.plan_name || 'College Gold Meal Pass',
            totalTokens: pass.total_tokens || 60,
            remainingTokens: pass.remaining_tokens ?? tokenContext.remainingTokens,
            totalSkips: pass.total_skips || 15,
            remainingSkips: pass.remaining_skips ?? tokenContext.remainingSkips,
          });
        } else if (!user.isVip && tokenContext.totalTokens === 0) {
          setPassStats({
            planName: 'No Active Subscription',
            totalTokens: 0,
            remainingTokens: 0,
            totalSkips: 0,
            remainingSkips: 0,
          });
        }
      } catch (e) {}

      // 2. Fetch Meal History Logs for THIS user ONLY
      try {
        const { data: history } = await supabase
          .from('meal_history')
          .select('*')
          .eq('user_id', user.userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (history && history.length > 0) {
          const mappedHistory: MealHistoryItem[] = history.map((h: any) => ({
            id: h.id,
            messName: h.mess_name || 'Partner Mess',
            mealType: h.meal_type || 'Lunch',
            status: h.status || 'completed',
            tokensUsed: h.tokens_used ?? (h.status === 'cancelled' || h.status === 'refunded' ? -1 : h.status === 'skipped' ? 0 : 1),
            date: new Date(h.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
          setHistoryList(expandHistoryWithRefundPairs(mappedHistory));
        } else if (!user.isVip) {
          setHistoryList(expandHistoryWithRefundPairs(tokenContext.mealHistory));
        }
      } catch (e) {
        setHistoryList(expandHistoryWithRefundPairs(tokenContext.mealHistory));
      }
    } catch (e) {
      console.warn('Ledger data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [tokenContext.remainingTokens, tokenContext.remainingSkips, tokenContext.mealHistory, tokenContext.totalTokens]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  return {
    passStats,
    historyList,
    loading,
    refetch: fetchLedgerData,
  };
}
