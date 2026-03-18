import { initWhisper, WhisperContext } from 'whisper.rn';
import * as FileSystem from 'expo-file-system/legacy';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const WHISPER_FILENAME = 'ggml-tiny.bin';
const WHISPER_PATH = `${MODEL_DIR}${WHISPER_FILENAME}`;

export const WHISPER_DOWNLOAD_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';

let whisperCtx: WhisperContext | null = null;

export async function whisperModelExists(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(WHISPER_PATH);
  return info.exists;
}

export async function downloadWhisperModel(onProgress: (pct: number) => void): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const callback = (p: FileSystem.DownloadProgressData) => {
    const pct = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
    onProgress(pct);
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    WHISPER_DOWNLOAD_URL, WHISPER_PATH, {}, callback,
  );
  await downloadResumable.downloadAsync();
}

export async function loadWhisper(): Promise<void> {
  if (whisperCtx) return;
  const exists = await whisperModelExists();
  if (!exists) throw new Error('Whisper model not downloaded');
  whisperCtx = await initWhisper({ filePath: WHISPER_PATH });
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  if (!whisperCtx) await loadWhisper();
  if (!whisperCtx) throw new Error('Whisper not loaded');
  const { result } = await whisperCtx.transcribe(audioPath, { language: 'auto' });
  return result.trim();
}

export async function releaseWhisper(): Promise<void> {
  if (whisperCtx) { await whisperCtx.release(); whisperCtx = null; }
}
