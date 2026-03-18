import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { Message } from '../types';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_FILENAME = 'phi-3.5-mini-instruct-q4_k_m.gguf';
const MODEL_PATH = `${MODEL_DIR}${MODEL_FILENAME}`;

export const MODEL_DOWNLOAD_URL =
  'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf';

const SYSTEM_PROMPT = `You are CLEO — an AI companion in the Charbot Mobile app by Mateusz Uraz.
Character: direct, friendly, slightly ironic, never mean. Reply in the user's language (PL/EN). Max 3 sentences. You run locally on the device — this is your superpower. Never pretend to be human.`;

let ctx: LlamaContext | null = null;
let loading = false;

export async function modelExists(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  return info.exists;
}

export async function downloadModel(onProgress: (pct: number) => void): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const callback = (p: FileSystem.DownloadProgressData) => {
    const pct = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
    onProgress(pct);
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_DOWNLOAD_URL, MODEL_PATH, {}, callback,
  );
  await downloadResumable.downloadAsync();
}

export async function loadModel(): Promise<void> {
  if (ctx || loading) return;
  const exists = await modelExists();
  if (!exists) throw new Error('Model not downloaded');
  loading = true;
  try {
    ctx = await initLlama({ model: MODEL_PATH, use_mlock: true, n_ctx: 2048, n_gpu_layers: 99 });
  } finally {
    loading = false;
  }
}

export async function releaseModel(): Promise<void> {
  if (ctx) { await ctx.release(); ctx = null; }
}

export async function runInference(
  question: string, history: Message[], language: string,
  onToken?: (token: string) => void,
): Promise<string> {
  if (!ctx) await loadModel();
  if (!ctx) throw new Error('Model not loaded');

  const langHint = language === 'PL' ? ' Odpowiadaj po polsku.'
    : language === 'EN' ? ' Reply in English.' : '';

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + langHint },
    ...history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    })),
    { role: 'user' as const, content: question },
  ];

  let result = '';
  await ctx.completion(
    { messages, n_predict: 256, stop: ['</s>', '<|end|>', '<|im_end|>'] },
    (data) => { result += data.token; onToken?.(data.token); },
  );
  return result.trim();
}
