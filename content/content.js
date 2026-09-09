/**
 * Content script 入口：接收 popup 指令，扫描页面并打开预览确认面板。
 * 依赖加载顺序：lib/storage.js → lib/fields.js → detector.js → filler.js → panel.js → 本文件
 */
(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'JAF_PING') {
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'JAF_START') {
      startFill().then(sendResponse);
      return true; // 异步响应
    }
    return false;
  });

  async function startFill() {
    const profile = await ProfileStorage.get();
    if (ProfileStorage.isEmpty(profile)) {
      const go = window.confirm('还没有保存个人资料。\n点击「确定」打开资料管理页填写姓名、学历、项目经历等信息。');
      if (go) window.open(chrome.runtime.getURL('options/options.html'), '_blank');
      return { ok: false, reason: 'empty-profile' };
    }
    const { matched, unmatched } = FormDetector.scan(profile);
    if (matched.length === 0 && unmatched.length === 0) {
      window.alert('当前页面没有检测到可填充的表单控件。\n请确认页面已加载完成（如是动态表单，先展开对应区块再试）。');
      return { ok: false, reason: 'no-controls' };
    }
    FillPanel.show({ matched, unmatched, profile });
    return { ok: true, matched: matched.length, unmatched: unmatched.length };
  }
})();
