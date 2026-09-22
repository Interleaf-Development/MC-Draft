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
  documentSummary: t('A proposed native app system for digital learning, teaching-material management and centre operations. The proposal begins with the student learning experience, then covers existing materials, new worksheet creation and administration.', '建議建立原生應用程式系統，涵蓋數碼學習、教材管理及中心營運。本建議書先說明學生學習體驗的轉變，再介紹現有教材數碼化、新工作紙編製及行政管理。'),
  systemOverview: t('System overview', '系統概覽'),
  appOverview: t('The proposed delivery includes native apps for student tablet learning and parent phone use, alongside workspaces for teachers, centre staff and HQ. Student learning prioritises portrait tablets and a full-page writing surface. The supported devices and operating systems will be agreed for delivery.', '建議提供供學生在平板學習及家長在手機使用的原生應用程式，並設老師、中心職員及總部工作介面。學生介面以直向平板及全頁書寫空間為優先；支援的裝置及作業系統將於確認交付範圍時議定。'),
  overviewRole: t('User', '使用者'),
  overviewTasks: t('Main tasks', '主要用途'),
  studentRole: t('Students', '學生'),
  studentTasks: t('Open assigned work in a digital binder, write answers, complete corrections and revisit past work. Future work stays locked until released.', '在數碼學習資料夾開啟已派發習作、書寫答案、完成改正及重溫舊作業；未開放的習作維持鎖定。'),
  parentRole: t('Parents', '家長'),
  parentTasks: t('Check lessons, request leave, communicate with the centre, view invoices and receipts, and upload payment proof.', '查看課堂、請假、與中心溝通、查閱帳單及收據，並上載付款證明。'),
  teacherRole: t('Teachers', '老師'),
  teacherTasks: t('Select students by class, assign work from the progress chart, mark answers, request corrections and follow learning progress.', '按班別選取學生，透過學習進度表派發習作、批改、安排改正及跟進學習進度。'),
  centreRole: t('Centre staff', '中心職員'),
  centreTasks: t('Handle enrolment, scheduling, make-up lessons, payment review, receipts and final audit.', '處理報名、排課、補堂、付款核對、收據及最終對帳。'),
  hqRole: t('HQ and curriculum team', '總部及教材編審團隊'),
  hqTasks: t('Organise and create materials, approve editions, manage centre permissions and oversee franchise operations.', '整理及編製教材、審批版本、管理中心權限及監察加盟營運。'),
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
  materials: t('Existing and new materials', '現有及新教材'),
  materialsScope: t('Digitise the existing library, create new digital worksheets, reuse approved questions and control material access and printing.', '將現有教材庫數碼化、編製新數碼工作紙、重用已審批題目，以及管理教材取用及列印權限。'),
  teaching: t('Student learning and teaching', '學生學習及教學'),
  teachingScope: t('The paper-to-digital learning journey: the student binder, full-page working, teacher assignment, marking and corrections.', '由紙本轉為數碼學習：學生資料夾、全頁作答、老師派發習作、批改及改正。'),
  operations: t('Centre and parent operations', '中心及家長事務'),
  operationsScope: t('Roles and shared records, enrolment, scheduling, leave, make-up lessons, temporary or permanent timetable changes and parent communication.', '角色及共用紀錄、報名、排課、請假、補堂、臨時或恆常調堂，以及家長溝通。'),
  billing: t('Billing and reconciliation', '收費及對帳'),
  billingScope: t('Invoice queues, payment proof review, agreed receipt issuance, reminders and bank-statement reconciliation.', '帳單待辦清單、付款證明審核、按議定政策發出收據、繳費提醒及銀行月結單對帳。'),
  franchise: t('HQ and franchise management', '總部及加盟管理'),
  franchiseScope: t('Centre permissions, approved curriculum, shared operating rules, oversight and access changes when staff or franchises leave.', '中心權限、已審批課程、共用營運規則、營運監察，以及職員離任或加盟合作結束時的權限調整。'),
  delivery: t('Delivery and commercial terms', '交付及商業安排'),
  deliveryScope: t('Pilot scope, responsibilities, acceptance criteria, phased rollout, pricing items, support and ownership.', '試行範圍、責任分工、驗收準則、分階段推展、報價項目、支援及擁有權。'),
  planningBasis: t('Planning basis', '規劃依據'),
  planningBasisText: t('The proposal covers the existing teaching-material library and approximately 20,000 students across centres. The materials included in the first release and the pilot group must be confirmed before fees and delivery dates are agreed.', '本建議書涵蓋現有教材庫及各中心約 20,000 名學生。議定費用及交付日期前，須確認首階段納入的教材及試行對象。'),
  demoBoundary: t('Interactive examples use the current UI demo. Proposed functions and acceptance conditions are specified in the relevant sections; a demonstration does not establish readiness for live operation.', '互動示例採用現有介面示範。建議功能及驗收條件於相關章節列明；示範可操作並不代表已可正式投入營運。'),
  learningLink: t('02. Student learning experience', '02. 學生學習體驗'),
  termsLink: t('12. Scope and commercial terms', '12. 範圍及商業安排')
};
