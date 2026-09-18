// Worksheet availability is transcribed from the supplied PRIMARY 6 Content chart.
// No original worksheets were supplied. All questions below are original demo
// examples, not MathConcept question-bank content; pages/minutes describe the demo.
const rows = [
  ['601', 'Division of decimals and whole numbers by whole numbers', '小數及整數除以整數', 'N', 'ABCDPR', 'A'],
  ['602', 'Division of whole numbers and decimals by decimals', '整數及小數除以小數', 'N', 'ABCDEPR', 'ABC'],
  ['603', 'Mixed operations with decimals', '小數四則混合計算', 'N', 'ABCDPQR', 'A'],
  ['604', 'Converting between decimals and fractions', '小數與分數互化', 'N', 'ABCDR', 'AB'],
  ['605', 'Comparing decimals and fractions', '比較小數和分數', 'N', 'ABCDR', 'A'],
  ['606', 'Averages', '平均數', 'D', 'ABCDPR', 'A'],
  ['607', 'Percentages', '百分數', 'N', 'ABCR', ''],
  ['608', 'Converting between percentages, decimals and fractions', '百分數、小數與分數互化', 'N', 'ABCDER', 'ABCDE'],
  ['609', 'Finding percentages', '求百分率', 'N', 'ABCDEPR', ''],
  ['610', 'Finding values from percentages: part and remainder', '百分數應用：部分和餘數', 'N', 'ABCPR', ''],
  ['611', 'Finding values from percentages: increase and decrease', '百分數應用：增加和減少', 'N', 'ABCDPQR', ''],
  ['612', 'Capacity and volume', '容量與體積', 'M', 'ABPR', ''],
  ['613', 'Displacement of water', '排水法', 'M', 'ABCDR', ''],
  ['614', 'Circumferences', '圓周', 'M', 'ABCR', ''],
  ['615', 'Calculating circumferences', '圓周計算', 'M', 'ABCDPR', ''],
  ['616', 'Area of circles', '圓面積', 'M', 'ABCDR', ''],
  ['617', 'Angles in degrees', '角度', 'M', 'ABCDER', ''],
  ['618', 'Pie charts', '圓形圖', 'D', 'ABCDR', ''],
  ['619', 'Time', '時間', 'M', 'ABR', 'AB'],
  ['620', 'Speed', '速率', 'M', 'ABCDPR', ''],
  ['621', 'Travel graphs', '行程圖', 'M', 'ABCR', ''],
  ['622', 'Simple equations', '簡易方程', 'A', 'ABCDR', ''],
  ['623', 'Two-step equations', '兩步方程', 'A', 'ABCR', ''],
  ['624', 'Problem solving with simple equations', '簡易方程應用題', 'A', 'ABP', ''],
  ['625', 'Broken-line graphs', '折線圖', 'D', 'ABCDR', ''],
  ['626', 'Uses and abuses of statistics', '統計的應用和誤用', 'D', 'ABR', ''],
  ['627', 'Symmetry', '對稱', 'S', 'ABCDR', ''],
  ['628', 'Rotational symmetry', '旋轉對稱', 'E', 'AB', ''],
  ['629', 'Non-metric units', '非公制單位', 'E', 'AB', ''],
  ['630', 'Chance', '可能性', 'OE', 'AB', ''],
  ['631', 'Recurring decimals', '循環小數', 'OE', 'AB', ''],
  ['632', 'Square numbers and triangular numbers', '平方數與三角形數', 'OE', 'ABC', ''],
  ['633', 'Squares and square roots', '平方與平方根', 'OE', 'ABC', '']
];

export const p6Topics = rows.map(([code, title, titleZh, category, math, excel]) => ({
  id: code, code, title, titleZh, category,
  term: Number(code) <= 616 ? 'first' : Number(code) <= 627 ? 'second' : 'extended',
  math: [...math], excel: [...excel]
}));

