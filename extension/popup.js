/* ============================================
   PromptX - popup.js  v2.2
   自包含：chrome.storage 读写 + remote fetch + 渲染
   不依赖 prompts.js 的异步链
   ============================================ */

var cmdList = document.getElementById('cmdList');
var cmdCount = document.getElementById('cmdCount');
var syncBtn = document.getElementById('syncBtn');
var syncStatus = document.getElementById('syncStatus');
var urlInput = document.getElementById('urlInput');
var urlSaveBtn = document.getElementById('urlSaveBtn');

var DEFAULT_URL = 'https://nicoliustudio.github.io/PromptX/prompts.json';
var URL_KEY = 'promptx_remote_url';
var PROMPTS_KEY = 'promptx_prompts';
var SYNC_TIME_KEY = 'promptx_last_sync';

// ── 获取数据源 URL ──
function getUrl(cb) {
  chrome.storage.local.get([URL_KEY], function (r) {
    cb(r[URL_KEY] || DEFAULT_URL);
  });
}

// ── 从 chrome.storage 读取缓存的提示词 ──
function loadCached(cb) {
  chrome.storage.local.get([PROMPTS_KEY, SYNC_TIME_KEY], function (r) {
    var prompts = r[PROMPTS_KEY];
    var time = r[SYNC_TIME_KEY] || 0;
    cb(Array.isArray(prompts) && prompts.length > 0 ? prompts : null, time);
  });
}

// ── 保存到 chrome.storage ──
function saveCache(prompts, cb) {
  var d = {};
  d[PROMPTS_KEY] = prompts;
  d[SYNC_TIME_KEY] = Date.now();
  chrome.storage.local.set(d, cb || function () {});
}

// ── 从远程拉取 ──
function fetchRemote(cb) {
  getUrl(function (url) {
    fetch(url, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var raw = data.prompts || data;
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('Empty');
        var prompts = raw.map(function (p) {
          return {
            id: p.id || '',
            title: p.title || '',
            command: p.command || '',
            category: p.category || p.categoryId || '其他',
            template: p.template || '',
            variables: p.variables || [],
          };
        });
        saveCache(prompts);
        cb(null, prompts);
      })
      .catch(function (err) {
        cb(err.message || 'fetch failed');
      });
  });
}

// ── 渲染指令列表 ──
function render(prompts) {
  if (!cmdList) return;
  cmdList.innerHTML = '';

  if (!prompts || prompts.length === 0) {
    var li = document.createElement('li');
    li.className = 'loading';
    li.textContent = '暂无指令，请点同步';
    cmdList.appendChild(li);
    if (cmdCount) cmdCount.textContent = '可用指令 (0)';
    return;
  }

  if (cmdCount) cmdCount.textContent = '可用指令 (' + prompts.length + ')';

  var groups = {};
  prompts.forEach(function (p) {
    var cat = p.category || '其他';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  Object.keys(groups).forEach(function (cat) {
    var label = document.createElement('li');
    label.className = 'cmd-item';
    label.style.cssText = 'color:#555;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 4px;border-bottom:none;';
    label.textContent = cat;
    cmdList.appendChild(label);

    groups[cat].forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'cmd-item';
      li.innerHTML =
        '<span class="cmd-command">\\' + esc(p.command) + '</span>' +
        '<span class="cmd-title">' + esc(p.title) + '</span>' +
        '<span class="cmd-cat">' + (p.variables || []).length + ' 参数</span>';
      cmdList.appendChild(li);
    });
  });
}

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── 格式化时间 ──
function fmtTime(ts) {
  var d = new Date(ts);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function p(n) { return n < 10 ? '0' + n : '' + n; }

// ── URL 初始化 ──
function initUrl() {
  chrome.storage.local.get([URL_KEY], function (r) {
    if (urlInput) urlInput.value = r[URL_KEY] || DEFAULT_URL;
  });
}

// ── 保存 URL ──
if (urlSaveBtn) {
  urlSaveBtn.addEventListener('click', function () {
    var u = (urlInput && urlInput.value.trim()) || DEFAULT_URL;
    var d = {}; d[URL_KEY] = u;
    chrome.storage.local.set(d, function () {
      if (syncStatus) {
        syncStatus.textContent = u === DEFAULT_URL ? '已恢复默认数据源' : '数据源已保存';
        syncStatus.className = 'sync-status';
      }
    });
  });
}

// ── 同步按钮 ──
if (syncBtn) {
  syncBtn.addEventListener('click', function () {
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';
    if (syncStatus) { syncStatus.textContent = '拉取中...'; syncStatus.className = 'sync-status'; }

    fetchRemote(function (err, prompts) {
      syncBtn.disabled = false;
      syncBtn.textContent = '同步';
      if (err) {
        if (syncStatus) { syncStatus.textContent = '失败: ' + err; syncStatus.className = 'sync-status error'; }
        // 回退到缓存
        loadCached(function (cached) { if (cached) render(cached); });
      } else {
        render(prompts);
        loadCached(function (_, t) {
          if (syncStatus && t) { syncStatus.textContent = '同步成功！上次: ' + fmtTime(t); syncStatus.className = 'sync-status success'; }
        });
      }
    });
  });
}

// ── 初始化 ──
function init() {
  initUrl();

  loadCached(function (cached, time) {
    if (cached) {
      render(cached);
      if (syncStatus && time) {
        syncStatus.textContent = '上次同步: ' + fmtTime(time);
        syncStatus.className = 'sync-status';
      }
    } else {
      // 无缓存 → 自动拉取
      if (syncStatus) { syncStatus.textContent = '首次加载中...'; syncStatus.className = 'sync-status'; }
      fetchRemote(function (err, prompts) {
        if (err) {
          render(null);
          if (syncStatus) { syncStatus.textContent = '加载失败: ' + err; syncStatus.className = 'sync-status error'; }
        } else {
          render(prompts);
          if (syncStatus) { syncStatus.textContent = '首次加载完成'; syncStatus.className = 'sync-status success'; }
        }
      });
    }
  });
}

init();
