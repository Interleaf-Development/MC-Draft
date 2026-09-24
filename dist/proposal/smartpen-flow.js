// A static explanation of the proposed workflow, not a connected device demo.
export function smartpenFlow(language) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const drawing = body => `<svg viewBox="0 0 144 104" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const paper = '<path d="M46 15h40l14 14v58H46z" fill="white"/><path d="M86 15v14h14M57 39h29M57 49h20"/>';
  const steps = [
    {
      title: copy('準備及派發', 'Prepare & hand out'),
      text: copy('老師選取教材，配對學生、智能筆與工作紙。', 'The teacher selects materials and links the pupil, pen and worksheet.'),
      art: drawing('<path d="M35 31V15h74v16" fill="white"/><rect x="22" y="31" width="100" height="43" rx="6" fill="white"/><path d="M42 57h60v35H42z" fill="white"/><path d="M53 68h38M53 78h24"/><path d="M34 44h8" class="flow-accent"/><circle cx="111" cy="44" r="2" fill="currentColor" stroke="none"/><path d="m104 84 4 4 8-9" class="flow-accent"/>')
    },
    {
      title: copy('紙上作答', 'Write on paper'),
      text: copy('學生沿用資料夾，以智能筆完成習作。', 'The pupil keeps their binder and answers with a smartpen.'),
      art: drawing('<rect x="25" y="12" width="80" height="82" rx="4" fill="white"/><path d="M37 12v82M20 32h11M20 72h11M49 30h37M49 39h23"/><path d="M48 56h9m-4-4v8m9-4h5m7-4v8m-3-4h6M49 78h30"/><path d="m78 70 5-13 33-34 8 8-34 33zM83 57l7 7M114 25l8 8" class="flow-accent" fill="white"/>')
    },
    {
      title: copy('同步筆跡', 'Sync handwriting'),
      text: copy('同步成功後，作答存入對應學生的紀錄。', 'After a successful sync, answers appear in the pupil’s record.'),
      art: drawing('<path d="M16 22h39v57H16z" fill="white"/><path d="M24 34h22M24 43h14M24 58l5-4 4 6 8-8"/><rect x="87" y="13" width="44" height="80" rx="6" fill="white"/><path d="M102 21h14M101 83h16M96 57h25M96 66h18"/><circle cx="109" cy="36" r="6"/><path d="M99 49c1-9 19-9 20 0"/><path d="M64 48h15m-5-5 5 5-5 5M79 66H64m5-5-5 5 5 5" class="flow-accent"/>')
    },
    {
      title: copy('批改及改正', 'Review & correct'),
      text: copy('老師查看作答、安排改正，再確認學習紀錄。', 'The teacher reviews answers, follows up corrections and confirms the record.'),
      art: drawing(`${paper}<path d="M57 64h17M57 76h23"/><path d="m81 61 5 5 11-12" class="flow-accent"/><path d="m105 83 4-12 19-20 7 7-20 20zM109 71l6 7" class="flow-accent" fill="white"/>`)
    },
    {
      title: copy('家長查看', 'Share with parents'),
      text: copy('老師發布後，家長可查看課堂報告及開放的習作。', 'Parents see reports and released work after the teacher publishes them.'),
      art: drawing('<rect x="43" y="10" width="58" height="86" rx="8" fill="white"/><path d="M62 18h20M65 88h14M53 61h36M53 71h28"/><path d="M53 29h36v23H53z" fill="white"/><path d="m64 40 5 5 12-13" class="flow-accent"/><path d="M109 41h19v17h-6l-7 6v-6h-6z" fill="white"/><path d="M115 47h7M115 52h4"/>')
    }
  ];
  return `<figure class="smartpen-flow" aria-labelledby="smartpen-flow-title">
    <figcaption id="smartpen-flow-title">${copy('一堂課的流程', 'A lesson, from paper to learning record')}</figcaption>
    <ol class="smartpen-flow-steps">${steps.map((step, index) => `<li>
      <div class="smartpen-flow-art">${step.art}</div>
      <div class="smartpen-flow-copy"><strong><span class="smartpen-flow-number" aria-hidden="true">${index + 1}.</span> ${step.title}</strong><p>${step.text}</p></div>
      ${index < steps.length - 1 ? '<span class="smartpen-flow-arrow" aria-hidden="true">→</span>' : ''}
    </li>`).join('')}</ol>
  </figure>`;
}
