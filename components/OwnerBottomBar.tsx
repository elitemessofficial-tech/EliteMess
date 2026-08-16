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
  QrCode,
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
    cutoutBg: isDark ? '#080C0E' : '#F8FAFC',
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
              size={21}
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

          {/* 2. Center Elevated Floating QR Scanner Tab */}
          <View style={styles.centerButtonWrapper}>
            <View style={[styles.cutoutRing, { backgroundColor: navColors.cutoutBg }]}>
              <TouchableOpacity
                onPress={() => onTabChange('verify')}
                activeOpacity={0.88}
                style={styles.qrTouchCircle}
              >
                <LinearGradient
                  colors={activeTab === 'verify' ? ['#10B981', '#047857'] : ['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.qrGradientCircle,
                    activeTab === 'verify' && styles.qrGradientActive,
                  ]}
                >
                  <QrCode size={22} color="#FFFFFF" strokeWidth={2.4} />
                </LinearGradient>
                {pendingCount > 0 && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.centerTabLabel,
                { color: activeTab === 'verify' ? navColors.active : navColors.inactive },
                activeTab === 'verify' && styles.tabLabelActive,
              ]}
            >
              Scan QR
            </Text>
          </View>

          {/* 3. Daily Dish Menu Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('menu')}
            activeOpacity={0.7}
          >
            <UtensilsCrossed
              size={21}
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
              Dish Menu
            </Text>
          </TouchableOpacity>

          {/* 4. Dining Log Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabChange('log')}
            activeOpacity={0.7}
          >
            <ClipboardList
              size={21}
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
    overflow: 'visible',
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
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: -20,
  },
  cutoutRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  qrTouchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrGradientCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  qrGradientActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  badgePill: {
    position: 'absolute',
    top: -2,
    right: -2,
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
