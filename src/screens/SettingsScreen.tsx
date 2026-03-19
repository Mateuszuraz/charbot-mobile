import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { AIMode, CleoMode, Language, Settings } from '../types';
import { clearHistory, saveSettings } from '../services/storage';
import { clearFacts } from '../services/memory';
import { getApiKey, setApiKey, ApiKeyName } from '../services/apiKeys';
import { modelExists, modelLoadingState } from '../services/llamaService';
import { whisperModelExists } from '../services/whisperService';

type Props = {
  settings: Settings;
  onUpdate: (s: Settings) => void;
  onBack: () => void;
  onOpenModelManager: () => void;
};

const CLEO_MODE_HINTS: Record<CleoMode, string> = {
  STANDARD: 'Bezpośrednia, lekko ironiczna, max 3 zdania.',
  FOCUS:    'Tylko fakty. Max 1-2 zdania. Zero small talku.',
  CHILL:    'Luźna, emoji, kolokwialnie — jak znajomy.',
  COACH:    'Mentor i coach. Zadaje pytania, motywuje.',
};

export default function SettingsScreen({ settings, onUpdate, onBack, onOpenModelManager }: Props) {
  const [local, setLocal] = useState<Settings>(settings);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [whisperReady, setWhisperReady] = useState<boolean | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);

  useEffect(() => {
    modelExists().then(setLlmReady);
    whisperModelExists().then(setWhisperReady);
    getApiKey('GEMINI').then(k => setGeminiKey(k || ''));
  }, []);

  const set = (patch: Partial<Settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdate(next);
    saveSettings(next);
  };

  const saveGemini = async () => {
    await setApiKey('GEMINI', geminiKey);
    Alert.alert('Saved', 'Gemini API key saved.');
  };

  const handleClearHistory = () => {
    Alert.alert('CLEAR MEMORY', 'Delete all conversation history?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: () => clearHistory() },
    ]);
  };

  const handleClearFacts = () => {
    Alert.alert('CLEAR FACTS', 'Delete all long-term memory facts?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: () => clearFacts() },
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

        {/* AI MODE */}
        <View style={styles.section}>
          <Text style={styles.label}>AI MODE</Text>
          <View style={styles.row}>
            {(['HYBRID', 'OFFLINE', 'CLOUD'] as AIMode[]).map(m => (
              <TouchableOpacity key={m}
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
            {local.aiMode === 'CLOUD' && 'Always uses cloud API. Requires internet.'}
          </Text>
        </View>

        {/* LANGUAGE */}
        <View style={styles.section}>
          <Text style={styles.label}>LANGUAGE</Text>
          <View style={styles.row}>
            {(['AUTO', 'PL', 'EN'] as Language[]).map(l => (
              <TouchableOpacity key={l}
                style={[styles.btn, local.language === l && styles.btnActive]}
                onPress={() => set({ language: l })}
              >
                <Text style={[styles.btnText, local.language === l && styles.btnTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* CLEO MODE */}
        <View style={styles.section}>
          <Text style={styles.label}>CLEO MODE</Text>
          <View style={styles.modeGrid}>
            {(['STANDARD', 'FOCUS', 'CHILL', 'COACH'] as CleoMode[]).map(m => (
              <TouchableOpacity key={m}
                style={[styles.modeBtn, local.cleoMode === m && styles.modeBtnActive]}
                onPress={() => set({ cleoMode: m })}
              >
                <Text style={[styles.modeBtnText, local.cleoMode === m && styles.modeBtnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>{CLEO_MODE_HINTS[local.cleoMode]}</Text>
        </View>

        {/* CUSTOM PROMPT */}
        <View style={styles.section}>
          <Text style={styles.label}>CUSTOM PROMPT</Text>
          <TextInput
            style={styles.textarea}
            value={local.customPrompt}
            onChangeText={v => set({ customPrompt: v })}
            placeholder={'Override CLEO\'s personality...\nLeave empty to use CLEO Mode above.'}
            placeholderTextColor="rgba(255,255,255,0.15)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.divider} />

        {/* API KEYS */}
        <View style={styles.section}>
          <Text style={styles.label}>API KEYS</Text>
          <TouchableOpacity
            style={styles.keyRow}
            onPress={() => setShowGemini(!showGemini)}
          >
            <Text style={styles.keyName}>Gemini</Text>
            <Text style={styles.keyStatus}>
              {geminiKey ? '● CONFIGURED' : '○ NOT SET'}
            </Text>
          </TouchableOpacity>
          {showGemini && (
            <View style={styles.keyInputWrap}>
              <TextInput
                style={styles.keyInput}
                value={geminiKey}
                onChangeText={setGeminiKey}
                placeholder="AIza..."
                placeholderTextColor="rgba(255,255,255,0.15)"
                autoCapitalize="none"
                secureTextEntry
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveGemini}>
                <Text style={styles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* LOCAL MODELS */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>LOCAL MODELS</Text>
            <TouchableOpacity onPress={onOpenModelManager}>
              <Text style={styles.manageLink}>MANAGE →</Text>
            </TouchableOpacity>
          </View>
          <ModelRow
            name="Phi-3.5-mini Q4" desc="LLM · 2.2 GB"
            ready={llmReady}
            activeLabel={modelLoadingState === 'ready' ? 'ACTIVE' : 'READY'}
          />
          <ModelRow
            name="Whisper tiny" desc="STT · 75 MB"
            ready={whisperReady}
            activeLabel="READY"
          />
        </View>

        <View style={styles.divider} />

        {/* MEMORY */}
        <View style={styles.section}>
          <Text style={styles.label}>MEMORY</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleClearHistory}>
              <Text style={styles.btnText}>CLEAR HISTORY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleClearFacts}>
              <Text style={styles.btnText}>CLEAR FACTS</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Facts = things CLEO remembers about you long-term.</Text>
        </View>

        <Text style={styles.about}>CLEO v2.0 — Charbot Mobile{'\n'}by Mateusz Uraz</Text>
      </ScrollView>
    </View>
  );
}

function ModelRow({ name, desc, ready, activeLabel }: {
  name: string; desc: string; ready: boolean | null; activeLabel: string;
}) {
  return (
    <View style={styles.modelRow}>
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{name}</Text>
        <Text style={styles.modelDesc}>{desc}</Text>
      </View>
      <View style={[styles.modelStatus, ready ? styles.modelStatusOk : styles.modelStatusMissing]}>
        <Text style={styles.modelStatusText}>
          {ready === null ? '...' : ready ? activeLabel : 'MISSING'}
        </Text>
      </View>
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
  divider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  section:          { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:      { color: 'rgba(255,255,255,0.35)', fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 4 },
  manageLink: { color: '#FF6B00', fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 2 },
  row:        { flexDirection: 'row', gap: 8 },
  hint:       { color: 'rgba(255,255,255,0.2)', fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1 },

  btn:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  btnActive:     { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  btnText:       { color: 'rgba(255,255,255,0.6)', fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 2 },
  btnTextActive: { color: '#fff' },

  modeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeBtn:          { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modeBtnActive:    { borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.1)' },
  modeBtnText:      { color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 2 },
  modeBtnTextActive:{ color: '#FF6B00' },

  textarea: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    color: '#fff', fontFamily: 'SpaceMono', fontSize: 10,
    padding: 12, minHeight: 90, lineHeight: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  keyRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  keyName:   { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1 },
  keyStatus: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 9, letterSpacing: 1 },
  keyInputWrap: { flexDirection: 'row', gap: 8, marginTop: 4 },
  keyInput:  { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', color: '#fff', fontFamily: 'SpaceMono', fontSize: 10, paddingHorizontal: 10, paddingVertical: 8 },
  saveBtn:   { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: '#FF6B00', justifyContent: 'center' },
  saveBtnText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 9, letterSpacing: 2 },

  modelRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modelInfo:         { flex: 1 },
  modelName:         { color: 'rgba(255,255,255,0.7)', fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 1 },
  modelDesc:         { color: 'rgba(255,255,255,0.25)', fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 1, marginTop: 3 },
  modelStatus:       { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8, borderWidth: 1 },
  modelStatusOk:     { borderColor: '#FF6B00' },
  modelStatusMissing:{ borderColor: 'rgba(255,255,255,0.15)' },
  modelStatusText:   { color: '#FF6B00', fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 2 },

  about: { color: 'rgba(255,255,255,0.12)', fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 2, textAlign: 'center', lineHeight: 16 },
});
