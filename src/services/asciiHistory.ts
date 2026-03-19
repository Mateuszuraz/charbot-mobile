import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ascii_history';
const MAX = 20;

export type AsciiEntry = {
  id: string;
  text: string;
  createdAt: number;
};

export async function saveAscii(text: string): Promise<void> {
  const history = await loadAsciiHistory();
  const entry: AsciiEntry = {
    id: Date.now().toString(),
    text,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...history].slice(0, MAX)));
}

export async function loadAsciiHistory(): Promise<AsciiEntry[]> {
  try {
    const r = await AsyncStorage.getItem(KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

export async function deleteAscii(id: string): Promise<void> {
  const history = await loadAsciiHistory();
  await AsyncStorage.setItem(KEY, JSON.stringify(history.filter(e => e.id !== id)));
}

export async function clearAsciiHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
