/**
 * 填充执行器：把确认后的值写入页面控件。
 * 使用原生 value setter + 派发 input/change 事件，确保 React/Vue 等框架的受控组件能感知。
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

  function fillSelect(el, value) {
    const target = String(value).trim().toLowerCase();
    if (!target) return false;
    let best = null;
    for (const opt of el.options) {
      const t = (opt.text || '').trim().toLowerCase();
      const v = (opt.value || '').trim().toLowerCase();
      if ((t && t === target) || (v && v === target)) { best = opt; break; }
    }
    if (!best) {
      for (const opt of el.options) {
        const t = (opt.text || '').trim().toLowerCase();
        if (t && (t.includes(target) || target.includes(t))) { best = opt; break; }
      }
    }
    if (!best) { highlight(el, false); return false; }
    el.value = best.value;
    dispatch(el);
    const ok = el.value === best.value;
    highlight(el, ok);
    return ok;
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
    return radio.value || '';
  }

  function fillRadio(radios, value) {
    const target = String(value).trim().toLowerCase();
    if (!target) return false;
    for (const r of radios) {
      const lt = radioLabel(r).toLowerCase();
      const rv = (r.value || '').trim().toLowerCase();
      if (lt === target || rv === target ||
          (lt && lt.includes(target)) ||
          (lt && target.includes(lt))) {
        r.click();
        highlight(r, true);
        return true;
      }
    }
    highlight(radios[0], false);
    return false;
  }

  /**
   * @param {object} item { element, elements?, kind, value }
   * @returns {{ ok: boolean, skipped?: boolean }}
   */
  function fill(item) {
    const value = String(item.value == null ? '' : item.value).trim();
    if (!value) return { ok: false, skipped: true };
    let ok = false;
    switch (item.kind) {
      case 'select': ok = fillSelect(item.element, value); break;
      case 'radio-group': ok = fillRadio(item.elements || [item.element], value); break;
      case 'date': ok = fillDate(item.element, value); break;
      default: ok = fillText(item.element, value);
    }
    return { ok };
  }

  return { fill, highlight };
})();
