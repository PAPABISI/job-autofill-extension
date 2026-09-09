/**
 * 填充执行器：把确认后的值写入页面控件。
 * - 原生控件使用 value setter + 派发 input/change 事件，兼容 React/Vue 受控组件。
 * - 组件库自定义下拉（combobox）通过「打开 → 定位弹出层选项 → 点击」模拟真实交互。
 * 填充结果通过 jaf-filled / jaf-failed 样式类高亮（见 content/page.css）。
 */
const FormFiller = (() => {
  function dispatch(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    dispatch(el);
  }

  function highlight(el, ok) {
    el.classList.remove('jaf-filled', 'jaf-failed');
    el.classList.add(ok ? 'jaf-filled' : 'jaf-failed');
  }

  /** 归一化文本用于选项匹配：小写、去全角空格、去空白、去括号注释 */
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\u3000/g, ' ')
      .replace(/\s+/g, '')
      .replace(/[（(【\[].*?[)）】\]]/g, '')
      .trim();
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && el.tagName !== 'OPTION') return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }

  function mouseClick(el) {
    const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function waitFor(fn, timeout = 1500) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = fn();
      if (r) return r;
      await sleep(40);
    }
    return null;
  }

  function fillText(el, value) {
    setNativeValue(el, value);
    highlight(el, true);
    return true;
  }

  function fillDate(el, value) {
    let v = String(value).trim();
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'date') {
      let m = v.match(/^(\d{4})[-/](\d{1,2})$/);
      if (m) v = `${m[1]}-${m[2].padStart(2, '0')}-01`;
      else {
        m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (m) v = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      }
    } else if (type === 'month') {
      const m = v.match(/^(\d{4})[-/](\d{1,2})/);
      if (m) v = `${m[1]}-${m[2].padStart(2, '0')}`;
    }
    setNativeValue(el, v);
    const ok = el.value !== '';
    highlight(el, ok);
    return ok;
  }

  function findNativeOptionIndex(el, value) {
    const target = norm(value);
    if (!target) return -1;
    for (let i = 0; i < el.options.length; i++) {
      const o = el.options[i];
      if ([o.text, o.value, o.label].some((t) => norm(t) === target)) return i;
    }
    let fuzzy = -1;
    for (let i = 0; i < el.options.length; i++) {
      const o = el.options[i];
      const n = norm(o.text) || norm(o.value) || norm(o.label);
      if (n && (n.includes(target) || target.includes(n))) { fuzzy = i; break; }
    }
    return fuzzy;
  }

  function fillNativeSelect(el, value) {
    const idx = findNativeOptionIndex(el, value);
    if (idx < 0) { highlight(el, false); return false; }
    el.selectedIndex = idx;
    el.value = el.options[idx].value;
    dispatch(el);
    highlight(el, true);
    return true;
  }

  function optionText(o) {
    const cy = o.querySelector ? o.querySelector('[data-cy-value]') : null;
    if (cy && cy.getAttribute('data-cy-value')) return cy.getAttribute('data-cy-value');
    if (o.getAttribute('data-cy-value')) return o.getAttribute('data-cy-value');
    return (o.textContent || '') + ' ' + (o.getAttribute('data-value') || '') + ' ' + (o.getAttribute('value') || '');
  }

  async function fillCustomSelect(el, value) {
    const target = norm(value);
    if (!target) return false;

    if (el.getAttribute('aria-expanded') !== 'true') mouseClick(el);

    const list = await waitFor(() => {
      const cid = el.getAttribute('aria-controls');
      if (cid) {
        const node = document.getElementById(cid);
        if (node && isVisible(node)) return node;
      }
      const boxes = Array.from(document.querySelectorAll('[role="listbox"]')).filter(isVisible);
      return boxes.length ? boxes[0] : null;
    });

    if (!list) {
      highlight(el, false);
      return false;
    }

    const options = Array.from(list.querySelectorAll('[role="option"], li, .atsx-select-dropdown-menu-item'))
      .filter((o) => isVisible(o) || isVisible(o.parentElement));
    let exact = null;
    let fuzzy = null;
    for (const o of options) {
      const n = norm(optionText(o));
      if (!n) continue;
      if (n === target) { exact = o; break; }
      if (!fuzzy && (n.includes(target) || target.includes(n))) fuzzy = o;
    }
    const chosen = exact || fuzzy;
    if (!chosen) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      highlight(el, false);
      return false;
    }

    const clickTarget = chosen.querySelector('[data-cy-value]') || chosen.querySelector('.atsx-clamp-content') || chosen;
    mouseClick(clickTarget);
    highlight(el, true);
    return true;
  }

  function radioLabel(radio) {
    if (radio.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
      if (lab) return (lab.innerText || '').trim();
    }
    const pl = radio.closest('label');
    if (pl) return (pl.innerText || '').trim();
    const next = radio.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE && next.textContent.trim()) {
      return next.textContent.trim();
    }
    if (radio.nextElementSibling) return (radio.nextElementSibling.innerText || '').trim();
    const wrapper = radio.closest('[class*="radio"]');
    if (wrapper) return (wrapper.innerText || '').trim();
    return radio.value || '';
  }

  function fillRadio(radios, value) {
    const target = norm(value);
    if (!target) return false;
    for (const r of radios) {
      const lt = norm(radioLabel(r));
      const rv = norm(r.value);
      if ((lt && (lt === target || lt.includes(target) || target.includes(lt))) ||
          (rv && (rv === target || rv.includes(target) || target.includes(rv)))) {
        // 用原生 click() 触发放射按钮的默认激活行为（切换 checked 并派发 change），
        // React 受控组件的 onChange 才能感知；视觉层高亮放到可见的包装元素上。
        r.click();
        const visual = r.closest('label') || r.closest('[class*="radio"]') || r;
        highlight(visual, true);
        return true;
      }
    }
    highlight(radios[0], false);
    return false;
  }

  /**
   * @param {object} item { element, elements?, kind, value }
   * @returns {Promise<{ ok: boolean, skipped?: boolean }>}
   */
  async function fill(item) {
    const value = String(item.value == null ? '' : item.value).trim();
    if (!value) return { ok: false, skipped: true };
    let ok = false;
    switch (item.kind) {
      case 'select':
        ok = item.element.tagName === 'SELECT'
          ? fillNativeSelect(item.element, value)
          : await fillCustomSelect(item.element, value);
        break;
      case 'radio-group': ok = fillRadio(item.elements || [item.element], value); break;
      case 'date': ok = fillDate(item.element, value); break;
      default: ok = fillText(item.element, value);
    }
    return { ok };
  }

  return { fill, highlight };
})();