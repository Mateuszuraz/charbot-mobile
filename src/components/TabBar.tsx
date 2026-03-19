import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tab } from '../types';

const TABS: { id: Tab; icon: string }[] = [
  { id: 'chat',    icon: '💬' },
  { id: 'archive', icon: '🕐' },
  { id: 'ascii',   icon: '🎨' },
  { id: 'profile', icon: '👤' },
];

export default function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <View style={styles.bar}>
      {TABS.map(t => (
        <TouchableOpacity key={t.id} style={styles.tab} onPress={() => onTabChange(t.id)}>
          <Text style={[styles.icon, t.id === 'ascii' && styles.iconAscii]}>{t.icon}</Text>
          <View style={[styles.dot, activeTab === t.id && styles.dotActive]} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar:       { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0a0a0a' },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  icon:      { fontSize: 20 },
  dot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: '#FF6B00' },
});