// A short, explicitly illustrative question set lets assigned demo sheets open
// on the Student tablet. Variants share these examples until real files arrive.
const examples = {
  601: [['Calculate 8.4 ÷ 4.', '計算 8.4 ÷ 4。'], ['Calculate 25.2 ÷ 6.', '計算 25.2 ÷ 6。'], ['Share 13.5 litres equally among 9 containers. How many litres are in each?', '把 13.5 公升的水平均分到 9 個容器，每個容器有多少公升水？']],
  602: [['Calculate 7.2 ÷ 0.6.', '計算 7.2 ÷ 0.6。'], ['Calculate 15 ÷ 0.25.', '計算 15 ÷ 0.25。'], ['A ribbon is 4.8 m long. Each piece is 0.4 m long. How many pieces can be cut?', '一條絲帶長 4.8 米，每段長 0.4 米，可以剪成多少段？']],
  603: [['Calculate 3.6 + 2.4 × 5.', '計算 3.6 + 2.4 × 5。'], ['Calculate (8.5 − 2.5) ÷ 0.3.', '計算 (8.5 − 2.5) ÷ 0.3。'], ['Calculate 12.6 ÷ 3 + 1.8.', '計算 12.6 ÷ 3 + 1.8。']],
  604: [['Write 0.75 as a fraction in its simplest form.', '把 0.75 化為最簡分數。'], ['Write 3/8 as a decimal.', '把 3/8 化為小數。'], ['Write 1.25 as a mixed number in its simplest form.', '把 1.25 化為最簡帶分數。']],
  605: [['Which is larger: 0.6 or 5/8?', '0.6 和 5/8，哪個較大？'], ['Arrange 0.45, 1/2 and 0.4 from smallest to largest.', '把 0.45、1/2 和 0.4 由小至大排列。'], ['Fill in >, < or =: 3/4 __ 0.75.', '填上 >、< 或 =：3/4 __ 0.75。']],
  606: [['Find the average of 12, 15 and 18.', '求 12、15 和 18 的平均數。'], ['Four numbers have an average of 8. What is their total?', '四個數的平均數是 8，它們的總和是多少？'], ['The average of 6, 9 and a third number is 10. Find the third number.', '6、9 和另一個數的平均數是 10，求另一個數。']],
  607: [['Write 35 out of 100 as a percentage.', '把一百分之三十五寫成百分數。'], ['What percentage of a hundred-square grid is 60 squares?', '一個有 100 格的方格圖，60 格佔全圖的百分之幾？'], ['Which is greater: 45% or 54%?', '45% 和 54%，哪個較大？']],
  608: [['Write 0.35 as a percentage.', '把 0.35 化為百分數。'], ['Write 3/4 as a percentage.', '把 3/4 化為百分數。'], ['Write 12% as a fraction in its simplest form.', '把 12% 化為最簡分數。']],
  609: [['12 out of 30 pupils walk to school. What percentage is this?', '30 名學生中有 12 名步行上學，佔全體學生的百分之幾？'], ['Express 18 as a percentage of 60.', '18 是 60 的百分之幾？']],
  610: [['Find 25% of 240.', '求 240 的 25%。'], ['A box has 80 pencils. 30% are used. How many pencils remain?', '一盒有 80 枝鉛筆，用去了 30%，還餘下多少枝？']],
  611: [['Increase 200 by 15%.', '把 200 增加 15%，結果是多少？'], ['A $400 bag is reduced by 20%. Find its new price.', '一個售價 400 元的袋減價 20%，新售價是多少元？']],
  612: [['Find the volume of a cuboid measuring 8 cm × 5 cm × 3 cm.', '一個長方體長 8 厘米、闊 5 厘米、高 3 厘米，體積是多少？'], ['Convert 2.5 litres to millilitres.', '把 2.5 公升化為毫升。']],
  613: [['Water rises from 120 ml to 165 ml when a stone is submerged. Find the volume of the stone.', '把石頭完全浸入水中，水位由 120 毫升升至 165 毫升，石頭的體積是多少立方厘米？'], ['A submerged object displaces 28 ml of water. Find its volume in cm³.', '一件物件完全浸入水中，排出 28 毫升的水，體積是多少立方厘米？']],
  614: [['A circle has a radius of 7 cm. Find its diameter.', '一個圓的半徑是 7 厘米，直徑是多少厘米？'], ['Write the formula for the circumference of a circle with diameter d.', '寫出直徑為 d 的圓的圓周公式。']],
  615: [['Find the circumference of a circle with diameter 10 cm. Use π = 3.14.', '一個圓的直徑是 10 厘米，求圓周。（取 π = 3.14）'], ['Find the circumference of a circle with radius 4 cm. Use π = 3.14.', '一個圓的半徑是 4 厘米，求圓周。（取 π = 3.14）']],
  616: [['Find the area of a circle with radius 5 cm. Use π = 3.14.', '一個圓的半徑是 5 厘米，求面積。（取 π = 3.14）'], ['Find the area of a circle with diameter 8 cm. Use π = 3.14.', '一個圓的直徑是 8 厘米，求面積。（取 π = 3.14）']],
  617: [['Two angles on a straight line are 65° and x°. Find x.', '一直線上的兩個鄰角分別是 65° 和 x°，求 x。'], ['A triangle has angles of 40°, 75° and x°. Find x.', '一個三角形的三個內角分別是 40°、75° 和 x°，求 x。']],
  618: [['A sector represents 25% of a pie chart. Find its angle.', '圓形圖中，一個扇形佔全圖的 25%，它的圓心角是多少度？'], ['A 120° sector represents 20 pupils. How many pupils does the whole chart represent?', '一個 120° 的扇形代表 20 名學生，整個圓形圖代表多少名學生？']],
  619: [['Convert 2 hours 45 minutes to minutes.', '把 2 小時 45 分鐘化為分鐘。'], ['A lesson starts at 14:35 and lasts 90 minutes. At what time does it finish?', '一堂課在 14:35 開始，歷時 90 分鐘，何時結束？']],
  620: [['A car travels 150 km in 3 hours. Find its average speed.', '一輛汽車在 3 小時內行駛 150 公里，平均速率是多少？'], ['A cyclist travels at 12 km/h for 30 minutes. Find the distance travelled.', '一名單車手以每小時 12 公里的速率行駛 30 分鐘，行駛了多少公里？']],
  621: [['On a distance–time graph, a journey goes from 0 km at 09:00 to 12 km at 10:00. Find the average speed.', '行程圖顯示：09:00 時距離為 0 公里，10:00 時為 12 公里。求這段行程的平均速率。'], ['What does a horizontal line on a distance–time graph mean?', '在距離—時間行程圖上，水平線代表甚麼？']],
  622: [['Solve x + 8 = 23.', '解方程：x + 8 = 23。'], ['Solve 5x = 45.', '解方程：5x = 45。']],
  623: [['Solve 3x + 5 = 26.', '解方程：3x + 5 = 26。'], ['Solve 4x − 7 = 21.', '解方程：4x − 7 = 21。']],
  624: [['Three identical notebooks and a $5 pen cost $26. Form an equation and find the price of one notebook.', '三本相同的筆記簿和一枝 5 元的筆共售 26 元。列出方程，求每本筆記簿的售價。'], ['A number doubled and then increased by 6 gives 30. Find the number using an equation.', '一個數的兩倍加 6 等於 30，列方程求這個數。']],
  625: [['Temperatures at 09:00, 10:00 and 11:00 were 24°C, 26°C and 25°C. Between which times did the temperature fall?', '09:00、10:00 和 11:00 的氣溫分別是 24°C、26°C 和 25°C。哪一段時間氣溫下降？'], ['Draw a broken-line graph for 3, 5 and 4 books read on Monday, Tuesday and Wednesday.', '星期一、二、三分別閱讀了 3、5 和 4 本書。根據資料繪畫折線圖。']],
  626: [['A survey asks only football club members which sport is most popular at school. Explain one problem with this sample.', '一項調查只訪問足球學會成員，便判斷全校最受歡迎的運動。指出這個抽樣方法的一個問題。'], ['How can starting a graph axis at 90 rather than 0 exaggerate the difference between 95 and 100?', '把圖表縱軸由 90 開始，而不是 0，為甚麼可能誇大 95 和 100 的差距？']],
  627: [['How many lines of symmetry does a square have?', '正方形有多少條對稱軸？'], ['How many lines of symmetry does a non-square rectangle have?', '一個非正方形的長方形有多少條對稱軸？']],
  628: [['What is the smallest angle through which a square can rotate to look unchanged?', '正方形最少要旋轉多少度，才能與原來的形狀重合？'], ['What is the order of rotational symmetry of an equilateral triangle?', '等邊三角形的旋轉對稱階是多少？']],
  629: [['Given 1 foot = 12 inches, convert 3 feet to inches.', '已知 1 呎 = 12 吋，把 3 呎化為吋。'], ['Given 1 yard = 3 feet, convert 5 yards to feet.', '已知 1 碼 = 3 呎，把 5 碼化為呎。']],
  630: [['A bag contains 3 red balls and 2 blue balls. Which colour is more likely to be drawn at random?', '袋內有 3 個紅球和 2 個藍球，隨機抽出一球，哪種顏色較有可能被抽中？'], ['A fair die is rolled. Is rolling an even number more likely than rolling an odd number?', '擲一顆公平骰子，擲出雙數是否比單數更有可能？']],
  631: [['Write the first six decimal places of 1/3.', '寫出 1/3 化為小數後的小數點後首六位數字。'], ['Which digit repeats in 0.777…?', '0.777… 中，哪個數字不斷重複？']],
  632: [['Write the next two square numbers after 1, 4, 9 and 16.', '平方數依次是 1、4、9、16，寫出其後兩個平方數。'], ['Write the next two triangular numbers after 1, 3, 6 and 10.', '三角形數依次是 1、3、6、10，寫出其後兩個三角形數。']],
  633: [['Calculate 12².', '計算 12²。'], ['Find the positive square root of 81.', '求 81 的正平方根。']]
};

