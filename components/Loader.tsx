import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoaderProps {
  color?: string;
}

const Loader = ({ color = '#10B981' }: LoaderProps) => {
  const anim1 = useRef(new Animated.Value(1)).current;
  const anim2 = useRef(new Animated.Value(1)).current;
  const anim3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1.6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 1.0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );
    };

    const a1 = createAnimation(anim1, 0);
    const a2 = createAnimation(anim2, 150);
    const a3 = createAnimation(anim3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim1 }] }]} />
        <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim2 }] }]} />
        <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim3 }] }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    width: '100%',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  bar: {
    width: 6,
    height: 20,
    borderRadius: 3,
  },
});

export default Loader;
