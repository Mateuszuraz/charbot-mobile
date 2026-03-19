import * as SecureStore from 'expo-secure-store';

export type ApiKeyName = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'KIMI' | 'OLLAMA_URL' | 'OLLAMA_MODEL';

const KEY_MAP: Record<ApiKeyName, string> = {
  GEMINI:       'cleo_api_gemini',
  OPENAI:       'cleo_api_openai',
  ANTHROPIC:    'cleo_api_anthropic',
  KIMI:         'cleo_api_kimi',
  OLLAMA_URL:   'cleo_ollama_url',
  OLLAMA_MODEL: 'cleo_ollama_model',
};

export async function getApiKey(name: ApiKeyName): Promise<string | null> {
  try { return await SecureStore.getItemAsync(KEY_MAP[name]); }
  catch { return null; }
}

export async function setApiKey(name: ApiKeyName, value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_MAP[name], value.trim());
}

export async function deleteApiKey(name: ApiKeyName): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_MAP[name]);
}
