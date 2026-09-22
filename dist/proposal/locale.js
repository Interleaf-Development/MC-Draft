export function getProposalLanguage(url) {
  return url.searchParams.get('lang') === 'zh-HK' ? 'zh-HK' : 'en';
}

export function proposalLanguageUrl(href, nextLanguage, { chapter, present = false } = {}) {
  const url = new URL(href);
  if (nextLanguage === 'zh-HK') url.searchParams.set('lang', 'zh-HK');
  else url.searchParams.delete('lang');
  if (present) url.searchParams.set('view', 'present');
  else url.searchParams.delete('view');
  if (chapter) url.hash = chapter;
  return url.pathname + url.search + url.hash;
}

export const language = typeof location === 'undefined' ? 'en' : getProposalLanguage(new URL(location.href));
export const t = (en, zh) => language === 'zh-HK' ? zh : en;

// This copy belongs to the proposal. The embedded application keeps its own
// established staff/family languages and saved demo state.
export const shellText = {
  skip: t('Skip to proposal', '跳至提案內容'),
  future: t('A connected future', '連繫各中心的未來'),
  draftMark: t('PROPOSAL / 01', '項目提案 / 01'),
  draftDate: t('22 September 2026', '2026年9月22日'),
  draftNote: t('First draft for discussion', '討論初稿'),
  eyebrow: t('01 / THE PROPOSAL', '01 / 項目提案'),
  heroFirst: t('One curriculum.', '同一套課程。'),
  heroSecond: t('Every centre.', '每一間中心。'),
  heroThird: t('Connected.', '緊密連繫。'),
  lead: t('Protect what makes MathConcept valuable. Give every teacher, student and centre a better way to work.', '保護 MathConcept 的核心教材，讓老師、學生和各中心以更便捷的方式教學、學習及運作。'),
  explore: t('Explore the proposal', '了解提案'),
  materialCount: t('existing materials & files', '份現有教材及檔案'),
  studentCount: t('students across centres', '名各中心學生'),
  boardLabel: t('THE CURRICULUM, AT THE CENTRE', '以教材為核心'),
  worksheetLevel: t('MATHCONCEPT / P6', 'MATHCONCEPT / 小六'),
  worksheetTitle: t('Division of decimals', '小數除法'),
  showWorking: t('Show your working.', '請列出計算步驟。'),
  sampleWorksheet: t('Illustrative worksheet', '示意工作紙'),
  headquarters: t('HQ publishes', '總部發佈'),
  teacher: t('Teacher assigns', '老師派發'),
  student: t('Student learns', '學生學習'),
  protectTitle: t('Protect the materials', '保護教材'),
  protectBody: t('Controlled access, authorised printing and accountable distribution.', '管理存取權限及列印授權，並保留教材發放紀錄。'),
  simplifyTitle: t('Simplify daily work', '簡化日常工作'),
  simplifyBody: t('Teaching, scheduling and payments connected through one system.', '透過同一個系統連繫教學、課表安排及繳費流程。'),
  centresTitle: t('Support every centre', '支援每一間中心'),
  centresBody: t('Consistent tools and curriculum as the franchise network grows.', '隨着加盟網絡擴展，讓各中心使用一致的工具及教材。')
};
