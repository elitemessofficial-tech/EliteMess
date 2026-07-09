import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';

interface FloatingHeaderProps {
  title?: string;
  subtitle?: string;
  titleAlign?: 'left' | 'center';
  showBackButton?: boolean;
  rightContent?: React.ReactNode;
  leftContent?: React.ReactNode;
  blurTarget?: React.RefObject<any>;
}

export default function FloatingHeader({
  title,
  subtitle,
  titleAlign = 'left',
  showBackButton = false,
  rightContent,
  leftContent,
  blurTarget,
}: FloatingHeaderProps) {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const theme = {
    bg: isDark ? 'rgba(15, 15, 12, 0.45)' : 'rgba(255, 255, 255, 0.45)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    text: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
  };

  const topOffset = Platform.OS === 'ios'
    ? 48
    : Platform.OS === 'android'
      ? (StatusBar.currentHeight || 38)
      : 16;
  const isCentered = titleAlign === 'center';

  const renderContent = () => (
    <View style={[styles.innerContainer, { borderColor: theme.border }]}>
      <View style={styles.contentRow}>
        {leftContent ? (
          leftContent
        ) : showBackButton ? (
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(customer)/branches');
              }
            }}
            style={[
              styles.backCircle,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)'
              }
            ]}
          >
            <ChevronLeft size={16} color={theme.accentGold} />
          </TouchableOpacity>
        ) : (
          isCentered && <View style={{ width: 36 }} />
        )}

        {isCentered && (
          <View style={styles.titleContainerAbsolute}>
            {title ? (
              <Text numberOfLines={1} style={[styles.titleText, { color: theme.text }]}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitleText, { color: theme.textSub }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}

        {!isCentered && (
          <View style={styles.titleContainer}>
            {title ? (
              <Text numberOfLines={1} style={[styles.titleText, { color: theme.text }]}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitleText, { color: theme.textSub }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.rightContainer}>
          {rightContent || (isCentered ? <View style={{ width: 36 }} /> : null)}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.outerContainer, { top: topOffset }]}>
      <BlurView
        intensity={75}
        tint={isDark ? 'dark' : 'light'}
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={[
          styles.blurContainer,
          {
            backgroundColor: isDark ? 'rgba(15, 15, 12, 0.35)' : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 1,
            borderColor: theme.border
          }
        ]}
      >
        {renderContent()}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  solidContainer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  innerContainer: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: '100%',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 4,
  },
  titleContainerAbsolute: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Keep above backdrop blur for visibility
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
