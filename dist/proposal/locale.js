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
  draftMark: t('SCOPE PROPOSAL', '系統建議書'),
  draftDate: t('23 September 2026', '2026年9月23日'),
  draftNote: t('Draft for discussion', '初稿，供討論用'),
  print: t('Print', '列印'),
  documentType: t('01 / Product scope and delivery proposal', '01 / 系統功能及交付建議'),
  documentTitle: t('MathConcept Digital Teaching & Centre Management System', 'MathConcept 數碼教學及中心管理系統'),
  documentSummary: t('A proposed native app system for digital learning, teaching-material management and centre operations. The proposal begins with the student learning experience, then covers existing materials, new worksheet creation and administration.', '建議為 MathConcept 建立涵蓋學生學習、教材管理及中心營運的系統，並提供學生及家長專用的原生應用程式。本建議書先介紹學生如何使用數碼教材，再說明現有教材數碼化、新工作紙編製及中心行政功能。'),
  systemOverview: t('System overview', '系統概覽'),
  appOverview: t('The proposed delivery includes native apps for student tablet learning and parent phone use, alongside workspaces for teachers, centre staff and HQ. Student learning prioritises portrait tablets and a full-page writing surface. The supported devices and operating systems will be agreed for delivery.', '建議交付學生平板及家長手機專用的原生應用程式，並提供老師、中心職員和總部使用的工作介面。學生以直向平板作答，配合完整頁面的書寫空間。支援的裝置及作業系統須在確認交付範圍時議定。'),
  overviewRole: t('User', '使用者'),
  overviewTasks: t('Main tasks', '主要用途'),
  studentRole: t('Students', '學生'),
  studentTasks: t('Open assigned work in a digital binder, write answers, complete corrections and revisit past work. Future work stays locked until released.', '在學習冊開啟老師派發的習作、手寫作答、完成改正及重溫已完成的內容；日後習作須待老師開放後才可取用。'),
  parentRole: t('Parents', '家長'),
  parentTasks: t('Check lessons, request leave, communicate with the centre, view invoices and receipts, and upload payment proof.', '查看課堂安排、提交請假申請、與中心溝通、查閱帳單及收據，並上載付款證明。'),
  teacherRole: t('Teachers', '老師'),
  teacherTasks: t('Select students by class, assign work from the progress chart, mark answers, request corrections and follow learning progress.', '按班別查看學生，從學習進度表選取及派發習作，並批改、跟進改正和查看學習進度。'),
  centreRole: t('Centre staff', '中心職員'),
  centreTasks: t('Handle enrolment, scheduling, make-up lessons, payment review, receipts and final audit.', '處理報名、排課及補堂，審核付款證明、發出收據，並完成最終對帳。'),
  hqRole: t('HQ and curriculum team', '總部及教材編審團隊'),
  hqTasks: t('Organise and create materials, approve editions, manage centre permissions and oversee franchise operations.', '整理及編製教材、核准教材版本、管理各中心的使用權限，並監察加盟中心的營運。'),
  preparedFor: t('Prepared for', '提交對象'),
  documentLabel: t('Document', '文件類別'),
  documentValue: t('Product scope proposal', '系統建議書'),
  dateLabel: t('Date', '日期'),
  statusLabel: t('Status', '文件狀態'),
  statusValue: t('Draft; scope, fees and dates to be agreed', '初稿；交付範圍、費用及日期待議'),
  scopeOverview: t('Scope overview', '範圍摘要'),
  area: t('Area', '項目'),
  proposedScope: t('Proposed scope', '建議範圍'),
  sections: t('Sections', '章節'),
  materials: t('Existing and new materials', '現有教材及新教材編製'),
  materialsScope: t('Digitise the existing library, create new digital worksheets, reuse approved questions and control material access and printing.', '將現有教材數碼化、編製數碼工作紙、重用已核准題目，以及管理教材使用及列印權限。'),
  teaching: t('Student learning and teaching', '學生學習及老師教學'),
  teachingScope: t('The paper-to-digital learning journey: the student binder, full-page working, teacher assignment, marking and corrections.', '將紙本習作流程轉為數碼操作，包括學生學習冊、全頁作答、老師派發及批改習作，以及學生改正。'),
  operations: t('Centre and parent operations', '中心及家長事務'),
  operationsScope: t('Roles and shared records, enrolment, scheduling, leave, make-up lessons, temporary or permanent timetable changes and parent communication.', '劃分使用者職責，管理相關紀錄，並處理報名、排課、請假、補堂、臨時或恆常調堂及家長溝通。'),
  billing: t('Billing and reconciliation', '收費及對帳'),
  billingScope: t('Invoice queues, payment proof review, agreed receipt issuance, reminders and bank-statement reconciliation.', '跟進待處理帳單、審核付款證明、按議定政策發出收據、發送繳費提醒，並核對銀行月結單。'),
  franchise: t('HQ and franchise management', '總部及加盟管理'),
  franchiseScope: t('Centre permissions, approved curriculum, shared operating rules, oversight and access changes when staff or franchises leave.', '管理各中心的權限及已核准教材，訂定共同營運規則並監察執行情況；職員離任或加盟合作結束時，按規定調整權限。'),
  delivery: t('Delivery and commercial terms', '交付及商業安排'),
  deliveryScope: t('Pilot scope, responsibilities, acceptance criteria, phased rollout, pricing items, support and ownership.', '試行範圍、責任分工、驗收準則、分階段推展、報價項目、支援及擁有權。'),
  planningBasis: t('Planning basis', '規劃依據'),
  planningBasisText: t('The proposal covers the existing teaching-material library and approximately 20,000 students across centres. The materials included in the first release and the pilot group must be confirmed before fees and delivery dates are agreed.', '本建議書以現有教材庫及各中心約 20,000 名學生的使用需要作規劃。議定費用及交付日期前，須先確認首階段納入的教材和參與試行的中心及使用者。'),
  demoBoundary: t('Interactive examples use the current UI demo. Proposed functions and acceptance conditions are specified in the relevant sections; a demonstration does not establish readiness for live operation.', '頁內互動示範以目前的瀏覽器介面展示操作流程，並非上述原生應用程式的交付版本。建議功能及驗收條件詳見各節；示範可供操作，不代表已通過正式營運驗收。'),
  learningLink: t('02. Student learning experience', '02. 學生學習體驗'),
  termsLink: t('12. Scope and commercial terms', '12. 範圍及商業安排')
};
