import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard,
  KeyRound,
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';

export type OwnerTabType = 'overview' | 'verify' | 'menu' | 'log';

interface OwnerBottomBarProps {
  activeTab: OwnerTabType;
  onTabChange: (tab: OwnerTabType) => void;
  pendingCount?: number;
}

export default function OwnerBottomBar({
  activeTab,
  onTabChange,
  pendingCount = 0,
}: OwnerBottomBarProps) {
  const { isDark } = useAppTheme();

  const navColors = {
    barBg: isDark ? 'rgba(12, 18, 16, 0.94)' : 'rgba(255, 255, 255, 0.94)',
    border: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(226, 232, 240, 0.8)',
    active: '#10B981',
    inactive: isDark ? '#94A3B8' : '#64748B',
  };

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <BlurView
        intensity={95}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.navbarContainer,
          {
            backgroundColor: navColors.barBg,
            borderColor: navColors.border,
          },
        ]}
      >
        <View style={styles.tabsRow}>
          {/* 1. Overview Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('overview')}
            activeOpacity={0.7}
          >
            <LayoutDashboard
              size={20}
              color={activeTab === 'overview' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'overview' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'overview' ? navColors.active : navColors.inactive },
                activeTab === 'overview' && styles.tabLabelActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          {/* 2. Keypad / Verify Center Hero Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('verify')}
            activeOpacity={0.8}
          >
            <View style={styles.centerHeroBtnWrapper}>
              <LinearGradient
                colors={activeTab === 'verify' ? ['#10B981', '#059669'] : ['#1E293B', '#0F172A']}
                style={[
                  styles.centerHeroGrad,
                  activeTab === 'verify' && styles.centerHeroActiveBorder,
                ]}
              >
                <KeyRound size={20} color="#FFFFFF" strokeWidth={2.2} />
              </LinearGradient>
              {pendingCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'verify' ? navColors.active : navColors.inactive },
                activeTab === 'verify' && styles.tabLabelActive,
              ]}
            >
              Verify OTP
            </Text>
          </TouchableOpacity>

          {/* 3. Menu & Cutoff Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('menu')}
            activeOpacity={0.7}
          >
            <UtensilsCrossed
              size={20}
              color={activeTab === 'menu' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'menu' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'menu' ? navColors.active : navColors.inactive },
                activeTab === 'menu' && styles.tabLabelActive,
              ]}
            >
              Daily Menu
            </Text>
          </TouchableOpacity>

          {/* 4. Dining Log Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('log')}
            activeOpacity={0.7}
          >
            <ClipboardList
              size={20}
              color={activeTab === 'log' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'log' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'log' ? navColors.active : navColors.inactive },
                activeTab === 'log' && styles.tabLabelActive,
              ]}
            >
              Dining Log
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  navbarContainer: {
    width: '100%',
    maxWidth: 440,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabelActive: {
    fontWeight: '900',
  },
  centerHeroBtnWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  centerHeroGrad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerHeroActiveBorder: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#080C0E',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
