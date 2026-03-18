import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speak = useCallback((text: string, lang = 'pl-PL') => {
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, { language: lang, rate: 0.95, pitch: 0.9, onDone: () => setIsSpeaking(false), onError: () => setIsSpeaking(false) });
  }, []);
  const stop = useCallback(() => { Speech.stop(); setIsSpeaking(false); }, []);
  return { isSpeaking, speak, stop };
}
