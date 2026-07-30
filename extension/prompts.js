/* ============================================
   PromptX - prompts.js  v2.0
   提示词存储管理：chrome.storage.local 缓存 + 线上同步
   ============================================ */

// ── 线上数据源 ──
const REMOTE_URL = 'https://nicoliustudio.github.io/PromptX/prompts.json';
const STORAGE_KEY = 'promptx_prompts';
const SYNC_TIME_KEY = 'promptx_last_sync';

// ── 内置备用提示词（网络不可用时的兜底） ──
const FALLBACK_PROMPTS = [
  {
    id: 'p-1', title: '小红书种草文案', command: 'xhs', category: '自媒体爆款',
    template: '你是一个小红书爆款文案专家。请为主题：{{topic}} 撰写一篇种草文案。\n风格要求：{{tone}}\n大概字数：{{length}}字\n要求：包含情绪钩子，使用丰富的Emoji，结构清晰，文末带上相关话题。',
    variables: ['topic', 'tone', 'length'],
  },
  {
    id: 'p-2', title: '代码重构专家', command: 'refactor', category: '代码重构',
    template: '你是一个资深的架构师。请重构以下 {{language}} 代码，目标是提升可读性、性能，并遵循最佳实践。\n\n代码如下：\n{{code}}',
    variables: ['language', 'code'],
  },
  {
    id: 'p-3', title: '工作周报生成器', command: 'report', category: '公文写作',
    template: '请根据以下任务要点，生成一份专业的周报：\n{{tasks}}\n\n本周核心亮点是：{{highlight}}\n语气：{{tone}}',
    variables: ['tasks', 'highlight', 'tone'],
  },
  {
    id: 'p-4', title: '中英翻译专家', command: 'trans', category: '通用工具',
    template: '你是一个专业翻译专家。请将以下内容翻译为 {{target_lang}}：\n{{content}}\n\n要求：保持原文语气和风格，专业术语准确。',
    variables: ['target_lang', 'content'],
  },
  {
    id: 'p-5', title: 'SQL 生成器', command: 'sql', category: '代码重构',
    template: '你是一个数据库专家。请根据以下需求生成 {{db_type}} SQL 语句：\n{{requirement}}\n\n表结构如下：\n{{schema}}\n\n要求：考虑性能优化，添加必要索引。',
    variables: ['db_type', 'requirement', 'schema'],
  },
  {
    id: 'p-6', title: 'PPT 大纲生成', command: 'ppt', category: '公文写作',
    template: '请为主题"{{topic}}"生成一份 PPT 大纲。\n页数：{{slides}}页\n受众：{{audience}}\n风格：{{tone}}\n\n每页包含：标题 + 要点（3-5条）。',
    variables: ['topic', 'slides', 'audience', 'tone'],
  },
  {
    id: 'p-7', title: 'Prompt 优化器', command: 'improve', category: 'Prompt 工程',
    template: '你是一个 Prompt 工程专家。请优化以下 Prompt，使其更清晰、更具指导性：\n\n原始 Prompt：\n{{original_prompt}}\n\n优化目标：{{goal}}\n\n请给出优化后的版本和优化说明。',
    variables: ['original_prompt', 'goal'],
  },
  {
    id: 'p-8', title: '会议纪要整理', command: 'meeting', category: '公文写作',
    template: '请将以下会议记录整理为规范的会议纪要：\n{{notes}}\n\n格式要求：\n1. 会议主题\n2. 参会人员\n3. 核心议题与讨论\n4. 决议事项\n5. 待办事项（含负责人和截止日期）',
    variables: ['notes'],
  },
  {
    id: 'p-9', title: '产品需求文档', command: 'prd', category: '公文写作',
    template: '你是一个高级产品经理。请为以下产品功能撰写 PRD：\n功能名称：{{feature_name}}\n目标用户：{{target_user}}\n核心场景：{{scenario}}\n\nPRD 结构：\n1. 背景与目标\n2. 用户故事\n3. 功能详述\n4. 交互流程\n5. 验收标准\n6. 数据埋点建议',
    variables: ['feature_name', 'target_user', 'scenario'],
  },
  {
    id: 'p-10', title: 'AI 绘画提示词', command: 'img', category: '艺术绘画',
    template: '为 AI 绘画生成一段高质量的英文 prompt：\n\n主题：{{subject}}\n风格：{{style}}\n构图：{{composition}}\n光线：{{lighting}}\n细节：{{details}}\n\n格式：英文，逗号分隔，按重要性排序。',
    variables: ['subject', 'style', 'composition', 'lighting', 'details'],
  },
];

