export function getSharedKnowledge(language) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const feature = (chineseTitle, englishTitle, chineseBody, englishBody) =>
    `<section class="feature-detail"><h3>${copy(chineseTitle, englishTitle)}</h3>${(zh ? chineseBody : [englishBody]).map(text => `<p>${text}</p>`).join('')}</section>`;

  return {
    heading: copy('共同大腦：跨中心學校資訊庫', 'School knowledge base across centres'),
    intro: copy(
      '',
      'Exam dates, syllabuses and past papers received from students or parents often remain with individual teachers. We recommend building a shared MathConcept knowledge base where teachers within the same centre and across other centres can find, contribute and use this information, turning local experience into a shared teaching resource.'
    ),
    body:
      (zh ? "<p>各中心從學生及家長取得的考試日期、考試範圍、學校通知及歷屆試卷，往往分散在不同老師手上。</p><p>我們建議把這些資訊逐步累積成 MathConcept 的「共同大腦」，將各中心原本分散的資訊和經驗轉化為整個 MathConcept 網絡都能運用的教學資源。</p>" : '') +
      feature(
        "各中心資訊集中累積",
        'Bring each centre’s information together',
        ["老師可加入學校通知、考試日期、考試範圍、歷屆試卷及教學備註，並記錄資料來源、提供中心、收集日期及最近更新時間。", "其他老師可補充資訊或提出修訂；更新後供獲授權中心共同查閱，同時保留過往版本及來源。"],
        'Teachers can contribute school notices, exam dates, syllabuses, past papers and teaching notes, recording the source, contributing centre, collection date and latest update. Attachments follow usage rights and centre permissions. Other teachers can add information and suggest corrections, with updates available to authorised centres and previous versions retained.'
      ) +
      feature(
        "按學校及考試查找",
        'Find information by school and exam',
        ["資訊按學校、年級、科目、學年、學期及考試整理。", "老師可快速查看相關學生的考試安排、考核課題及參考資料，並比較歷年內容，用於安排溫習進度、選取教材及準備考前輔導，減少不同中心重複向家長收集相同資訊。"],
        'Organise information by school, grade, subject, academic year, term and exam. Teachers can find relevant exam arrangements, topics and references, check their update dates and compare previous years. This supports revision planning, material selection and exam preparation while reducing repeated requests to parents.'
      ) +
      feature(
        "AI 編製同類練習與模擬卷",
        'AI-assisted practice and mock papers',
        ["AI 可參照獲准使用的試卷及學校資訊，分析考核課題、題型、試卷結構及難度，再按老師指定的範圍編製原創同類練習或模擬卷。", "內容可包括重新設計的題目、數據、情境及圖形，並附上建議答案和解題說明，讓老師更快為不同學校及學生準備針對性的溫習材料。"],
        'AI can use permitted reference papers to identify topics, question types, paper structure and difficulty, then draft original practice or mock papers within the teacher’s chosen scope. These can include newly designed questions, wording, data, contexts and diagrams, with suggested answers and explanations to help teachers prepare suitable revision materials for different students.'
      ) +
      feature(
        "審閱後共用，持續完善",
        'Review, share and improve',
        ["AI 產生的內容先由老師核對數學準確性、答案、解題方法及教學適切性，修改及批准後才加入共用題庫。", "其他中心可按權限選用，並保留版本及參考來源。隨著更多學校資訊、試卷及使用回饋累積，這套共同資源亦會持續完善。"],
        'Teachers check mathematical accuracy, answers, solution methods and teaching suitability, then edit and approve the content before publishing it to the shared question bank. Other centres can use it within their permissions, with reference sources and versions retained. Teacher feedback and new exam information support ongoing revisions, steadily enriching the school information and practice resources.'
      )
  };
}
