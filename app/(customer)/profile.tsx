import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  ShieldCheck,
  Award,
  LogOut,
  Utensils,
  Sun,
  Moon,
  HelpCircle,
  ChevronRight,
  Zap,
  Bell,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDescope, useSession } from '@descope/react-native-sdk';
import { supabase } from '../../src/services/supabase';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';

export default function ProfileScreen() {
  const router = useRouter();
  const sdk = useDescope();
  const { session, manageSession } = useSession();
  const { isDark, toggleTheme } = useAppTheme();
  const { subscriptionPlan, totalTokens, streakDays } = useToken();

  const [dietaryPref, setDietaryPref] = useState<'Veg Only' | 'Non-Veg & Veg'>('Veg Only');
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const doLogout = async () => {
    try {
      await AsyncStorage.setItem('explicit_logout', 'true');
      await AsyncStorage.removeItem('vip_session_active');
      await AsyncStorage.removeItem('demo_role');
      await AsyncStorage.removeItem('user_selected_role');
      try { await sdk.logout(); } catch (e) {}
      try { await manageSession(undefined); } catch (e) {}
      try { await supabase.auth.signOut(); } catch (e) {}
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.replace('/(auth)/login');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Student Profile" titleAlign="center" showBackButton={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Identity & VIP Pass Card */}
        <AnimatedEntrance direction="down">
          <LinearGradient
            colors={isDark ? ['#0F241C', '#061712'] : ['#ECFDF5', '#D1FAE5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeaderCard}
          >
            <View style={styles.avatarCircle}>
              <User size={36} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userName}>{session?.user?.name || 'Alex Student'}</Text>
                <ShieldCheck size={16} color="#10B981" />
              </View>
              <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                Phone: <Text style={{ color: colors.textMain, fontWeight: '700' }}>{session?.user?.phone || '+91 98765 43210'}</Text>
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 1 }}>
                College ID: 2026-CS-409
              </Text>
              <View style={styles.planBadge}>
                <Zap size={10} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>
                  {subscriptionPlan}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </AnimatedEntrance>

        {/* Dietary Preference Filter Selection */}
        <AnimatedEntrance direction="up" delay={100}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Dietary Preference</Text>
          <View style={[styles.settingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Utensils size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.textMain }]}>Meal Type Filter</Text>
                <Text style={{ fontSize: 11, color: colors.textSub }}>Filter mess menus by preference</Text>
              </View>
            </View>

            <View style={styles.prefToggleRow}>
              <TouchableOpacity
                style={[
                  styles.prefChip,
                  dietaryPref === 'Veg Only' && { backgroundColor: '#10B981', borderColor: '#10B981' },
                ]}
                onPress={() => setDietaryPref('Veg Only')}
              >
                <Text
                  style={[
                    styles.prefChipText,
                    { color: dietaryPref === 'Veg Only' ? '#FFFFFF' : colors.textMain },
                  ]}
                >
                  Pure Veg Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.prefChip,
                  dietaryPref === 'Non-Veg & Veg' && { backgroundColor: '#10B981', borderColor: '#10B981' },
                ]}
                onPress={() => setDietaryPref('Non-Veg & Veg')}
              >
                <Text
                  style={[
                    styles.prefChipText,
                    { color: dietaryPref === 'Non-Veg & Veg' ? '#FFFFFF' : colors.textMain },
                  ]}
                >
                  All (Veg & Non-Veg)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedEntrance>

        {/* Preferences & App Settings */}
        <AnimatedEntrance direction="up" delay={150}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>App Settings</Text>
          <View style={[styles.settingGroup, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isDark ? <Sun size={20} color="#10B981" /> : <Moon size={20} color="#10B981" />}
                <Text style={[styles.rowText, { color: colors.textMain }]}>Dark Mode</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#94A3B8', true: '#10B981' }} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Bell size={20} color="#10B981" />
                <Text style={[styles.rowText, { color: colors.textMain }]}>Cutoff Notifications</Text>
              </View>
              <Switch
                value={allowNotifications}
                onValueChange={setAllowNotifications}
                trackColor={{ false: '#94A3B8', true: '#10B981' }}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/(customer)/support')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <HelpCircle size={20} color="#10B981" />
                <Text style={[styles.rowText, { color: colors.textMain }]}>Help & Campus Support</Text>
              </View>
              <ChevronRight size={18} color={colors.textSub} />
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* Sign Out Button */}
        <AnimatedEntrance direction="up" delay={200}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out of Meal Pass</Text>
          </TouchableOpacity>
        </AnimatedEntrance>
      </ScrollView>

      {/* ================= THEMED LOGOUT CONFIRMATION MODAL ================= */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={modalStyles.overlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={modalStyles.cardWrapper}>
            <View style={[modalStyles.card, { backgroundColor: isDark ? '#0D1412' : '#FFFFFF', borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)' }]}>
              {/* Icon Circle */}
              <View style={modalStyles.iconCircle}>
                <LogOut size={28} color="#EF4444" />
              </View>

              {/* Title & Subtitle */}
              <Text style={[modalStyles.title, { color: colors.textMain }]}>Sign Out of Meal Pass?</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>
                Are you sure you want to sign out? You will need to log back in to access your meal pass & active bookings.
              </Text>

              {/* Actions Row */}
              <View style={modalStyles.btnRow}>
                <TouchableOpacity
                  style={[modalStyles.cancelBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[modalStyles.cancelBtnText, { color: colors.textMain }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={modalStyles.confirmBtn}
                  onPress={() => {
                    setShowLogoutModal(false);
                    doLogout();
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={modalStyles.confirmGrad}
                  >
                    <LogOut size={16} color="#FFFFFF" />
                    <Text style={modalStyles.confirmBtnText}>Sign Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      <CustomerBottomBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 104,
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 16,
  },
  profileHeaderCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  settingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  prefToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  settingGroup: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
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
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
