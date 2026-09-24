import { smartpenFlow } from './smartpen-flow.js';
import { smartpenWritingDemo } from './smartpen-writing-demo.js';
import { getSharedKnowledge } from './shared-knowledge.js';

// Student options differ by writing device. Teaching workflows and materials
// are presented once in separate chapters.
export function buildProposalStructure(language, original, smartpen) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const chapter = (source, id) => source.chapters.find(item => item.id === id);
  const paragraph = text => `<p>${text}</p>`;
  const lowerHeadings = html => html.replace(/<(\/?)(h)([2-5])\b/g, (_, close, h, level) => `<${close}${h}${Number(level) + 1}`);
  const subsection = (item, id, body = item.body) => `<section class="proposal-subsection" id="${id}" aria-labelledby="heading-${id}"><h3 id="heading-${id}">${item.heading || item.title}</h3>${item.intro ? `<p class="section-intro">${item.intro}</p>` : ''}${lowerHeadings(body)}</section>`;
  const learningBody = (source, prefix) => {
    const item = chapter(source, 'student');
    const body = prefix === 'smartpen-' ? (zh ? '' : smartpenWritingDemo(language)) + item.body + smartpenFlow(language) : item.body;
    return subsection(item, `${prefix}student`, body);
  };

  const overviewHTML = `
    <header class="document-header">
      <div class="document-type">${copy('系統功能建議', 'System proposal')}</div>
      <h1 id="document-title">${copy('1. MathConcept 教學及中心管理系統', '1. MathConcept Teaching & Centre Management System')}</h1>
      ${zh ? '' : `<p class="document-summary">${copy('我們建議為 MathConcept 建立一套涵蓋學生學習、教材管理、中心營運及家長服務的系統。學生可使用平板或紙本配合智能筆作答，以下先介紹兩種學生體驗，再說明教材、教學流程、跨中心知識庫、中心管理及家長功能。', 'We recommend bringing student learning, teaching materials, centre operations and parent services together in one system for MathConcept. Students can answer on tablets or on paper with smartpens. We first introduce these two student experiences, followed by teaching materials, teaching workflows, the cross-centre knowledge base, centre management and parent functions.')}</p>`}
      <dl class="document-metadata">
        <div><dt>${copy('提交對象', 'Prepared for')}</dt><dd>MathConcept</dd></div>
        <div><dt>${copy('文件類別', 'Document')}</dt><dd>${copy('系統建議書', 'System proposal')}</dd></div>
        <div><dt>${copy('日期', 'Date')}</dt><dd>${copy('2026年9月24日', '24 September 2026')}</dd></div>
        <div><dt>${copy('文件狀態', 'Status')}</dt><dd>${copy('初稿，供討論用', 'Draft for discussion')}</dd></div>
      </dl>
    </header>
    <section class="feature-detail">
      <h2>${copy('系統概覽', 'System overview')}</h2>
      ${paragraph(copy('我們建議為 MathConcept 建立一套以 AI 深度輔助的綜合系統，涵蓋學生學習、教材管理、中心營運及家長服務，並在各個合適的流程中充分運用 AI，以提升教學質素及營運效率。系統預計包括 iOS 及 Android 原生應用程式(Native Application)，以及供電腦使用的網頁介面。家長以手機為主，老師可使用平板或電腦，中心職員及總部以電腦處理日常工作。學生方面，我們有兩套方案：方案一以平板作答為主同時保留紙本掃描；方案二是採用智能筆配合特製紙張的技術，讓使用者能如常在紙上書寫的同時，此技術能將書寫內容自動同步至系統。', 'The proposed system includes native iOS and Android applications and a web interface for computers. Parents mainly use phones, teachers use tablets or computers, and centre staff and HQ use computers for everyday work. Students can choose between two writing methods: portrait tablets in Solution 1, or familiar binders and specially patterned worksheets with ink smartpens streaming strokes while connected in Solution 2.'))}
      ${paragraph(copy('<strong>學生及老師：</strong>派發習作、作答、批改、改正、學習進度及集印鼓勵。學生的兩套學習體驗方案見第 2 節；教材準備、教材內容保護見第 3 節；派發及老師跟進流程見第 4 節。', '<strong>Students and teachers:</strong> assignments, answers, marking, corrections, learning progress and stamp rewards. Section 2 describes how students write; section 3 covers material preparation, and section 4 covers assignment and teacher follow-up.'))}
      ${paragraph(copy('<strong>中心職員及總部：</strong>報名、排課、請假補堂、家長溝通、收費與銀行對帳，以及跨中心權限及營運管理。', '<strong>Centre staff and HQ:</strong> enrolment, scheduling, leave and make-up arrangements, parent communication, billing and bank reconciliation, plus permissions and operations across centres.'))}
      ${paragraph(copy('<strong>家長：</strong>透過手機查閱子女課堂、已開放的學習紀錄、電子手冊、帳單及收據，提交請假或付款證明，並與中心溝通。', '<strong>Parents:</strong> use a phone to view lessons, released learning records, the digital handbook, invoices and receipts, submit leave requests or payment proof, and communicate with the centre.'))}
    </section>
    ${zh ? '' : `<div class="document-links"><a href="#learning">${copy('2. 學生體驗', '2. Student experience')}</a><a href="#materials">${copy('3. 教材', '3. Teaching materials')}</a><a href="#teaching">${copy('4. 老師及課後流程', '4. Teacher and home learning workflows')}</a><a href="#system">${copy('5. 中心及總部管理', '5. Centre & HQ management')}</a><a href="#parent">${copy('6. 家長應用程式', '6. Parent app')}</a></div>`}`;

  const learning = {
    id: 'learning',
    title: copy('學生體驗', 'Student experience'),
    heading: copy('學生體驗 — 兩個建議方案', 'Student experience'),
    intro: copy('', 'Students can write on a tablet with a stylus, or keep paper worksheets and use an ink smartpen to capture their handwriting. Compare the two writing experiences below.'),
    body: `<section class="learning-comparison" id="learning-comparison" aria-labelledby="${zh ? 'heading-learning' : 'learning-comparison-title'}">
      ${zh ? '' : `<header class="learning-comparison-heading"><h3 id="learning-comparison-title">${copy('選擇作答方式', 'Choose how students write')}</h3><p>${copy('切換下方選項，查看平板或智能筆的學生體驗。', 'Switch between the options to explore the tablet or smartpen student experience.')}</p></header>`}
      <nav class="solution-switch" id="solution-switch" aria-label="${copy('選擇作答方式', 'Choose how students write')}"><a data-solution="1" aria-controls="learning-solution-1" href="?solution=1#learning"><span class="solution-number">${copy('方案一', 'Solution 1')}</span><strong>${copy('平板無紙化', 'Paperless tablets')}</strong><span class="solution-description">${copy('以平板為主配合基本紙本掃描', 'Write and answer directly on a tablet')}</span></a><a data-solution="2" aria-controls="learning-solution-2" href="?solution=2#learning"><span class="solution-number">${copy('方案二', 'Solution 2')}</span><strong>${copy('智能筆＋特製紙張', 'Paper + smartpen')}</strong><span class="solution-description">${copy('在保留紙本書寫體驗的同時自動將書寫內容同步至系統', 'Keep writing on paper, with automatic handwriting sync')}</span></a></nav>
      <section id="learning-solution-1" class="learning-option" data-learning-solution="1" aria-labelledby="learning-solution-1-title"><h3 id="learning-solution-1-title">${copy('方案一：平板無紙化學習', 'Solution 1: paperless tablet learning')}</h3>${learningBody(original, '')}</section>
      <section id="learning-solution-2" class="learning-option" data-learning-solution="2" aria-labelledby="learning-solution-2-title"><h3 id="learning-solution-2-title">${copy('方案二：紙本作答，筆跡即時同步', 'Solution 2: write on paper, sync strokes as you write')}</h3>${learningBody(smartpen, 'smartpen-')}</section>
      </section>`
  };

  const materials = {
    id: 'materials',
    title: copy('教材', 'Teaching materials'),
    heading: copy('教材', 'Teaching materials'),
    intro: copy('我們建議建立一套完整的教材及學習管理系統，涵蓋現有教材數碼化、新教材編製、教材安全、派發及批改、學習分析、家長跟進及課後自學。老師可在同一系統完成主要教學工作，並利用跨中心累積的學校資訊及 AI，準備更適合學生的教材和練習。', 'From digitising existing materials and creating new content to assigning worksheets, marking and following up learning, teachers can work in one system and use school information and AI to prepare suitable practice.'),
    body: subsection(chapter(original, 'library'), 'library') +
      subsection(getSharedKnowledge(language), 'shared-knowledge')
  };

  const teaching = {
    id: 'teaching',
    title: copy('老師及課後流程', 'Teacher and home learning workflows'),
    heading: copy('老師及課後流程', 'Teacher and home learning workflows'),
    intro: '',
    body: subsection(chapter(original, 'teacher'), 'teacher') +
      `<section class="proposal-subsection shared-practice" id="shared-practice"><h3>${copy('課後自學與互動練習', 'Home learning and interactive practice')}</h3>${paragraph(copy('課堂教材及練習可進一步轉化成互動遊戲、自學活動及挑戰，直接放到學生 App，讓學生回家後透過電腦、平板或手機繼續學習。AI 可根據正在學習的課題及學生進度，協助把現有教材轉化成不同形式的遊戲和互動練習，讓原本的教材不只用於課堂及工作紙，亦能延伸成更有趣的課後自學體驗。', 'At home, students can sign in on a computer, tablet or phone to revisit released work and use interactive exercises. AI can draft questions, hints, learning content and games around current topics and teacher-confirmed needs. Teachers review and adjust them before release, keeping home learning aligned with classroom progress.'))}${paragraph(copy('以下可試玩「數學飛車」：學生在八道個位數加法題中駛向正確答案便會加速，選錯則會減速，以遊戲鼓勵練習。此版本僅作概念及互動效果示範，主要展示教材如何轉化為遊戲化學習體驗，並非最終的遊戲內容或設計。', 'Try Maths Kart below: students race through eight single-digit addition questions, speeding up when they drive towards the correct answer and slowing down for an incorrect one.'))}<div class="demo-wrap"><div class="demo-caption">${copy('互動示範：數學飛車', 'Interactive demo: Maths Kart')}</div><div class="demo" data-demo="game" id="demo-game"></div></div></section>`
  };

  const centre = chapter(original, 'system');
  const franchise = chapter(original, 'franchise');
  const parent = chapter(original, 'parent');
  const chapters = [
    { id: 'vision', title: copy('建議書概覽', 'Proposal overview') },
    learning,
    materials,
    teaching,
    {
      ...centre,
      title: copy('中心及總部管理', 'Centre & HQ management'),
      heading: copy('中心及總部管理', 'Centre & HQ management'),
      intro: copy('中心可在同一系統處理報名、排課、請假補堂及收費，總部則可管理各中心的權限及營運紀錄，方便職員按熟悉的方式處理日常工作。', 'Centres can handle enrolment, scheduling, leave, make-up lessons and billing in one system, while HQ manages centre permissions and operating records so staff can continue with familiar ways of working.'),
      body: centre.body + subsection(franchise, 'franchise')
    },
    {
      ...parent,
      intro: `${copy('可查閱的學習紀錄來自已儲存的平板作答，或已成功同步的智能筆筆跡，並須由老師開放。', 'Available learning records come from saved tablet work or successfully synchronised smartpen handwriting, released by the teacher.')} ${parent.intro}`
    }
  ];

  const referenceLabels = {
    scope: copy('詳細範圍', 'Detailed scope'),
    safeguards: copy('教材與營運保障', 'Protection & reliability'),
    assumptions: copy('待確認事項', 'Open decisions')
  };
  const references = Object.fromEntries(Object.entries(referenceLabels).map(([key, title]) => {
    let penBody = smartpen.references[key].body
      .replace('原有方案一另頁保留；', '平板與智能筆的學生體驗見第 2 節，可切換比較；')
      .replace('Solution 1 remains available separately.', 'Tablet and smartpen student experiences are available to compare in section 2.')
      .replace('本方案第 5 至第 7 章', '本建議書第 5 至第 6 節')
      .replace('chapters 5–7', 'sections 5–6');
    if (key === 'scope') {
      // Shared operational terms remain in the original scope above. The
      // smartpen supplement only needs its teaching, materials and demo scope.
      penBody = penBody.replace(/<section class="feature-detail"><h3>(?:中心、家長及總部|Centre, parent and HQ functions)<\/h3>[\s\S]*?<\/section>/, '');
    }
    return [key, {
      title,
      body: `<section class="reference-section"><h3>${copy('系統功能範圍', 'System functions')}</h3>${lowerHeadings(original.references[key].body)}</section><section class="reference-section"><h3>${copy('方案二：智能筆補充內容', 'Solution 2: smartpen-specific details')}</h3>${lowerHeadings(penBody)}</section>`
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
      learningLink: copy('2. 學生體驗', '2. Student experience'),
      parentLink: copy('6. 家長應用程式', '6. Parent app')
    }
  };
}
