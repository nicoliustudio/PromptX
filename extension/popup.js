/* ============================================
   PromptX - popup.js  v2.0
   从 chrome.storage 动态加载提示词，支持手动同步
   ============================================ */

var cmdList = document.getElementById('cmdList');
var cmdCount = document.getElementById('cmdCount');
var syncBtn = document.getElementById('syncBtn');
var syncStatus = document.getElementById('syncStatus');

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
    // 分类标签
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
      // 降级：直接读取 chrome.storage
      chrome.storage.local.get(['promptx_prompts'], function (data) {
        syncBtn.disabled = false;
        syncBtn.textContent = '同步';
        if (data.promptx_prompts && data.promptx_prompts.length > 0) {
          renderPrompts(data.promptx_prompts);
          if (syncStatus) {
            syncStatus.textContent = '已从缓存加载';
            syncStatus.className = 'sync-status';
          }
        } else {
          if (syncStatus) {
            syncStatus.textContent = 'syncFromRemote 不可用，请检查扩展';
            syncStatus.className = 'sync-status error';
          }
        }
      });
    }
  });
}

// ── 初始化：从 chrome.storage 加载 ──
function init() {
  showSyncTime();
  chrome.storage.local.get(['promptx_prompts'], function (data) {
    var prompts = data.promptx_prompts;
    if (Array.isArray(prompts) && prompts.length > 0) {
      renderPrompts(prompts);
    } else {
      // 无缓存，显示提示并由 popup.html 中加载的 prompts.js 触发一次加载
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
