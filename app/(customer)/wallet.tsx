import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Wallet, Clock, CheckCircle2, Gift, Sparkles, Lock, ArrowUpRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import ScratchCardModal, { ScratchCardData } from '../../src/components/ScratchCardModal';
import { supabase } from '../../src/services/supabase';

interface WalletTransaction {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'credited' | 'debited';
  description: string;
  createdAt: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const [balance, setBalance] = useState(0.00);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<Set<string>>(new Set());
  
  // Active modal scratch card
  const [activeModalCard, setActiveModalCard] = useState<ScratchCardData | null>(null);

  const loadWalletData = useCallback(async () => {
    try {
      const balStr = await AsyncStorage.getItem('hotelbet_wallet_balance');
      if (balStr) {
        setBalance(parseFloat(balStr));
      } else {
        setBalance(0.00);
      }

      const txnStr = await AsyncStorage.getItem('hotelbet_wallet_transactions');
      if (txnStr) {
        let txns: WalletTransaction[] = JSON.parse(txnStr);
        // Auto-fix existing stored transactions where used credit was mislabeled as credited
        txns = txns.map(t => {
          if (t.description && t.description.toLowerCase().startsWith('used')) {
            return { ...t, status: 'debited' };
          }
          return t;
        });
        txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(txns);
      } else {
        setTransactions([]);
      }

      const cardsStr = await AsyncStorage.getItem('hotelbet_scratch_cards');
      if (cardsStr) {
        const cards: ScratchCardData[] = JSON.parse(cardsStr);
        cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setScratchCards(cards);
      } else {
        setScratchCards([]);
      }

      // Fetch delivered orders from Supabase DB to unlock scratch cards
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, status');

        if (ordersData) {
          const deliveredSet = new Set(
            ordersData
              .filter(o => o.status === 'delivered')
              .map(o => o.id)
          );
          setDeliveredOrderIds(deliveredSet);
        }
      } catch (dbErr) {
        console.warn('Failed to fetch orders delivery status for wallet:', dbErr);
      }
    } catch (e) {
      console.error('Failed to load wallet data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [loadWalletData])
  );

  const pendingTotal = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + 
           ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const activeCards = scratchCards.filter(c => !c.isScratched);
  const claimedCards = scratchCards.filter(c => c.isScratched);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader 
        title="My Wallet" 
        titleAlign="center" 
        showBackButton={true} 
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Balance Card */}
        <BlurView
          intensity={90}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.balanceCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.iconCircle}>
            <Wallet size={24} color={colors.accentGold} />
          </View>
          <Text style={[styles.balanceLabel, { color: colors.textSub }]}>AVAILABLE BALANCE</Text>
          <Text style={[styles.balanceVal, { color: colors.textMain }]}>₹ {balance.toFixed(2)}</Text>
          {pendingTotal > 0 && (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 6, 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 8,
              borderWidth: 0.5,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              marginTop: 4,
            }}>
              <Clock size={12} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
                ₹{pendingTotal} pending (credited after delivery)
              </Text>
            </View>
          )}
        </BlurView>

        {/* Scratch Cards Section */}
        <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>
          MY SCRATCH CARDS {activeCards.length > 0 ? `(${activeCards.length})` : ''}
        </Text>
        
        {scratchCards.length === 0 ? (
          <View style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 20 }]}>
            <Gift size={28} color={colors.accentGold} style={{ opacity: 0.8, marginBottom: 6 }} />
            <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>No Scratch Cards Yet</Text>
            <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
              Place an order over ₹500 and select a Scratch Card reward to win up to ₹2,000!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {/* Active Unscratched Cards */}
            {activeCards.map((c) => {
              const isUnlocked = deliveredOrderIds.has(c.orderId);

              if (!isUnlocked) {
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      Alert.alert(
                        '🔒 Scratch Card Locked',
                        `This scratch card for Order #${c.orderId.substring(0, 8).toUpperCase()} is locked.\n\nIt will unlock automatically once your food is delivered by the delivery guy!`
                      );
                    }}
                    style={[
                      styles.scratchCardTile,
                      {
                        backgroundColor: 'rgba(212, 175, 55, 0.12)',
                        borderColor: colors.accentGold,
                        borderWidth: 1.2,
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.goldGiftBadge, { backgroundColor: colors.accentGold }]}>
                        <Lock size={18} color="#000000" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900' }}>
                          {c.tierName} Scratch Card
                        </Text>
                        <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                          Unlocks upon doorstep delivery
                        </Text>
                      </View>
                      <View style={[styles.scratchActionPill, { backgroundColor: 'rgba(212, 175, 55, 0.2)', borderColor: colors.accentGold }]}>
                        <Lock size={11} color={colors.accentGold} />
                        <Text style={[styles.scratchActionText, { color: colors.accentGold }]}>LOCKED</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.85}
                  onPress={() => setActiveModalCard(c)}
                  style={[styles.scratchCardTile, { backgroundColor: 'rgba(212, 175, 55, 0.12)', borderColor: colors.accentGold }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.goldGiftBadge}>
                      <Gift size={20} color="#000000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900' }}>
                        {c.tierName} Scratch Card
                      </Text>
                      <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                        Guaranteed ₹{c.minPrize} – ₹{c.maxPrize} Cashback
                      </Text>
                    </View>
                    <View style={styles.scratchActionPill}>
                      <Sparkles size={12} color="#000000" />
                      <Text style={styles.scratchActionText}>SCRATCH</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Claimed Scratched Cards */}
            {claimedCards.map((c) => (
              <View
                key={c.id}
                style={[styles.scratchCardTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: 0.7 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.goldGiftBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <CheckCircle2 size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '800' }}>
                      {c.tierName} Scratch Card
                    </Text>
                    <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2 }}>
                      Scratched · Claimed ₹{c.wonAmount}
                    </Text>
                  </View>
                  <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '900' }}>
                    +₹{c.wonAmount}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Transactions Section */}
        <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>TRANSACTION HISTORY</Text>
        
        {transactions.length === 0 ? (
          <View style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Clock size={28} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>No Transactions Yet</Text>
            <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
              Place an order with a cashback or scratch card reward to see transactions here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {transactions.map((txn) => {
              const isDebited = txn.status === 'debited' || (txn.description && txn.description.toLowerCase().startsWith('used'));
              const isCredited = !isDebited && txn.status === 'credited';
              
              const statusColor = isDebited ? '#EF4444' : isCredited ? '#10B981' : '#F59E0B';
              const statusBg = isDebited ? 'rgba(239, 68, 68, 0.12)' : isCredited ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';
              const statusLabel = isDebited ? 'DEBITED' : isCredited ? 'CREDITED' : 'PENDING';
              const amountPrefix = isDebited ? '-₹' : '+₹';

              return (
                <View 
                  key={txn.id} 
                  style={[styles.txnRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: statusBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isDebited ? (
                        <ArrowUpRight size={16} color="#EF4444" />
                      ) : isCredited ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : (
                        <Clock size={16} color="#F59E0B" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                        {txn.description}
                      </Text>
                      <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2 }}>
                        {formatDate(txn.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ 
                      color: statusColor, 
                      fontSize: 14, 
                      fontWeight: '900' 
                    }}>
                      {amountPrefix}{txn.amount}
                    </Text>
                    <View style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: statusBg,
                      marginTop: 3,
                    }}>
                      <Text style={{ 
                        color: statusColor,
                        fontSize: 8,
                        fontWeight: '900',
                        letterSpacing: 0.5,
                      }}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Interactive Scratch Card Modal */}
      <ScratchCardModal
        visible={activeModalCard !== null}
        card={activeModalCard}
        onClose={() => setActiveModalCard(null)}
        onRewardClaimed={() => {
          loadWalletData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 40,
    gap: 16,
  },
  balanceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: '#D4AF37',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceVal: {
    fontSize: 32,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchCardTile: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  goldGiftBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scratchActionText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
