import { useState, useEffect, useCallback } from 'react';
import { useToken, MealHistoryItem, expandHistoryWithRefundPairs } from '../context/TokenContext';
import { getCurrentUserIdentity } from '../utils/userSession';
import { getMealPassFromNeon, getMealHistoryFromNeon } from '../services/neon';

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

      // 1. Fetch Pass Stats from Neon DB
      try {
        const pass = await getMealPassFromNeon(user.userId);

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

      // 2. Fetch Meal History Logs from Neon DB
      try {
        const history = await getMealHistoryFromNeon(user.userId);

        if (history && history.length > 0) {
          const mappedHistory: MealHistoryItem[] = history.map((h) => ({
            id: h.id,
            messName: h.mess_name || 'Partner Mess',
            mealType: (h.meal_type as any) || 'Lunch',
            status: (h.status as any) || 'completed',
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
