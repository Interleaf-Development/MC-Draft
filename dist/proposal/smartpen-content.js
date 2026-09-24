// A second proposal, kept separate from the original tablet-first solution.
// Existing operational chapters are reused so the agreed centre policies stay aligned.
export function getSmartpenProposal(language, original) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const detail = (title, body) => `<section class="feature-detail"><h3>${title}</h3>${body}</section>`;
  const paragraph = (chinese, english) => `<p>${copy(chinese, english)}</p>`;
  const list = items => `<ul class="plain-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const feature = (chineseTitle, englishTitle, chineseBody, englishBody) => detail(copy(chineseTitle, englishTitle), paragraph(chineseBody, englishBody));
  const featureGroup = (chineseTitle, englishTitle, paragraphs) => detail(copy(chineseTitle, englishTitle), paragraphs.map(([chinese, english]) => paragraph(chinese, english)).join(''));
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
      intro: copy('我們建議保留學生熟悉的紙本工作紙及資料夾，以相容智能筆記錄作答。筆跡完成同步後，系統會整理到該學生的相應習作，讓課堂保留面對面教學及整張紙的書寫空間，同時累積可跟進的學習紀錄。', 'We suggest keeping the paper worksheets and binders students already know, using compatible smartpens to record their answers. Once synchronised, handwriting is organised under the correct student and assignment. Lessons retain face-to-face teaching and a full page of working space, while building learning records that teachers can follow up.'),
      body:
        featureGroup('保留紙本習慣，串連派發與作答', 'Keep the paper routine, from assignment to answers', [
          ['老師仍從學習進度表選取已核准工作紙，指定學生及堂課或功課用途，再安排列印及派發；學生作答後，由老師批改及跟進改正。新流程增加派發前的配對及作答後的同步，讓習作與跟進紀錄集中保存，減少逐份拍照或掃描的需要。', 'Teachers continue selecting approved worksheets from the progress chart, specifying the student and whether the work is for class or home, then arranging printing and distribution. Students answer, and teachers mark the work and follow up corrections. Assignment checks before distribution and synchronisation afterwards keep work and follow-up records together, reducing the need to photograph or scan every sheet.'],
          ['資料夾保留「已完成、目前、日後」分類：已完成習作可重溫，目前部分包括堂課、功課及待改正內容；日後習作由老師保管，決定何時派發及在帳戶內開放。系統不會向學生或家長顯示未開放教材，但已派出的紙張不能鎖上，仍須由老師控制實際派發時間。', 'Binders keep their past, current and future sections: completed work is available for revision; current work includes classwork, homework and outstanding corrections; teachers hold future work and decide when to distribute it and release it digitally. Unreleased materials remain unavailable to student and parent accounts, while teachers still control physical distribution because a printed sheet cannot be locked once handed out.']
        ]) +
        featureGroup('配對工作紙，確認同步結果', 'Match the worksheet and check synchronisation', [
          ['上課前確認學生、智能筆及工作紙的配對。每份印製工作紙均對應學生、頁次、教材版本及該次派發；補印、收回或重新派發亦保留紀錄，避免不同學生或不同次作答混在一起。中心可採用個人領用或課堂借用，換筆或轉交設備時按同一程序重新確認。', 'Before class, confirm the relationship between the student, smartpen and worksheet. Each printed sheet is linked to its student, page, material version and assignment, with records for reprints, withdrawals and reassignment so different students or attempts do not become mixed. Centres can allocate pens individually or lend them in class, checking the association again whenever a pen is replaced or handed over.'],
          ['課堂結束前，老師或職員檢查哪些習作已同步、哪些仍待處理，清楚區分「未收到筆跡」與「學生未作答」。若連線或設備中斷，可先以紙本繼續教學，再按確認的復原程序補回紀錄；在家完成的功課亦待成功同步後，才可在系統查閱。', 'Before closing the lesson, teachers or staff check synchronised and pending work, distinguishing missing handwriting from an unanswered worksheet. If connectivity or equipment is interrupted, teaching can continue from the paper copy while records are recovered through the agreed procedure. Homework also becomes available digitally only after successful synchronisation.']
        ]) +
        demo('game', copy('共用練習示範：數學飛車（並非智能筆示範）', 'Shared practice demo: Maths Kart (not a smartpen demonstration)'))
    },
    {
      id: 'teacher', title: copy('老師派發及批改流程', 'Teacher assignment and feedback'),
      heading: copy('派發紙本習作，集中跟進教學紀錄', 'Distribute paper work and keep teaching records together'),
      intro: copy('老師保留課堂講解、巡視及面對面跟進，並可透過系統查閱已同步作答、記錄批改及發布課堂報告。以下為建議的智能筆流程，實際用筆及改正方式會在試行時一起確認。', 'Teachers retain classroom explanations, observation and face-to-face support, while the system lets them review synchronised answers, record marking and publish lesson reports. This is the proposed smartpen workflow; we would confirm the practical writing and correction routines together during a pilot.'),
      body:
        featureGroup('批改與改正，配合 AI 輔助核對', 'Marking and corrections with AI-assisted checks', [
          ['老師可直接查看紙本，或在應用程式查閱已同步筆跡、加入批改及安排改正。原作答與後續改正一併保存，由老師確認是否完成；紙上的擦除、塗改或覆蓋，不會令已儲存的數碼筆跡自動消失，須配合選定智能筆及學生實際使用，確認合適的改正方式。', 'Teachers can inspect paper work or review synchronised handwriting in the app, add marking and assign corrections. Original answers and later corrections are retained together, with teachers confirming completion. Erasing, covering or changing an answer on paper does not automatically remove stored handwriting, so the correction routine must be validated with the selected pen and students.'],
          ['若要同步老師在紙上的批改，亦須驗證老師用筆、身份及筆跡區分方式；一般紅筆寫下的評語不會自動成為數碼紀錄，可由老師在應用程式補入。', 'Capturing teachers’ paper annotations also requires validation of teacher pens, identity and how their handwriting is distinguished. Ordinary red-pen comments do not become digital records automatically; teachers can add them in the app.'],
          ['AI 可參照核准答案，協助辨識作答、提出核對建議及整理常見錯誤，供老師參考。適用題型及字跡須先測試；未能辨識的數字、圖形、運算步驟及不確定結果交由老師判斷，不能把收到筆跡當作已正確批改。', 'AI may help read answers, suggest checks against approved answers and organise recurring mistakes for teachers to review. Supported question types and handwriting need testing first. Unclear numbers, diagrams, working steps and uncertain results remain for teacher judgement; receiving handwriting does not establish that it has been marked correctly.']
        ]) +
        featureGroup('課堂報告、家長跟進與學生鼓勵', 'Lesson reports, parent follow-up and encouragement', [
          ['老師可記錄課堂日期、導師及學習重點，為準時上課、交齊功課、上課認真及自學自習填寫 A–E 評級，並撰寫給家長的評語。課堂報告由老師發布後才顯示在家長電子手冊，連同家長已閱及回覆紀錄保存；習作亦只開放已成功同步並經老師選定的內容。', 'Teachers record the lesson date, instructor and learning focus, with A–E ratings for punctuality, completed homework, diligence and independent study, plus notes for parents. Reports appear in the parent handbook only after teachers publish them, alongside read acknowledgements and replies. Only successfully synchronised work selected by the teacher is released.'],
          ['老師亦可為學生的努力或進步給予印章，寫下簡短鼓勵原因；學生在獨立集印頁查看。應用程式可提供老師開放的重溫內容及互動練習，配合日常紙本學習。本節末的數學飛車是可試玩的加法練習示例，與智能筆記錄分開；按個別學習進度產生練習仍屬建議功能。', 'Teachers can award stamps for effort or progress with a short reason, which students view in a separate collection. The app can also provide teacher-released revision content and interactive practice alongside paper-based learning. The Maths Kart game at the end of this section is a playable addition example, separate from smartpen capture; generating practice from individual learning progress remains a proposed function.']
        ])
    },
    {
      id: 'library', title: copy('教材', 'Materials'), heading: copy('教材數碼化、編製及受控列印', 'Material digitisation, authoring and controlled printing'),
      intro: copy('我們會先沿用現有教材的內容及版面，整理成老師可以查找、派發及列印的受控教材庫，再逐步加入題庫及編製工具。智能筆所需的紙張及印製安排，會以實際工作紙測試後確認。', 'We would start with the content and layouts of existing materials, organising them into a controlled library teachers can search, assign and print, then add a question bank and authoring tools in stages. Paper and printing arrangements for smartpens would be validated using real worksheets.'),
      body:
        featureGroup('整理現有教材，驗證工作紙印製', 'Organise existing materials and validate printing', [
          ['沿用年級、課題、教材系列及工作紙編號建立目錄，核對檔案完整性、重複內容及使用版本。已核准工作紙保留原有算式、圖形及作答空間；印製時加入相容的頁面識別，記錄學生、頁次、教材版本及派發次數。普通紙張上的既有文件不能直接假設可記錄筆跡。', 'Build the catalogue around existing grades, topics, series and worksheet numbers, checking completeness, duplicates and versions. Approved sheets retain their equations, diagrams and working space. Printing adds compatible page identification, linked to the student, page, material version and assignment. Existing documents on ordinary paper cannot be assumed to capture handwriting.'],
          ['試行時一起核對細小算式、圖形、裝訂、紙張及打印品質，確保閱讀及書寫不受影響。自行影印、縮放、補印或更換打印設備的效果亦須測試，確認合適後才擴展使用。', 'During the pilot, we would check small equations, diagrams, binding, paper and print quality together so reading and writing remain practical. Photocopying, scaling, reprinting and different printers also need testing before wider use.']
        ]) +
        featureGroup('重用題庫，編製及審批新教材', 'Reuse questions and create approved new materials', [
          ['已核實的題目、算式、圖形及答案可逐步整理成可搜尋和重用的題庫，保留來源及版本。原版工作紙、已辨識題目及已核對可編輯內容分開標示；辨識不完整的內容先保留原版，不當作已完成轉換。', 'Verified questions, equations, diagrams and answers can gradually become a searchable, reusable question bank, retaining sources and versions. Original-layout sheets, extracted questions and verified editable content are labelled separately. Incomplete conversions remain in their original form rather than being counted as completed editable material.'],
          ['編審人員可由空白頁開始，或選用已核准題目，以拖放方式編排文字、算式、圖形及作答空間。AI 可協助起草題目、答案、提示及排版，再由指定人員核對數學內容及教學用途；完成審批後才發布正式版本，並預覽紙本輸出及智能筆使用效果。', 'Editors can start with a blank page or approved questions, arranging text, equations, diagrams and working space through a visual editor. AI can assist with draft questions, answers, hints and layouts, with designated reviewers checking mathematical accuracy and teaching suitability. Only approved versions are published, with previews and checks for printed output and smartpen use.']
        ]) +
        featureGroup('管控教材取用、列印及副本紀錄', 'Control material access, printing and copy records', [
          ['原始文件及傳統格式教材存於受控教材庫，按中心、角色及教材範圍開放；學生用教材、答案及老師備註分開管理。一般教學帳戶只取用獲准教材，不提供整庫原始檔案下載。使用外部 AI 處理教材前，亦須先議定授權、用途及保密安排。', 'Original files and traditional-format materials stay in a controlled library, with access limited by centre, role and curriculum. Student content, answers and teacher notes are managed separately. Ordinary teaching accounts use authorised materials without unrestricted downloads of the original collection. External AI processing requires agreed permissions, purposes and confidentiality arrangements.'],
          ['獲授權職員可直接在系統提出列印，送往中心認可設備，毋須先下載原始工作紙到個人電腦。系統保留教材版本、派發對象、份數、時間及列印結果；補印可追溯至原派發，按規則處理舊紙張與新紙張的關係，並可加入版本或副本標記協助追查來源。', 'Authorised staff request printing directly to approved centre equipment without first downloading source worksheets to personal computers. Records retain the version, recipient, copy count, time and outcome. Reprints remain traceable to the original assignment, with rules for relating old and replacement sheets; optional edition or copy identifiers can help trace their source.'],
          ['紙張交付後仍可能被拍照、影印或轉交，因此保障重點是限制整庫取用、管控派發及保留追蹤紀錄，配合中心的保管安排，不能保證紙本無法被複製。', 'Printed pages can still be photographed, copied or passed on. Protection therefore focuses on limiting library access, controlling distribution and retaining traceable records, alongside centre storage procedures; it cannot guarantee that paper will never be copied.']
        ])
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
