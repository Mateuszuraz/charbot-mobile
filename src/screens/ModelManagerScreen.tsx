import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {
  MODEL_CATALOG, ModelEntry,
  modelFileExists, deleteModelFile, downloadModelFile,
} from '../services/modelCatalog';

type ModelState = 'checking' | 'missing' | 'downloading' | 'ready';
type States = Record<string, ModelState>;
type Progress = Record<string, number>;

type Props = { onBack: () => void };

export default function ModelManagerScreen({ onBack }: Props) {
  const [states, setStates] = useState<States>({});
  const [progress, setProgress] = useState<Progress>({});

  useEffect(() => {
    checkAll();
  }, []);

  const checkAll = async () => {
    const next: States = {};
    for (const m of MODEL_CATALOG) {
      next[m.id] = 'checking';
    }
    setStates(next);
    for (const m of MODEL_CATALOG) {
      const exists = await modelFileExists(m.filename);
      setStates(prev => ({ ...prev, [m.id]: exists ? 'ready' : 'missing' }));
    }
  };

  const download = async (entry: ModelEntry) => {
    setStates(prev => ({ ...prev, [entry.id]: 'downloading' }));
    setProgress(prev => ({ ...prev, [entry.id]: 0 }));
    try {
      await downloadModelFile(entry, pct => {
        setProgress(prev => ({ ...prev, [entry.id]: pct }));
      });
      setStates(prev => ({ ...prev, [entry.id]: 'ready' }));
    } catch (e: any) {
      setStates(prev => ({ ...prev, [entry.id]: 'missing' }));
      Alert.alert('Download failed', e?.message || 'Unknown error');
    }
  };

  const remove = (entry: ModelEntry) => {
    Alert.alert('DELETE MODEL', `Remove ${entry.name}?`, [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'DELETE', style: 'destructive',
        onPress: async () => {
          await deleteModelFile(entry.filename);
          setStates(prev => ({ ...prev, [entry.id]: 'missing' }));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MODEL MANAGER</Text>
        <View style={styles.back} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.hint}>
          Local models run fully offline on your device.{'\n'}Only one model is active at a time.
        </Text>

        {MODEL_CATALOG.map(entry => {
          const s = states[entry.id] ?? 'checking';
          const pct = progress[entry.id] ?? 0;
          return (
            <View key={entry.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.modelName}>{entry.name}</Text>
                  <Text style={styles.modelDesc}>{entry.size} · {entry.description}</Text>
                </View>
                <View style={[styles.badge,
                  s === 'ready' && styles.badgeReady,
                  s === 'downloading' && styles.badgeDl,
                ]}>
                  <Text style={styles.badgeText}>
                    {s === 'checking' ? '...'
                      : s === 'ready' ? 'READY'
                      : s === 'downloading' ? `${pct}%`
                      : 'MISSING'}
                  </Text>
                </View>
              </View>

              {s === 'downloading' && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${pct}%` }]} />
                </View>
              )}

              <View style={styles.cardActions}>
                {s === 'missing' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => download(entry)}>
                    <Text style={styles.actionText}>↓ DOWNLOAD</Text>
                  </TouchableOpacity>
                )}
                {s === 'ready' && (
                  <TouchableOpacity style={styles.actionBtnDanger} onPress={() => remove(entry)}>
                    <Text style={styles.actionTextDanger}>✕ DELETE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  back:     { width: 40 },
  backText: { color: '#fff', fontSize: 20, fontFamily: 'SpaceMono' },
  title:    { color: '#fff', fontFamily: 'SpaceMono', fontSize: 13, letterSpacing: 4 },

  body:        { flex: 1 },
  bodyContent: { padding: 20, gap: 16 },
  hint: {
    fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.25)',
    fontSize: 9, letterSpacing: 1, lineHeight: 16,
  },

  card: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, gap: 10,
  },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo:  { flex: 1, gap: 4 },
  modelName: { fontFamily: 'SpaceMono', color: '#fff', fontSize: 11, letterSpacing: 1 },
  modelDesc: { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1 },

  badge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginLeft: 8,
  },
  badgeReady: { borderColor: '#FF6B00' },
  badgeDl:    { borderColor: '#fff' },
  badgeText:  { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 8, letterSpacing: 2 },

  progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  progressBar:   { height: 2, backgroundColor: '#FF6B00' },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#FF6B00',
  },
  actionBtnDanger: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  actionText:       { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 9, letterSpacing: 2 },
  actionTextDanger: { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 2 },
});
