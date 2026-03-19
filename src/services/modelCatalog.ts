import * as FileSystem from 'expo-file-system/legacy';

export type ModelEntry = {
  id: string;
  name: string;
  filename: string;
  size: string;
  url: string;
  description: string;
};

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

export const MODEL_CATALOG: ModelEntry[] = [
  {
    id: 'phi35',
    name: 'Phi-3.5-mini Q4',
    filename: 'phi-3.5-mini-instruct-q4_k_m.gguf',
    size: '2.2 GB',
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    description: 'Best quality. Recommended.',
  },
  {
    id: 'llama32',
    name: 'Llama 3.2 1B Q4',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    size: '0.7 GB',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    description: 'Fast & light. Good for weaker devices.',
  },
  {
    id: 'qwen05',
    name: 'Qwen 2.5 0.5B Q4',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: '0.4 GB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    description: 'Ultra light. Basic conversations.',
  },
];

export async function modelFileExists(filename: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(`${MODEL_DIR}${filename}`);
  return info.exists;
}

export async function deleteModelFile(filename: string): Promise<void> {
  const path = `${MODEL_DIR}${filename}`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) await FileSystem.deleteAsync(path);
}

export async function downloadModelFile(
  entry: ModelEntry,
  onProgress: (pct: number) => void,
): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const dl = FileSystem.createDownloadResumable(
    entry.url,
    `${MODEL_DIR}${entry.filename}`,
    {},
    (p: FileSystem.DownloadProgressData) => {
      const pct = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
      onProgress(pct);
    },
  );
  await dl.downloadAsync();
}