// ── 从线上拉取提示词 ──
function fetchRemotePrompts() {
  return fetch(REMOTE_URL, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var prompts = data.prompts || data;
      if (!Array.isArray(prompts) || prompts.length === 0) {
        throw new Error('Invalid data format');
      }
      // 标准化字段名
      return prompts.map(function (p) {
        return {
          id: p.id || '',
          title: p.title || '',
          command: p.command || '',
          category: p.category || p.categoryId || '其他',
          template: p.template || '',
          variables: p.variables || [],
        };
      });
    });
}

// ── chrome.storage 读写 ──
function saveToStorage(prompts) {
  return new Promise(function (resolve) {
    var data = {};
    data[STORAGE_KEY] = prompts;
    data[SYNC_TIME_KEY] = Date.now();
    chrome.storage.local.set(data, resolve);
  });
}

function loadFromStorage() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([STORAGE_KEY, SYNC_TIME_KEY], function (result) {
      var prompts = result[STORAGE_KEY];
      var syncTime = result[SYNC_TIME_KEY] || 0;
      if (Array.isArray(prompts) && prompts.length > 0) {
        resolve({ prompts: prompts, syncTime: syncTime });
      } else {
        resolve({ prompts: null, syncTime: 0 });
      }
    });
  });
}

// ── 主入口：加载提示词（优先缓存 → 线上拉取 → 内置兜底） ──
function loadPrompts() {
  return loadFromStorage().then(function (cached) {
    if (cached.prompts) {
      // 后台静默更新（不阻塞返回）
      fetchRemotePrompts().then(function (remote) {
        saveToStorage(remote);
      }).catch(function () {});
      return cached.prompts;
    }
    // 无缓存，尝试线上拉取
    return fetchRemotePrompts().then(function (remote) {
      saveToStorage(remote);
      return remote;
    }).catch(function () {
      // 网络不通，用内置兜底
      saveToStorage(FALLBACK_PROMPTS);
      return FALLBACK_PROMPTS;
    });
  });
}

// ── 手动同步（popup 调用） ──
function syncFromRemote() {
  return fetchRemotePrompts().then(function (remote) {
    return saveToStorage(remote).then(function () {
      return { success: true, count: remote.length, prompts: remote };
    });
  }).catch(function (err) {
    return { success: false, error: err.message };
  });
}

// ── 平台检测 ──
const PLATFORM_CONFIG = {
  'chatgpt.com': { name: 'ChatGPT', inputSelector: '#prompt-textarea, div[contenteditable="true"][data-id]' },
  'chat.openai.com': { name: 'ChatGPT', inputSelector: '#prompt-textarea, div[contenteditable="true"][data-id]' },
  'doubao.com': { name: '豆包', inputSelector: 'textarea, div[contenteditable="true"]' },
  'claude.ai': { name: 'Claude', inputSelector: 'div[contenteditable="true"]' },
  'kimi.moonshot.cn': { name: 'Kimi', inputSelector: 'div[contenteditable="true"]' },
  'tongyi.aliyun.com': { name: '通义千问', inputSelector: 'textarea, div[contenteditable="true"]' },
  'yiyan.baidu.com': { name: '文心一言', inputSelector: 'textarea, div[contenteditable="true"]' },
  'poe.com': { name: 'Poe', inputSelector: 'textarea, div[contenteditable="true"]' },
  'gemini.google.com': { name: 'Gemini', inputSelector: 'div[contenteditable="true"]' },
  'deepseek.com': { name: 'DeepSeek', inputSelector: 'textarea, div[contenteditable="true"]' },
  'yuanbao.tencent.com': { name: '腾讯元宝', inputSelector: 'textarea, div[contenteditable="true"]' },
  'xinghuo.xfyun.cn': { name: '讯飞星火', inputSelector: 'textarea, div[contenteditable="true"]' },
  'chatglm.cn': { name: '智谱清言', inputSelector: 'textarea, div[contenteditable="true"]' },
};

function detectPlatform() {
  var host = window.location.hostname;
  for (var domain in PLATFORM_CONFIG) {
    if (PLATFORM_CONFIG.hasOwnProperty(domain) && host.indexOf(domain) !== -1) {
      return PLATFORM_CONFIG[domain];
    }
  }
  return { name: '未知平台', inputSelector: 'textarea, div[contenteditable="true"]' };
}
