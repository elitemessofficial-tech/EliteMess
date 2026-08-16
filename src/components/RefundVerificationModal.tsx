import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import {
  Utensils,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  X,
  Zap,
  ArrowRight,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { BookingDetails } from '../context/TokenContext';

interface RefundVerificationModalProps {
  visible: boolean;
  activeBooking: BookingDetails | null;
  onClose: () => void;
  onConfirmRefund: () => Promise<{ success: boolean; message: string; reason?: string }>;
}

type RefundStage = 'confirm' | 'checking' | 'success' | 'error';

export default function RefundVerificationModal({
  visible,
  activeBooking,
  onClose,
  onConfirmRefund,
}: RefundVerificationModalProps) {
  const { isDark } = useAppTheme();
  const [stage, setStage] = useState<RefundStage>('confirm');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  useEffect(() => {
    if (visible) {
      setStage('confirm');
      setStatusMessage('');
    }
  }, [visible]);

  const handleStartVerification = async () => {
    setStage('checking');
    setStatusMessage('Checking with Mess Ledger if OTP has been redeemed...');

    // Natural verification time (between 2.2s and 4.2s) as requested
    const randomDelay = 2200 + Math.floor(Math.random() * 2000);

    const [refundResult] = await Promise.all([
      onConfirmRefund(),
      new Promise((resolve) => setTimeout(resolve, randomDelay)),
    ]);

    if (refundResult.success) {
      setStatusMessage(refundResult.message || '1 Meal Token refunded successfully.');
      setStage('success');
    } else {
      setStatusMessage(
        refundResult.message ||
          'This OTP has already been redeemed and verified by the Mess Owner. Token cannot be refunded.'
      );
      setStage('error');
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.modalCard}>
          {/* Top Close Button (only on confirm or terminal states) */}
          {stage !== 'checking' && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={16} color={colors.textSub} />
            </TouchableOpacity>
          )}

          {/* ============================================================ */}
          {/* STAGE 1: CONFIRMATION & PRE-CHECK NOTICE                     */}
          {/* ============================================================ */}
          {stage === 'confirm' && (
            <View style={styles.contentContainer}>
              <LottieView
                source={require('../../assets/images/wrong.json')}
                autoPlay
                loop
                style={styles.lottieIcon}
              />

              <Text style={[styles.title, { color: colors.textMain }]}>Cancel Meal Booking?</Text>
              <Text style={[styles.subtitle, { color: colors.textSub }]}>
                First, we will verify with the Mess Ledger to check whether your OTP has been redeemed by the owner before processing your refund.
              </Text>

              {activeBooking && (
                <View style={[styles.summaryBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.cardBorder }]}>
                  <View style={styles.summaryRow}>
                    <Utensils size={14} color="#10B981" />
                    <Text style={[styles.summaryText, { color: colors.textMain }]} numberOfLines={1}>
                      {activeBooking.messName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <ShieldCheck size={14} color="#10B981" />
                    <Text style={[styles.summaryText, { color: colors.textSub }]}>
                      OTP: <Text style={{ color: '#10B981', fontWeight: '800' }}>{activeBooking.otp}</Text> • {activeBooking.mealType}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStartVerification}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGrad}
                >
                  <Text style={styles.primaryBtnText}>Check & Refund 1 Token</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={[styles.secondaryBtnText, { color: colors.textMain }]}>Keep My Booking</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: LIVE CHECKING WITH MESS LEDGER                      */}
          {/* ============================================================ */}
          {stage === 'checking' && (
            <View style={styles.contentContainer}>
              <View style={styles.checkingSpinnerWrapper}>
                <ActivityIndicator size="large" color="#10B981" />
                <View style={styles.pulseRing} />
              </View>

              <Text style={[styles.title, { color: colors.textMain }]}>Checking Mess Ledger...</Text>
              <Text style={[styles.subtitle, { color: colors.textSub }]}>
                {statusMessage}
              </Text>

              <View style={styles.verificationBadge}>
                <Zap size={14} color="#10B981" />
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>
                  Checking OTP #{activeBooking?.otp || ''} on Neon Ledger
                </Text>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* STAGE 3A: ERROR (OTP ALREADY REDEEMED BY OWNER)              */}
          {/* ============================================================ */}
          {stage === 'error' && (
            <View style={styles.contentContainer}>
              <View style={styles.errorIconBox}>
                <AlertOctagon size={42} color="#EF4444" />
              </View>

              <Text style={[styles.title, { color: '#EF4444' }]}>Refund Denied</Text>
              <Text style={[styles.subtitle, { color: colors.textMain, fontWeight: '700' }]}>
                OTP Already Used by Mess Owner
              </Text>
              <Text style={[styles.errorDesc, { color: colors.textSub }]}>
                {statusMessage}
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onClose}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#334155', '#1E293B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGrad}
                >
                  <Text style={styles.primaryBtnText}>Understood</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* STAGE 3B: SUCCESS (REFUNDED WITH TICK.LOTTIE)                */}
          {/* ============================================================ */}
          {stage === 'success' && (
            <View style={styles.contentContainer}>
              <LottieView
                source={require('../../assets/images/Greentick.json')}
                autoPlay
                loop={false}
                style={styles.lottieIcon}
              />

              <Text style={[styles.title, { color: '#10B981' }]}>Token Refunded Successfully! 🎉</Text>
              <Text style={[styles.subtitle, { color: colors.textSub }]}>
                1 Meal Token has been credited back to your active pass balance.
              </Text>

              <View style={styles.creditPill}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.creditPillText}>+1 Meal Token Credited</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onClose}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGrad}
                >
                  <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 24,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  contentContainer: {
    alignItems: 'center',
    textAlign: 'center',
  },
  lottieIcon: {
    width: 85,
    height: 85,
    marginBottom: 10,
  },
  checkingSpinnerWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  errorIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  errorDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  summaryBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 20,
  },
  creditPillText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  primaryBtnGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
