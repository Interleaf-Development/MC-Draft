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
  documentSummary: t("Build a system for MathConcept covering student learning, paperless teaching-material management and centre operations, with dedicated native applications for students, parents and centres. This proposal first introduces the student learning experience after going paperless, supporting a hybrid approach in which students can complete exercises online or print materials for paper use. It then explains the process of digitising existing materials, creating new materials and handling centre administration.", "為 MathConcept 建立涵蓋學生學習、無紙化教材管理及中心營運的系統，並提供學生、家長及中心專用的原生應用程式（Native Application）。本建議書會先介紹學生無紙化下的學習體驗，支援學生以混合方式學習，既可在線上完成練習，也可列印教材供紙本使用，再說明現有教材的數碼化過程、新教材的編製方式及中心行政功能。"),
  systemOverview: t('System overview', '系統概覽'),
  appOverview: t("The system will include native applications for iOS and Android, suitable for tablets and phones, and a web application for use on computers. Each role’s interface supports different devices. The design will focus on tablets for students, phones for parents, tablets and computers for teachers, and computers for centre staff and HQ. Students will use portrait tablets with a full-page writing area. Fully supported devices and operating systems will be agreed when confirming the delivery scope.", "系統會包括原生應用程式（iOS 及 Android，並適用於平板及手機），以及網頁應用程式在電腦上使用。各角色的介面支持在不同設備上運作，但設計方向上，學生以平板為主，家長以手機為主，老師以平板及電腦為主，中心職員和總部的工作介面以電腦為主。學生以直向平板作答，配合完整頁面的書寫空間。完整支援的裝置及作業系統須在確認交付範圍時議定。"),
  overviewRole: t('User', '使用者'),
  overviewTasks: t('Main tasks', '主要用途'),
  studentRole: t('Students', '學生'),
  studentTasks: t("Replicate the existing folder workflow. The digital binder lets students open classwork and homework assigned by teachers, answer questions, complete corrections and revisit completed work; future work can only be accessed after the teacher releases it. Students can write by hand on a tablet or, with digital materials, complete worksheets and exercises in an interactive game-like format, with AI providing simple, immediate marking and feedback. It also works seamlessly with printing worksheets and scanning and uploading completed work.", "模擬現有的資料夾流程，電子化學習冊可以開啟老師派發的堂課及功課，作答、完成改正及重溫已完成的內容；日後習作須待老師開放後才可取用。作答時可以在平板上手寫，或在配合電子化教材的情況下，以類似互動遊戲的方式完成工作紙和練習，配合 AI 得到簡單的即時批改及回饋。同時亦無縫地配合列印工作紙，完成後掃描上傳的程序。"),
  parentRole: t('Parents', '家長'),
  parentTasks: t("Use student QR check-in, view lesson arrangements, submit leave requests, communicate with the centre in the app, view invoices and receipts, and upload payment proof.", "學生 QR 點名、查看課堂安排、提交請假申請、與中心在 APP 上溝通、查閱帳單及收據，並上載付款證明。"),
  teacherRole: t('Teachers', '老師'),
  teacherTasks: t("View students by class and their own schedule, select and assign worksheets from the progress chart, use AI for marking, follow up corrections, view learning progress and communicate with parents in the app.", "按班別查看學生，查看自己日程，從學習進度表選取及派發習作，並配合 AI 批改、跟進改正和查看學習進度、與家長在 APP 上溝通。"),
  centreRole: t('Centre staff', '中心職員'),
  centreTasks: t("Handle enrolment, scheduling and make-up lessons, use AI to review payment proof, issue receipts, complete final reconciliation and communicate with parents in the app.", "處理報名、排課及補堂，配合 AI 審核付款證明、發出收據，並完成最終對帳、與家長在 APP 上溝通。"),
  hqRole: t('HQ and curriculum team', '總部及教材編審團隊'),
  hqTasks: t("Organise and create teaching materials with AI, approve material versions, manage each centre’s access permissions and oversee franchise operations.", "整理及配合 AI 編製教材、核准教材版本、管理各中心的使用權限，並監察加盟中心的營運。"),
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
  materialsScope: t("Digitise existing materials, create digital worksheets, reuse approved questions and manage permissions for material use and printing.", "將現有教材數碼化、編製數碼工作紙、重用已核准題目，以及管理教材使用及列印權限。"),
  teaching: t('Student learning and teaching', '學生學習及老師教學'),
  teachingScope: t("Move the paper worksheet workflow into the digital system, including the student binder, full-page answering, teacher assignment and marking, and student corrections.", "將紙本習作流程轉為數碼操作，包括學生學習冊、全頁作答、老師派發及批改習作，以及學生改正。"),
  operations: t('Centre and parent operations', '中心及家長事務'),
  operationsScope: t("Define user responsibilities, manage related records, and handle enrolment, scheduling, leave, make-up lessons, temporary or permanent timetable changes and parent communication.", "劃分使用者職責，管理相關紀錄，並處理報名、排課、請假、補堂、臨時或恆常調堂及家長溝通。"),
  billing: t('Billing and reconciliation', '收費及對帳'),
  billingScope: t("Follow up outstanding invoices, review payment proof, issue receipts according to the agreed policy, send payment reminders and reconcile bank statements.", "跟進待處理帳單、審核付款證明、按議定政策發出收據、發送繳費提醒，並核對銀行月結單。"),
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
