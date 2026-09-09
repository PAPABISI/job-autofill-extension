/**
 * 字段定义表：options 页与 content script 共用。
 * - key:      字段唯一标识
 * - label:    面板中显示的中文名
 * - scope:    资料中的分区（basic / education / projects / extra）
 * - prop:     分区内属性名
 * - keywords: 识别关键词，越靠前优先级越高；中英文混合，匹配时不区分大小写
 * - kind:     特殊控件类型提示（date / choice），默认按文本处理
 * - multiline: 长文本，优先匹配 textarea
 */
const FIELD_DEFS = [
  // ===== 基本信息 =====
  { key: 'name', label: '姓名', scope: 'basic', prop: 'name',
    keywords: ['真实姓名', '您的姓名', '申请人姓名', '姓名', 'full name', 'fullname', 'full_name', 'full-name',
               'realname', 'real_name', 'real-name', 'candidate name', 'lastname', 'name', 'xingming', 'xm'] },
  { key: 'gender', label: '性别', scope: 'basic', prop: 'gender', kind: 'choice',
    keywords: ['性别', 'gender', 'sex', 'xb'] },
  { key: 'birthDate', label: '出生日期', scope: 'basic', prop: 'birthDate', kind: 'date',
    keywords: ['出生日期', '出生年月', '出生时间', '生日', 'date of birth', 'dateofbirth', 'birth date',
               'birthday', 'birth', 'dob', 'csrq'] },
  { key: 'phone', label: '手机号码', scope: 'basic', prop: 'phone',
    keywords: ['手机号码', '联系电话', '手机号', '手机', '电话', '联系方式', 'mobile phone', 'phone number',
               'mobile', 'telephone', 'phone', 'cellphone', 'tel', 'sjh', 'lxdh'] },
  { key: 'email', label: '电子邮箱', scope: 'basic', prop: 'email',
    keywords: ['电子邮箱', '邮箱地址', '邮箱', '邮件', 'email address', 'e-mail', 'email', 'mail', 'yx'] },
  { key: 'idCard', label: '证件号码', scope: 'basic', prop: 'idCard',
    keywords: ['身份证号码', '身份证号', '证件号码', '证件号', '身份证', 'id card', 'idcard', 'id_card',
               'id number', 'idnumber', 'id_number', 'identity', 'zjhm', 'sfzh'] },
  { key: 'politicalStatus', label: '政治面貌', scope: 'basic', prop: 'politicalStatus',
    keywords: ['政治面貌', 'political status', 'political', 'zzmm'] },
  { key: 'highestDegree', label: '最高学历', scope: 'basic', prop: 'highestDegree', kind: 'choice',
    keywords: ['最高学历', '最高学位', 'highest degree', 'highest education', 'zgxw'] },
  { key: 'nativePlace', label: '籍贯/生源地', scope: 'basic', prop: 'nativePlace',
    keywords: ['籍贯', '生源地', '户籍所在地', '户籍', '户口所在地', 'native place', 'nativeplace', 'jg', 'syd'] },
  { key: 'currentCity', label: '现居城市', scope: 'basic', prop: 'currentCity',
    keywords: ['现居城市', '现居住地', '现所在地', '所在城市', '居住地', 'current city', 'currentcity', 'city'] },
  { key: 'expectedCity', label: '期望工作城市', scope: 'basic', prop: 'expectedCity',
    keywords: ['期望工作城市', '期望工作地点', '意向工作城市', '意向城市', '期望城市', '工作地点', '工作城市',
               'expected city', 'preferred city', 'work city', 'gzdd'] },
  { key: 'expectedSalary', label: '期望薪资', scope: 'basic', prop: 'expectedSalary',
    keywords: ['期望薪资', '期望月薪', '期望年薪', '薪资要求', 'expected salary', 'salary expectation', 'salary'] },
  { key: 'address', label: '通讯地址', scope: 'basic', prop: 'address',
    keywords: ['通讯地址', '通信地址', '联系地址', '家庭住址', '家庭地址', '详细地址', '地址', 'address', 'dz'] },
  { key: 'qq', label: 'QQ', scope: 'basic', prop: 'qq',
    keywords: ['qq号', 'qq号码', 'qq'] },
  { key: 'wechat', label: '微信号', scope: 'basic', prop: 'wechat',
    keywords: ['微信号', '微信', 'wechat', 'weixin', 'wx'] },
  { key: 'englishLevel', label: '英语水平', scope: 'basic', prop: 'englishLevel',
    keywords: ['英语水平', '外语水平', '英语等级', 'english level', 'englishlevel', 'english', 'cet'] },

  // ===== 教育经历（多条） =====
  { key: 'school', label: '毕业院校', scope: 'education', prop: 'school',
    keywords: ['毕业院校', '毕业学校', '学校名称', '院校名称', '所在学校', '就读学校', '就读院校', '高校名称',
               '学校', '院校', 'university', 'college', 'school', 'institution', 'xxmc'] },
  { key: 'degree', label: '学历', scope: 'education', prop: 'degree', kind: 'choice',
    keywords: ['最高学历', '学历层次', '学历', '学位', 'education level', 'degree', 'education background',
               'education', 'xl'] },
  { key: 'major', label: '专业', scope: 'education', prop: 'major',
    keywords: ['专业名称', '所学专业', '专业方向', '专业', 'major', 'specialty', 'discipline', 'zymc'] },
  { key: 'eduStart', label: '入学时间', scope: 'education', prop: 'start', kind: 'date',
    keywords: ['入学时间', '入学日期', '入学年月', '入校时间', 'enrollment date', 'admission date',
               'education start', 'rxsj'] },
  { key: 'eduEnd', label: '毕业时间', scope: 'education', prop: 'end', kind: 'date',
    keywords: ['毕业时间', '毕业日期', '毕业年月', '预计毕业时间', 'graduation date', 'graduation time',
               'graduation', 'bysj'] },
  { key: 'gpa', label: '成绩/GPA', scope: 'education', prop: 'gpa',
    keywords: ['平均学分绩点', 'gpa', '绩点', '加权成绩', '平均成绩', '专业成绩', '学习成绩', '成绩',
               'grade point', 'score'] },
  { key: 'rank', label: '专业排名', scope: 'education', prop: 'rank',
    keywords: ['专业排名', '年级排名', '综合排名', '排名', 'ranking', 'rank', 'pm'] },

  // ===== 项目经历（多条） =====
  { key: 'projectName', label: '项目名称', scope: 'projects', prop: 'name',
    keywords: ['项目名称', '项目名', 'project name', 'projectname', 'project_name', 'project title',
               'project', 'xmmc'] },
  { key: 'projectRole', label: '担任角色', scope: 'projects', prop: 'role',
    keywords: ['担任角色', '项目角色', '项目职责', '承担职责', '职责', 'my role', 'role', 'responsibility'] },
  { key: 'projectStart', label: '项目开始时间', scope: 'projects', prop: 'start', kind: 'date',
    keywords: ['项目开始时间', '项目开始日期', 'project start', 'start date', 'startdate'] },
  { key: 'projectEnd', label: '项目结束时间', scope: 'projects', prop: 'end', kind: 'date',
    keywords: ['项目结束时间', '项目结束日期', 'project end', 'end date', 'enddate'] },
  { key: 'projectDesc', label: '项目描述', scope: 'projects', prop: 'description', multiline: true,
    keywords: ['项目描述', '项目介绍', '项目详情', '项目内容', '项目经历描述', '主要工作内容', '主要工作',
               'project description', 'project detail', 'description', 'xmms'] },

  // ===== 实习经历（多条） =====
  { key: 'company', label: '实习公司', scope: 'internships', prop: 'company',
    keywords: ['实习公司', '实习单位', '公司名称', '单位名称', '实习机构', '公司', 'company',
               'employer', 'organization', 'gsmc'] },
  { key: 'position', label: '实习岗位', scope: 'internships', prop: 'position',
    keywords: ['实习岗位', '实习职位', '岗位名称', '职位名称', '岗位', '职位', 'internship position',
               'position', 'job title', 'gwmc'] },
  { key: 'internStart', label: '实习开始时间', scope: 'internships', prop: 'start', kind: 'date',
    keywords: ['实习开始时间', '实习开始日期', 'internship start', 'sxkssj'] },
  { key: 'internEnd', label: '实习结束时间', scope: 'internships', prop: 'end', kind: 'date',
    keywords: ['实习结束时间', '实习结束日期', 'internship end', 'sxjssj'] },
  { key: 'internDesc', label: '实习内容', scope: 'internships', prop: 'description', multiline: true,
    keywords: ['实习内容', '实习描述', '工作内容', '工作描述', '实习经历描述', '工作职责',
               'internship description', 'work description', 'sxnr'] },

  // ===== 补充信息 =====
  { key: 'skills', label: '技能特长', scope: 'extra', prop: 'skills', multiline: true,
    keywords: ['专业技能', '技能特长', '个人技能', '技能', 'skills', 'skill', 'jntc'] },
  { key: 'awards', label: '获奖情况', scope: 'extra', prop: 'awards', multiline: true,
    keywords: ['获奖情况', '获奖经历', '奖励情况', '荣誉奖项', '获奖', '荣誉', 'awards', 'award', 'honor'] },
  { key: 'selfEval', label: '自我评价', scope: 'extra', prop: 'selfEval', multiline: true,
    keywords: ['自我评价', '自我介绍', '个人评价', '个人简介', '自我描述', 'self evaluation', 'self-evaluation',
               'self intro', 'about yourself', 'personal statement', 'zwpj'] }
];

/** 根据字段定义从资料中取值。array 型 scope 用 occurrence 定位第几条记录。 */
function resolveFieldValue(def, profile, occurrence) {
  const src = profile ? profile[def.scope] : null;
  if (!src) return '';
  if (Array.isArray(src)) {
    const rec = src[occurrence || 0];
    return rec ? String(rec[def.prop] || '') : '';
  }
  return String(src[def.prop] || '');
}

function fieldDefByKey(key) {
  return FIELD_DEFS.find((d) => d.key === key) || null;
}
