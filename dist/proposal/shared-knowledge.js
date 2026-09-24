export function getSharedKnowledge(language) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const feature = (chineseTitle, englishTitle, chineseBody, englishBody) =>
    `<section class="feature-detail"><h3>${copy(chineseTitle, englishTitle)}</h3><p>${copy(chineseBody, englishBody)}</p></section>`;

  return {
    heading: copy('共同大腦：跨中心學校資訊庫（兩方案共用）', 'Shared knowledge: school information across centres (shared)'),
    intro: copy(
      '各中心從學生或家長取得的考試日期、考試範圍及歷屆試卷，往往分散在個別老師手上。我們建議把這些資訊累積成 MathConcept 的「共同大腦」，讓同中心及其他中心的老師都能查找、補充和運用，將各自的經驗變成共同的教學資源。',
      'Exam dates, syllabuses and past papers received from students or parents often remain with individual teachers. We recommend building a shared MathConcept knowledge base where teachers within the same centre and across other centres can find, contribute and use this information, turning local experience into a shared teaching resource.'
    ),
    body:
      feature(
        '各中心的資訊，集中累積與共享',
        'Bring each centre’s information together',
        '老師可加入學校通知、考試日期、考試範圍、歷屆試卷及教學備註，記錄資料來源、提供中心、收集日期及最近更新時間。附件按使用權及中心授權開放；其他老師可補充資訊及提出修訂，更新後供獲授權中心共同查閱，並保留過往版本。',
        'Teachers can contribute school notices, exam dates, syllabuses, past papers and teaching notes, recording the source, contributing centre, collection date and latest update. Attachments follow usage rights and centre permissions. Other teachers can add information and suggest corrections, with updates available to authorised centres and previous versions retained.'
      ) +
      feature(
        '按學校及考試查找',
        'Find information by school and exam',
        '資訊按學校、年級、科目、學年、學期及考試整理，老師可快速找到相關學生的考試安排、課題及參考資料，查看更新日期並比較歷年內容，用來安排溫習進度、選取教材及準備考前輔導，減少重複向家長索取資料。',
        'Organise information by school, grade, subject, academic year, term and exam. Teachers can find relevant exam arrangements, topics and references, check their update dates and compare previous years. This supports revision planning, material selection and exam preparation while reducing repeated requests to parents.'
      ) +
      feature(
        'AI 編製同類練習與模擬卷',
        'AI-assisted practice and mock papers',
        'AI 可參照已獲准使用的試卷，整理考核課題、題型、試卷結構及難度，再按老師指定的範圍編製原創同類練習或模擬卷。內容可包括新設計的題目、敘述、數據、情境及圖形，並附上建議答案和解題說明，方便老師為不同學生準備合適的溫習材料。',
        'AI can use permitted reference papers to identify topics, question types, paper structure and difficulty, then draft original practice or mock papers within the teacher’s chosen scope. These can include newly designed questions, wording, data, contexts and diagrams, with suggested answers and explanations to help teachers prepare suitable revision materials for different students.'
      ) +
      feature(
        '審閱後共用，持續完善',
        'Review, share and improve',
        '老師先核對生成內容的數學準確性、答案、解題方法及教學適切性，修改並批准後才發布至共用題庫。其他中心可按權限選用，保留參考來源及版本；老師亦可加入使用回饋，配合新考試資訊持續修訂，逐步累積更完整的學校資訊及練習資源。',
        'Teachers check mathematical accuracy, answers, solution methods and teaching suitability, then edit and approve the content before publishing it to the shared question bank. Other centres can use it within their permissions, with reference sources and versions retained. Teacher feedback and new exam information support ongoing revisions, steadily enriching the school information and practice resources.'
      )
  };
}
