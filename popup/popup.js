/* Popup：显示资料摘要，触发当前页扫描填充；content script 未就绪时动态注入。 */

const CONTENT_FILES = [
  'lib/storage.js',
  'lib/fields.js',
  'content/detector.js',
  'content/filler.js',
  'content/panel.js',
  'content/content.js'
];

const statusEl = document.getElementById('status');
const fillBtn = document.getElementById('btn-fill');

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? 'status error' : 'status';
}

async function showProfileSummary() {
  const profile = await ProfileStorage.get();
  const summaryEl = document.getElementById('profile-summary');
  if (ProfileStorage.isEmpty(profile)) {
    summaryEl.textContent = '尚未填写资料，请先点击「管理我的资料」。';
    return;
  }
  const name = profile.basic.name || '（未填姓名）';
  const lines = [
    `${name}`,
    `教育经历 ${profile.education.length} 条 · 项目经历 ${profile.projects.length} 条`
  ];
  summaryEl.textContent = lines.join('\n');
}

async function ensureInjected(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'JAF_PING' });
  } catch (e) {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/page.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
  }
}

async function startFill() {
  fillBtn.disabled = true;
  setStatus('正在扫描页面…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || '')) {
      setStatus('当前页面不支持填充（仅支持 http/https 页面）', true);
      return;
    }
    await ensureInjected(tab.id);
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'JAF_START' });
    if (resp && resp.ok) {
      setStatus(`识别到 ${resp.matched} 个字段，请在页面右侧确认。`);
    } else if (resp && resp.reason === 'empty-profile') {
      setStatus('请先填写资料。', true);
    } else {
      setStatus('');
    }
  } catch (e) {
    setStatus('无法在当前页面运行，请刷新页面后重试。', true);
  } finally {
    fillBtn.disabled = false;
  }
}

document.getElementById('btn-fill').addEventListener('click', startFill);
document.getElementById('btn-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

showProfileSummary();
