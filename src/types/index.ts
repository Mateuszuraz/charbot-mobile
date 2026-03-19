export type Message = {
  id: string;
  role: 'user' | 'cleo';
  text: string;
  timestamp: number;
};

export type AIMode = 'HYBRID' | 'OFFLINE' | 'CLOUD';
export type Language = 'AUTO' | 'PL' | 'EN';
export type CleoMode = 'STANDARD' | 'FOCUS' | 'CHILL' | 'COACH';

export type Settings = {
  aiMode: AIMode;
  language: Language;
  cleoMode: CleoMode;
  customPrompt: string;
};

export type CleoStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'loading_model';
export type Tab = 'chat' | 'archive' | 'ascii' | 'profile';

export type Session = {
  id: string;
  date: number;
  preview: string;
  messages: Message[];
};
