export function getProposalLanguage(url) {
  return ['eng', 'en'].includes(url.searchParams.get('lang')) ? 'en' : 'zh-HK';
}

export function proposalLanguageUrl(href, nextLanguage, { chapter, present } = {}) {
  const url = new URL(href);
  if (nextLanguage === 'en' || nextLanguage === 'eng') url.searchParams.set('lang', 'eng');
  else url.searchParams.delete('lang');
  if (present === true) url.searchParams.set('view', 'present');
  else if (present === false) url.searchParams.delete('view');
  if (chapter) url.hash = chapter;
  return url.pathname + url.search + url.hash;
}

export const language = typeof location === 'undefined' ? 'zh-HK' : getProposalLanguage(new URL(location.href));
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
  documentTitle: t("MathConcept Paperless Teaching & Centre Management System", "MathConcept 無紙化教學及中心管理系統"),
  documentSummary: t("A system for student learning, paperless teaching-material management and centre operations, with native apps for students, parents and centre users. The proposal starts with the student experience and a hybrid approach to digital and printed work, followed by existing-material digitisation, new material creation and administration.", "為 MathConcept 建立涵蓋學生學習、無紙化教材管理及中心營運的系統，並提供學生、家長及中心使用者專用的原生應用程式。本建議書先介紹學生的學習體驗，說明數碼練習與紙本列印如何配合，再介紹現有教材數碼化、新教材編製及中心行政功能。"),
  systemOverview: t('System overview', '系統概覽'),
  appOverview: t("The system will include native apps for iOS/iPadOS and Android, plus a web application for desktop browsers. Each role can work across devices, with layouts prioritising portrait tablets for students, phones for parents, tablets and computers for teachers, and computers for centre staff and HQ. Student work keeps a full-page writing area. Supported operating-system versions, browsers, devices and stylus compatibility will be agreed for delivery.", "系統包括適用於 iOS／iPadOS 及 Android 的原生應用程式，以及供電腦瀏覽器使用的網頁應用程式。各角色可在不同裝置使用系統；介面設計以學生直向平板、家長手機、老師平板及電腦，以及中心職員和總部的電腦操作為主。學生作答時保留完整頁面的書寫空間。支援的作業系統版本、瀏覽器、裝置及觸控筆相容要求，會在確認交付範圍時議定。"),
  overviewRole: t('User', '使用者'),
  overviewTasks: t('Main tasks', '主要用途'),
  studentRole: t('Students', '學生'),
  studentTasks: t("Use a digital binder for assigned classwork, homework, corrections and past work; future work stays locked until released. Write by hand or complete approved interactive exercises with AI-assisted feedback, and keep scanned paper work in the same learning record.", "沿用資料夾概念，在數碼學習冊開啟老師派發的堂課及功課，作答、改正及重溫；日後習作須待老師開放。可手寫或完成互動練習，配合 AI 即時批改及回饋，亦可將紙本作答掃描上載，保留於同一學習紀錄。"),
  parentRole: t('Parents', '家長'),
  parentTasks: t("Use QR attendance, check lessons, request leave, communicate with the centre in the app, view invoices and receipts, and upload payment proof.", "使用 QR 碼點名、查看課堂安排、提交請假申請、在應用程式與中心溝通、查閱帳單及收據，並上載付款證明。"),
  teacherRole: t('Teachers', '老師'),
  teacherTasks: t("View classes and the teaching schedule, assign work from the progress chart, use AI-assisted marking, follow corrections and progress, and communicate with parents in the app.", "按班別查看學生及自己的授課日程，從學習進度表選取及派發習作，配合 AI 批改、跟進改正及學習進度，並在應用程式與家長溝通。"),
  centreRole: t('Centre staff', '中心職員'),
  centreTasks: t("Handle enrolment, scheduling and make-up lessons, use AI-assisted payment-proof review, issue receipts, complete final reconciliation and communicate with parents.", "處理報名、排課及補堂，配合 AI 審核付款證明、發出收據及完成最終對帳，並與家長溝通。"),
  hqRole: t('HQ and curriculum team', '總部及教材編審團隊'),
  hqTasks: t("Organise and create materials with AI assistance, approve editions, manage centre permissions and oversee franchise operations.", "整理教材並配合 AI 編製新內容、核准教材版本、管理各中心的使用權限，並監察加盟中心的營運。"),
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
  materialsScope: t("Digitise the existing library, visually create digital worksheets and interactive activities, reuse approved questions, and control access, printing and authorised exports.", "將現有教材數碼化，以拖放方式編製工作紙及互動內容，重用已核准題目，並管理教材取用、列印及授權匯出。"),
  teaching: t('Student learning and teaching', '學生學習及老師教學'),
  teachingScope: t("Digital and paper learning through the student binder, full-page working, teacher assignment, marking and corrections, with linked paper scans and home practice.", "透過學生學習冊、全頁作答、老師派發及批改習作，銜接數碼與紙本學習，並加入紙本作答上載及課後自學。"),
  operations: t('Centre and parent operations', '中心及家長事務'),
  operationsScope: t("Enrolment and student records, attendance, scheduling, leave, make-up lessons, temporary or ongoing timetable changes and parent communication.", "處理報名及學生紀錄、點名、排課、請假、補堂、臨時或恆常調堂，以及家長溝通。"),
  billing: t('Billing and reconciliation', '收費及對帳'),
  billingScope: t("Invoice queues, staff review and approval of payment proof, receipt issuance, reminders and bank-statement reconciliation.", "跟進待處理帳單，由職員審核及批准付款證明後發出收據、發送繳費提醒，並核對銀行月結單。"),
  franchise: t('HQ and franchise management', '總部及加盟管理'),
  franchiseScope: t('Centre permissions, approved curriculum, shared operating rules, oversight and access changes when staff or franchises leave.', '管理各中心的權限及已核准教材，訂定共同營運規則並監察執行情況；職員離任或加盟合作結束時，按規定調整權限。'),
  delivery: t('Delivery and commercial terms', '交付及商業安排'),
  deliveryScope: t('Pilot scope, responsibilities, acceptance criteria, phased rollout, pricing items, support and ownership.', '試行範圍、責任分工、驗收準則、分階段推展、報價項目、支援及擁有權。'),
  planningBasis: t('Planning basis', '規劃依據'),
  planningBasisText: t('The proposal covers the existing teaching-material library and approximately 20,000 students across centres. The materials included in the first release and the pilot group must be confirmed before fees and delivery dates are agreed.', '本建議書以現有教材庫及各中心約 20,000 名學生的使用需要作規劃。議定費用及交付日期前，須先確認首階段納入的教材和參與試行的中心及使用者。'),
  demoBoundary: t('Interactive examples use the current UI demo. Proposed functions and acceptance conditions are specified in the relevant sections; a demonstration does not establish readiness for live operation.', '頁內互動示範以目前的瀏覽器介面展示操作流程，並非上述原生應用程式的交付版本。建議功能及驗收條件詳見各節；示範可供操作，不代表已通過正式營運驗收。'),
  learningLink: t('02. Student learning experience', '02. 學生學習體驗'),
  termsLink: t("10. Scope and commercial terms", "10. 範圍及商業安排")
};