const questionsFor = codes => (codes.length > 1
  ? codes.map(code => examples[code]?.[0]).filter(Boolean)
  : codes.flatMap(code => examples[code] || [])).slice(0, 3).map(([prompt, promptZh]) => ({ prompt, promptZh }));
const topicByCode = code => p6Topics.find(topic => topic.code === String(code));
const base = { level: 'P6', pages: 1, minutes: 15, colour: 'blue', demoContent: true, type: 'number', format: 'demo' };
const familyLabels = { math: 'Math 1–6', excel: 'EXCEL', revision: 'Revision', ce: 'CE Rev', ps: 'PS', sspa: 'SSPA' };
const catalog = [];

for (const topic of p6Topics) {
  for (const family of ['math', 'excel']) {
    for (const variant of topic[family]) {
      const code = (family === 'excel' ? 'EXCEL ' : '') + topic.code + variant;
      catalog.push({ ...base, id: `p6-${family}-${topic.code}-${variant}`, code,
        title: topic.title, titleZh: topic.titleZh, topic: topic.title, topicZh: topic.titleZh,
        family, familyLabel: familyLabels[family], variant, topicCode: topic.code, term: topic.term,
        questions: questionsFor([topic.code]) });
    }
  }
}

export const p6SupplementGroups = [];
function addGroup(id, label, sections) {
  const result = { id, label, sections: [] };
  for (const section of sections) {
    const { id: sectionId, label: sectionLabel, titleZh, term, variants, topicCodes = [] } = section;
    const worksheetIds = variants.map(value => {
      const variant = String(value), worksheetId = `p6-${id}-${sectionId}-${variant}`;
      const topic = topicByCode(topicCodes[0]);
      catalog.push({ ...base, id: worksheetId, code: `${sectionLabel} ${variant}`,
        title: `${label} · ${sectionLabel}`, titleZh, topic: topic?.title || label,
        topicZh: topic?.titleZh || titleZh, family: id, familyLabel: label, variant,
        sectionId, term, topicCodes, questions: questionsFor(topicCodes.length ? topicCodes : ['603', '608', '623']) });
      return worksheetId;
    });
    result.sections.push({ id: sectionId, label: sectionLabel, titleZh, term, topicCodes, worksheetIds });
  }
  p6SupplementGroups.push(result);
}

