import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { CleoStatus } from '../types';

const AVATAR_URI = 'https://charbot.org/unnamed.jpg';

export default function Avatar({ status }: { status: CleoStatus }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const sway  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation(); sway.stopAnimation();
    if (status === 'thinking' || status === 'speaking') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
      ])).start();
    } else if (status === 'listening') {
      Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: 6,  duration: 600, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -6, duration: 600, useNativeDriver: true }),
      ])).start();
    } else {
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(sway,  { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [status]);

  const borderColor =
    status === 'thinking' ? '#FF6B00' :
    status === 'listening' ? '#FF2020' :
    status === 'speaking'  ? '#fff' :
    'rgba(255,255,255,0.3)';

  return (
    <Animated.View style={[
      styles.border,
      { borderColor, transform: [{ scale: pulse }, { translateX: sway }] },
    ]}>
      <Image source={{ uri: AVATAR_URI }} style={styles.img} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  border: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
});
