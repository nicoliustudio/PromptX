import { AISettings, AIProvider, PROVIDER_PRESETS } from '../types';

const STORAGE_KEY = 'promptx_ai_settings';

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Basic validation
      if (parsed && typeof parsed.provider === 'string' && typeof parsed.apiKey === 'string') {
        return {
          provider: parsed.provider as AIProvider,
          apiKey: parsed.apiKey,
          baseURL: parsed.baseURL || PROVIDER_PRESETS[parsed.provider as AIProvider]?.baseURL || '',
          model: parsed.model || '',
          githubToken: parsed.githubToken || '',
        };
      }
    }
  } catch {
    // Ignore parse errors, fall through to defaults
  }
  return { provider: 'gemini', apiKey: '', baseURL: PROVIDER_PRESETS.gemini.baseURL, model: 'gemini-2.5-flash', githubToken: '' };
}

export function saveSettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns a masked key for display, e.g. "AIza...abcd" */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
