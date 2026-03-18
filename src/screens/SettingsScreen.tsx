import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { AIMode, Language, Settings } from '../types';
import { clearHistory, saveSettings } from '../services/storage';
import { modelExists, modelLoadingState } from '../services/llamaService';
import { whisperModelExists } from '../services/whisperService';

type Props = { settings: Settings; onUpdate: (s: Settings) => void; onBack: () => void };

export default function SettingsScreen({ settings, onUpdate, onBack }: Props) {
  const [local, setLocal] = useState<Settings>(settings);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [whisperReady, setWhisperReady] = useState<boolean | null>(null);

  useEffect(() => {
    modelExists().then(setLlmReady);
    whisperModelExists().then(setWhisperReady);
  }, []);

  const set = (patch: Partial<Settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdate(next);
    saveSettings(next);
  };

  const handleClear = () => {
    Alert.alert('CLEAR MEMORY', 'Delete all conversation history?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: () => clearHistory() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.back} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        <View style={styles.section}>
          <Text style={styles.label}>AI MODE</Text>
          <View style={styles.row}>
            {(['HYBRID', 'OFFLINE', 'CLOUD'] as AIMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.btn, local.aiMode === m && styles.btnActive]}
                onPress={() => set({ aiMode: m })}
              >
                <Text style={[styles.btnText, local.aiMode === m && styles.btnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {local.aiMode === 'HYBRID' && 'Cloud when online, local when offline.'}
            {local.aiMode === 'OFFLINE' && 'Always local. No data sent anywhere.'}
            {local.aiMode === 'CLOUD' && 'Always uses Gemini API. Requires internet.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>LANGUAGE</Text>
          <View style={styles.row}>
            {(['AUTO', 'PL', 'EN'] as Language[]).map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.btn, local.language === l && styles.btnActive]}
                onPress={() => set({ language: l })}
              >
                <Text style={[styles.btnText, local.language === l && styles.btnTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {local.language === 'AUTO' && 'Detects language from your input.'}
            {local.language === 'PL' && 'CLEO responds in Polish.'}
            {local.language === 'EN' && 'CLEO responds in English.'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>LOCAL MODELS</Text>
          <View style={styles.modelRow}>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>Phi-3.5-mini Q4_K_M</Text>
              <Text style={styles.modelDesc}>LLM · 2.2 GB · Local inference</Text>
            </View>
            <View style={[styles.modelStatus, llmReady ? styles.modelStatusOk : styles.modelStatusMissing]}>
              <Text style={styles.modelStatusText}>
                {llmReady === null ? '...' : llmReady
                  ? (modelLoadingState === 'ready' ? 'ACTIVE' : 'READY')
                  : 'MISSING'}
              </Text>
            </View>
          </View>
          <View style={styles.modelRow}>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>Whisper Small</Text>
              <Text style={styles.modelDesc}>STT · 230 MB · Offline transcription</Text>
            </View>
            <View style={[styles.modelStatus, whisperReady ? styles.modelStatusOk : styles.modelStatusMissing]}>
              <Text style={styles.modelStatusText}>
                {whisperReady === null ? '...' : whisperReady ? 'READY' : 'MISSING'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>MEMORY</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearText}>CLEAR MEMORY</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.about}>CLEO v1.0 — Charbot Mobile{'\n'}by Mateusz Uraz</Text>
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
  title:    { color: '#fff', fontFamily: 'SpaceMono', fontSize: 14, letterSpacing: 4 },

  body:        { flex: 1 },
  bodyContent: { padding: 20, gap: 28 },

  section: { gap: 12 },
  label:   { color: 'rgba(255,255,255,0.35)', fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 4 },
  row:     { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  btnActive:     { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  btnText:       { color: 'rgba(255,255,255,0.6)', fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 2 },
  btnTextActive: { color: '#fff' },
  hint: {
    color: 'rgba(255,255,255,0.2)', fontFamily: 'SpaceMono',
    fontSize: 9, letterSpacing: 1,
  },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  modelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modelInfo: { flex: 1 },
  modelName: { color: 'rgba(255,255,255,0.7)', fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 1 },
  modelDesc: { color: 'rgba(255,255,255,0.25)', fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 1, marginTop: 3 },
  modelStatus: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  modelStatusOk: { borderWidth: 1, borderColor: '#FF6B00' },
  modelStatusMissing: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  modelStatusText: { color: '#FF6B00', fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 2 },

  clearBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 16, alignItems: 'center',
  },
  clearText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 4 },

  about: {
    color: 'rgba(255,255,255,0.12)', fontFamily: 'SpaceMono',
    fontSize: 8, letterSpacing: 2, textAlign: 'center', lineHeight: 16,
  },
});
