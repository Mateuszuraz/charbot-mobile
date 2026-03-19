import React, { useState } from 'react';
import {
  Animated, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CleoMode, Settings } from '../types';
import { saveFact } from '../services/memory';
import { saveSettings } from '../services/storage';

export const ONBOARDING_KEY = 'onboarding_done';

type Props = {
  settings: Settings;
  onDone: (updated: Settings) => void;
};

const STEPS = 3;

export default function OnboardingScreen({ settings, onDone }: Props) {
  const [step, setStep]       = useState(0);
  const [name, setName]       = useState('');
  const [cleoMode, setCleoMode] = useState<CleoMode>('STANDARD');
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const nextStep = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(s => s + 1);
  };

  const finish = async () => {
    if (name.trim()) {
      saveFact(`Użytkownik ma na imię ${name.trim()}`);
    }
    const updated: Settings = { ...settings, cleoMode };
    await saveSettings(updated);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    onDone(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {step === 0 && (
          <>
            <Text style={styles.title}>WITAJ</Text>
            <Text style={styles.sub}>Jestem CLEO — Twój AI companion.{'\n'}Jak masz na imię?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Twoje imię..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoFocus
              autoCapitalize="words"
            />
            <TouchableOpacity style={styles.btn} onPress={nextStep}>
              <Text style={styles.btnText}>DALEJ →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>TRYB CLEO</Text>
            <Text style={styles.sub}>Jak lubisz żebym się zachowywała?</Text>
            <View style={styles.modeGrid}>
              {([
                { id: 'STANDARD', label: 'STANDARD', desc: 'Bezpośrednia i przyjazna' },
                { id: 'FOCUS',    label: 'FOCUS',    desc: 'Zwięzła, tylko konkrety' },
                { id: 'CHILL',    label: 'CHILL',    desc: 'Luźna, emoji, jak znajomy' },
                { id: 'COACH',    label: 'COACH',    desc: 'Mentor, pyta i motywuje' },
              ] as { id: CleoMode; label: string; desc: string }[]).map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modeBtn, cleoMode === m.id && styles.modeBtnActive]}
                  onPress={() => setCleoMode(m.id)}
                >
                  <Text style={[styles.modeName, cleoMode === m.id && styles.modeNameActive]}>{m.label}</Text>
                  <Text style={styles.modeDesc}>{m.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={nextStep}>
              <Text style={styles.btnText}>DALEJ →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>GOTOWE{name ? `, ${name.toUpperCase()}` : ''}!</Text>
            <Text style={styles.sub}>
              Tryb: {cleoMode}{'\n\n'}
              Możesz mi mówić "pamiętaj że..." — zapamiętam to na zawsze.{'\n\n'}
              Naciśnij 🎙 żeby porozmawiać głosowo.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={finish}>
              <Text style={styles.btnText}>START →</Text>
            </TouchableOpacity>
          </>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', padding: 32 },
  progress:  { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 48 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#FF6B00' },

  content: { gap: 24 },
  title:   { fontFamily: 'SpaceMono', color: '#fff', fontSize: 22, letterSpacing: 8 },
  sub:     { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, lineHeight: 20 },

  input: {
    borderBottomWidth: 1, borderColor: '#FF6B00',
    color: '#fff', fontFamily: 'SpaceMono', fontSize: 18,
    paddingVertical: 12, letterSpacing: 2,
  },

  modeGrid: { gap: 10 },
  modeBtn: {
    padding: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', gap: 4,
  },
  modeBtnActive:  { borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.08)' },
  modeName:       { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 },
  modeNameActive: { color: '#FF6B00' },
  modeDesc:       { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 1 },

  btn: {
    borderWidth: 1, borderColor: '#FF6B00',
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 12, letterSpacing: 4 },
});
