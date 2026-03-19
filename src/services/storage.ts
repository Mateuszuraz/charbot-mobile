import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, Settings, Session } from '../types';

const HISTORY_KEY = 'cleo_history';
const SETTINGS_KEY = 'cleo_settings';
const SESSIONS_KEY = 'cleo_sessions';

export async function loadHistory(): Promise<Message[]> {
  try { const r = await AsyncStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
export async function saveHistory(msgs: Message[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-20)));
}
export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
const DEFAULT_SETTINGS: Settings = { aiMode: 'HYBRID', language: 'AUTO', cleoMode: 'STANDARD', customPrompt: '' };

export async function loadSettings(): Promise<Settings> {
  try {
    const r = await AsyncStorage.getItem(SETTINGS_KEY);
    return r ? { ...DEFAULT_SETTINGS, ...JSON.parse(r) } : DEFAULT_SETTINGS;
  }
  catch { return DEFAULT_SETTINGS; }
}
export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
export async function loadSessions(): Promise<Session[]> {
  try { const r = await AsyncStorage.getItem(SESSIONS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
export async function saveSession(msgs: Message[]): Promise<void> {
  if (msgs.length === 0) return;
  const sessions = await loadSessions();
  const session: Session = {
    id: `#X${Math.random().toString(36).slice(2,4).toUpperCase()}-${Math.floor(Math.random()*90+10)}`,
    date: Date.now(),
    preview: msgs[msgs.length - 1]?.text?.slice(0, 80) || '',
    messages: msgs,
  };
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...sessions].slice(0, 50)));
}
