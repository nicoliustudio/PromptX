/* ============================================
   PromptX - content.js  v5.1
   极简架构：\\ 触发 → 菜单 → 点击/Enter → 注入
   异步加载线上提示词，支持实时同步
   ============================================ */

(function () {
  'use strict';

  // ====== 全局提示词（异步加载后填充） ======
  var PROMPTS = [];
  var READY = false;

  // ====== 状态 ======
  var isActive = false;
  var curQuery = '';
  var selIdx = 0;
  var filtered = [];
  var activeInput = null;
  var container = null;
  var dropdown = null;
  var savedRange = null;
  var savedInput = null;
  var tabVars = [];
  var tabVarIdx = -1;
  var toastEl = null;

  // ====== React 安全设值 ======
  var nativeTA, nativeIN;
  try {
    nativeTA = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    nativeIN = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  } catch (e) {}

  function reactSet(el, val) {
    try {
      var s = el.tagName === 'INPUT' ? nativeIN : nativeTA;
      if (s) s.call(el, val);
      else el.value = val;
    } catch (e) { el.value = val; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function isChat(el) {
    if (!el) return false;
    var t = el.tagName;
    if (t === 'TEXTAREA') return true;
    if (t === 'INPUT' && (el.type === 'text' || el.type === 'search')) return true;
    if (el.isContentEditable === true) return true;
    return false;
  }

  function snap(input) {
    savedInput = input;
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      savedRange = { type: 'ta', start: input.selectionStart, end: input.selectionEnd };
    } else {
      var sel = getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = { type: 'ce', range: sel.getRangeAt(0).cloneRange() };
      } else {
        savedRange = null;
      }
    }
  }

  function getQuery(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      var v = el.value, p = el.selectionStart;
      var b = v.substring(0, p);
      var i = b.lastIndexOf('\\');
      if (i === -1) return null;
      var a = b.substring(i + 1);
      if (a.indexOf(' ') !== -1) return null;
      return a;
    }
    if (el.isContentEditable) {
      var sel = getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      var r = sel.getRangeAt(0);
      if (r.startContainer.nodeType !== 3) return null;
      var t = r.startContainer.textContent;
      var pos = r.startOffset;
      var bef = t.substring(0, pos);
      var idx = bef.lastIndexOf('\\');
      if (idx === -1) return null;
      var aft = bef.substring(idx + 1);
      if (aft.indexOf(' ') !== -1) return null;
      return aft;
    }
    return null;
  }

  function filterQ(q) {
    if (!q) return PROMPTS;
    q = q.toLowerCase();
    return PROMPTS.filter(function (p) {
      return p.command.toLowerCase().indexOf(q) !== -1 ||
             p.title.toLowerCase().indexOf(q) !== -1 ||
             (p.category && p.category.toLowerCase().indexOf(q) !== -1);
    });
  }

  // ====== DOM 创建/销毁 ======
  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'promptx-dropdown-container';
    document.body.appendChild(container);
  }

  function destroy() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
    isActive = false;
    curQuery = '';
    selIdx = 0;
    filtered = [];
    activeInput = null;
    savedRange = null;
    savedInput = null;
    tabVars = [];
    tabVarIdx = -1;
  }

  function render(items, sel) {
    if (dropdown) dropdown.remove();
    ensureContainer();
    dropdown = document.createElement('div');
    dropdown.className = 'px-dropdown';

    // Header
    var h = document.createElement('div');
    h.className = 'px-header';
    h.innerHTML = '<span class="px-header-dot"></span>PromptX 指令 · ' + PROMPTS.length + ' 条';
    dropdown.appendChild(h);

    if (items.length === 0) {
      var e = document.createElement('div');
      e.className = 'px-empty';
      e.textContent = '无匹配指令';
      dropdown.appendChild(e);
    } else {
      // 分组
      var grp = {};
      items.forEach(function (p) {
        var c = p.category || '其他';
        if (!grp[c]) grp[c] = [];
        grp[c].push(p);
      });
      var gi = 0;
      Object.keys(grp).forEach(function (c) {
        var lb = document.createElement('div');
        lb.className = 'px-group-label';
        lb.textContent = c;
        dropdown.appendChild(lb);
        grp[c].forEach(function (p) {
          var it = document.createElement('div');
          it.className = 'px-item' + (gi === sel ? ' px-selected' : '');
          it.setAttribute('data-idx', gi);

          var ic = document.createElement('div');
          ic.className = 'px-item-icon';
          ic.textContent = p.title.charAt(0);
          var bd = document.createElement('div');
          bd.className = 'px-item-body';
          var tt = document.createElement('div');
          tt.className = 'px-item-title';
          tt.innerHTML = '<span class="px-item-command">\\' + p.command + '</span>' + p.title;
          var ds = document.createElement('div');
          ds.className = 'px-item-desc';
          ds.textContent = (p.variables || []).length + ' 参数 · ' + (p.template || '').substring(0, 30) + '...';

          bd.appendChild(tt);
          bd.appendChild(ds);
          it.appendChild(ic);
          it.appendChild(bd);

          // 点击事件
          it.pxPrompt = p;
          it.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var pr = ev.currentTarget.pxPrompt;
            if (pr) doSelect(pr);
          });

          dropdown.appendChild(it);
          gi++;
        });
      });
    }

    var ft = document.createElement('div');
    ft.className = 'px-footer';
    ft.innerHTML = 'Enter 选择  Esc 关闭  Tab 跳变量';
    dropdown.appendChild(ft);
    container.appendChild(dropdown);

    // 滚动到选中
    requestAnimationFrame(function () {
      var s = dropdown.querySelector('.px-selected');
      if (s) s.scrollIntoView({ block: 'nearest' });
    });
  }

  function position(input) {
    if (!dropdown || !input) return;
    var r = input.getBoundingClientRect();
    var h = dropdown.offsetHeight || 340;
    var top = r.top - 12 - h;
    if (top < 20) top = r.bottom + 8;
    var left = r.left;
    if (left + 360 > innerWidth) left = innerWidth - 370;
    if (left < 8) left = 8;
    container.style.top = top + 'px';
    container.style.left = left + 'px';
  }

  function update(q) {
    curQuery = q;
    filtered = filterQ(q);
    selIdx = Math.min(selIdx, Math.max(0, filtered.length - 1));
    render(filtered, selIdx);
    if (activeInput) position(activeInput);
  }

  function showToast(html, dur) {
    if (toastEl) { toastEl.className = 'px-toast px-toast-out'; }
    var old = toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'px-toast';
    toastEl.innerHTML = html;
    document.body.appendChild(toastEl);
    var d = dur || 2500;
    setTimeout(function () {
      if (toastEl) {
        toastEl.className = 'px-toast px-toast-out';
        setTimeout(function () {
          if (toastEl) { toastEl.remove(); toastEl = null; }
        }, 300);
      }
    }, d);
    if (old) setTimeout(function () { if (old.parentNode) old.remove(); }, 300);
  }

  function copyText(txt) {
    try {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  // ====== 选择指令 → 注入 ======
  function doSelect(prompt) {
    var input = savedInput || activeInput;
    if (!input) { destroy(); return; }

    var tpl = prompt.template || '';
    var ok = true;

    try {
      if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        injectTA(input, tpl);
      } else if (input.isContentEditable) {
        injectCE(input, tpl);
      } else {
        ok = false;
      }
    } catch (e) { ok = false; }

    destroy();

    if (ok) {
      showToast('已插入 <strong>\\' + prompt.command + '</strong> · ' + prompt.title);
      setTimeout(function () { input.focus(); setupTab(input, prompt); }, 30);
    } else {
      if (copyText(tpl)) {
        showToast('已复制到剪贴板，请输入框内 Ctrl+V 粘贴', 4000);
      } else {
        showToast('注入失败，请手动复制模板', 3000);
      }
      setTimeout(function () { input.focus(); }, 30);
    }
  }

  function injectTA(el, tpl) {
    if (!savedRange || savedRange.type !== 'ta') {
      reactSet(el, el.value + tpl);
      return;
    }
    var v = el.value;
    var s = savedRange.start;
    var bef = v.substring(0, s);
    var aft = v.substring(savedRange.end);
    var si = bef.lastIndexOf('\\');
    var nb = si !== -1 ? bef.substring(0, si) : bef;
    var nv = nb + tpl + aft;
    reactSet(el, nv);
    var nc = (si !== -1 ? si : s) + tpl.length;
    el.setSelectionRange(nc, nc);
  }

  function injectCE(div, tpl) {
    div.focus();
    if (!savedRange || savedRange.type !== 'ce' || !savedRange.range) {
      var tn = document.createTextNode(tpl);
      div.appendChild(tn);
      var s = getSelection();
      s.removeAllRanges();
      var r = document.createRange();
      r.setStartAfter(tn); r.collapse(true);
      s.addRange(r);
      div.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    var snap = savedRange.range;
    var node = snap.startContainer;
    var pos = snap.startOffset;
    if (node.nodeType !== 3) {
      var tn2 = document.createTextNode(tpl);
      div.appendChild(tn2);
      var s2 = getSelection();
      s2.removeAllRanges();
      var r2 = document.createRange();
      r2.setStartAfter(tn2); r2.collapse(true);
      s2.addRange(r2);
      div.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    var txt = node.textContent;
    var bef = txt.substring(0, pos);
    var si = bef.lastIndexOf('\\');
    var newT, newP;
    if (si === -1) {
      newT = txt + tpl;
      newP = newT.length;
    } else {
      newT = txt.substring(0, si) + tpl + txt.substring(pos);
      newP = si + tpl.length;
    }
    node.textContent = newT;
    var s3 = getSelection();
    s3.removeAllRanges();
    var r3 = document.createRange();
    r3.setStart(node, newP); r3.collapse(true);
    s3.addRange(r3);
    div.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 动态搜索下一个 {{变量}}
  function findNextVar(el) {
    if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return null;
    var val = el.value;
    var pos = el.selectionEnd || el.selectionStart || 0;
    var re = /\{\{([^}]+)\}\}/g;
    re.lastIndex = pos;
    var m = re.exec(val);
    if (m) return { s: m.index, e: m.index + m[0].length };
    re.lastIndex = 0;
    m = re.exec(val);
    if (m) return { s: m.index, e: m.index + m[0].length };
    return null;
  }

  function setupTab(input, prompt) {
    if (input.tagName !== 'TEXTAREA' && input.tagName !== 'INPUT') return;
    var v = findNextVarInRange(input, input.selectionStart - (prompt.template || '').length, prompt.template || '');
    if (!v) {
      v = findNextVar(input);
    }
    if (v) {
      tabVars = [{ s: v.s, e: v.e }];
      input.setSelectionRange(v.s, v.e);
      input.focus();
    }
  }

  function findNextVarInRange(el, rangeStart, templateText) {
    if (!templateText || rangeStart < 0) return null;
    var re = /\{\{([^}]+)\}\}/g;
    var m;
    while ((m = re.exec(templateText)) !== null) {
      var abs = rangeStart + m.index;
      if (abs >= (el.selectionEnd || el.selectionStart || 0)) {
        return { s: abs, e: abs + m[0].length };
      }
    }
    return null;
  }

  function jumpVar(input) {
    var v = findNextVar(input);
    if (v) {
      input.setSelectionRange(v.s, v.e);
      input.focus();
      return true;
    }
    return false;
  }

  // ====== 事件监听 ======
  function setupEventListeners() {
    document.addEventListener('keydown', function (e) {
      var t = e.target;

      // Tab 跳变量
      if (e.key === 'Tab' && !e.shiftKey && isChat(t)) {
        if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') {
          var val = t.value;
          if (/\{\{[^}]+\}\}/.test(val)) {
            e.preventDefault();
            jumpVar(t);
            return;
          }
        }
      }

      if (!isChat(t)) return;

      // 菜单键盘
      if (isActive) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selIdx = (selIdx + 1) % Math.max(1, filtered.length);
          render(filtered, selIdx);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selIdx = (selIdx - 1 + filtered.length) % Math.max(1, filtered.length);
          render(filtered, selIdx);
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (filtered[selIdx]) doSelect(filtered[selIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          destroy();
          return;
        }
      }

      // \\ 触发
      if (e.key === '\\') {
        (function (tgt) {
          setTimeout(function () {
            if (!READY) return;
            if (activeInput !== tgt) destroy();
            activeInput = tgt;
            var q = getQuery(tgt);
            if (q !== null && q !== undefined) {
              snap(tgt);
              isActive = true;
              update(q);
            }
          }, 0);
        })(t);
      }
    }, true);

    // 实时更新
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!isActive || t !== activeInput) return;
      if (!isChat(t)) return;
      var q = getQuery(t);
      if (q === null) { destroy(); return; }
      update(q);
      if (isActive) snap(t);
    }, true);

    // 失焦延迟关闭
    document.addEventListener('blur', function (e) {
      var t = e.target;
      if (!isActive) return;
      if (t === activeInput || t === savedInput) {
        setTimeout(function () {
          var ae = document.activeElement;
          if (isActive && ae !== activeInput && ae !== savedInput) {
            destroy();
          }
        }, 300);
      }
    }, true);

    // 点击外部关闭
    document.addEventListener('mousedown', function (e) {
      if (!isActive) return;
      if (container && container.contains(e.target)) return;
      if (e.target === activeInput || e.target === savedInput) return;
      destroy();
    }, true);
  }

  // ====== 初始化：异步加载提示词 ======
  function init() {
    if (typeof loadPrompts !== 'function') {
      console.warn('[PromptX] prompts.js 未加载，扩展可能未正确安装');
      return;
    }

    loadPrompts().then(function (prompts) {
      PROMPTS = prompts;
      READY = true;
      setupEventListeners();
    }).catch(function (err) {
      console.error('[PromptX] 提示词加载失败:', err);
      // 仍然尝试初始化，使用空数组
      PROMPTS = [];
      READY = true;
      setupEventListeners();
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
