import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../context/ThemeContext';
import PremiumScratchCard from './PremiumScratchCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ScratchCardData {
  id: string;
  orderId: string;
  tierName: string;
  minPrize: number;
  maxPrize: number;
  wonAmount: number;
  isScratched: boolean;
  createdAt: string;
}

interface ScratchCardModalProps {
  visible: boolean;
  card: ScratchCardData | null;
  onClose: () => void;
  onRewardClaimed: (amount: number) => void;
}

export default function ScratchCardModal({
  visible,
  card,
  onClose,
  onRewardClaimed
}: ScratchCardModalProps) {
  const { isDark } = useAppTheme();
  const [claiming, setClaiming] = useState(false);
  const [showSuccessLottie, setShowSuccessLottie] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setShowSuccessLottie(false);
      setClaiming(false);
    }
  }, [visible]);

  if (!card) return null;

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      // Mark card as scratched in AsyncStorage
      const existingCardsStr = await AsyncStorage.getItem('hotelbet_scratch_cards');
      const cardsList: ScratchCardData[] = existingCardsStr ? JSON.parse(existingCardsStr) : [];
      const updatedCards = cardsList.map((c) => 
        c.id === card.id ? { ...c, isScratched: true, wonAmount: card.wonAmount } : c
      );
      await AsyncStorage.setItem('hotelbet_scratch_cards', JSON.stringify(updatedCards));

      // Add amount to Wallet balance
      const balanceKey = 'hotelbet_wallet_balance';
      const currentBalStr = await AsyncStorage.getItem(balanceKey);
      const currentBal = currentBalStr ? parseFloat(currentBalStr) : 0.00;
      const newBal = currentBal + card.wonAmount;
      await AsyncStorage.setItem(balanceKey, String(newBal));

      // Add to Wallet transactions as CREDITED
      const txnKey = 'hotelbet_wallet_transactions';
      const existingTxnsStr = await AsyncStorage.getItem(txnKey);
      const txns = existingTxnsStr ? JSON.parse(existingTxnsStr) : [];
      txns.push({
        id: `txn_${Date.now()}`,
        orderId: card.orderId,
        amount: card.wonAmount,
        status: 'credited',
        description: `Scratch Card Cashback (${card.tierName})`,
        createdAt: new Date().toISOString()
      });
      await AsyncStorage.setItem(txnKey, JSON.stringify(txns));

      // Display Greentick Lottie animation
      setShowSuccessLottie(true);

      // Close modal and notify parent after playing animation
      setTimeout(() => {
        onRewardClaimed(card.wonAmount);
        onClose();
        setShowSuccessLottie(false);
      }, 1900);
    } catch (e) {
      console.error('Failed to claim scratch card reward:', e);
      setClaiming(false);
    }
  };

  const colors = {
    cardBg: isDark ? 'rgba(18, 18, 14, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    cardBorder: 'rgba(212, 175, 55, 0.4)',
    accentGold: '#D4AF37',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {/* Close Button */}
            {!showSuccessLottie && (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={20} color={colors.textSub} />
              </TouchableOpacity>
            )}

            {showSuccessLottie ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 10 }}>
                <LottieView
                  source={require('../../assets/images/Greentick.lottie')}
                  autoPlay
                  loop={false}
                  style={{ width: 140, height: 140 }}
                />
                <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 }}>
                  Deposited to Wallet Successfully! 🎉
                </Text>
                <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 2 }}>
                  +₹{card.wonAmount} added to your available balance
                </Text>
              </View>
            ) : (
              /* Hyper-Smooth GPay/PhonePe SVG Scratch Engine */
              <PremiumScratchCard
                wonAmount={card.wonAmount}
                tierName={card.tierName}
                minPrize={card.minPrize}
                maxPrize={card.maxPrize}
                isScratched={card.isScratched}
                onClaim={handleClaim}
                claiming={claiming}
              />
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: Math.min(SCREEN_WIDTH - 36, 340),
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
});
