import { useState, useRef, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { whisperModelExists } from '../services/whisperService';

const WHISPER_PATH = `${FileSystem.documentDirectory}models/ggml-small.bin`;

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone Permission',
      message: 'Charbot needs microphone access for voice input.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function useWhisper() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const ctxRef = useRef<WhisperContext | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const ensureLoaded = async () => {
    if (ctxRef.current) return;
    const exists = await whisperModelExists();
    if (!exists) throw new Error('Whisper model not downloaded');
    ctxRef.current = await initWhisper({ filePath: WHISPER_PATH });
  };

  const startListening = useCallback(async (
    onResult: (text: string) => void,
    onError?: (e: Error) => void,
  ) => {
    try {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        onError?.(new Error('Microphone permission denied'));
        return;
      }
      await ensureLoaded();
      if (!ctxRef.current) return;
      setIsListening(true);

      const { stop, subscribe } = await ctxRef.current.transcribeRealtime({
        language: 'auto',
        realtimeAudioSec: 30,
        realtimeAudioSliceSec: 3,
      });

      stopRef.current = stop;

      subscribe((evt: any) => {
        if (evt.isCapturing === false && evt.data?.result) {
          const text = evt.data.result.trim();
          if (text) onResult(text);
          setIsListening(false);
          setIsTranscribing(false);
        }
      });
    } catch (e) {
      setIsListening(false);
      onError?.(e as Error);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (stopRef.current) {
      setIsTranscribing(true);
      await stopRef.current();
      stopRef.current = null;
      setIsListening(false);
    }
  }, []);

  const release = useCallback(async () => {
    if (ctxRef.current) {
      await ctxRef.current.release();
      ctxRef.current = null;
    }
  }, []);

  return { isListening, isTranscribing, startListening, stopListening, release };
}
