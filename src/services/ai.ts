import NetInfo from '@react-native-community/netinfo';
import { Message, AIMode, Language, CleoMode } from '../types';
import { modelExists, runInference } from './llamaService';
import { loadFacts } from './memory';

const CLEO_MODES: Record<CleoMode, string> = {
  STANDARD: `Jestes CLEO — AI companion aplikacji Charbot Mobile stworzonej przez Mateusza Uraza.
Charakter: bezposrednia, przyjazna, lekko ironiczna, nigdy zlosliwa. Odpowiadasz w jezyku rozmowcy (PL/EN). Krotko — max 3 zdania. Offline to Twoja supermoc. Nigdy nie udajesz czlowieka.`,

  FOCUS: `Jestes CLEO w trybie FOCUS. Odpowiadasz bardzo zwiezle — max 1-2 zdania. Tylko fakty i konkrety. Zero small talku. Jezyk rozmowcy (PL/EN).`,

  CHILL: `Jestes CLEO w trybie CHILL. Jestes luzna, uzywasz emoji, mowisz kolokwialnie, mozesz zartowac. Odpowiadasz jak dobry znajomy — naturalnie i bez sztywnosci. Jezyk rozmowcy (PL/EN).`,

  COACH: `Jestes CLEO w trybie COACH. Jestes mentorem i coachem. Zadajesz pytania ktore pomagaja uzytkownikowi myslec i osiagac cele. Motywujesz bez sztucznego entuzjazmu. Jezyk rozmowcy (PL/EN).`,
};

export async function checkOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return s.isConnected === true && s.isInternetReachable !== false;
}

function buildSystemPrompt(
  cleoMode: CleoMode,
  customPrompt: string,
  language: Language,
): string {
  const base = customPrompt.trim() || CLEO_MODES[cleoMode];
  const langHint = language === 'PL' ? ' Odpowiadaj po polsku.'
    : language === 'EN' ? ' Reply in English.' : '';
  const facts = loadFacts();
  const memory = facts.length > 0
    ? `\n\nCo wiem o uzytkowniku:\n${facts.map(f => `- ${f}`).join('\n')}`
    : '';
  return base + langHint + memory;
}

export type CloudKeys = {
  geminiKey?: string;
  kimiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
};

export async function askCleo(
  question: string,
  history: Message[],
  mode: AIMode,
  language: Language,
  onToken?: (token: string) => void,
  cleoMode: CleoMode = 'STANDARD',
  customPrompt = '',
  keys: CloudKeys = {},
): Promise<{ reply: string; usedCloud: boolean }> {
  const systemPrompt = buildSystemPrompt(cleoMode, customPrompt, language);
  const online = mode !== 'OFFLINE' && await checkOnline();

  if (online) {
    // 1. Kimi K2.5 (Moonshot AI)
    if (keys.kimiKey?.trim()) {
      try {
        const reply = await callOpenAICompat(
          question, history, systemPrompt, keys.kimiKey,
          'https://api.moonshot.cn/v1/chat/completions',
          'kimi-k2-0711-preview',
        );
        return { reply, usedCloud: true };
      } catch {}
    }

    // 2. Gemini
    if (keys.geminiKey?.trim()) {
      try {
        const reply = await callGemini(question, history, systemPrompt, keys.geminiKey);
        return { reply, usedCloud: true };
      } catch {}
    }

    // 3. Ollama remote
    if (keys.ollamaUrl?.trim()) {
      try {
        const model = keys.ollamaModel?.trim() || 'llama3.2';
        const reply = await callOpenAICompat(
          question, history, systemPrompt, '',
          `${keys.ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`,
          model,
        );
        return { reply, usedCloud: true };
      } catch {}
    }
  }

  // Local LLM
  const hasModel = await modelExists();
  if (hasModel) {
    try {
      const reply = await runInference(question, history, systemPrompt, onToken);
      return { reply, usedCloud: false };
    } catch {
      return { reply: getModelErrorFallback(language), usedCloud: false };
    }
  }

  return { reply: getBasicFallback(question, language), usedCloud: false };
}

async function callOpenAICompat(
  question: string,
  history: Message[],
  systemPrompt: string,
  apiKey: string,
  url: string,
  model: string,
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-16).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: question },
  ];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: 512 }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json?.choices?.[0]?.message?.content || '(brak odpowiedzi)';
}

async function callGemini(
  question: string,
  history: Message[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const contents = [
    ...history.slice(-16).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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

function getModelErrorFallback(language: Language): string {
  return language === 'EN'
    ? 'Local model failed to respond. Try again or check available memory.'
    : 'Lokalny model nie odpowiedział. Spróbuj ponownie lub sprawdź pamięć urządzenia.';
}
