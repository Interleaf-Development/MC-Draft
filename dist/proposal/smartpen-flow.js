// A static explanation of the proposed workflow, not a connected device demo.
export function smartpenFlow(language) {
  const zh = language === 'zh-HK';
  const copy = (chinese, english) => zh ? chinese : english;
  const drawing = body => `<svg viewBox="0 0 144 104" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const steps = [
    {
      title: copy('配合紙張及智能筆', 'Use compatible paper and pen'),
      text: copy('使用已對應學生及習作的點紋工作紙，配合相容智能筆。', 'Use a compatible smartpen and patterned worksheet linked to the student and assignment.'),
      art: drawing('<path d="M35 31V15h74v16" fill="white"/><rect x="22" y="31" width="100" height="43" rx="6" fill="white"/><path d="M42 57h60v35H42z" fill="white"/><path d="M53 68h38M53 78h24"/><path d="M34 44h8" class="flow-accent"/><circle cx="111" cy="44" r="2" fill="currentColor" stroke="none"/><path d="m104 84 4 4 8-9" class="flow-accent"/>')
    },
    {
      title: copy('紙上作答', 'Write on paper'),
      text: copy('學生照常在紙上作答，筆芯留下真實墨水。', 'The pupil writes normally on paper, leaving real ink.'),
      art: drawing('<rect x="25" y="12" width="80" height="82" rx="4" fill="white"/><path d="M37 12v82M20 32h11M20 72h11M49 30h37M49 39h23"/><path d="M48 56h9m-4-4v8m9-4h5m7-4v8m-3-4h6M49 78h30"/><path d="m78 70 5-13 33-34 8 8-34 33zM83 57l7 7M114 25l8 8" class="flow-accent" fill="white"/>')
    },
    {
      title: copy('即時同步', 'Sync as they write'),
      text: copy('連線正常時，筆跡隨下筆逐筆出現在系統。', 'While connected, strokes appear in the system as they are written.'),
      art: drawing('<path d="M16 22h39v57H16z" fill="white"/><path d="M24 34h22M24 43h14M24 58l5-4 4 6 8-8"/><rect x="87" y="13" width="44" height="80" rx="6" fill="white"/><path d="M102 21h14M101 83h16M96 57h25M96 66h18"/><circle cx="109" cy="36" r="6"/><path d="M99 49c1-9 19-9 20 0"/><path d="M64 48h15m-5-5 5 5-5 5M79 66H64m5-5-5 5 5 5" class="flow-accent"/>')
    }
  ];
  return `<figure class="smartpen-flow" aria-labelledby="smartpen-flow-title">
    <figcaption id="smartpen-flow-title">${copy('從紙上書寫到筆跡同步', 'From writing on paper to synced strokes')}</figcaption>
    <ol class="smartpen-flow-steps">${steps.map((step, index) => `<li>
      <div class="smartpen-flow-art">${step.art}</div>
      <div class="smartpen-flow-copy"><strong><span class="smartpen-flow-number" aria-hidden="true">${index + 1}.</span> ${step.title}</strong><p>${step.text}</p></div>
      ${index < steps.length - 1 ? '<span class="smartpen-flow-arrow" aria-hidden="true">→</span>' : ''}
    </li>`).join('')}</ol>
  </figure>`;
}
