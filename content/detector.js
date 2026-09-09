/**
 * 表单字段启发式识别引擎。
 * 扫描页面中的表单控件，结合 label 文本、元素属性、邻近文本与关键词表做加权匹配，
 * 输出 matched（识别成功，含取值）与 unmatched（未识别，供人工指定）两组结果。
 * 支持：原生 input/textarea/select、原生 radio 组，以及组件库自定义下拉（combobox）。
 * 依赖：lib/fields.js（FIELD_DEFS / resolveFieldValue）
 */
const FormDetector = (() => {
  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset', 'file', 'password', 'checkbox']);
  const BLOCK_TEXT_RE = /登录|登陆|注册|密码|验证码|账号|搜索/;
  const BLOCK_ATTR_RE = /login|sign[\s_-]?in|sign[\s_-]?up|account|passwd|password|captcha|verify|search/i;

  // 自定义下拉触发器：标准 WAI-ARIA combobox + 常见组件库容器
  const CUSTOM_SELECT_SELECTOR = [
    '[role="combobox"]',
    '[aria-haspopup="listbox"]',
    '.atsx-select-selection',
    '.el-select',
    '.ant-select-selector',
    '[class*="select-selection"]'
  ].join(',');

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  // 原生 radio 常被 CSS 隐藏（opacity:0 / 绝对定位），但其 label/包装是可见的
  function radioUsable(el) {
    if (isVisible(el)) return true;
    const wrap = el.closest('label') || el.closest('[class*="radio"]') || el.parentElement;
    return !!wrap && isVisible(wrap);
  }

  function collectControls() {
    const singles = [];
    const radioGroups = new Map();
    const customSelects = [];

    const pushRadio = (el) => {
      // 无 name 的受控 radio（如 atsx），按最近的分组容器聚合
      const groupEl = el.closest('[role="radiogroup"], [class*="radio-group"], fieldset');
      const key = el.name ? ('name:' + el.name) : (groupEl || el.parentElement);
      if (!radioGroups.has(key)) radioGroups.set(key, []);
      radioGroups.get(key).push(el);
    };

    for (const el of document.querySelectorAll('input, textarea, select')) {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (tag === 'input' && SKIP_TYPES.has(type)) continue;
      if (type === 'search') continue;
      if (el.disabled || el.readOnly) continue;
      if (tag === 'input' && type === 'radio') {
        if (!radioUsable(el)) continue;
        pushRadio(el);
        continue;
      }
      if (!isVisible(el)) continue;
      singles.push(el);
    }

    for (const el of document.querySelectorAll(CUSTOM_SELECT_SELECTOR)) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') continue;
      if (el.disabled) continue;
      if (!isVisible(el)) continue;
      customSelects.push(el);
    }

    return { singles, radioGroups, customSelects };
  }

  function labelTextOf(el) {
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) return (lab.innerText || '').trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return (parentLabel.innerText || '').trim();
    return '';
  }

  function nearbyText(el) {
    let text = '';
    let node = el.previousElementSibling;
    let hops = 0;
    while (node && hops < 3 && text.length < 60) {
      const t = (node.innerText || '').trim();
      if (t) text = t + ' ' + text;
      node = node.previousElementSibling;
      hops++;
    }
    if (text.trim()) return text.trim().slice(0, 80);

    const p = el.parentElement;
    if (!p) return '';
    const lab = p.querySelector('label');
    if (lab && !lab.contains(el)) text = (lab.innerText || '').trim();
    if (!text) {
      for (const child of p.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          text = child.textContent.trim();
          break;
        }
      }
    }
    if (!text) {
      let ps = p.previousElementSibling;
      let h = 0;
      while (ps && h < 2) {
        const t = (ps.innerText || '').trim();
        if (t && t.length < 40) { text = t; break; }
        ps = ps.previousElementSibling;
        h++;
      }
    }
    return (text || '').slice(0, 80);
  }

  function extractContext(el) {
    const attr = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
                  el.getAttribute('autocomplete'), el.getAttribute('data-field'),
                  el.getAttribute('data-name'), el.getAttribute('data-cy')]
      .filter(Boolean).join(' ');
    return { label: labelTextOf(el), attr, nearby: nearbyText(el) };
  }

  function looksBlocked(ctx) {
    if (BLOCK_TEXT_RE.test(ctx.label) || BLOCK_TEXT_RE.test(ctx.nearby)) return true;
    if (BLOCK_ATTR_RE.test(ctx.attr)) return true;
    return false;
  }

  function matchField(ctx, el) {
    if (looksBlocked(ctx)) return null;
    const sources = [
      { text: ctx.label, weight: 10 },
      { text: ctx.attr, weight: 8 },
      { text: ctx.nearby, weight: 6 }
    ];
    const isTextarea = el.tagName === 'TEXTAREA';
    let best = null;
    for (const def of FIELD_DEFS) {
      let score = 0;
      for (const s of sources) {
        const t = (s.text || '').toLowerCase();
        if (!t) continue;
        for (let i = 0; i < def.keywords.length; i++) {
          const kw = def.keywords[i].toLowerCase();
          if (kw && t.includes(kw)) {
            const kwScore = s.weight * 100 + (def.keywords.length - i) * 2 + kw.length;
            if (kwScore > score) score = kwScore;
          }
        }
      }
      if (score > 0 && def.multiline && isTextarea) score += 30;
      if (score > 0 && (!best || score > best.score)) best = { def, score };
    }
    return best ? best.def : null;
  }

  function controlKind(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'date' || type === 'month' || type === 'datetime-local') return 'date';
    return 'text';
  }

  function captionOf(node) {
    if (!node) return '';
    const t = (node.innerText || '').trim();
    return (t && t.length <= 24 && !t.includes('\n')) ? t : '';
  }

  function radioContext(radios) {
    const first = radios[0];
    let ctx = extractContext(first);
    const groupEl = first.closest('[role="radiogroup"], [class*="radio-group"]') || first.closest('fieldset');

    if (groupEl) {
      if (groupEl.tagName === 'FIELDSET') {
        const legend = groupEl.querySelector(':scope > legend');
        const c = captionOf(legend);
        if (c) return { ...ctx, label: c };
      }
      // 表单行（form-item）里位于分组上方的标签
      const item = groupEl.closest('[class*="form-item"], [class*="formItem"], [class*="form_item"], li, tr, td');
      if (item && item !== groupEl) {
        for (const child of item.children) {
          if (child === groupEl || (child.contains && child.contains(groupEl))) continue;
          const c = captionOf(child);
          if (c) return { ...ctx, label: c };
        }
      }
      // 分组前相邻的标签节点（如 <label>性别</label>）
      let prev = groupEl.previousElementSibling;
      for (let h = 0; prev && h < 3; h++) {
        const c = captionOf(prev);
        if (c) return { ...ctx, label: c };
        prev = prev.previousElementSibling;
      }
    }

    if (!ctx.label && !ctx.nearby) {
      const container = first.closest('div, li, td, tr');
      if (container) {
        const lab = container.querySelector('label');
        if (lab) ctx = { ...ctx, nearby: (lab.innerText || '').trim() };
      }
    }
    return ctx;
  }

  /**
   * 扫描当前页面。
   * @param {object} profile 用户资料
   * @returns {{ matched: Array, unmatched: Array }}
   *   matched 项: { element, elements?, kind, def, occurrence, value, ctxLabel }
   *   unmatched 项: { element, elements?, kind, ctxLabel }
   */
  function scan(profile) {
    const { singles, radioGroups, customSelects } = collectControls();
    const matched = [];
    const unmatched = [];
    const occurrenceCounters = {};

    const pushItem = (entry) => {
      const def = matchField(entry.ctx, entry.element);
      if (def) {
        let occurrence = 0;
        if (Array.isArray(profile[def.scope])) {
          occurrence = occurrenceCounters[def.key] || 0;
          occurrenceCounters[def.key] = occurrence + 1;
        }
        matched.push({
          element: entry.element,
          elements: entry.elements || null,
          kind: entry.kind,
          def,
          occurrence,
          value: resolveFieldValue(def, profile, occurrence),
          ctxLabel: entry.ctxLabel
        });
      } else {
        unmatched.push({
          element: entry.element,
          elements: entry.elements || null,
          kind: entry.kind,
          ctxLabel: entry.ctxLabel
        });
      }
    };

    for (const el of singles) {
      const ctx = extractContext(el);
      const ctxLabel = ctx.label || ctx.nearby || el.placeholder || el.name || el.id || '(无标签)';
      pushItem({ element: el, ctx, kind: controlKind(el), ctxLabel });
    }
    for (const el of customSelects) {
      const ctx = extractContext(el);
      const ctxLabel = ctx.label || ctx.nearby || el.getAttribute('data-cy') ||
        el.getAttribute('aria-label') || '(无标签)';
      pushItem({ element: el, ctx, kind: 'select', ctxLabel });
    }
    for (const [key, radios] of radioGroups) {
      const ctx = radioContext(radios);
      const nameKey = typeof key === 'string' ? key.slice(5) : '';
      pushItem({
        element: radios[0],
        elements: radios,
        ctx,
        kind: 'radio-group',
        ctxLabel: ctx.label || ctx.nearby || nameKey || '(无标签)'
      });
    }

    const byDocOrder = (a, b) => {
      const pos = a.element.compareDocumentPosition(b.element);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    };
    matched.sort(byDocOrder);
    unmatched.sort(byDocOrder);

    return { matched, unmatched };
  }

  return { scan };
})();