import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Zap,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'zap' | 'lock' | 'clock' | 'alert' | 'check' | 'skip';
  confirmText?: string;
  cancelText?: string;
  confirmGradient?: string[];
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  icon = 'zap',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmGradient = ['#10B981', '#059669'],
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { isDark } = useAppTheme();

  if (!visible) return null;

  const renderIcon = () => {
    switch (icon) {
      case 'lock':
        return <Lock size={26} color="#10B981" />;
      case 'clock':
      case 'skip':
        return <Clock size={26} color="#10B981" />;
      case 'alert':
        return <AlertTriangle size={26} color="#F59E0B" />;
      case 'check':
        return <CheckCircle2 size={26} color="#10B981" />;
      default:
        return <Zap size={26} color="#10B981" />;
    }
  };

  const colors = {
    cardBg: isDark ? '#0F1A17' : '#FFFFFF',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    cancelBg: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
    cancelBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} style={styles.cardWrapper}>
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.borderColor }]}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
              <X size={18} color={colors.textSub} />
            </TouchableOpacity>

            {/* Icon Header */}
            <View style={styles.iconCircle}>
              {renderIcon()}
            </View>

            {/* Title & Message */}
            <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSub }]}>{message}</Text>

            {/* Buttons Row / Column */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
                onPress={onConfirm}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={confirmGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtnGrad}
                >
                  <Text style={styles.confirmBtnText}>
                    {loading ? 'Processing...' : confirmText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.cancelBg, borderColor: colors.cancelBorder }]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMain }]}>{cancelText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 300,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
