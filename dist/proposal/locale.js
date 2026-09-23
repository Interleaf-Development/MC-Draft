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
// Hong Kong Traditional Chinese interface and saved demo state.
export const shellText = {
  skip: t('Skip to proposal', '跳至建議書內容'),
  contents: t('Contents', '目錄'),
  draftMark: t('SYSTEM PROPOSAL', '系統建議書'),
  draftDate: t('23 September 2026', '2026年9月23日'),
  draftNote: t('Draft for discussion', '初稿，供討論用'),
  demoNotice: t('All demos in this proposal are for illustration and discussion only, not the final product. Design, features and workflows are not finalized and will be refined based on mutually agreed requirements.', '本建議書內所有示範僅供說明及討論，並非最終成品；設計、功能及操作流程均未定稿，將按雙方確認的需求調整。'),
  print: t('Print', '列印'),
  documentType: t('System proposal', '系統功能建議'),
  documentTitle: t("1. MathConcept Paperless Teaching & Centre Management System", "1. MathConcept 無紙化教學及中心管理系統"),
  documentSummary: t("Build a system for MathConcept covering student learning, paperless teaching-material management and centre operations, with dedicated native applications for students, parents and centres. This proposal first introduces the student learning experience after going paperless, supporting a hybrid approach in which students can complete exercises online or print materials for paper use. It then explains the process of digitising existing materials, creating new materials and handling centre administration.", "為 MathConcept 建立涵蓋學生學習、無紙化教材管理及中心營運的系統，並提供學生、家長及中心專用的原生應用程式（Native Application）。本建議書會先介紹學生無紙化下的學習體驗，支援學生以混合方式學習，既可在線上完成練習，也可列印教材供紙本使用，再說明現有教材的數碼化過程、新教材的編製方式及中心行政功能。"),
  systemOverview: t('System overview', '系統概覽'),
  appOverview: t("The system will include native applications for iOS and Android, suitable for tablets and phones, and a web application for use on computers. Each role’s interface supports different devices. The design will focus on tablets for students, phones for parents, tablets and computers for teachers, and computers for centre staff and HQ. Students will use portrait tablets with a full-page writing area. Fully supported devices and operating systems will be agreed when confirming the delivery scope.", "系統會包括原生應用程式（iOS 及 Android，並適用於平板及手機），以及網頁應用程式在電腦上使用。各角色的介面支持在不同設備上運作，但設計方向上，學生以平板為主，家長以手機為主，老師以平板及電腦為主，中心職員和總部的工作介面以電腦為主。學生以直向平板作答，配合完整頁面的書寫空間。完整支援的裝置及作業系統須在確認交付範圍時議定。"),
  overviewRole: t('User', '使用者'),
  overviewTasks: t('Main tasks', '主要用途'),
  studentRole: t('Students', '學生'),
  studentTasks: t("Replicate the existing folder workflow. The digital binder lets students open classwork and homework assigned by teachers, answer questions, complete corrections and revisit completed work; future work can only be accessed after the teacher releases it. Students can write by hand on a tablet or, with digital materials, complete worksheets and exercises in an interactive game-like format, with AI providing simple, immediate marking and feedback. It also works seamlessly with printing worksheets and scanning and uploading completed work. Students can view teacher-awarded stamps in a separate collection.", "模擬現有的資料夾流程，電子化學習冊可以開啟老師派發的堂課及功課，作答、完成改正及重溫已完成的內容；日後習作須待老師開放後才可取用。作答時可以在平板上手寫，或在配合電子化教材的情況下，以類似互動遊戲的方式完成工作紙和練習，配合 AI 得到簡單的即時批改及回饋。同時亦無縫地配合列印工作紙，完成後掃描上傳的程序。學生亦可在獨立集印頁查看老師給予的印章。"),
  parentRole: t('Parents', '家長'),
  parentTasks: t("Use student QR check-in, view lesson arrangements, submit leave requests, communicate with the centre in the app, view invoices and receipts, and upload payment proof. The digital handbook brings together lesson reports, the centre calendar and parent notices, with read acknowledgements and replies to teachers.", "學生 QR 點名、查看課堂安排、提交請假申請、與中心在 APP 上溝通、查閱帳單及收據，並上載付款證明。電子手冊集中顯示課堂報告、中心校曆及家長須知，家長可確認已閱及回覆老師。"),
  teacherRole: t('Teachers', '老師'),
  teacherTasks: t("View students by class and their own schedule, select and assign worksheets from the progress chart, use AI for marking, follow up corrections, view learning progress and communicate with parents in the app. Teachers can also write and publish lesson reports and award stamps to students.", "按班別查看學生，查看自己日程，從學習進度表選取及派發習作，並配合 AI 批改、跟進改正和查看學習進度、與家長在 APP 上溝通。老師亦可撰寫及發布課堂報告，並給予學生印章。"),
  centreRole: t('Centre staff', '中心職員'),
  centreTasks: t("Handle enrolment, scheduling and make-up lessons, use AI to review payment proof, issue receipts, complete final reconciliation and communicate with parents in the app.", "處理報名、排課及補堂，配合 AI 審核付款證明、發出收據，並完成最終對帳、與家長在 APP 上溝通。"),
  hqRole: t('HQ and curriculum team', '總部及教材編審團隊'),
  hqTasks: t("Organise and create teaching materials with AI, approve material versions, manage each centre’s access permissions and oversee franchise operations.", "整理及配合 AI 編製教材、核准教材版本、管理各中心的使用權限，並監察加盟中心的營運。"),
  preparedFor: t('Prepared for', '提交對象'),
  documentLabel: t('Document', '文件類別'),
  documentValue: t('System proposal', '系統建議書'),
  dateLabel: t('Date', '日期'),
  statusLabel: t('Status', '文件狀態'),
  statusValue: t('Draft for discussion', '初稿，供討論用'),
  learningLink: t('2. Student learning experience', '2. 學生學習體驗'),
  parentLink: t("6. Parent app", "6. 家長應用程式")
};
