import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard,
  Wallet,
  Utensils,
  Users,
  Headphones,
} from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';

export type AdminTabType = 'telemetry' | 'payouts' | 'messes' | 'owners' | 'support';

interface AdminBottomBarProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  pendingPayoutsCount?: number;
  openSupportCount?: number;
}

export default function AdminBottomBar({
  activeTab,
  onTabChange,
  pendingPayoutsCount = 0,
  openSupportCount = 0,
}: AdminBottomBarProps) {
  const { isDark } = useAppTheme();

  const colors = {
    bg: isDark ? 'rgba(8, 12, 14, 0.94)' : 'rgba(255, 255, 255, 0.98)',
    border: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
    activeTint: '#10B981',
    inactiveTint: isDark ? '#64748B' : '#475569',
    textActive: isDark ? '#FFFFFF' : '#000000',
    gold: '#F59E0B',
  };

  const navItems: { id: AdminTabType; label: string; icon: any; badge?: number }[] = [
    { id: 'telemetry', label: 'Overview', icon: LayoutDashboard },
    { id: 'payouts', label: 'Payouts', icon: Wallet, badge: pendingPayoutsCount },
    { id: 'messes', label: 'Messes', icon: Utensils },
    { id: 'owners', label: 'Owners', icon: Users },
    { id: 'support', label: 'Support', icon: Headphones, badge: openSupportCount },
  ];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={[styles.barContainer, { borderColor: colors.border }]}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tabButton}
              onPress={() => onTabChange(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {isActive ? (
                  <View style={styles.activeIconCircle}>
                    <IconComponent size={18} color="#10B981" />
                  </View>
                ) : (
                  <IconComponent size={18} color={colors.inactiveTint} />
                )}

                {item.badge && item.badge > 0 ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.textActive : colors.inactiveTint },
                  isActive && { fontWeight: '900' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 12,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 500,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: '100%',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconCircle: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 6,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
