export type Message = {
  id: string;
  role: 'user' | 'cleo';
  text: string;
  timestamp: number;
};

export type AIMode = 'HYBRID' | 'OFFLINE' | 'CLOUD';
export type Language = 'AUTO' | 'PL' | 'EN';

export type Settings = {
  aiMode: AIMode;
  language: Language;
};

export type CleoStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'loading_model';
export type Tab = 'chat' | 'archive' | 'profile';

export type Session = {
  id: string;
  date: number;
  preview: string;
  messages: Message[];
};
