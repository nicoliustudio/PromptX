export interface PromptVersion {
  id: string;
  template: string;
  timestamp: number;
}

export interface Prompt {
  id: string;
  title: string;
  command: string; // e.g., "xhs"
  categoryId: string;
  template: string; // Current text, may contain {{variables}}
  variables: string[];
  style: string;
  bestFor: string[];
  history: PromptVersion[];
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
}

export type AppView = 'dashboard' | 'playground' | 'arena' | 'settings';

export type AIProvider = 'gemini' | 'deepseek' | 'openai' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseURL: string;
  model: string;
  githubToken: string;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  prompts: Prompt[];
  categories: Category[];
  aiSettings: AISettings;
}

export const PROVIDER_PRESETS: Record<AIProvider, { label: string; baseURL: string; models: string[] }> = {
  gemini: {
    label: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  custom: {
    label: '自定义（兼容 OpenAI 协议）',
    baseURL: '',
    models: [],
  },
};
