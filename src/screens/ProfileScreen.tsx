import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { loadSessions, loadHistory, clearHistory } from '../services/storage';

type Stat = { label: string; value: string; unit?: string };

export default function ProfileScreen() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [cleared, setCleared] = useState(false);

  const loadStats = async () => {
    const [sessions, history] = await Promise.all([loadSessions(), loadHistory()]);
    const totalMsg = sessions.reduce((a, s) => a + s.messages.length, 0);
    const avgMsgPerSession = sessions.length > 0
      ? Math.round(totalMsg / sessions.length)
      : 0;

    // Calculate avg response time from history (estimate based on timestamps)
    let avgResponseSec = 0;
    const cleoMsgs = history.filter(m => m.role === 'cleo');
    const userMsgs = history.filter(m => m.role === 'user');
    if (cleoMsgs.length > 0 && userMsgs.length > 0) {
      const diffs: number[] = [];
      for (let i = 0; i < Math.min(cleoMsgs.length, userMsgs.length); i++) {
        const diff = (cleoMsgs[i].timestamp - (userMsgs[i]?.timestamp || 0)) / 1000;
        if (diff > 0 && diff < 60) diffs.push(diff);
      }
      if (diffs.length > 0) avgResponseSec = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    // Memory usage estimate (rough)
    const memKB = Math.round(JSON.stringify(history).length / 1024);
    const syncLevel = sessions.length > 0 ? Math.min(99, 60 + sessions.length * 2) : 0;

    setStats([
      { label: 'SESSIONS', value: String(sessions.length) },
      { label: 'AVG_RESPONSE', value: avgResponseSec > 0 ? `${avgResponseSec}` : '—', unit: 'S' },
      { label: 'SYNC_LEVEL', value: `${syncLevel}`, unit: '%' },
      { label: 'MEMORY_USAGE', value: memKB > 0 ? `${memKB}` : '—', unit: 'KB' },
      { label: 'TRUST_CORE', value: sessions.length >= 10 ? 'MAX' : sessions.length >= 5 ? 'HIGH' : sessions.length >= 1 ? 'MED' : 'INIT' },
      { label: 'MSG_COUNT', value: String(history.length) },
    ]);
  };

  useEffect(() => { loadStats(); }, []);

  const handleClear = () => {
    Alert.alert(
      'CLEAR MEMORY',
      'This will delete all conversation history permanently.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE', style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setCleared(true);
            setStats(prev => prev.map(s => ({ ...s, value: s.label === 'MSG_COUNT' ? '0' : s.value })));
            setTimeout(() => setCleared(false), 2000);
            loadStats();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
        <Text style={styles.sub}>CLEO_UNIT_01</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Avatar placeholder */}
        <View style={styles.avatarBox}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarChar}>C</Text>
          </View>
          <Text style={styles.agentId}>AGENT_ID: CLEO-v1.0</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{s.value}</Text>
                {s.unit && <Text style={styles.statUnit}>{s.unit}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearText}>
            {cleared ? '— MEMORY CLEARED —' : 'CLEAR MEMORY'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.about}>CHARBOT MOBILE v1.0 — CLEO AI COMPANION{'\n'}by Mateusz Uraz</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontFamily: 'SpaceMono', color: '#fff', fontSize: 14, letterSpacing: 5 },
  sub:   { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2 },

  body: { padding: 20, gap: 24 },

  avatarBox:  { alignItems: 'center', paddingVertical: 8, gap: 10 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.05)',
  },
  avatarChar: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 32 },
  agentId:    { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 3 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    width: '47%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, gap: 8, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statLabel:    { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue:    { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 22 },
  statUnit:     { fontFamily: 'SpaceMono', color: 'rgba(255,107,0,0.6)', fontSize: 10 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  clearBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 16, alignItems: 'center',
  },
  clearText: { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 4 },

  about: {
    fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.1)',
    fontSize: 8, letterSpacing: 1, textAlign: 'center', lineHeight: 16,
  },
});
