import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  LayoutChangeEvent
} from 'react-native';
import Svg, { Defs, Mask, Rect, Path, LinearGradient as SvgLinearGradient, Stop as SvgStop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, Zap, Award, CheckCircle2, Trophy, Star } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_SIZE = Math.min(SCREEN_WIDTH - 64, 280);
const STROKE_WIDTH = 54; // Smooth GPay/PhonePe circular eraser width

export interface PremiumScratchCardProps {
  cardSize?: number;
  wonAmount: number;
  tierName: string;
  minPrize: number;
  maxPrize: number;
  isScratched?: boolean;
  onReveal?: () => void;
  onClaim?: () => void;
  claiming?: boolean;
}

export default function PremiumScratchCard({
  cardSize = DEFAULT_CARD_SIZE,
  wonAmount,
  tierName,
  minPrize,
  maxPrize,
  isScratched = false,
  onReveal,
  onClaim,
  claiming = false
}: PremiumScratchCardProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState(isScratched);
  const [scratchPercentage, setScratchPercentage] = useState(isScratched ? 100 : 0);

  const currentPathRef = useRef<string>('');
  const allPathsRef = useRef<string[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const totalScratchedAreaRef = useRef<number>(0);
  const isRevealedRef = useRef<boolean>(isScratched);

  const foilOpacity = useRef(new Animated.Value(isScratched ? 0 : 1)).current;
  const rewardScale = useRef(new Animated.Value(0.95)).current;
  const rewardRotate = useRef(new Animated.Value(0)).current;

  // Trigger full reveal animation
  const triggerAutoReveal = useCallback(() => {
    if (isRevealedRef.current) return;
    isRevealedRef.current = true;
    setIsRevealed(true);
    setScratchPercentage(100);

    // Fade out foil
    Animated.parallel([
      Animated.timing(foilOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(rewardScale, {
        toValue: 1.05,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.spring(rewardScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    });

    if (onReveal) {
      onReveal();
    }
  }, [foilOpacity, rewardScale, onReveal]);

  // Handle PanResponder Gestures with smooth quadratic bezier curve smoothing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRevealedRef.current,
      onMoveShouldSetPanResponder: () => !isRevealedRef.current,

      onPanResponderGrant: (evt) => {
        if (isRevealedRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const startPath = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        currentPathRef.current = startPath;
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentPath(startPath);
      },

      onPanResponderMove: (evt) => {
        if (isRevealedRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        if (!lastPointRef.current) return;

        const prevX = lastPointRef.current.x;
        const prevY = lastPointRef.current.y;
        const dx = locationX - prevX;
        const dy = locationY - prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only draw if move distance > 2px for performance
        if (dist > 2) {
          const midX = (prevX + locationX) / 2;
          const midY = (prevY + locationY) / 2;

          // Smooth quadratic curve segment Q (midX, midY) (locationX, locationY)
          const curveSegment = ` Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current += curveSegment;
          setCurrentPath(currentPathRef.current);

          lastPointRef.current = { x: locationX, y: locationY };

          // Accumulate area estimate
          totalScratchedAreaRef.current += dist * STROKE_WIDTH * 0.45;
          const totalArea = cardSize * cardSize;
          const percentage = Math.min(100, Math.round((totalScratchedAreaRef.current / totalArea) * 100));
          setScratchPercentage(percentage);

          // Threshold auto-reveal (50% coverage)
          if (percentage >= 48) {
            triggerAutoReveal();
          }
        }
      },

      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          allPathsRef.current.push(currentPathRef.current);
          setPaths([...allPathsRef.current]);
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  // Manual Sweep Scratch Action
  const handleQuickSweep = () => {
    if (isRevealedRef.current) return;
    totalScratchedAreaRef.current += cardSize * cardSize * 0.35;
    const percentage = Math.min(100, Math.round((totalScratchedAreaRef.current / (cardSize * cardSize)) * 100));
    setScratchPercentage(percentage);

    if (percentage >= 48) {
      triggerAutoReveal();
    } else {
      // Add diagonal sweep stroke
      const sweepPath = `M 20 20 L ${cardSize - 20} ${cardSize - 20} M 20 ${cardSize - 20} L ${cardSize - 20} 20`;
      allPathsRef.current.push(sweepPath);
      setPaths([...allPathsRef.current]);
    }
  };

  return (
    <View style={[styles.container, { width: cardSize }]}>
      {/* GPay/PhonePe Card Container */}
      <View style={[styles.cardFrame, { width: cardSize, height: cardSize }]}>
        
        {/* UNDERNEATH LAYER: Celebratory Cashback Reward Surface */}
        <Animated.View 
          style={[
            styles.rewardLayer, 
            { transform: [{ scale: rewardScale }] }
          ]}
        >
          <LinearGradient
            colors={['#091A11', '#062E1A', '#081A12']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rewardGradient}
          >
            {/* Background Decorative Rings */}
            <View style={styles.bgRingOuter} />
            <View style={styles.bgRingInner} />

            {/* Reward Icon Badge */}
            <View style={styles.trophyEmblemCircle}>
              <LinearGradient
                colors={['#F5E4A8', '#D4AF37', '#997A15']}
                style={styles.emblemGradient}
              >
                <Zap size={32} color="#000000" />
              </LinearGradient>
            </View>

            {/* Reward Copy */}
            <Text style={styles.congratsBadgeText}>CONGRATULATIONS!</Text>
            <Text style={styles.cashbackAmountText}>₹{wonAmount}</Text>
            <Text style={styles.cashbackSubtext}>CASHBACK UNLOCKED</Text>
            <View style={styles.walletPillTextWrapper}>
              <Text style={styles.walletPillText}>Instant credit to your Wallet balance</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* FOIL TOP OVERLAY LAYER (SVG Masked Continuous Path Eraser) */}
        {!isScratched && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.foilContainer,
              { opacity: foilOpacity }
            ]}
          >
            <Svg width={cardSize} height={cardSize} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Dynamic Scratch Mask */}
                <Mask id="scratchMask" x="0" y="0" width={cardSize} height={cardSize}>
                  {/* White background: Foil visible */}
                  <Rect x="0" y="0" width={cardSize} height={cardSize} fill="white" />
                  
                  {/* Black paths: Foil erased continuously */}
                  {paths.map((p, index) => (
                    <Path
                      key={index}
                      d={p}
                      stroke="black"
                      strokeWidth={STROKE_WIDTH}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                  {currentPath ? (
                    <Path
                      d={currentPath}
                      stroke="black"
                      strokeWidth={STROKE_WIDTH}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null}
                </Mask>

                {/* Metallic Emerald Liquid Foil Gradient */}
                <SvgLinearGradient id="metallicGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <SvgStop offset="0%" stopColor="#A7F3D0" />
                  <SvgStop offset="25%" stopColor="#34D399" />
                  <SvgStop offset="50%" stopColor="#10B981" />
                  <SvgStop offset="75%" stopColor="#059669" />
                  <SvgStop offset="100%" stopColor="#6EE7B7" />
                </SvgLinearGradient>
              </Defs>

              {/* Render Metallic Emerald Cover Card with Mask Applied */}
              <Rect
                x="0"
                y="0"
                width={cardSize}
                height={cardSize}
                fill="url(#metallicGold)"
                mask="url(#scratchMask)"
                rx={24}
                ry={24}
              />
            </Svg>

            {/* Liquid Glass Overlay Overlay Hint (Fades out smoothly as scratched) */}
            {scratchPercentage < 40 && (
              <View style={styles.foilContentCenter} pointerEvents="none">
                <View style={styles.glassIconCircle}>
                  <Gift size={32} color="#06402B" />
                </View>
                <Text style={styles.foilTitleText}>SCRATCH HERE</Text>
                <Text style={styles.foilSubtext}>Rub finger in smooth circular motion</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Action Buttons Below Card */}
      {!isRevealed ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleQuickSweep}
          style={styles.sweepBtn}
        >
          <Zap size={16} color="#000000" />
          <Text style={styles.sweepBtnText}>
            SCRATCH FASTER ({scratchPercentage}%)
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onClaim}
          disabled={claiming}
          style={styles.claimRewardBtn}
        >
          <CheckCircle2 size={18} color="#000000" />
          <Text style={styles.claimRewardBtnText}>
            {claiming ? 'CREDITING WALLET...' : `CLAIM ₹${wonAmount} TO WALLET`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  cardFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
    backgroundColor: '#041C14',
  },
  rewardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rewardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
  },
  bgRingOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  bgRingInner: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  trophyEmblemCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    marginBottom: 10,
  },
  emblemGradient: {
    flex: 1,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  congratsBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cashbackAmountText: {
    color: '#10B981',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  cashbackSubtext: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  walletPillTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 8,
  },
  walletPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  foilContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foilContentCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 16,
  },
  glassIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  foilTitleText: {
    color: '#06402B',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  foilSubtext: {
    color: '#042E20',
    fontSize: 11,
    fontWeight: '700',
  },
  sweepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#10B981',
  },
  sweepBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  claimRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#10B981',
  },
  claimRewardBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
