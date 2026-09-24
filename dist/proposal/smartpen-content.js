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
      <p class="document-summary">${copy('保留學生使用紙本工作紙及資料夾的學習方式，以墨水智能筆在專用點紋工作紙上作答，連線時逐筆同步至學生的學習紀錄。老師可繼續在課堂派發、講解及跟進習作，並透過系統管理教材、查看作答、記錄批改及改正進度。家長手冊、中心行政、收費及跨中心管理亦集中在同一系統。', 'Keep students working on paper worksheets in their familiar binders, using ink smartpens on compatible patterned worksheets to stream strokes into each student’s learning record while connected. Teachers continue handing out, explaining and following up work in class, while the system supports material management, review of answers, marking records and corrections. The parent handbook, centre administration, billing and multi-centre management remain part of the same system.')}</p>
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
          <tr><th scope="row">${copy('學習紀錄', 'Learning records')}</th><td>${copy('作答直接保存在電子工作紙。', 'Answers are saved on the digital worksheet.')}</td><td>${copy('連線時逐筆同步；支援的筆型可離線記錄，再補傳至對應習作。', 'Strokes sync while connected; supported pens can store offline work for later transfer to the correct assignment.')}</td></tr>
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
      heading: copy('像平常一樣在紙上寫，筆跡同時進入系統', 'Write naturally on paper, with handwriting appearing digitally as you write'),
      intro: copy('學生繼續以真正有墨水的智能筆，在外觀接近一般工作紙的專用紙上作答，保留熟悉的版面及書寫空間。連線時，作答隨寫隨同步，毋須完成後逐份拍照或掃描。老師可即時查看及重播過程，家長則可在老師開放後跟進習作及進展。', 'Students use a real ink smartpen on compatible paper that looks much like an ordinary worksheet, retaining the familiar layout and writing space. While connected, work syncs as they write, without photographing or scanning each completed sheet. Teachers can follow and replay the process, and parents can review work and progress after the teacher releases it.'),
      body:
        featureGroup('保留紙本習慣，自動留下學習紀錄', 'Keep familiar paper routines and capture learning records automatically', [
          ['老師照常派發習作，學生沿用「已完成、目前、日後」資料夾。每份作答會整理至對應學生的學習紀錄，原作答、老師批改及後續改正可一併查閱，方便接手跟進；日後習作仍由老師決定何時派發及開放。', 'Teachers hand out work as usual, and students keep their past, current and future binder sections. Each assignment is organised under the correct pupil, with original answers, teacher marking and later corrections available together for follow-up and handover. Teachers continue deciding when future work is distributed and released.'],
          ['支援離線儲存的筆型可先記錄、稍後補傳，學生不必因短暫斷線而停下作答。老師會看見哪些紀錄已收到、哪些仍待同步；只有完整同步並由老師開放的內容，才會分享給家長。', 'Pens with offline storage can retain work for later transfer, allowing students to keep writing through a temporary disconnection. Teachers can see which records have arrived and which remain pending. Only successfully synchronised work released by the teacher is shared with parents.']
        ]) +
        demo('game', copy('共用練習示範：數學飛車（並非智能筆示範）', 'Shared practice demo: Maths Kart (not a smartpen demonstration)'))
    },
    {
      id: 'teacher', title: copy('老師派發及批改流程', 'Teacher assignment and feedback'),
      heading: copy('看見作答過程，以 AI 協助教學跟進', 'Understand the working process and use AI to guide follow-up'),
      intro: copy('老師可以即時查看已連線學生的作答，課後重播值得跟進的步驟。我們會把這些紀錄用於 AI 學習分析，協助老師找出需要重溫的課題、安排個人化練習，以及整理家長看得明白的進度摘要。以下為建議提供的紀錄及分析範圍，會以實際教材及課堂試行確認。', 'Teachers can follow connected students’ work live and replay steps worth discussing afterwards. We will use these records for AI-assisted learning analysis to help teachers identify topics to revisit, plan personalised practice and prepare clear progress summaries for parents. The proposed recording and analysis scope below will be validated with real materials and classroom trials.'),
      body:
        detail(copy('系統會記錄甚麼', 'What the system will track'), list([
          copy('<strong>作答內容及先後次序：</strong>保留數字、算式、圖形及解題步驟的筆跡，可按原有次序重播，或按已設定的題目範圍查閱。', '<strong>Answers and order of working:</strong> retain handwritten numbers, equations, diagrams and working steps, with replay in their original order and review by mapped question.'),
          copy('<strong>書寫用時及速度：</strong>估算每一筆的用時、每題累計書寫時間及書寫速度變化；書寫時間與停筆間隔分開顯示。', '<strong>Writing time and speed:</strong> estimate each stroke’s duration, accumulated writing time per question and changes in writing speed, separating active writing from gaps.'),
          copy('<strong>停筆位置及時長：</strong>顯示在哪一步停下、停了多久，以及之後從哪裏繼續，方便老師回看及了解原因。', '<strong>Pauses and their location:</strong> show where recorded writing stopped, the length of the gap and where it resumed, helping teachers revisit the step and ask why.'),
          copy('<strong>重寫及改正紀錄：</strong>保留回到先前位置繼續書寫、再次嘗試及後續改正的新增筆跡，與老師批改一併跟進。', '<strong>Rewritten work and corrections:</strong> retain new strokes when a pupil returns to an earlier area, tries again or makes corrections, alongside teacher marking.'),
          copy('<strong>習作進度及成果：</strong>結合派發、同步及老師確認的紀錄，跟進已交、待批改、待改正及已完成習作，並整理已核對的作答結果。', '<strong>Assignment progress and results:</strong> combine assignment, sync and teacher-confirmed records to track submitted work, marking, corrections and completion, with checked answer results.'),
          copy('<strong>書寫力度：</strong>如選用的筆型支援，可記錄力度變化，供書寫練習及老師觀察時參考。', '<strong>Writing pressure:</strong> supported pen models can record pressure changes for handwriting practice and teacher observation.')
        ])) +
        detail(copy('我們會如何運用 AI 分析', 'How we will use AI to analyse learning'), list([
          copy('<strong>核對答案及解題步驟：</strong>AI 協助辨識作答，參照核准答案提出核對建議，標示可能出錯或需要老師查看的步驟。', '<strong>Check answers and working:</strong> AI will help recognise written answers, suggest checks against approved answers and highlight potentially incorrect steps or work needing teacher review.'),
          copy('<strong>整理常見錯誤及重溫課題：</strong>綜合多份習作，找出反覆出現的錯誤，例如進位、位值或運算次序，建議老師優先跟進哪些課題。', '<strong>Identify recurring errors and revision topics:</strong> analyse several assignments for repeated errors, such as carrying, place value or operation order, and suggest topics for teachers to prioritise.'),
          copy('<strong>找出值得追問的作答位置：</strong>結合停頓、重寫及作答結果，標示可能需要講解的步驟，讓老師有依據地了解學生在哪裏遇到困難。', '<strong>Highlight steps worth discussing:</strong> combine pauses, rewritten work and answer results to suggest steps that may benefit from explanation, giving teachers evidence for a follow-up conversation.'),
          copy('<strong>比較個人學習進展：</strong>比較同一學生在相近題型的正確率、作答次序、重寫及用時，整理進步趨勢與仍需練習的部分，避免只以快慢衡量表現。', '<strong>Review individual progress:</strong> compare the same pupil’s accuracy, order of working, rewritten steps and timing on similar questions to summarise improvement and areas for practice, without judging performance by speed alone.'),
          copy('<strong>建議個人化練習及提示：</strong>按已確認的學習需要，從核准題庫推薦練習，或草擬針對性的題目、提示及講解，由老師確認後派發。', '<strong>Suggest personalised practice and hints:</strong> use confirmed learning needs to recommend approved questions or draft targeted exercises, hints and explanations for teachers to check and assign.'),
          copy('<strong>整理課堂及家長摘要：</strong>把已確認的表現整理成重點、進展及跟進建議，供老師修改及發布；亦可用去識別化資料分析全班常見問題，協助改善教材及教學安排。', '<strong>Prepare lesson and parent summaries:</strong> turn confirmed observations into highlights, progress and follow-up suggestions for teachers to edit and publish. De-identified class patterns can also inform materials and lesson planning.')
        ]) + paragraph('AI 分析會保留相關筆跡供老師核對；字跡不清、資料未同步或判斷不確定的內容會交由老師處理。停筆只能作為跟進線索，不能單憑停頓判定學生不懂、分心或情緒狀態。', 'AI analysis will retain the relevant handwriting for teacher review. Unclear writing, unsynchronised data and uncertain conclusions will be referred to the teacher. A pause is a clue for follow-up, not proof of misunderstanding, distraction or an emotional state.')) +
        featureGroup('批改及改正集中跟進', 'Keep marking and corrections together', [
          ['老師可查看紙本或已同步的習作，加入批改、安排改正並確認完成。原作答與後續改正一併保留，方便比較及重溫；紙上的擦除不會自動刪去數碼筆跡，一般紅筆評語亦須由老師補入，實際批改方式會在試行時確認。', 'Teachers can review paper or synchronised work, add marking, assign corrections and confirm completion. Original answers and later corrections remain together for comparison and revision. Physical erasure does not automatically remove digital strokes, and ordinary red-pen comments need to be added by the teacher; the marking routine will be validated during the pilot.']
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
        featureGroup('沿用現有教材，逐步建立可搜尋的教材庫', 'Retain existing materials and build a searchable library', [
          ['按現有年級、課題、教材系列及工作紙編號整理教材，老師可快速找到正確版本，再派發予指定學生。工作紙保留原有內容、版面及作答空間，配合智能筆記錄學習過程；中心毋須先重寫整套教材才開始使用。', 'Organise materials by existing grades, topics, series and worksheet numbers so teachers can quickly find the correct version and assign it to pupils. Worksheets retain their content, layout and working space while supporting smartpen records; the centre does not need to rewrite its entire curriculum before starting.'],
          ['我們會先選取具代表性的工作紙，確認學生閱讀、書寫、批改及補印都能順暢完成，再逐步擴展教材範圍。', 'We will first validate representative worksheets for reading, writing, marking and reprinting, then gradually expand the material collection.']
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
          copy('連線時逐筆同步，支援的筆型可離線暫存後補傳；顯示已收到、待同步及需要跟進的習作，避免把未收到筆跡判斷為未完成作答。', 'Stream strokes while connected, with offline capture and later transfer on supported pens. Distinguish received, pending and exception records without treating missing data as unfinished work.'),
          copy('建議開發逐筆重播、每筆用時及筆間停頓分析、按題目整理的作答節奏，以及由老師確認的個人化練習及進展摘要；這些分析須以實際資料驗證，不能把停頓直接解讀為不懂或分心。', 'Proposed development includes stroke replay, stroke duration and pause analysis, question-level writing patterns, and teacher-approved personalised practice and progress summaries. Validate these against real data; pauses do not by themselves show confusion or distraction.'),
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
          copy('課堂及家中的連線安排、逐筆顯示延遲、同時使用人數、離線容量及補傳完整性，以及誰負責檢查及復原未完成紀錄。', 'Connections in class and at home, stroke-display latency, simultaneous users, offline capacity and transfer completeness, and responsibility for checking and recovering pending records.'),
          copy('落筆及抬筆時間、逐點位置、時間準確性及力度資料是否適用；如何區分補傳時間與原書寫時間、缺漏紀錄與真正停頓，以及題目邊界與多次作答。', 'Availability and accuracy of pen-down/up times, point positions and pressure; distinguish transfer time from writing time, missing data from actual pauses, and question boundaries from repeated attempts.'),
          copy('學習分析如何供老師覆核、哪些紀錄向家長開放、資料保留期限及去識別化統計方式；以學生個人進展為主，不以速度排名或推斷心理狀態。', 'Teacher review of analysis, parent visibility, retention and de-identification, focusing on individual progress rather than speed rankings or inferred mental states.'),
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
