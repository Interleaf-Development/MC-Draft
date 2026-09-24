import { smartpenFlow } from './smartpen-flow.js';
import { smartpenWritingDemo } from './smartpen-writing-demo.js';

// Keep the agreed wording in its source documents. Only the teaching approach
// changes; materials, centre operations and the parent app are presented once.
export function buildProposalStructure(language, original, smartpen) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const chapter = (source, id) => source.chapters.find(item => item.id === id);
  const paragraph = text => `<p>${text}</p>`;
  const lowerHeadings = html => html.replace(/<(\/?)(h)([2-5])\b/g, (_, close, h, level) => `<${close}${h}${Number(level) + 1}`);
  const gameMarkup = /<div class="demo-wrap"><div class="demo-caption">[^<]*<\/div><div class="demo" data-demo="game" id="demo-game"><\/div><\/div>/g;
  const subsection = (item, id, body = item.body) => `<section class="proposal-subsection" id="${id}" aria-labelledby="heading-${id}"><h3 id="heading-${id}">${item.heading || item.title}</h3>${item.intro ? `<p class="section-intro">${item.intro}</p>` : ''}${lowerHeadings(body)}</section>`;
  const learningBody = (source, prefix) => ['student', 'teacher'].map(id => {
    const item = chapter(source, id);
    let body = item.body.replace(gameMarkup, '');
    if (id === 'student') {
      body = body.replace('以下「數學飛車」示範', '本節末的「數學飛車」示範')
        .replace('下方數學飛車', '本節末的數學飛車')
        .replace('The addition racing game below', 'The addition racing game at the end of this section')
        .replace('The Maths Kart demo below', 'The Maths Kart demo at the end of this section');
    }
    if (prefix === 'smartpen-' && id === 'student') body = smartpenWritingDemo(language) + body + smartpenFlow(language);
    return subsection(item, `${prefix}${id}`, body);
  }).join('');

  const overviewHTML = `
    <header class="document-header">
      <div class="document-type">${copy('系統功能建議', 'System proposal')}</div>
      <h1 id="document-title">${copy('1. MathConcept 教學及中心管理系統', '1. MathConcept Teaching & Centre Management System')}</h1>
      <p class="document-summary">${copy('我們建議為 MathConcept 建立一套涵蓋學生學習、教材管理、中心營運及家長服務的系統。教學部分提供「平板無紙化」及「紙本＋智能筆」兩種選擇，方便中心按實際需要比較。兩個方案共用相同的教材管理、中心管理及家長功能，以下會一併介紹。', 'We recommend bringing student learning, teaching materials, centre operations and parent services together in one system for MathConcept. The teaching section offers two approaches to compare against the centre’s needs: paperless tablet learning or paper with smartpens. Both use the same material management, centre management and parent functions, which we introduce together below.')}</p>
      <dl class="document-metadata">
        <div><dt>${copy('提交對象', 'Prepared for')}</dt><dd>MathConcept</dd></div>
        <div><dt>${copy('文件類別', 'Document')}</dt><dd>${copy('系統建議書', 'System proposal')}</dd></div>
        <div><dt>${copy('日期', 'Date')}</dt><dd>${copy('2026年9月24日', '24 September 2026')}</dd></div>
        <div><dt>${copy('文件狀態', 'Status')}</dt><dd>${copy('初稿，供討論用', 'Draft for discussion')}</dd></div>
      </dl>
    </header>
    <section class="feature-detail">
      <h2>${copy('系統概覽', 'System overview')}</h2>
      ${paragraph(copy('系統預計包括 iOS 及 Android 原生應用程式，以及供電腦使用的網頁介面。家長以手機為主，老師可使用平板或電腦，中心職員及總部以電腦處理日常工作。學生的作答方式按所選教學方案安排：方案一以直向平板作答，方案二保留紙本工作紙及資料夾，以墨水智能筆在專用點紋工作紙上書寫，連線時逐筆同步。', 'The proposed system includes native iOS and Android applications and a web interface for computers. Parents mainly use phones, teachers use tablets or computers, and centre staff and HQ use computers for everyday work. Student writing depends on the chosen teaching approach: portrait tablets in Solution 1, or familiar binders and specially patterned worksheets with ink smartpens streaming strokes while connected in Solution 2.'))}
      ${paragraph(copy('<strong>學生及老師：</strong>派發習作、作答、批改、改正、學習進度及集印鼓勵。兩個方案保留相同的教學目的，分別說明學生使用方式、老師跟進流程及教材準備。', '<strong>Students and teachers:</strong> assignments, answers, marking, corrections, learning progress and stamp rewards. Both approaches support the same teaching aims, with their own student workflow, teacher follow-up and material preparation.'))}
      ${paragraph(copy('<strong>中心職員及總部：</strong>報名、排課、請假補堂、家長溝通、收費與銀行對帳，以及跨中心權限及營運管理。', '<strong>Centre staff and HQ:</strong> enrolment, scheduling, leave and make-up arrangements, parent communication, billing and bank reconciliation, plus permissions and operations across centres.'))}
      ${paragraph(copy('<strong>家長：</strong>透過手機查閱子女課堂、已開放的學習紀錄、電子手冊、帳單及收據，提交請假或付款證明，並與中心溝通。', '<strong>Parents:</strong> use a phone to view lessons, released learning records, the digital handbook, invoices and receipts, submit leave requests or payment proof, and communicate with the centre.'))}
    </section>
    <div class="document-links"><a href="#learning">${copy('2. 教學與教材：比較兩個方案', '2. Teaching & materials: compare the approaches')}</a><a href="#system">${copy('3. 中心及總部管理（兩方案共用）', '3. Centre & HQ management (shared)')}</a><a href="#parent">${copy('4. 家長應用程式（兩方案共用）', '4. Parent app (shared)')}</a></div>`;

  const learning = {
    id: 'learning',
    title: copy('教學與教材', 'Teaching & materials'),
    heading: copy('教學與教材：兩個方案', 'Teaching & materials: two approaches'),
    intro: copy('兩個方案共用相同的教材及管理系統，主要分別在於學生如何作答，以及老師如何收集和跟進學習紀錄。', 'Both approaches share the same materials and management system. The main difference is how students answer worksheets and how teachers collect and follow up their work.'),
    body: `<section class="learning-comparison" id="learning-comparison" aria-labelledby="learning-comparison-title">
      <header class="learning-comparison-heading"><h3 id="learning-comparison-title">${copy('選擇教學方案', 'Choose a teaching approach')}</h3><p>${copy('切換下方選項，比較框內的學生體驗與老師流程。', 'Switch between the options to compare the student and teacher workflows inside this section.')}</p></header>
      <nav class="solution-switch" id="solution-switch" aria-label="${copy('選擇教學方案', 'Choose a teaching approach')}"><a data-solution="1" aria-controls="learning-solution-1" href="?solution=1#learning"><span class="solution-number">${copy('方案一', 'Solution 1')}</span><strong>${copy('平板無紙化', 'Paperless tablets')}</strong><span class="solution-description">${copy('在平板上直接書寫及作答', 'Write and answer directly on a tablet')}</span></a><a data-solution="2" aria-controls="learning-solution-2" href="?solution=2#learning"><span class="solution-number">${copy('方案二', 'Solution 2')}</span><strong>${copy('紙本＋智能筆', 'Paper + smartpen')}</strong><span class="solution-description">${copy('保留紙本書寫，筆跡同步至系統', 'Keep writing on paper, with synced handwriting')}</span></a></nav>
      <section id="learning-solution-1" class="learning-option" data-learning-solution="1" aria-labelledby="learning-solution-1-title"><h3 id="learning-solution-1-title">${copy('方案一：平板無紙化學習', 'Solution 1: paperless tablet learning')}</h3>${learningBody(original, '')}</section>
      <section id="learning-solution-2" class="learning-option" data-learning-solution="2" aria-labelledby="learning-solution-2-title"><h3 id="learning-solution-2-title">${copy('方案二：紙本作答，筆跡即時同步', 'Solution 2: write on paper, sync strokes as you write')}</h3>${learningBody(smartpen, 'smartpen-')}</section>
      </section>
      ${subsection({ ...chapter(original, 'library'), heading: copy('教材管理與編製（兩方案共用）', 'Material management and authoring (shared)') }, 'library')}
      <section class="proposal-subsection shared-practice" id="shared-practice"><h3>${copy('兩方案均可提供的課後互動練習', 'Optional interactive practice for either approach')}</h3>${paragraph(copy('學生可在日常習作以外使用獲開放的互動練習。以下可試玩「數學飛車」，體驗以遊戲鼓勵學生練習加法的方式，兩個方案均可採用。', 'Students can use released interactive exercises alongside their regular worksheets. Try Maths Kart below to explore game-based addition practice, available with either approach.'))}<div class="demo-wrap"><div class="demo-caption">${copy('共用練習示範：數學飛車', 'Shared practice demo: Maths Kart')}</div><div class="demo" data-demo="game" id="demo-game"></div></div></section>`
  };

  const centre = chapter(original, 'system');
  const franchise = chapter(original, 'franchise');
  const parent = chapter(original, 'parent');
  const chapters = [
    { id: 'vision', title: copy('建議書概覽', 'Proposal overview') },
    learning,
    {
      ...centre,
      title: copy('中心及總部管理', 'Centre & HQ management'),
      heading: copy('中心及總部管理', 'Centre & HQ management'),
      intro: copy('不論選擇哪個教學方案，中心都可使用以下功能。報名、排課、請假補堂、收費及跨中心管理沿用相同流程，方便職員繼續按熟悉的方式處理日常工作。', 'Whichever teaching approach the centre chooses, the following functions are shared. Enrolment, scheduling, leave and make-up lessons, billing and multi-centre management follow the same workflows, helping staff continue with familiar ways of working.'),
      body: centre.body + subsection(franchise, 'franchise')
    },
    {
      ...parent,
      intro: `${copy('兩個教學方案使用同一套家長功能；可查閱的學習紀錄來自已儲存的平板作答，或已成功同步的智能筆筆跡，並須由老師開放。', 'Both teaching approaches use the same parent functions. Available learning records come from saved tablet work or successfully synchronised smartpen handwriting, released by the teacher.')} ${parent.intro}`
    }
  ];

  const referenceLabels = {
    scope: copy('詳細範圍', 'Detailed scope'),
    safeguards: copy('教材與營運保障', 'Protection & reliability'),
    assumptions: copy('待確認事項', 'Open decisions')
  };
  const references = Object.fromEntries(Object.entries(referenceLabels).map(([key, title]) => {
    let penBody = smartpen.references[key].body
      .replace('原有方案一另頁保留；', '方案一保留在「教學與教材」一節，可切換比較；')
      .replace('Solution 1 remains available separately.', 'Solution 1 remains available in the Teaching & materials section for comparison.')
      .replace('本方案第 5 至第 7 章', '本建議書第 3 至第 4 節')
      .replace('chapters 5–7', 'sections 3–4');
    if (key === 'scope') {
      // Shared operational terms remain in the original scope above. The
      // smartpen supplement only needs its teaching, materials and demo scope.
      penBody = penBody.replace(/<section class="feature-detail"><h3>(?:中心、家長及總部|Centre, parent and HQ functions)<\/h3>[\s\S]*?<\/section>/, '');
    }
    return [key, {
      title,
      body: `<section class="reference-section"><h3>${copy('共用系統及方案一', 'Shared system and Solution 1')}</h3>${lowerHeadings(original.references[key].body)}</section><section class="reference-section"><h3>${copy('方案二：智能筆補充內容', 'Solution 2: smartpen-specific details')}</h3>${lowerHeadings(penBody)}</section>`
    }];
  }));

  return {
    chapters,
    references,
    overviewHTML,
    shellTextOverrides: {
      draftMark: copy('系統建議書', 'SYSTEM PROPOSAL'),
      draftNote: copy('初稿，供討論用', 'Draft for discussion'),
      documentType: copy('系統功能建議', 'System proposal'),
      documentTitle: copy('1. MathConcept 教學及中心管理系統', '1. MathConcept Teaching & Centre Management System'),
      documentValue: copy('系統建議書', 'System proposal'),
      draftDate: copy('2026年9月24日', '24 September 2026'),
      learningLink: copy('2. 教學與教材', '2. Teaching & materials'),
      parentLink: copy('4. 家長應用程式', '4. Parent app')
    }
  };
}
