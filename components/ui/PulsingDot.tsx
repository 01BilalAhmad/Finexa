import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface PulsingDotProps {
  color: string;
  size?: number;
  style?: ViewStyle;
}

export function PulsingDot({ color, size = 8, style }: PulsingDotProps) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.8, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      { transform: [{ scale: anim }] },
      style,
    ]} />
  );
}
