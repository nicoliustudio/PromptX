import { Prompt, Category, AISettings, ExportData } from '../types';
import { INITIAL_PROMPTS, INITIAL_CATEGORIES } from '../data';
import { loadSettings, saveSettings } from './settings';

const PROMPTS_KEY = 'promptx_prompts';
const CATEGORIES_KEY = 'promptx_categories';

// ── Prompt Persistence ──

export function loadPrompts(): Prompt[] {
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id && parsed[0]?.template) {
        return parsed as Prompt[];
      }
    }
  } catch { /* fall through */ }
  return INITIAL_PROMPTS;
}

export function savePrompts(prompts: Prompt[]): void {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

// ── Category Persistence ──

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
        return parsed as Category[];
      }
    }
  } catch { /* fall through */ }
  return INITIAL_CATEGORIES;
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

// ── Export ──

export function exportAll(): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts: loadPrompts(),
    categories: loadCategories(),
    aiSettings: loadSettings(),
  };
}

/** Downloads a JSON file to the user's machine */
export function downloadExport(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `promptx-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Import ──

export interface ImportResult {
  success: boolean;
  promptsCount: number;
  categoriesCount: number;
  hasSettings: boolean;
  error?: string;
}

export function importAll(json: string): ImportResult {
  let data: ExportData;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, promptsCount: 0, categoriesCount: 0, hasSettings: false, error: 'JSON 解析失败，请检查文件格式。' };
  }

  // Validate
  if (!data.version || !Array.isArray(data.prompts)) {
    return { success: false, promptsCount: 0, categoriesCount: 0, hasSettings: false, error: '文件格式不正确，缺少必要字段（version, prompts）。' };
  }

  if (data.prompts.length === 0) {
    return { success: false, promptsCount: 0, categoriesCount: 0, hasSettings: false, error: '文件中没有提示词数据。' };
  }

  // Validate each prompt has required fields
  for (const p of data.prompts) {
    if (!p.id || !p.template || !p.command) {
      return { success: false, promptsCount: 0, categoriesCount: 0, hasSettings: false, error: `提示词 "${p.title || '未知'}" 缺少必要字段（id/template/command）。` };
    }
  }

  // Write to localStorage
  savePrompts(data.prompts);
  if (data.categories && data.categories.length > 0) {
    saveCategories(data.categories);
  }
  if (data.aiSettings && data.aiSettings.provider) {
    saveSettings(data.aiSettings);
  }

  return {
    success: true,
    promptsCount: data.prompts.length,
    categoriesCount: data.categories?.length || 0,
    hasSettings: !!(data.aiSettings && data.aiSettings.apiKey),
  };
}

// ── Clear All ──

export function clearAllData(): void {
  localStorage.removeItem(PROMPTS_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
}

// ── Publish to Extension (GitHub API) ──

const GITHUB_API = 'https://api.github.com/repos/nicoliustudio/PromptX/contents/public/prompts.json';

interface PublishResult {
  success: boolean;
  message: string;
}

export async function publishExtensionData(token: string): Promise<PublishResult> {
  if (!token) {
    return { success: false, message: '请先填入 GitHub Token。' };
  }

  const prompts = loadPrompts();
  const categories = loadCategories();

  if (prompts.length === 0) {
    return { success: false, message: '提示词库为空，请先添加提示词。' };
  }

  // 构建 categoryId → name 映射
  const catMap: Record<string, string> = {};
  categories.forEach(c => { catMap[c.id] = c.name; });

  // 生成 extension-compatible 格式
  const extPrompts = prompts.map(p => ({
    id: p.id,
    title: p.title,
    command: p.command,
    category: catMap[p.categoryId] || '其他',
    template: p.template,
    variables: p.variables,
  }));

  const content = {
    version: 1,
    updatedAt: new Date().toISOString(),
    prompts: extPrompts,
  };

  const contentStr = JSON.stringify(content, null, 2);
  const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));

  try {
    // Step 1: 获取当前文件 sha
    const getRes = await fetch(GITHUB_API, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });

    let sha = '';
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha || '';
    }
    // 文件不存在时 sha 为空（新建文件场景）

    // Step 2: PUT 更新文件
    const body = JSON.stringify({
      message: 'chore: sync prompts.json from web app',
      content: contentBase64,
      ...(sha ? { sha } : {}),
    });

    const putRes = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body,
    });

    if (putRes.ok) {
      return { success: true, message: `已发布 ${extPrompts.length} 条提示词！部署完成后扩展点"同步"即可更新。` };
    }

    const errData = await putRes.json().catch(() => ({}));
    if (putRes.status === 401) {
      return { success: false, message: 'Token 无效或已过期，请重新生成。' };
    }
    if (putRes.status === 404) {
      return { success: false, message: '仓库不存在或 Token 无权限访问。' };
    }
    return { success: false, message: (errData as any).message || `GitHub API 返回 ${putRes.status}` };
  } catch {
    return { success: false, message: '网络请求失败，请检查网络连接。' };
  }
}