const revisionRanges = [
  ['6A01', 'first', ['601', '602', '603']], ['6A02', 'first', ['604', '605']],
  ['6A03', 'first', ['606']], ['6A04', 'first', ['607', '608']],
  ['6A05', 'first', ['609', '610', '611']], ['6A06', 'first', ['612', '613']],
  ['6A07', 'first', ['614', '615']], ['6A08', 'first', ['616']],
  ['6B01', 'second', ['617']], ['6B02', 'second', ['618']],
  ['6B03', 'second', ['619', '620', '621']], ['6B04', 'second', ['622', '623', '624']],
  ['6B05', 'second', ['625']], ['6B06', 'second', ['626']], ['6B07', 'second', ['627']]
];
addGroup('revision', 'Revision', revisionRanges.map(([id, term, topicCodes]) => ({
  id, label: id, titleZh: `小六溫習 ${id}`, term, variants: ['A1', 'A2', 'B1', 'B2'], topicCodes
})));
addGroup('ce', 'CE Rev', [
  { id: '6F', label: '6F', titleZh: '小六上學期總溫習', term: 'first', variants: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4'], topicCodes: ['603', '608', '615'] },
  { id: '6S', label: '6S', titleZh: '小六下學期總溫習', term: 'second', variants: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4'], topicCodes: ['618', '620', '623'] },
  { id: 'P6', label: 'P6', titleZh: '小六綜合溫習', term: 'extended', variants: ['01', '02'], topicCodes: ['603', '608', '623'] }
]);

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const starredPs = new Set([...range(6, 21), ...range(24, 26), ...range(29, 31), ...range(35, 38), ...range(40, 43), ...range(46, 54), ...range(57, 59), ...range(61, 63), ...range(65, 70)]);
const psSections = [
  ['decimal-division', 'Division of decimals', '小數除法應用題', 'first', range(1, 5), '602'],
  ['decimal-mixed', 'Mixed operations with decimals', '小數四則混合應用題', 'first', range(6, 16), '603'],
  ['mixed', 'Mixed operations', '四則混合應用題', 'first', range(17, 21), '603'],
  ['volume', 'Volume', '體積應用題', 'first', range(22, 26), '612'],
  ['averages', 'Averages', '平均數應用題', 'first', range(27, 31), '606'],
  ['percentages', 'Percentages', '百分數應用題', 'first', range(32, 43), '611'],
  ['circumference', 'Circumferences', '圓周應用題', 'first', range(51, 54), '615'],
  ['diagrams', 'Diagrams', '圖解應用題', 'second', range(44, 50), '624'],
  ['speed', 'Speed', '速率應用題', 'second', range(55, 63), '620'],
  ['equations', 'Simple equations', '簡易方程應用題', 'second', range(64, 70), '624']
];
const psGroup = { id: 'ps', label: 'PS', sections: [] };
for (const [id, label, titleZh, term, numbers, topicCode] of psSections) {
  const worksheetIds = numbers.map(number => {
    const worksheetId = `p6-ps-${number}`, starred = starredPs.has(number);
    catalog.push({ ...base, id: worksheetId, code: `PS ${number}${starred ? '*' : ''}`,
      title: `${label} · PS ${number}`, titleZh: `${titleZh} PS ${number}`, topic: label, topicZh: titleZh,
      family: 'ps', familyLabel: 'PS', variant: `${number}${starred ? '*' : ''}`, number, starred,
      sectionId: id, term, topicCode, questions: questionsFor([topicCode]) });
    return worksheetId;
  });
  psGroup.sections.push({ id, label, titleZh, term, topicCodes: [topicCode], worksheetIds });
}
p6SupplementGroups.push(psGroup);
addGroup('sspa', 'SSPA', [
  { id: '6A', label: 'SSPA 6A', titleZh: '小六呈分試練習 6A', term: 'first', variants: range(1, 6), topicCodes: ['603', '608', '615'] },
  { id: '6B', label: 'SSPA 6B', titleZh: '小六呈分試練習 6B', term: 'second', variants: range(1, 6), topicCodes: ['618', '620', '623'] }
]);

export const p6Worksheets = catalog;
