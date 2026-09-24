// A second proposal, kept separate from the original tablet-first solution.
// Existing operational chapters are reused so the agreed centre policies stay aligned.
export function getSmartpenProposal(language, original) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const detail = (title, body) => `<section class="feature-detail"><h3>${title}</h3>${body}</section>`;
  const paragraph = (chinese, english) => `<p>${copy(chinese, english)}</p>`;
  const list = items => `<ul class="plain-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const feature = (chineseTitle, englishTitle, chineseBody, englishBody) => detail(copy(chineseTitle, englishTitle), paragraph(chineseBody, englishBody));
  const demo = (id, label) => `<div class="demo-wrap"><div class="demo-caption">${label}</div><div class="demo" data-demo="${id}" id="demo-${id}"></div></div>`;
  const shared = id => original.chapters.find(chapter => chapter.id === id);
  const sharedDemoLabels = body => body.replaceAll(zh ? '互動示範：' : 'Interactive demo:', copy('共用功能示範：', 'Shared workflow demo:'));

  const overviewHTML = `
    <header class="document-header">
      <div class="document-type">${copy('方案二 · 紙本學習數碼化', 'Solution 2 · Digitising paper-based learning')}</div>
      <h1 id="document-title">${copy('1. MathConcept 智能筆教學及中心管理系統', '1. MathConcept Smartpen Teaching & Centre Management System')}</h1>
      <p class="document-summary">${copy('保留學生使用紙本工作紙及資料夾的學習方式，以智能筆記錄作答筆跡，再同步至學生的學習紀錄。老師可繼續在課堂派發、講解及跟進習作，並透過系統管理教材、查看作答、記錄批改及改正進度。家長手冊、中心行政、收費及跨中心管理亦集中在同一系統。', 'Keep students working on paper worksheets in their familiar binders, using smartpens to record handwriting and synchronise it with each student’s learning record. Teachers continue handing out, explaining and following up work in class, while the system supports material management, review of answers, marking records and corrections. The parent handbook, centre administration, billing and multi-centre management remain part of the same system.')}</p>
      <dl class="document-metadata">
        <div><dt>${copy('提交對象', 'Prepared for')}</dt><dd>MathConcept</dd></div>
        <div><dt>${copy('文件類別', 'Document')}</dt><dd>${copy('方案二建議書', 'Solution 2 proposal')}</dd></div>
        <div><dt>${copy('日期', 'Date')}</dt><dd>${copy('2026年9月24日', '24 September 2026')}</dd></div>
        <div><dt>${copy('文件狀態', 'Status')}</dt><dd>${copy('初稿，供比較及討論', 'Draft for comparison and discussion')}</dd></div>
      </dl>
    </header>
    <section class="feature-detail">
      <h2>${copy('兩個方案，供 MathConcept 選擇', 'Two approaches for MathConcept to consider')}</h2>
      ${paragraph('原有方案一完整保留，主張以平板及電子學習冊作為主要作答方式。本方案二則以紙本工作紙及智能筆為主要學習方式，將紙上的作答帶入系統。兩者是可供選擇的方案，並非必須同時推行；中心管理及家長服務則採用相同的功能方向。', 'Solution 1 remains available in full and uses tablets and a digital binder as the main way of answering worksheets. Solution 2 uses paper worksheets and smartpens, bringing written work into the system. These are alternative approaches, not a requirement to introduce both. They share the same direction for centre management and parent services.')}
      <div class="feature-table-wrap"><table class="feature-table solution-comparison">
        <thead><tr><th scope="col">${copy('比較項目', 'Area')}</th><th scope="col">${copy('方案一：平板學習', 'Solution 1: tablet learning')}</th><th scope="col">${copy('方案二：智能筆與紙本學習', 'Solution 2: smartpen and paper learning')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">${copy('學生作答', 'Student work')}</th><td>${copy('主要在平板的電子工作紙上手寫。', 'Primarily handwritten on digital worksheets using a tablet.')}</td><td>${copy('以相容智能筆在專用印製的紙本工作紙上作答。', 'Written with a compatible smartpen on specially prepared printed worksheets.')}</td></tr>
          <tr><th scope="row">${copy('課堂安排', 'Classroom routine')}</th><td>${copy('使用電子學習冊派發及整理習作。', 'A digital binder organises and delivers assignments.')}</td><td>${copy('保留紙本資料夾及派發習作的習慣，增加智能筆領用與同步程序。', 'Retain paper binders and worksheet handout routines, adding pen allocation and synchronisation.')}</td></tr>
          <tr><th scope="row">${copy('學習紀錄', 'Learning records')}</th><td>${copy('作答直接保存在電子工作紙。', 'Answers are saved on the digital worksheet.')}</td><td>${copy('完成同步後，筆跡按學生及工作紙整理成數碼紀錄。', 'After synchronisation, handwriting is organised by student and worksheet.')}</td></tr>
          <tr><th scope="row">${copy('主要設備與耗材', 'Equipment and supplies')}</th><td>${copy('平板、書寫筆及充電安排。', 'Tablets, styluses and charging arrangements.')}</td><td>${copy('相容智能筆、配合的工作紙印製、充電及同步安排。', 'Compatible smartpens, suitable worksheet printing, charging and synchronisation arrangements.')}</td></tr>
          <tr><th scope="row">${copy('共用功能', 'Shared functions')}</th><td colspan="2">${copy('教材管理、學習進度、課堂報告、印章、家長應用程式、排課、收費對帳及跨中心管理。', 'Material management, learning progress, lesson reports, stamps, the parent app, scheduling, billing reconciliation and multi-centre management.')}</td></tr>
        </tbody>
      </table></div>
    </section>
    <section class="feature-detail">
      <h2>${copy('系統概覽及角色分工', 'System overview and roles')}</h2>
      ${paragraph('本方案屬於教學及中心營運數碼化，並保留紙本學習。系統擬提供原生應用程式及電腦網頁介面：家長以手機為主；老師可在平板或電腦查看習作及處理教學紀錄；中心及總部以電腦管理日常營運。學生的課堂作答以紙本為主，毋須每人全程使用平板。智能筆的配對、領用及同步方式，須在試行時按選定設備確認。', 'This approach digitises teaching records and centre operations while retaining paper-based learning. The proposed system includes native applications and a desktop web interface: parents mainly use phones, teachers use tablets or computers to review work and teaching records, and centre staff and HQ use computers for operations. Students mainly answer on paper and do not each need a tablet throughout the lesson. Pen pairing, allocation and synchronisation arrangements must be validated with the selected equipment during a pilot.')}
      ${paragraph('<strong>學生：</strong>使用紙本工作紙作答及改正，保留「已完成、目前、日後」資料夾分類；可另在應用程式查看自己的印章、重溫已開放紀錄及使用獲准的練習遊戲。', '<strong>Students:</strong> answer and correct paper worksheets, retaining past, current and future binder sections. An optional app view provides their stamps, released learning records and approved practice games.')}
      ${paragraph('<strong>老師：</strong>選取工作紙、安排受控列印及派發，查看已同步的作答，處理批改與改正、發布課堂報告及給予印章。', '<strong>Teachers:</strong> choose worksheets, arrange authorised printing and distribution, review synchronised answers, manage marking and corrections, publish lesson reports and award stamps.')}
      ${paragraph('<strong>家長：</strong>查閱已發布的課堂報告及學習紀錄，處理課堂、請假補堂、繳費、收據及與中心溝通。', '<strong>Parents:</strong> view published lesson reports and learning records, manage lessons, leave and make-up preferences, pay invoices, access receipts and contact the centre.')}
      ${paragraph('<strong>中心及總部：</strong>中心處理報名、排課、收費及日常設備安排；總部管理教材版本、中心使用權限及跨中心營運紀錄。', '<strong>Centre staff and HQ:</strong> centres handle enrolment, scheduling, payments and daily equipment arrangements; HQ manages material versions, centre permissions and agreed operational records across centres.')}
    </section>
    <section class="feature-detail">
      <h2>${copy('本頁示範的範圍', 'What this page demonstrates')}</h2>
      ${paragraph('智能筆、紙本工作紙配對及筆跡同步屬本方案建議功能，現階段未在網站內接駁實體智能筆。下文的中心、家長及跨中心互動示範沿用兩個方案的共用介面，用於說明操作流程；遊戲則是可試玩的獨立練習示例。正式使用前，須以實際教材、智能筆及印製設備驗證完整流程。', 'Smartpen use, printed-sheet assignment and handwriting synchronisation are proposed functions; this website does not currently connect to a physical smartpen. The centre, parent and multi-centre interactive demos below show workflows shared by both solutions. The game is a separate playable practice example. The complete smartpen workflow must be validated using real teaching materials, pens and printing equipment before live use.')}
    </section>
    <div class="document-links"><a href="#student">${copy('2. 學生學習體驗', '2. Student learning experience')}</a><a href="#system">${copy('5. 中心管理', '5. Centre management')}</a></div>`;

  const chapters = [
    { id: 'vision', title: copy('方案二概覽', 'Solution 2 overview') },
    {
      id: 'student', title: copy('學生學習體驗', 'Student learning experience'),
      heading: copy('紙本作答，自動整理學習紀錄', 'Paper-based answers with organised digital learning records'),
      intro: copy('學生繼續使用熟悉的紙本工作紙及資料夾。老師準備已配對的工作紙，學生以相容智能筆作答；筆跡完成同步後，系統將作答整理到該學生的相應習作。課堂毋須改為全程對着螢幕，亦可保留實體紙張的書寫空間。', 'Students continue using familiar paper worksheets and binders. Teachers prepare assigned worksheets for students to complete with compatible smartpens. Once synchronised, handwriting is organised under the correct student and assignment. Lessons do not need to become screen-based, and students retain the writing space of a physical page.'),
      body:
        feature('由現有流程銜接至新流程', 'From the current routine to the proposed workflow', '現時由老師派發工作紙，學生作答，再由老師批改及安排改正。新流程保留這些步驟，增加派發前的工作紙配對，以及作答後的筆跡同步。系統可集中保留習作及跟進紀錄，減少為每份已完成習作另外拍照或掃描的需要。', 'Teachers currently hand out worksheets, students answer, and teachers mark the work and assign corrections. The proposed workflow retains those steps, adding worksheet assignment before distribution and handwriting synchronisation afterwards. The system keeps work and follow-up records together, reducing the need to photograph or scan every completed sheet separately.') +
        feature('保留「已完成、目前、日後」資料夾', 'Keep past, current and future binder sections', '已完成的工作紙保留作重溫；目前使用的部分包括堂課、功課及上次需要改正的內容；日後習作由老師保管及決定何時派發。系統以相同分類整理紀錄，未開放的教材不會在學生或家長帳戶顯示。已交到學生手上的紙張則無法由系統鎖上，因此仍須由老師控制日後習作的實際派發時間。', 'Completed worksheets remain available for revision. Current work includes classwork, homework and outstanding corrections. Teachers keep future work and decide when to release it. Digital records follow the same organisation, with unreleased materials unavailable to student and parent accounts. The system cannot lock a physical sheet already handed to a student, so teachers still control when future paper worksheets are distributed.') +
        feature('同一學生、同一份工作紙', 'Match each sheet to its student', '每份印製工作紙須對應學生、教材版本及該次派發紀錄；再次列印或重新派發時，系統保留相應紀錄，避免不同學生或不同次作答互相混合。智能筆亦須按中心的領用方式確認使用者。完成配對後，學生可在整張紙上書寫，毋須為了系統而縮小作答區。', 'Each printed worksheet is associated with a student, material version and assignment record. Reprints and new assignments retain their own records so answers from different students or attempts do not become mixed. Pen use also follows the centre’s allocation procedure. Once assigned, students can write across the page without reducing their working area to accommodate the system.') +
        feature('同步後才提供數碼紀錄', 'Digital records become available after synchronisation', '系統需顯示哪些習作已同步、哪些仍待處理，讓老師辨別「未收到筆跡」與「學生未作答」。課堂結束前由老師或職員檢查同步結果；連線或設備中斷時，保留紙本作為即時教學依據，按確認的復原程序補回紀錄。在家完成的功課，亦須待筆跡成功同步後才可在系統查閱。', 'The system should distinguish synchronised work from items still awaiting processing, so missing handwriting is not mistaken for an unanswered worksheet. Teachers or staff check the result before closing the lesson. If connectivity or equipment is interrupted, paper remains available for teaching while records are recovered through the agreed procedure. Homework completed at home also becomes available digitally only after successful synchronisation.') +
        feature('改正與書寫習慣', 'Corrections and writing habits', '學生可沿用在工作紙上改正的方式，但須配合選定智能筆的書寫及改正規則。紙上擦除、塗改或覆蓋原有答案，不代表已儲存的數碼筆跡會自動消失。系統應保留原作答及後續改正，由老師確認完成狀態；具體操作須以學生實際使用測試確認。', 'Students can continue correcting work on paper, following the writing and correction method supported by the selected pen. Erasing, covering or changing an answer on paper does not mean previously recorded digital handwriting disappears automatically. The system should retain original answers and later corrections, with teachers confirming completion. The exact procedure must be tested with students.') +
        feature('印章及課後練習', 'Stamps and practice outside class', '學生可在獨立集印頁查看老師給予的印章及鼓勵原因。應用程式亦可提供老師開放的重溫內容及互動練習，毋須取代日常紙本作答。下方數學飛車為可試玩的加法練習示例，與智能筆記錄功能分開；按個別學習進度產生練習仍屬建議功能。', 'Students can view teacher-awarded stamps and encouragement in a separate collection. The app may also provide released revision content and interactive practice without replacing everyday paper work. The addition racing game below is a playable example, separate from smartpen capture. Generating practice based on individual learning progress remains a proposed function.') +
        demo('game', copy('共用練習示範：數學飛車（並非智能筆示範）', 'Shared practice demo: Maths Kart (not a smartpen demonstration)'))
    },
    {
      id: 'teacher', title: copy('老師派發及批改流程', 'Teacher assignment and feedback'),
      heading: copy('派發紙本習作，集中跟進教學紀錄', 'Distribute paper work and keep teaching records together'),
      intro: copy('老師仍按班別及學生的學習進度選取工作紙，保留課堂講解、巡視及面對面跟進。系統負責連結教材、派發紀錄及已同步筆跡，讓老師可在紙本之外查閱每位學生的作答及改正進度。以下為智能筆方案建議流程，並非已接駁實體設備的互動示範。', 'Teachers continue choosing worksheets according to each class and student’s progress, with the same explanations, observation and face-to-face support. The system links materials, assignments and synchronised handwriting so teachers can also review answers and corrections digitally. The following describes the proposed smartpen workflow rather than an implemented hardware demonstration.'),
      body:
        feature('選取教材及準備派發', 'Select materials and prepare assignments', '老師在學習進度表選取一份或多份已核准工作紙，指定學生、堂課或功課用途，再提出列印。系統記錄所用版本及每份工作紙的派發對象；補印、收回及重新派發均有紀錄。日後習作可先列為待派發，但由老師控制實體紙張及帳戶內的開放時間。', 'Teachers select one or more approved worksheets from the progress chart, specify the student and whether the work is for class or home, then request printing. The system records the version and recipient of each copy, including reprints, withdrawals and reassignment. Future work can be prepared in advance, with teachers controlling both physical distribution and digital release.') +
        feature('課堂領用及同步檢查', 'Allocate equipment and check synchronisation', '中心可按實際情況採用個人領用或課堂借用安排。上課前確認智能筆、學生及工作紙的配對；下課時檢查已同步、待同步及需要跟進的習作。借用設備交回及轉交另一位學生前，須按確認程序處理，避免將上一位學生的紀錄歸入新帳戶。', 'Centres may use individual allocation or classroom lending, according to their practical needs. Confirm the relationship between pen, student and worksheet before use, then check synchronised, pending and exception records after class. Follow the agreed return and reassignment procedure before lending a device to another student so records remain attached to the correct learner.') +
        feature('批改、講解及改正', 'Marking, explanation and corrections', '老師可在課堂直接查看紙本，並在應用程式查閱已同步筆跡、加入批改及安排改正。若希望老師在紙上所寫的評語或批改亦自動記錄，須另行驗證老師用筆、身份及批改筆跡的區分方式；一般紅筆在紙上寫下的內容，不會因此自動成為數碼紀錄。', 'Teachers can inspect paper work in class and use the app to review synchronised handwriting, add marking and assign corrections. Automatically recording teachers’ paper annotations requires separate validation of teacher pens, identity and how marking is distinguished from student work. Ordinary red-pen annotations do not automatically become digital records.') +
        feature('AI 輔助核對與整理', 'AI-assisted checking and organisation', 'AI 可協助辨識已同步的作答、參照核准答案提出核對建議，以及整理常見錯誤，供老師批改時參考。適用範圍須按題型、字跡及教材測試。未能辨識的數字、圖形、運算步驟及不確定結果應交回老師判斷，不把成功收集筆跡等同於已正確理解或批改答案。', 'AI may help read synchronised answers, suggest checks against approved answers and organise recurring mistakes for teachers to review. Coverage must be validated for the question types, handwriting and materials involved. Unclear numbers, diagrams, working steps and uncertain results remain for teacher judgement; capturing handwriting does not itself establish that an answer has been understood or marked correctly.') +
        feature('課堂報告與印章', 'Lesson reports and stamps', '老師可記錄課堂日期、導師、學習重點、準時上課、交齊功課、上課認真及自學自習的 A–E 評級，並撰寫給家長的評語。發布後才會顯示在家長電子手冊，連同家長已閱及回覆紀錄保存。老師亦可因學生的努力或進步給予印章，寫下簡短鼓勵原因。', 'Teachers record the lesson date, instructor and learning focus, with A–E ratings for punctuality, completed homework, diligence and independent study, plus notes for parents. Reports appear in the parent handbook only after publication, alongside read acknowledgements and replies. Teachers can also award stamps for effort or progress and record a short reason.')
    },
    {
      id: 'library', title: copy('教材', 'Materials'), heading: copy('教材數碼化、編製及受控列印', 'Material digitisation, authoring and controlled printing'),
      intro: copy('現有教材先保留原有內容及版面，整理成老師可以查找、派發及列印的受控教材庫，再逐步建立可重用的題庫及編製工具。配合智能筆使用的工作紙須經過印製及辨識測試，不能假設普通紙張上的任何既有文件都能直接記錄筆跡。', 'Existing materials first retain their content and layout within a controlled catalogue that teachers can search, assign and print. A reusable question bank and authoring tools can follow in stages. Worksheets intended for smartpen use require printing and recognition tests; arbitrary existing documents on ordinary paper cannot be assumed to capture handwriting.'),
      body:
        feature('整理現有教材', 'Organise existing materials', '沿用年級、課題、教材系列及工作紙編號建立目錄，核對檔案完整性、重複內容及使用版本。已核准工作紙可保留原有版面，包括算式、圖形及作答空間；原始文件及答案另按權限保存，老師毋須從共用硬碟下載整批教材。', 'Build the catalogue around existing grades, topics, series and worksheet numbers, checking completeness, duplicates and the correct versions. Approved sheets retain their equations, diagrams and working space. Original files and answers are stored under separate permissions, removing the need for teachers to download collections from a shared drive.') +
        feature('配合智能筆的工作紙', 'Prepare worksheets for smartpen use', '每份工作紙在印製時加入相容的頁面識別，並記錄學生、頁次、教材版本及派發次數。試行須核對細小算式、圖形、裝訂、紙張及打印品質，確保不影響學生閱讀和書寫。自行影印、縮放、補印或使用不同打印設備的影響亦須測試，合格後才擴展使用。', 'Each printed worksheet receives compatible page identification and a record of its student, page, material version and assignment. The pilot checks small equations, diagrams, binding, paper and print quality so reading and writing remain practical. Photocopying, scaling, reprinting and different printers must also be tested before wider use.') +
        feature('逐步建立可重用題庫', 'Build a reusable question bank in stages', '將已核實的題目、算式、圖形及答案整理成可搜尋和重用的內容，保留來源及版本。可直接派發的原版工作紙、已辨識題目及已核對可編輯內容，應分開標示；辨識不完整的內容先保留原版，不當作已完成轉換。', 'Organise verified questions, equations, diagrams and answers into searchable, reusable content, retaining source and version information. Distinguish original-layout sheets ready for assignment from extracted questions and verified editable content. Incomplete conversions remain available in their original form rather than being counted as completed editable material.') +
        feature('新教材編製與審批', 'Create and approve new materials', '教材編審人員可由空白頁開始，或選用已核准題目，以拖放方式編排文字、算式、圖形及作答空間。AI 可協助起草題目、答案、提示及排版，交由指定人員核對數學內容及教學用途。完成審批後才發布正式版本，並預覽紙本輸出及智能筆使用效果。', 'Editors can start with a blank page or approved questions, arranging text, equations, diagrams and working space through a visual editor. AI can assist with draft questions, answers, hints and layouts, while designated reviewers check mathematical accuracy and teaching suitability. Publish only approved versions, with previews and checks for printed output and smartpen use.') +
        feature('原始文件及教材使用權限', 'Original files and material permissions', '傳統格式文件可存於受控教材庫，按中心、角色及教材範圍開放。一般教學帳戶只可取用獲准教材，不提供整庫原始檔案下載。學生用教材、答案及老師備註分開管理；使用外部 AI 處理教材前，須先議定授權、用途及保密安排。', 'Traditional-format files can remain in the controlled library, with access limited by centre, role and curriculum. Ordinary teaching accounts use authorised materials without unrestricted downloads of the original collection. Student content, answers and teacher notes have separate access rules. Any external AI processing requires agreed permissions, purposes and confidentiality arrangements.') +
        feature('受控列印及補印', 'Controlled printing and reprints', '獲授權職員可在系統內提出列印，送往中心認可的列印設備，毋須先把原始工作紙下載到個人電腦。系統保留教材版本、派發對象、列印份數、時間及完成或失敗紀錄；補印須能追溯至原派發，並按規則處理舊紙張與新紙張的關係。', 'Authorised staff request printing within the system to approved centre equipment, without first downloading the source worksheet to a personal computer. Records retain the version, recipient, copy count, time and outcome. Reprints remain traceable to the original assignment, with an agreed procedure for relating the old and replacement sheets.') +
        feature('教材保護及追蹤', 'Material protection and traceability', '按角色及中心限制教材取用、記錄派發及列印，並可加入版本或副本標記，協助追查外流教材的來源。紙張交付後仍可能被拍照、影印或轉交；本方案的保障重點是限制整庫取用、管控派發及保留追蹤紀錄，並不保證紙本無法被複製。', 'Limit access by role and centre, record distribution and printing, and optionally include edition or copy identifiers to help investigate leaked material. Printed pages can still be photographed, copied or passed on. Protection focuses on limiting library access, controlling distribution and retaining traceable records; it cannot guarantee that paper will never be copied.')
    },
    {
      ...shared('system'),
      intro: `${shared('system').intro} ${copy('下方示範為兩個方案共用的中心行政及收費流程，並非智能筆接駁示範。', 'The demos below show centre administration and billing shared by both solutions, rather than a connected smartpen workflow.')}`
    },
    {
      ...shared('parent'),
      intro: copy('家長應用程式沿用兩個方案共通的課堂、電子手冊、繳費及溝通功能。智能筆方案另把已成功同步並獲老師開放的習作紀錄帶入家長帳戶，讓家長跟進紙本學習；未同步的筆跡及老師未發布的內容不會當作完整紀錄。', 'The parent app shares lesson, handbook, payment and communication functions across both solutions. In the smartpen approach, successfully synchronised work that teachers release also becomes available to parents, supporting their child’s paper-based learning. Unsynchronised handwriting and unpublished content are not presented as complete records.'),
      body: paragraph('下方為現有家長介面的共用功能示範。課堂安排、電子手冊、繳費及溝通可供試用；畫面中的習作是示範資料，並非由實體智能筆同步。', 'The existing parent interface below demonstrates shared functions. Lesson arrangements, the handbook, payments and communication can be explored. Any work shown uses demonstration records, not handwriting synchronised from a physical smartpen.') + sharedDemoLabels(shared('parent').body)
    },
    {
      ...shared('franchise'),
      intro: copy('總部集中管理教材發布、各中心的使用權限及營運規則。各中心沿用相同的行政及家長服務流程，智能筆方案另需建立一致的工作紙印製、設備領用、同步檢查及例外處理安排，讓新中心可按已驗證的方式推行。', 'HQ manages material publication, centre permissions and operating policies. Centres share the same administrative and parent-service workflows. The smartpen approach also requires consistent worksheet printing, equipment allocation, synchronisation checks and exception handling so new centres can adopt a validated routine.'),
      body: paragraph('下方沿用荃灣及坑口的共用中心示範，用於比較相同系統下的分校操作，並不代表已完成跨中心智能筆設備部署。', 'The shared Tsuen Wan and Hang Hau demos below show how branches use the same system. They do not represent a completed multi-centre smartpen deployment.') + sharedDemoLabels(shared('franchise').body) +
        feature('新中心的智能筆準備', 'Prepare a new centre for smartpen use', '開設新中心時，按已確認的設備及印製要求建立工作環境，完成代表性工作紙測試，並培訓職員派發、領用、同步、補印及異常跟進。先確認日常一堂課可以順暢完成，再逐步增加學生及教材範圍。', 'Prepare new centres using validated equipment and printing requirements, test representative worksheets, and train staff in assignment, pen allocation, synchronisation, reprints and exception handling. Confirm that an ordinary lesson can run smoothly before expanding to more students and materials.') +
        feature('日常管理及交接', 'Daily operations and handover', '中心應有指定人員檢查未完成同步、設備損壞、遺失及補印紀錄。總部可按議定範圍查看各中心的使用及異常情況，安排支援。職員離職、學生轉中心或加盟關係結束時，按權限與紀錄移交政策處理；已印製的紙張及設備亦須有實際交接安排。', 'Named staff check pending synchronisations, damaged or missing equipment and reprint records. HQ can review agreed usage and exception information to arrange support. Staff departures, student transfers and the end of franchise relationships follow access and record-handover policies, with practical arrangements for printed materials and equipment.')
    }
  ];

  const references = {
    scope: {
      title: copy('方案二詳細範圍', 'Solution 2 detailed scope'),
      body: paragraph('本方案以紙本及智能筆為主要作答方式。原有方案一另頁保留；中心行政及收費政策共用，無須因學生書寫工具改變而重新設定。', 'This proposal uses paper and smartpens as the main answering method. Solution 1 remains available separately. Administrative and billing policies are shared and do not need to change because students use a different writing tool.') +
        detail(copy('教學及學習紀錄', 'Teaching and learning records'), list([
          copy('按學生、工作紙版本、頁次及派發紀錄配對紙張與筆跡，保留補印及重新派發歷史。', 'Associate paper and handwriting with the student, worksheet version, page and assignment, retaining reprint and reassignment history.'),
          copy('顯示已同步、待同步及需要跟進的習作，避免把未收到筆跡判斷為未完成作答。', 'Distinguish synchronised, pending and exception records without treating missing handwriting as unfinished work.'),
          copy('保留紙本資料夾分類；教師控制未來習作的實體派發及帳戶內的開放。', 'Retain binder categories, with teachers controlling physical distribution and account access for future work.'),
          copy('提供老師批改、學生改正、課堂報告、家長已閱及回覆、學生集印紀錄。', 'Support teacher marking, student corrections, lesson reports, parent acknowledgements and replies, and stamp records.'),
          copy('AI 協助核對已驗證題型；不確定字跡、解題方法及評分仍須老師判斷。', 'AI assists with validated question types; uncertain handwriting, methods and grading remain for teacher judgement.')
        ])) +
        detail(copy('教材及列印', 'Materials and printing'), list([
          copy('整理既有目錄及核准版本，先保留原版工作紙，再分階段建立可搜尋、可重用及可編輯題庫。', 'Organise catalogues and approved versions, retaining original-layout sheets first and building searchable, reusable and editable questions in stages.'),
          copy('提供教材編排及審批、原始檔案權限、獲准設備列印、補印及追蹤紀錄。', 'Provide material authoring and approval, source-file permissions, authorised printing, reprints and traceable records.'),
          copy('用實際工作紙確認智能筆辨識、打印品質、學生書寫、改正及老師批改的可行流程。', 'Use real worksheets to validate pen recognition, printing quality, student writing, corrections and teacher marking.')
        ])) +
        detail(copy('中心、家長及總部', 'Centre, parent and HQ functions'), paragraph('沿用本方案第 5 至第 7 章列出的排課、請假補堂、報名、電子手冊、家長溝通、收費、對帳及跨中心管理功能。收費維持每兩個曆月的八堂名義課程套票；自然出現的七、八或九堂，以及恆常調堂後的堂數增減，按已確認的中心政策處理。', 'Use the scheduling, leave and make-up, enrolment, handbook, parent communication, billing, reconciliation and multi-centre functions in chapters 5–7. Billing retains the nominal eight-lesson package over two calendar months; naturally occurring seven, eight or nine lessons and changes caused by regular rescheduling follow the confirmed centre policy.')) +
        detail(copy('示範與建議功能的分別', 'Demos and proposed functions'), paragraph('本網站的智能筆流程為建議內容，未連接實體智能筆或受控列印設備。共用示範以本機示範資料運作，不會跨裝置同步；付款、AI 核對及自動審批亦為模擬。正式產品的原生應用程式、筆跡同步、完整教材轉換及設備管理須另行開發及驗證。', 'The website describes a proposed smartpen workflow and is not connected to physical pens or controlled printers. Shared demos use local demonstration records without cross-device synchronisation; payment, AI checks and automatic approval are simulated. Native applications, handwriting synchronisation, full material conversion and equipment management require development and validation.'))
    },
    safeguards: {
      title: copy('教材與紀錄保障', 'Material and record safeguards'),
      body:
        feature('教材取用與紙本副本', 'Material access and printed copies', '限制各中心、角色及學生的可用教材，保留版本、派發及列印紀錄；答案及老師備註另設權限。紙張可被拍照或影印，已交付的副本不能由系統收回，須配合中心保管及回收流程。', 'Limit materials by centre, role and student, retain edition, assignment and printing records, and protect answers and teacher notes separately. Paper can be photographed or copied, and distributed copies cannot be recalled digitally; centre storage and collection procedures remain necessary.') +
        feature('正確歸屬與同步復原', 'Correct ownership and synchronisation recovery', '學生、筆及工作紙的配對須能查核；換筆、轉交設備、補印及中途斷線須有清楚流程。重複同步不可產生重複習作，不完整的紀錄須標示待處理；紙本仍可供老師核對。', 'Student, pen and worksheet associations must be reviewable, with procedures for replacement pens, device handovers, reprints and interruptions. Repeated synchronisation must not duplicate assignments, incomplete records must be flagged, and paper remains available for verification.') +
        feature('批改與發布責任', 'Marking and publication responsibilities', '保留原作答、批改、改正及更改紀錄；老師決定是否完成改正及何時發布給家長。AI 結果只按已核准用途輔助，未能辨識或不確定的內容不可自動當作正確。', 'Retain original answers, marking, corrections and revision records. Teachers determine when corrections are complete and when records are released to parents. AI supports approved purposes only; unreadable or uncertain content must not automatically be treated as correct.') +
        feature('學生資料與持續使用', 'Student data and continuity', '學習紀錄只供獲授權人士查閱。備份、紀錄保留、帳戶停用、資料移交及設備遺失後的處理方式須預先議定，並以實際測試確認同步中斷及更換設備時的恢復安排。', 'Learning records are available only to authorised users. Agree backup, retention, account closure, data handover and lost-device handling in advance, and test recovery after synchronisation interruptions or equipment replacement.')
    },
    assumptions: {
      title: copy('試行及待確認事項', 'Pilot and open decisions'),
      body: paragraph('我們建議先選取一小組學生、老師及具代表性的工作紙，一起驗證從派發工作紙到家長查看紀錄的完整課堂流程，再決定擴展範圍。以下項目影響實際使用方式，須在方案定稿前確認。', 'We recommend starting with a small group of students, teachers and representative worksheets, testing the full lesson workflow together from distribution to parent access before deciding how widely to expand. The following items affect practical use and need confirmation before finalising the proposal.') +
        list([
          copy('智能筆是否適合學生年齡、握筆習慣及日常書寫；所用筆芯、紙張、改正方式及耗材安排。', 'Whether selected pens suit student ages, grip and daily writing, including refills, paper, corrections and consumables.'),
          copy('工作紙印製品質及可用設備；原版算式、圖形、頁次、裝訂、縮放及補印是否影響辨識。', 'Printing quality and supported equipment, including the effect of equations, diagrams, pagination, binding, scaling and reprints on recognition.'),
          copy('個人領用或課堂借用、同時使用的學生數目、充電、損壞及遺失處理；不可假設任意設備可同時連接全班。', 'Individual allocation or class lending, class size, charging and damage or loss procedures; do not assume any device can connect to a whole class at once.'),
          copy('課堂及家中如何同步、何時顯示結果、無網絡時可保留甚麼、何人負責檢查及復原未完成的紀錄。', 'How classwork and homework synchronise, when records appear, what is retained without connectivity, and who checks and recovers pending records.'),
          copy('老師是否需要以智能筆記錄紙本批改，或在應用程式補入批改；如何區分學生作答、老師註解及後續改正。', 'Whether teachers need captured paper annotations or app-based marking, and how student answers, teacher notes and later corrections are distinguished.'),
          copy('AI 可處理的題型及核對標準、必須交由老師的情況，以及教材使用及保密安排。', 'Supported AI question types, checking standards, cases requiring teacher review, and material-use and confidentiality arrangements.'),
          copy('設備、耗材、商業使用授權及支援安排；確認各項成本後，再由 MathConcept 比較兩個方案。', 'Equipment, consumables, commercial usage rights and support; establish these costs before MathConcept compares the two approaches.')
        ])
    }
  };

  return {
    chapters,
    references,
    overviewHTML,
    shellTextOverrides: {
      draftMark: copy('方案二建議書', 'SOLUTION 2 PROPOSAL'),
      draftNote: copy('智能筆與紙本學習 · 初稿', 'Smartpen and paper learning · Draft'),
      documentType: copy('方案二 · 紙本學習數碼化', 'Solution 2 · Digitising paper-based learning'),
      documentTitle: copy('1. MathConcept 智能筆教學及中心管理系統', '1. MathConcept Smartpen Teaching & Centre Management System'),
      draftDate: copy('2026年9月24日', '24 September 2026'),
      documentValue: copy('方案二建議書', 'Solution 2 proposal'),
      statusValue: copy('初稿，供比較及討論', 'Draft for comparison and discussion')
    }
  };
}
