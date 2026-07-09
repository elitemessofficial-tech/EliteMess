import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function AnimatedEntrance({
  children,
  delay = 0,
  duration = 400,
  style,
}: AnimatedEntranceProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
