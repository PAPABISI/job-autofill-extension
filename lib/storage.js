/**
 * 资料本地存储模块（chrome.storage.local）。
 * 数据结构：
 * {
 *   basic:     { name, gender, birthDate, phone, email, idCard, politicalStatus,
 *                nativePlace, currentCity, expectedCity, expectedSalary, address, qq, wechat, englishLevel },
 *   education: [ { school, degree, major, start, end, gpa, rank } ],
 *   projects:  [ { name, role, start, end, description } ],
 *   extra:     { skills, awards, selfEval }
 * }
 */
const ProfileStorage = {
  KEY: 'jaf_profile',

  emptyProfile() {
    return {
      basic: {
        name: '', gender: '', birthDate: '', phone: '', email: '', idCard: '',
        politicalStatus: '', nativePlace: '', currentCity: '', expectedCity: '',
        expectedSalary: '', address: '', qq: '', wechat: '', englishLevel: ''
      },
      education: [],
      projects: [],
      extra: { skills: '', awards: '', selfEval: '' }
    };
  },

  async get() {
    const data = await chrome.storage.local.get(this.KEY);
    const profile = data[this.KEY];
    if (!profile) return this.emptyProfile();
    const merged = this.emptyProfile();
    Object.assign(merged.basic, profile.basic || {});
    Object.assign(merged.extra, profile.extra || {});
    merged.education = Array.isArray(profile.education) ? profile.education : [];
    merged.projects = Array.isArray(profile.projects) ? profile.projects : [];
    return merged;
  },

  async save(profile) {
    await chrome.storage.local.set({ [this.KEY]: profile });
  },

  isEmpty(profile) {
    const filled = (obj) => Object.values(obj || {}).some((v) => String(v || '').trim() !== '');
    return (
      !filled(profile.basic) &&
      !filled(profile.extra) &&
      (profile.education || []).length === 0 &&
      (profile.projects || []).length === 0
    );
  }
};
