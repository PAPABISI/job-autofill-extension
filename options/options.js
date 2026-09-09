/* 资料管理页逻辑：渲染表单、保存到 chrome.storage.local、导入导出 JSON。 */

const BASIC_FIELDS = [
  { prop: 'name', label: '姓名' },
  { prop: 'gender', label: '性别', type: 'select', options: ['男', '女', '其他'] },
  { prop: 'birthDate', label: '出生日期', placeholder: 'YYYY-MM-DD' },
  { prop: 'phone', label: '手机号码' },
  { prop: 'email', label: '电子邮箱' },
  { prop: 'idCard', label: '证件号码' },
  { prop: 'politicalStatus', label: '政治面貌', type: 'select', options: ['群众', '共青团员', '中共预备党员', '中共党员', '其他'] },
  { prop: 'englishLevel', label: '英语水平', placeholder: '如 CET-6' },
  { prop: 'nativePlace', label: '籍贯/生源地' },
  { prop: 'currentCity', label: '现居城市' },
  { prop: 'expectedCity', label: '期望工作城市' },
  { prop: 'expectedSalary', label: '期望薪资' },
  { prop: 'address', label: '通讯地址' },
  { prop: 'qq', label: 'QQ' },
  { prop: 'wechat', label: '微信号' }
];

const EDU_FIELDS = [
  { prop: 'school', label: '毕业院校' },
  { prop: 'degree', label: '学历', type: 'select', options: ['大专', '本科', '硕士', '博士', 'MBA', '其他'] },
  { prop: 'major', label: '专业' },
  { prop: 'start', label: '入学时间 *', placeholder: 'YYYY-MM' },
  { prop: 'end', label: '毕业时间 *', placeholder: 'YYYY-MM' },
  { prop: 'gpa', label: '成绩/GPA', placeholder: '如 3.5/4.0 或 85/100' },
  { prop: 'rank', label: '专业排名', placeholder: '如 前10%' }
];

const PROJECT_FIELDS = [
  { prop: 'name', label: '项目名称' },
  { prop: 'role', label: '担任角色' },
  { prop: 'start', label: '开始时间 *', placeholder: 'YYYY-MM' },
  { prop: 'end', label: '结束时间 *', placeholder: 'YYYY-MM' },
  { prop: 'description', label: '项目描述', type: 'textarea' }
];

let profile = null;

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { el.hidden = true; }, 2000);
}

function buildField(f, value, dataProp) {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.className = 'field-label';
  span.textContent = f.label;
  wrap.appendChild(span);

  let input;
  if (f.type === 'select') {
    input = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '请选择';
    input.appendChild(empty);
    for (const opt of f.options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      input.appendChild(o);
    }
  } else if (f.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 4;
  } else {
    input = document.createElement('input');
    input.type = 'text';
  }
  input.dataset.prop = dataProp;
  if (f.placeholder) input.placeholder = f.placeholder;
  input.value = value || '';
  wrap.appendChild(input);
  return wrap;
}

function renderBasic() {
  const grid = document.getElementById('basic-grid');
  grid.innerHTML = '';
  for (const f of BASIC_FIELDS) {
    grid.appendChild(buildField(f, profile.basic[f.prop], f.prop));
  }
}

function renderRecordList(containerId, fields, records, sectionName) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (records.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = `暂无记录，点击右上角「+ 添加${sectionName}」按钮新增。`;
    container.appendChild(hint);
    return;
  }
  records.forEach((rec, idx) => {
    const card = document.createElement('div');
    card.className = 'record-card';

    const head = document.createElement('div');
    head.className = 'record-head';
    const title = document.createElement('span');
    title.className = 'record-title';
    title.textContent = `${sectionName} ${idx + 1}`;
    const del = document.createElement('button');
    del.className = 'btn btn-small btn-danger';
    del.textContent = '删除';
    del.addEventListener('click', () => {
      records.splice(idx, 1);
      renderRecordList(containerId, fields, records, sectionName);
    });
    head.appendChild(title);
    head.appendChild(del);
    card.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const f of fields) {
      const node = buildField(f, rec[f.prop], f.prop);
      if (f.type === 'textarea') {
        grid.appendChild(node);
        node.style.gridColumn = '1 / -1';
      } else {
        grid.appendChild(node);
      }
    }
    card.appendChild(grid);
    container.appendChild(card);
  });
}

function renderAll() {
  renderBasic();
  renderRecordList('education-list', EDU_FIELDS, profile.education, '教育经历');
  renderRecordList('project-list', PROJECT_FIELDS, profile.projects, '项目经历');
  document.getElementById('extra-skills').value = profile.extra.skills || '';
  document.getElementById('extra-awards').value = profile.extra.awards || '';
  document.getElementById('extra-selfEval').value = profile.extra.selfEval || '';
}

function collectBasic() {
  const out = {};
  document.querySelectorAll('#basic-grid [data-prop]').forEach((el) => {
    out[el.dataset.prop] = el.value.trim();
  });
  return out;
}

function collectRecords(containerId) {
  const list = [];
  document.querySelectorAll(`#${containerId} .record-card`).forEach((card) => {
    const rec = {};
    card.querySelectorAll('[data-prop]').forEach((el) => {
      rec[el.dataset.prop] = el.value.trim();
    });
    list.push(rec);
  });
  return list;
}

function collectProfile() {
  return {
    basic: collectBasic(),
    education: collectRecords('education-list'),
    projects: collectRecords('project-list'),
    extra: {
      skills: document.getElementById('extra-skills').value.trim(),
      awards: document.getElementById('extra-awards').value.trim(),
      selfEval: document.getElementById('extra-selfEval').value.trim()
    }
  };
}

function exportJson() {
  const data = collectProfile();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '网申助手资料.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (typeof data !== 'object' || data === null) throw new Error('bad format');
      const fresh = ProfileStorage.emptyProfile();
      if (data.basic && typeof data.basic === 'object') Object.assign(fresh.basic, data.basic);
      if (data.extra && typeof data.extra === 'object') Object.assign(fresh.extra, data.extra);
      if (Array.isArray(data.education)) fresh.education = data.education;
      if (Array.isArray(data.projects)) fresh.projects = data.projects;
      profile = fresh;
      renderAll();
      await ProfileStorage.save(profile);
      toast('导入成功，已保存');
    } catch (e) {
      toast('导入失败：文件格式不正确');
    }
  };
  reader.readAsText(file);
}

async function init() {
  profile = await ProfileStorage.get();
  renderAll();

  document.getElementById('btn-save').addEventListener('click', async () => {
    profile = collectProfile();
    await ProfileStorage.save(profile);
    toast('已保存');
  });
  document.getElementById('btn-add-edu').addEventListener('click', () => {
    profile = collectProfile();
    profile.education.push({ school: '', degree: '', major: '', start: '', end: '', gpa: '', rank: '' });
    renderAll();
  });
  document.getElementById('btn-add-project').addEventListener('click', () => {
    profile = collectProfile();
    profile.projects.push({ name: '', role: '', start: '', end: '', description: '' });
    renderAll();
  });
  document.getElementById('btn-export').addEventListener('click', exportJson);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  });
}

init();
