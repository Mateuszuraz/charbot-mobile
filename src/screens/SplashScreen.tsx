import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = { onDone: () => void };

export default function SplashScreen({ onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(lineWidth, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]),
      Animated.delay(1000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.title}>CHARBOT</Text>
        <Animated.View
          style={[
            styles.line,
            { width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
        <Text style={styles.sub}>CLEO // AI COMPANION</Text>
      </Animated.View>
      <Text style={styles.version}>v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center',
  },
  content:  { alignItems: 'center', gap: 14 },
  title: {
    fontFamily: 'SpaceMono', fontSize: 32,
    color: '#fff', letterSpacing: 10, textAlign: 'center',
  },
  line: {
    height: 1, backgroundColor: '#FF6B00', alignSelf: 'center',
  },
  sub: {
    fontFamily: 'SpaceMono', fontSize: 10,
    color: 'rgba(255,255,255,0.35)', letterSpacing: 4, textAlign: 'center',
  },
  version: {
    position: 'absolute', bottom: 40,
    fontFamily: 'SpaceMono', fontSize: 8,
    color: 'rgba(255,255,255,0.15)', letterSpacing: 2,
  },
});
