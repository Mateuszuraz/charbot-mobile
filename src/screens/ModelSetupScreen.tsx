import React, { useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {
  modelExists, downloadModel,
} from '../services/llamaService';
import {
  whisperModelExists, downloadWhisperModel,
} from '../services/whisperService';

type Props = { onDone: () => void };

type DownloadState = 'idle' | 'downloading_llm' | 'downloading_whisper' | 'done' | 'error';

const LLM_SIZE = '2.2 GB';
const WHISPER_SIZE = '230 MB';

export default function ModelSetupScreen({ onDone }: Props) {
  const [state, setState] = useState<DownloadState>('idle');
  const [llmPct, setLlmPct] = useState(0);
  const [whisperPct, setWhisperPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const start = async () => {
    try {
      // LLM
      const llmReady = await modelExists();
      if (!llmReady) {
        setState('downloading_llm');
        await downloadModel(setLlmPct);
      } else {
        setLlmPct(100);
      }

      // Whisper
      const whisperReady = await whisperModelExists();
      if (!whisperReady) {
        setState('downloading_whisper');
        await downloadWhisperModel(setWhisperPct);
      } else {
        setWhisperPct(100);
      }

      setState('done');
      setTimeout(onDone, 800);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Download failed.');
      setState('error');
    }
  };

  const isDownloading = state === 'downloading_llm' || state === 'downloading_whisper';
  const currentPct = state === 'downloading_llm' ? llmPct : whisperPct;
  const barWidth = `${currentPct}%`;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>FIRST RUN</Text>
        <Text style={styles.sub}>CLEO needs local AI models{'\n'}to work offline.</Text>

        <View style={styles.modelList}>
          <ModelRow
            label="LLM — Phi-3.5-mini"
            size={LLM_SIZE}
            pct={llmPct}
            active={state === 'downloading_llm'}
            done={llmPct === 100}
          />
          <ModelRow
            label="STT — Whisper small"
            size={WHISPER_SIZE}
            pct={whisperPct}
            active={state === 'downloading_whisper'}
            done={whisperPct === 100}
          />
        </View>

        {state === 'error' && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {isDownloading && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: barWidth as any }]} />
            </View>
            <Text style={styles.pct}>{currentPct}%</Text>
          </View>
        )}

        {state === 'done' && (
          <Text style={styles.doneText}>— MODELS READY —</Text>
        )}

        {(state === 'idle' || state === 'error') && (
          <TouchableOpacity style={styles.btn} onPress={start}>
            <Text style={styles.btnText}>
              {state === 'error' ? 'RETRY' : 'DOWNLOAD & SETUP'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Requires ~2.5 GB free space.{'\n'}Wi-Fi recommended.
        </Text>
      </View>
    </View>
  );
}

function ModelRow({
  label, size, pct, active, done,
}: { label: string; size: string; pct: number; active: boolean; done: boolean }) {
  const color = done ? '#FF6B00' : active ? '#fff' : 'rgba(255,255,255,0.3)';
  return (
    <View style={rowStyles.wrap}>
      <View style={rowStyles.left}>
        <Text style={[rowStyles.label, { color }]}>{label}</Text>
        <Text style={rowStyles.size}>{size}</Text>
      </View>
      <Text style={[rowStyles.status, { color }]}>
        {done ? '✓' : active ? `${pct}%` : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center' },
  content:   { padding: 32, gap: 28 },
  title: { fontFamily: 'SpaceMono', color: '#fff', fontSize: 20, letterSpacing: 8 },
  sub:   {
    fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.4)',
    fontSize: 11, letterSpacing: 2, lineHeight: 20,
  },
  modelList:   { gap: 12 },
  progressWrap: { gap: 8 },
  progressTrack: {
    height: 2, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: 2, backgroundColor: '#FF6B00',
  },
  pct: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 10, letterSpacing: 2, textAlign: 'right' },
  doneText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 11, letterSpacing: 4, textAlign: 'center' },
  errorText: { fontFamily: 'SpaceMono', color: '#FF2020', fontSize: 10, letterSpacing: 1 },
  btn: {
    borderWidth: 1, borderColor: '#FF6B00',
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 11, letterSpacing: 4 },
  hint: {
    fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.15)',
    fontSize: 9, letterSpacing: 1, lineHeight: 16, textAlign: 'center',
  },
});

const rowStyles = StyleSheet.create({
  wrap:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  left:   { gap: 3 },
  label:  { fontFamily: 'SpaceMono', fontSize: 11, letterSpacing: 1 },
  size:   { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: 1 },
  status: { fontFamily: 'SpaceMono', fontSize: 12 },
});
