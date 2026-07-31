/* ============================================
   PromptX - popup.js  v2.1
   从 chrome.storage 动态加载提示词，支持手动同步和 URL 配置
   ============================================ */

var cmdList = document.getElementById('cmdList');
var cmdCount = document.getElementById('cmdCount');
var syncBtn = document.getElementById('syncBtn');
var syncStatus = document.getElementById('syncStatus');
var urlInput = document.getElementById('urlInput');
var urlSaveBtn = document.getElementById('urlSaveBtn');

var URL_KEY = 'promptx_remote_url';
var DEFAULT_URL = 'https://nicoliustudio.github.io/PromptX/prompts.json';

// ── 渲染指令列表 ──
function renderPrompts(prompts) {
  if (!cmdList) return;
  cmdList.innerHTML = '';

  if (!Array.isArray(prompts) || prompts.length === 0) {
    var li = document.createElement('li');
    li.className = 'loading';
    li.textContent = '暂无指令，请点击同步';
    cmdList.appendChild(li);
    if (cmdCount) cmdCount.textContent = '可用指令 (0)';
    return;
  }

  if (cmdCount) cmdCount.textContent = '可用指令 (' + prompts.length + ')';

  // 按分类分组
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
        '<span class="cmd-command">\\' + escapeHtml(p.command) + '</span>' +
        '<span class="cmd-title">' + escapeHtml(p.title) + '</span>' +
        '<span class="cmd-cat">' + (p.variables || []).length + ' 参数</span>';
      cmdList.appendChild(li);
    });
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 显示同步状态 ──
function showSyncTime() {
  chrome.storage.local.get(['promptx_last_sync'], function (result) {
    var time = result.promptx_last_sync;
    if (time) {
      var d = new Date(time);
      var str = d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes());
      if (syncStatus) {
        syncStatus.textContent = '上次同步：' + str;
        syncStatus.className = 'sync-status';
      }
    }
  });
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// ── URL 输入 ──
function loadUrl() {
  chrome.storage.local.get([URL_KEY], function (result) {
    if (urlInput) {
      urlInput.value = result[URL_KEY] || DEFAULT_URL;
    }
  });
}

if (urlSaveBtn) {
  urlSaveBtn.addEventListener('click', function () {
    var url = (urlInput && urlInput.value.trim()) || DEFAULT_URL;
    var data = {};
    data[URL_KEY] = url;
    chrome.storage.local.set(data, function () {
      if (syncStatus && urlInput) {
        // 使用自定义 URL 时显示提示
        var isDefault = url === DEFAULT_URL;
        syncStatus.textContent = isDefault ? '使用默认数据源' : '数据源已更新: ' + url.substring(0, 50) + '...';
        syncStatus.className = 'sync-status';
        setTimeout(function () { showSyncTime(); }, 2000);
      }
    });
  });
}

// ── 同步按钮 ──
if (syncBtn) {
  syncBtn.addEventListener('click', function () {
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';
    if (syncStatus) {
      syncStatus.textContent = '正在从线上拉取...';
      syncStatus.className = 'sync-status';
    }

    if (typeof syncFromRemote === 'function') {
      syncFromRemote().then(function (result) {
        syncBtn.disabled = false;
        syncBtn.textContent = '同步';
        if (result.success) {
          renderPrompts(result.prompts);
          if (syncStatus) {
            syncStatus.textContent = '同步成功！共 ' + result.count + ' 条指令';
            syncStatus.className = 'sync-status success';
          }
          showSyncTime();
        } else {
          if (syncStatus) {
            syncStatus.textContent = '同步失败：' + (result.error || '未知错误');
            syncStatus.className = 'sync-status error';
          }
        }
      });
    } else {
      chrome.storage.local.get(['promptx_prompts'], function (data) {
        syncBtn.disabled = false;
        syncBtn.textContent = '同步';
        if (data.promptx_prompts && data.promptx_prompts.length > 0) {
          renderPrompts(data.promptx_prompts);
          if (syncStatus) {
            syncStatus.textContent = '已从缓存加载';
            syncStatus.className = 'sync-status';
          }
        }
      });
    }
  });
}

// ── 初始化 ──
function init() {
  loadUrl();
  showSyncTime();
  chrome.storage.local.get(['promptx_prompts'], function (data) {
    var prompts = data.promptx_prompts;
    if (Array.isArray(prompts) && prompts.length > 0) {
      renderPrompts(prompts);
    } else {
      if (typeof loadPrompts === 'function') {
        loadPrompts().then(function (p) {
          renderPrompts(p);
          showSyncTime();
        }).catch(function () {
          renderPrompts([]);
        });
      } else {
        renderPrompts([]);
      }
    }
  });
}

init();
