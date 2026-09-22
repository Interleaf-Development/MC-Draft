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
  skip: t('Skip to proposal', '跳至建議書內容'),
  contents: t('Contents', '目錄'),
  draftMark: t('SCOPE PROPOSAL', '產品範圍建議書'),
  draftDate: t('22 September 2026', '2026年9月22日'),
  draftNote: t('Draft for discussion', '討論初稿'),
  print: t('Print', '列印'),
  documentType: t('01 / Product scope and delivery proposal', '01 / 產品範圍及交付建議'),
  documentTitle: t('MathConcept Digital Teaching & Centre Management System', 'MathConcept 數碼教學及中心管理系統'),
  documentSummary: t('Proposed functions, operating rules, delivery scope and commercial items for review. This document covers the use of existing materials, teaching and student work, centre administration and franchise management.', '本建議書列明擬提供的功能、營運規則、交付範圍及待議定的商業安排，涵蓋現有教材使用、教與學、中心行政及加盟管理。'),
  preparedFor: t('Prepared for', '提交對象'),
  documentLabel: t('Document', '文件類別'),
  documentValue: t('Product scope proposal', '產品範圍建議書'),
  dateLabel: t('Date', '日期'),
  statusLabel: t('Status', '文件狀態'),
  statusValue: t('Draft; scope, fees and dates to be agreed', '初稿；範圍、費用及日期有待議定'),
  scopeOverview: t('Scope overview', '範圍摘要'),
  area: t('Area', '項目'),
  proposedScope: t('Proposed scope', '建議範圍'),
  sections: t('Sections', '章節'),
  materials: t('Materials and curriculum', '教材及課程'),
  materialsScope: t('Controlled access to existing materials, approved printing, content organisation, question reuse and new worksheet creation.', '管理現有教材的取用及列印權限，整理教材、重用題目及編製新工作紙。'),
  teaching: t('Teaching and student work', '教學及學生習作'),
  teachingScope: t('Class and student selection, progress-chart assignment, digital working, teacher marking and corrections.', '按班別及學生選取教材，透過學習進度表派發習作，支援數碼書寫、老師批改及學生改正。'),
  operations: t('Centre and parent operations', '中心及家長事務'),
  operationsScope: t('Student records, scheduling, leave, make-up lessons, temporary or permanent timetable changes and parent communication.', '學生紀錄、排課、請假、補堂、臨時或恆常調堂，以及家長溝通。'),
  billing: t('Billing and reconciliation', '收費及對帳'),
  billingScope: t('Invoice queues, payment proof review, agreed receipt issuance, reminders and bank-statement reconciliation.', '帳單待辦清單、付款證明審核、按議定政策發出收據、繳費提醒及銀行月結單對帳。'),
  franchise: t('HQ and franchise management', '總部及加盟管理'),
  franchiseScope: t('Centre permissions, approved curriculum, shared operating rules, oversight and access changes when staff or franchises leave.', '中心權限、已審批課程、共用營運規則、營運監察，以及職員離任或加盟合作結束時的權限調整。'),
  delivery: t('Delivery and commercial terms', '交付及商業安排'),
  deliveryScope: t('Pilot scope, responsibilities, acceptance criteria, phased rollout, pricing items, support and ownership.', '試行範圍、責任分工、驗收準則、分階段推展、報價項目、支援及擁有權。'),
  planningBasis: t('Planning basis', '規劃依據'),
  planningBasisText: t('The current planning estimate is more than 200,000 material files and approximately 20,000 students across centres. The file inventory, first-release coverage and pilot group must be confirmed before fees and delivery dates are agreed.', '目前按超過 200,000 份教材檔案及各中心約 20,000 名學生作規劃。議定費用及交付日期前，須確認教材盤點、首階段涵蓋範圍及試行對象。'),
  demoBoundary: t('Interactive examples use the current UI demo. Proposed functions and acceptance conditions are specified in the relevant sections; a demonstration does not establish readiness for live operation.', '互動示例採用現有介面示範。建議功能及驗收條件於相關章節列明；示範可操作並不代表已可正式投入營運。'),
  rolesLink: t('02. Users and responsibilities', '02. 使用者及責任分工'),
  termsLink: t('12. Scope and commercial terms', '12. 範圍及商業安排')
};
