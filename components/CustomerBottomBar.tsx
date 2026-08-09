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
import { Home, CalendarCheck2, UtensilsCrossed, Wallet, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../src/context/ThemeContext';

export type CustomerTabType = 'dashboard' | 'discover' | 'shortlist' | 'bookings' | 'wallet' | 'profile' | 'home' | 'menu' | 'cart' | 'account' | 'favorites';

interface CustomerBottomBarProps {
  activeTab: CustomerTabType;
}

export default function CustomerBottomBar({ activeTab }: CustomerBottomBarProps) {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const navColors = {
    barBg: isDark ? 'rgba(12, 18, 16, 0.94)' : 'rgba(255, 255, 255, 0.94)',
    border: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(226, 232, 240, 0.8)',
    cutoutBg: isDark ? '#080C0E' : '#F8FAFC',
    active: '#10B981',
    inactive: isDark ? '#94A3B8' : '#64748B',
  };

  const handleNavigation = (tab: CustomerTabType) => {
    if (tab === activeTab) return;
    switch (tab) {
      case 'dashboard':
        router.replace('/(customer)/dashboard');
        break;
      case 'bookings':
        router.replace('/(customer)/bookings');
        break;
      case 'discover':
        router.replace('/(customer)/discover');
        break;
      case 'wallet':
        router.replace('/(customer)/wallet');
        break;
      case 'profile':
        router.replace('/(customer)/profile');
        break;
    }
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
          {/* 1. Dashboard / Pass Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleNavigation('dashboard')}
            activeOpacity={0.7}
          >
            <Home
              size={22}
              color={activeTab === 'dashboard' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'dashboard' ? navColors.active : navColors.inactive },
                activeTab === 'dashboard' && styles.tabLabelActive,
              ]}
            >
              Pass
            </Text>
          </TouchableOpacity>

          {/* 2. Bookings Tab (replaced Decision Room) */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleNavigation('bookings')}
            activeOpacity={0.7}
          >
            <CalendarCheck2
              size={22}
              color={activeTab === 'bookings' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'bookings' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'bookings' ? navColors.active : navColors.inactive },
                activeTab === 'bookings' && styles.tabLabelActive,
              ]}
            >
              Bookings
            </Text>
          </TouchableOpacity>

          {/* 3. Center Elevated Floating Button — Discover (moved to center) */}
          <View style={styles.centerButtonWrapper}>
            <View style={[styles.cutoutRing, { backgroundColor: navColors.cutoutBg }]}>
              <TouchableOpacity
                onPress={() => handleNavigation('discover')}
                activeOpacity={0.88}
                style={styles.cartTouchCircle}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cartGradientCircle}
                >
                  <UtensilsCrossed size={22} color="#FFFFFF" strokeWidth={2.2} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Wallet / Ledger Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleNavigation('wallet')}
            activeOpacity={0.7}
          >
            <Wallet
              size={22}
              color={activeTab === 'wallet' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'wallet' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'wallet' ? navColors.active : navColors.inactive },
                activeTab === 'wallet' && styles.tabLabelActive,
              ]}
            >
              Ledger
            </Text>
          </TouchableOpacity>

          {/* 5. Profile Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleNavigation('profile')}
            activeOpacity={0.7}
          >
            <User
              size={22}
              color={activeTab === 'profile' ? navColors.active : navColors.inactive}
              strokeWidth={activeTab === 'profile' ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'profile' ? navColors.active : navColors.inactive },
                activeTab === 'profile' && styles.tabLabelActive,
              ]}
            >
              Profile
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
    zIndex: 9999,
    alignItems: 'center',
  },
  navbarContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  centerButtonWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  cutoutRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  cartTouchCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  cartGradientCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
