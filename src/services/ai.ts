import NetInfo from '@react-native-community/netinfo';
import { Message, AIMode, Language } from '../types';
import { modelExists, runInference } from './llamaService';

const GEMINI_API_KEY = 'AIzaSyAqQyGuYYfuysOa6-JR77iqpHY3TRNdx2Y';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Jestes CLEO — AI companion aplikacji Charbot Mobile stworzonej przez Mateusza Uraza.
Charakter: bezposrednia, przyjazna, lekko ironiczna, nigdy zlosliwa. Odpowiadasz w jezyku rozmowcy (PL/EN). Krotko — max 3 zdania. Offline to Twoja supermoc. Nigdy nie udajesz czlowieka.`;

export async function checkOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return s.isConnected === true && s.isInternetReachable !== false;
}

export async function askCleo(
  question: string,
  history: Message[],
  mode: AIMode,
  language: Language,
  onToken?: (token: string) => void,
): Promise<{ reply: string; usedCloud: boolean }> {
  const online = mode !== 'OFFLINE' && await checkOnline();

  // Cloud path
  if (online) {
    try {
      const reply = await callGemini(question, history, language);
      return { reply, usedCloud: true };
    } catch {
      // Cloud failed — fall through to local
    }
  }

  // Local LLM path
  const hasModel = await modelExists();
  if (hasModel) {
    const reply = await runInference(question, history, language, onToken);
    return { reply, usedCloud: false };
  }

  // Last resort — basic fallback (before model is downloaded)
  return { reply: getBasicFallback(question, language), usedCloud: false };
}

async function callGemini(question: string, history: Message[], language: Language): Promise<string> {
  const langHint = language === 'PL' ? ' Odpowiadaj po polsku.'
    : language === 'EN' ? ' Reply in English.' : '';
  const contents = [
    ...history.slice(-16).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];
  const res = await fetch(GEMINI_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT + langHint }] },
      contents,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || '(brak odpowiedzi)';
}

function getBasicFallback(question: string, language: Language): string {
  const isPL = language === 'PL' || (language === 'AUTO' && /[ąćęłńóśźż]/i.test(question));
  return isPL
    ? 'Model AI nie jest jeszcze pobrany. Wejdź w Profil → pobierz modele.'
    : 'AI model not downloaded yet. Go to Profile → download models.';
}
