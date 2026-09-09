/**
 * 逐字段预览确认面板。
 * 使用 Shadow DOM 隔离样式。列出识别成功的字段映射（可编辑值、可勾选），
 * 以及未识别控件（可手动指定字段），确认后调用 FormFiller 执行填充。
 * 依赖：lib/fields.js、content/filler.js
 */
const FillPanel = (() => {
  const HOST_ID = 'jaf-panel-host';
  let host = null;

  const CSS = `
    * { box-sizing: border-box; }
    .panel {
      position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
      background: #fff; color: #1f2430; z-index: 2147483647;
      display: flex; flex-direction: column;
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif; font-size: 13px;
      border-left: 1px solid #dfe4ec; box-shadow: -4px 0 18px rgba(0,0,0,.12);
    }
    .head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #e4e8f0; flex-shrink: 0;
    }
    .head h3 { margin: 0; font-size: 15px; }
    .close { cursor: pointer; font-size: 20px; color: #8a93a6; border: none; background: none; padding: 0 4px; }
    .close:hover { color: #1f2430; }
    .summary { padding: 10px 16px; color: #5a6372; border-bottom: 1px solid #eef1f6; flex-shrink: 0; line-height: 1.6; }
    .hint { color: #b77700; margin-top: 4px; }
    .body { flex: 1; overflow-y: auto; padding: 8px 16px; }
    .row {
      display: flex; align-items: center; gap: 8px; padding: 7px 0;
      border-bottom: 1px dashed #eef1f6;
    }
    .row input[type="checkbox"] { flex-shrink: 0; }
    .badge {
      flex-shrink: 0; min-width: 64px; text-align: center;
      background: #eef4ff; color: #3566e8; border-radius: 4px;
      padding: 3px 6px; font-size: 12px; white-space: nowrap;
    }
    .ctx {
      flex-shrink: 0; width: 110px; color: #8a93a6; font-size: 12px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .val {
      flex: 1; min-width: 0; padding: 5px 8px; font-size: 13px;
      border: 1px solid #cdd5e1; border-radius: 4px; font-family: inherit;
    }
    .val:focus { outline: none; border-color: #4a7dff; }
    select.val { flex: 1; }
    .section-title { margin: 12px 0 4px; font-weight: 600; color: #4a5568; }
    .unmatched-note { color: #8a93a6; font-size: 12px; margin: 2px 0 6px; }
    .foot {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      border-top: 1px solid #e4e8f0; flex-shrink: 0;
    }
    .foot label { color: #5a6372; display: flex; align-items: center; gap: 4px; }
    .btn {
      padding: 7px 14px; border-radius: 6px; border: 1px solid #cdd5e1;
      background: #fff; cursor: pointer; font-size: 13px;
    }
    .btn-primary { background: #4a7dff; border-color: #4a7dff; color: #fff; margin-left: auto; }
    .btn-primary:hover { background: #3566e8; }
    .result { padding: 8px 16px; color: #2c7a3f; border-top: 1px solid #eef1f6; flex-shrink: 0; }
    .scroll-tip { cursor: pointer; color: #3566e8; text-decoration: underline; }
  `;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function remove() {
    if (host) { host.remove(); host = null; }
  }

  function scrollToControl(item) {
    const target = item.element;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
  }

  const SCOPE_NAMES = { education: '教育经历', projects: '项目经历', internships: '实习经历' };

  function recordHints(matched, profile) {
    const hints = [];
    for (const [scope, name] of Object.entries(SCOPE_NAMES)) {
      const groups = matched
        .filter((m) => m.def.scope === scope)
        .reduce((max, m) => Math.max(max, m.occurrence + 1), 0);
      const total = (profile[scope] || []).length;
      if (total > 1 && groups > 0 && total > groups) {
        hints.push(`${name}共 ${total} 条，页面识别到 ${groups} 组；如需填充更多，请先在页面上点击「添加」再重新扫描。`);
      }
    }
    return hints;
  }

  /**
   * @param {object} opts { matched, unmatched, profile }
   */
  function show({ matched, unmatched, profile }) {
    remove();
    host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    const panel = el('div', 'panel');
    shadow.appendChild(panel);

    // ===== 头部 =====
    const head = el('div', 'head');
    head.appendChild(el('h3', null, '字段预览确认'));
    const closeBtn = el('button', 'close', '×');
    closeBtn.addEventListener('click', remove);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    // ===== 统计与提示 =====
    const summary = el('div', 'summary');
    summary.appendChild(el('div', null,
      `已识别 ${matched.length} 个字段，${unmatched.length} 个控件未识别。请逐项核对，确认后写入页面。`));
    for (const hint of recordHints(matched, profile)) {
      summary.appendChild(el('div', 'hint', hint));
    }
    panel.appendChild(summary);

    // ===== 主体列表 =====
    const body = el('div', 'body');
    panel.appendChild(body);
    const matchedRows = [];
    const unmatchedRows = [];

    for (const item of matched) {
      const row = el('div', 'row');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.value !== '';
      const badgeText = item.occurrence > 0
        ? `${item.def.label} #${item.occurrence + 1}`
        : item.def.label;
      const badge = el('span', 'badge', badgeText);
      const ctx = el('span', 'scroll-tip ctx', item.ctxLabel);
      ctx.title = `页面字段：${item.ctxLabel}（点击定位）`;
      ctx.addEventListener('click', () => scrollToControl(item));
      const val = el('input', 'val');
      val.type = 'text';
      val.value = item.value;
      val.addEventListener('input', () => { item.value = val.value; });
      row.appendChild(checkbox);
      row.appendChild(badge);
      row.appendChild(ctx);
      row.appendChild(val);
      body.appendChild(row);
      matchedRows.push({ item, checkbox, val });
    }

    if (unmatched.length > 0) {
      body.appendChild(el('div', 'section-title', `未识别控件（${unmatched.length}）`));
      body.appendChild(el('div', 'unmatched-note', '可为下列控件手动指定对应字段；不需要填充的保持「忽略」。'));
      for (const item of unmatched) {
        const row = el('div', 'row');
        const ctx = el('span', 'scroll-tip ctx', item.ctxLabel);
        ctx.title = `页面字段：${item.ctxLabel}（点击定位）`;
        ctx.addEventListener('click', () => scrollToControl(item));
        const select = el('select', 'val');
        const ignoreOpt = document.createElement('option');
        ignoreOpt.value = '';
        ignoreOpt.textContent = '忽略';
        select.appendChild(ignoreOpt);
        for (const def of FIELD_DEFS) {
          const o = document.createElement('option');
          o.value = def.key;
          o.textContent = def.label;
          select.appendChild(o);
        }
        const val = el('input', 'val');
        val.type = 'text';
        val.placeholder = '选择字段后自动带出，可修改';
        select.addEventListener('change', () => {
          const def = fieldDefByKey(select.value);
          if (def) val.value = resolveFieldValue(def, profile, 0);
        });
        row.appendChild(ctx);
        row.appendChild(select);
        row.appendChild(val);
        body.appendChild(row);
        unmatchedRows.push({ item, select, val });
      }
    }

    // ===== 底部操作 =====
    const foot = el('div', 'foot');
    const toggleLabel = el('label');
    const toggleAll = document.createElement('input');
    toggleAll.type = 'checkbox';
    toggleAll.checked = true;
    toggleLabel.appendChild(toggleAll);
    toggleLabel.appendChild(document.createTextNode('全选'));
    toggleAll.addEventListener('change', () => {
      for (const r of matchedRows) r.checkbox.checked = toggleAll.checked;
    });
    const cancelBtn = el('button', 'btn', '取消');
    cancelBtn.addEventListener('click', remove);
    const confirmBtn = el('button', 'btn btn-primary', '确认填充');
    foot.appendChild(toggleLabel);
    foot.appendChild(cancelBtn);
    foot.appendChild(confirmBtn);
    panel.appendChild(foot);

    const result = el('div', 'result');
    result.style.display = 'none';
    panel.appendChild(result);

    confirmBtn.addEventListener('click', () => {
      const tasks = [];
      for (const r of matchedRows) {
        if (r.checkbox.checked) {
          tasks.push({
            element: r.item.element,
            elements: r.item.elements,
            kind: r.item.kind,
            value: r.val.value
          });
        }
      }
      for (const r of unmatchedRows) {
        if (r.select.value) {
          tasks.push({
            element: r.item.element,
            elements: r.item.elements,
            kind: r.item.kind,
            value: r.val.value
          });
        }
      }
      let ok = 0, fail = 0, skip = 0;
      for (const t of tasks) {
        const r = FormFiller.fill(t);
        if (r.skipped) skip++;
        else if (r.ok) ok++;
        else fail++;
      }
      let msg = `填充完成：成功 ${ok} 项`;
      if (fail > 0) msg += `，失败 ${fail} 项（已标黄，请手动填写）`;
      if (skip > 0) msg += `，跳过空值 ${skip} 项`;
      result.textContent = msg;
      result.style.display = 'block';
      confirmBtn.textContent = '再次填充';
    });

    document.body.appendChild(host);
  }

  return { show, remove };
})();
