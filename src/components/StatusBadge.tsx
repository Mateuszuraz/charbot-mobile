import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CleoStatus } from '../types';

type Props = { status: CleoStatus; isOnline: boolean };

const LABELS: Record<CleoStatus, string> = {
  idle:      '',
  listening: 'LISTENING...',
  thinking:  'THINKING...',
  speaking:  'SPEAKING...',
};

export default function StatusBadge({ status, isOnline }: Props) {
  const label = LABELS[status] || (isOnline ? 'ONLINE' : 'OFFLINE');
  const dotColor = status !== 'idle'
    ? '#facc15'
    : isOnline ? '#4ade80' : '#6b7280';

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot:  { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },
});
