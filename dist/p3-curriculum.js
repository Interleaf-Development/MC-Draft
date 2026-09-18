// Worksheet availability is transcribed from the supplied PRIMARY 3 Content chart.
// Original worksheet files were not supplied. The questions below are original
// demo examples; variants share these examples until the real files are added.
const rows = [
  ['301', 'Five-digit numbers', '五位數', 'N', 'ABCDER', 'ABCDE'],
  ['302', 'Kilometres', '公里', 'M', 'ABCR', 'AB'],
  ['303', 'Millimetres', '毫米', 'M', 'ABCDER', 'AB'],
  ['304', 'Multiplication: two-digit by one-digit numbers', '兩位數乘一位數', 'N', 'ABCR', 'ABC'],
  ['305', 'Multiplication: three-digit by one-digit numbers', '三位數乘一位數', 'N', 'ABCDR', 'ABC'],
  ['306', 'Multiplication word problems', '乘法應用題', 'N', 'ABR', ''],
  ['307', 'Problems related to time', '時間應用題', 'M', 'ABCR', 'A'],
  ['308', 'Seconds', '秒', 'M', 'ABCDER', 'ABCDE'],
  ['309', 'Division: two-digit by one-digit numbers', '兩位數除以一位數', 'N', 'ABCDR', 'ABC'],
  ['310', 'Division: three-digit by one-digit numbers', '三位數除以一位數', 'N', 'ABCDEFGR', 'ABCDE'],
  ['311', 'Problem solving in division', '除法應用題', 'N', 'ABCR', ''],
  ['312', 'Weight', '重量', 'M', 'ABR', ''],
  ['313', 'Grams and kilograms', '克和公斤', 'M', 'ABCDER', 'ABC'],
  ['314', 'Parallel lines', '平行線', 'S', 'ABR', ''],
  ['315', 'Parallelograms', '平行四邊形', 'S', 'ABCR', ''],
  ['316', 'Trapeziums', '梯形', 'S', 'ABR', ''],
  ['317', '24-hour time', '24 小時報時制', 'M', 'ABR', 'ABCD'],
  ['318', 'Mixed addition and subtraction', '加減混合計算', 'N', 'ABCDEFPR', 'ABCDEFGHIJK'],
  ['319', 'Mixed addition, subtraction and multiplication', '加減乘混合計算', 'N', 'ABCDR', ''],
  ['320', 'Mixed-operation word problems', '混合計算應用題', 'N', 'ABCR', ''],
  ['321', 'Triangles (1)', '三角形（一）', 'S', 'ABCDEFR', ''],
  ['322', 'Triangles (2)', '三角形（二）', 'S', 'ABR', ''],
  ['323', 'Fractions', '分數', 'N', 'ABCR', 'A'],
  ['324', 'Comparing fractions', '比較分數', 'N', 'ABCR', 'ABCD'],
  ['325', 'Adding and subtracting fractions', '分數加減', 'N', 'ABCR', ''],
  ['326', 'Capacity', '容量', 'M', 'ABR', ''],
  ['327', 'Litres and millilitres', '公升和毫升', 'M', 'ABCDR', 'AB'],
  ['328', 'Reading bar charts', '閱讀棒形圖', 'D', 'ABR', ''],
  ['329', 'Making bar charts', '製作棒形圖', 'D', 'ABCR', ''],
  ['330', 'Curve stitching', '繡曲線', 'E', 'AB', ''],
  ['331', 'Map-colouring problems', '地圖着色問題', 'E', 'A', ''],
  ['332', 'Number sense', '數感', 'E', 'AB', ''],
  ['333', 'Chinese abacus', '中國算盤', 'E', 'AB', ''],
  ['334', 'Inverse operations with fractions', '分數逆運算', 'E', 'A', 'A'],
  ['335', 'Stem-and-leaf diagrams', '幹葉圖', 'E', 'AB', '']
];

export const p3Topics = rows.map(([code, title, titleZh, category, math, excel]) => ({
  id: code, code, title, titleZh, category,
  term: Number(code) <= 317 ? 'first' : Number(code) <= 329 ? 'second' : 'extended',
  math: [...math], excel: [...excel]
}));

const examples = {
  301: [['Write the number with 3 ten-thousands, 4 thousands, 2 hundreds, 5 tens and 6 ones.', '寫出由 3 個萬、4 個千、2 個百、5 個十和 6 個一組成的數。'], ['In 58,214, what is the value of the digit 8?', '在 58,214 中，數字 8 的數值是多少？']],
  302: [['Convert 3 km to metres.', '把 3 公里化為米。'], ['A route is 2 km 300 m long. How many metres is this?', '一段路長 2 公里 300 米，即多少米？']],
  303: [['Convert 4 cm to millimetres.', '把 4 厘米化為毫米。'], ['A line is 35 mm long. Write its length in centimetres and millimetres.', '一條線段長 35 毫米，即多少厘米多少毫米？']],
  304: [['Calculate 24 × 3.', '計算 24 × 3。'], ['Calculate 47 × 6.', '計算 47 × 6。']],
  305: [['Calculate 123 × 4.', '計算 123 × 4。'], ['Calculate 208 × 3.', '計算 208 × 3。']],
  306: [['Each box has 24 crayons. How many crayons are in 3 boxes?', '每盒有 24 枝蠟筆，3 盒共有多少枝？'], ['One book costs $36. How much do 4 books cost?', '每本書售 36 元，4 本書共售多少元？']],
  307: [['A lesson starts at 09:15 and ends at 10:00. How long is the lesson?', '一堂課在上午 9 時 15 分開始，上午 10 時結束，歷時多少分鐘？'], ['A bus ride starts at 14:20 and takes 35 minutes. At what time does it finish?', '乘車在 14:20 開始，車程為 35 分鐘，何時到達？']],
  308: [['Convert 3 minutes to seconds.', '把 3 分鐘化為秒。'], ['Convert 95 seconds to minutes and seconds.', '把 95 秒化為分鐘和秒。']],
  309: [['Calculate 84 ÷ 4.', '計算 84 ÷ 4。'], ['Calculate 75 ÷ 3.', '計算 75 ÷ 3。']],
  310: [['Calculate 648 ÷ 3.', '計算 648 ÷ 3。'], ['Calculate 725 ÷ 5.', '計算 725 ÷ 5。']],
  311: [['Share 96 stickers equally among 4 children. How many does each child get?', '把 96 張貼紙平均分給 4 名小朋友，每人可獲多少張？'], ['Put 125 pencils into boxes of 5. How many boxes are needed?', '把 125 枝鉛筆裝盒，每盒裝 5 枝，需要多少個盒？']],
  312: [['Which is the more suitable unit for the weight of an apple: grams or kilograms?', '量度一個蘋果的重量，應用克還是公斤作單位？'], ['Which is heavier: 2 kg of rice or 800 g of flour?', '2 公斤的米和 800 克的麵粉，哪個較重？']],
  313: [['Convert 2 kg 300 g to grams.', '把 2 公斤 300 克化為克。'], ['Convert 4,500 g to kilograms and grams.', '把 4,500 克化為公斤和克。']],
  314: [['Draw a pair of parallel straight lines.', '畫出一對平行線。'], ['Do opposite sides of a rectangle form parallel lines?', '長方形的對邊是否平行？']],
  315: [['How many pairs of parallel sides does a parallelogram have?', '平行四邊形有多少對平行的對邊？'], ['Draw a parallelogram and mark one pair of parallel sides.', '畫出一個平行四邊形，並標示一對平行的對邊。']],
  316: [['A quadrilateral has exactly one pair of parallel opposite sides. What is this shape called?', '一個四邊形只有一對對邊平行，它叫甚麼？'], ['Draw a trapezium and mark its parallel sides.', '畫出一個梯形，並標示平行的對邊。']],
  317: [['Write 3:25 pm using the 24-hour clock.', '用 24 小時報時制表示下午 3 時 25 分。'], ['Write 21:10 using am or pm.', '用上午或下午表示 21:10。']],
  318: [['Calculate 245 + 138 − 96.', '計算 245 + 138 − 96。'], ['Calculate 700 − 258 + 149.', '計算 700 − 258 + 149。']],
  319: [['Calculate 28 + 6 × 7.', '計算 28 + 6 × 7。'], ['Calculate 100 − 8 × 9.', '計算 100 − 8 × 9。']],
  320: [['May buys 3 notebooks at $12 each and a $7 pen. How much does she pay?', '美美買了 3 本每本售 12 元的筆記簿和一枝 7 元的筆，共付多少元？'], ['Ben has 80 stickers and gives 6 stickers to each of 5 friends. How many remain?', '明明有 80 張貼紙，送給 5 位朋友每人 6 張，還餘下多少張？']],
  321: [['How many sides and vertices does a triangle have?', '三角形有多少條邊和多少個頂點？'], ['A triangle has three equal sides. What type of triangle is it?', '三條邊長度相等的三角形叫甚麼？']],
  322: [['A triangle has one right angle. What type of triangle is it?', '有一個直角的三角形叫甚麼？'], ['Draw a triangle with two equal sides.', '畫出一個有兩條邊長度相等的三角形。']],
  323: [['A cake is divided into 8 equal parts. Three parts are eaten. What fraction is eaten?', '一個蛋糕平均分成 8 份，吃了 3 份，即吃了全個蛋糕的幾分之幾？'], ['What is the denominator of 4/7?', '4/7 的分母是多少？']],
  324: [['Which is larger: 3/8 or 5/8?', '3/8 和 5/8，哪個較大？'], ['Arrange 1/7, 6/7 and 3/7 from smallest to largest.', '把 1/7、6/7 和 3/7 由小至大排列。']],
  325: [['Calculate 2/9 + 4/9.', '計算 2/9 + 4/9。'], ['Calculate 7/8 − 3/8.', '計算 7/8 − 3/8。']],
  326: [['Which is a more suitable unit for a bucket of water: litres or millilitres?', '量度一桶水的容量，應用公升還是毫升作單位？'], ['Which container holds more: a 2-litre jug or a 500-millilitre bottle?', '一個 2 公升的水壺和一個 500 毫升的水樽，哪個容量較大？']],
  327: [['Convert 3 litres to millilitres.', '把 3 公升化為毫升。'], ['Convert 2,500 millilitres to litres and millilitres.', '把 2,500 毫升化為公升和毫升。']],
  328: [['In a bar chart, the bar for apples reaches 12 and the bar for oranges reaches 8. How many more apples are there?', '棒形圖中，蘋果的棒高表示 12 個，橙的棒高表示 8 個。蘋果比橙多多少個？'], ['A bar chart uses a scale of 2 books per division. A bar reaches the fifth division. How many books does it show?', '棒形圖的每格代表 2 本書，一條棒達到第 5 格，代表多少本書？']],
  329: [['Draw a bar chart showing 4 red balls, 6 blue balls and 3 yellow balls.', '根據紅球 4 個、藍球 6 個、黃球 3 個的資料繪畫棒形圖。'], ['Give your bar chart a title and label its axes.', '為你的棒形圖加上標題，並標示兩條軸的名稱。']],
  330: [['Draw two perpendicular line segments. Mark 5 equally spaced points on each and join them in reverse order to make a curve-stitching pattern.', '畫兩條互相垂直的線段，在每條線段上標示 5 個等距點，再按相反次序連接兩邊的點，製作繡曲線圖案。'], ['Are the lines you drew straight or curved?', '你所畫的每條連線是直線還是曲線？']],
  331: [['Draw three regions in a row. Colour neighbouring regions differently, using as few colours as possible.', '畫出一排相連的三個區域，用最少的顏色着色，使相鄰區域的顏色不同。'], ['How many colours did you use?', '你用了多少種顏色？']],
  332: [['Estimate 198 + 302 by rounding each number to the nearest hundred.', '把 198 和 302 四捨五入至最接近的百位，估算它們的和。'], ['Fill in the missing number: 250 + __ = 1,000.', '填上適當的數：250 + __ = 1,000。']],
  333: [['On a Chinese abacus, an upper bead is worth 5 and each lower bead is worth 1 in its place. What digit is shown by one upper bead and two lower beads touching the bar?', '中國算盤每檔的一顆上珠表示 5，每顆下珠表示 1。一顆上珠和兩顆下珠靠樑，表示哪個數字？'], ['How many lower beads represent 4 in the units column?', '在個位檔，要用多少顆下珠表示 4？']],
  334: [['One third of a number is 6. Find the number.', '一個數的三分之一是 6，求這個數。'], ['Two thirds of a number is 8. Find the number.', '一個數的三分之二是 8，求這個數。']],
  335: [['In a stem-and-leaf diagram, 2 | 3 means 23. What numbers are shown by 3 | 1 4 7?', '在幹葉圖中，2 | 3 表示 23。3 | 1 4 7 表示哪些數？'], ['Use tens as stems and ones as leaves to show 12, 15, 21 and 24.', '以十位數作幹、個位數作葉，用幹葉圖表示 12、15、21 和 24。']]
};

const questionsFor = codes => (codes.length > 1
  ? codes.map(code => examples[code]?.[0]).filter(Boolean)
  : codes.flatMap(code => examples[code] || [])).slice(0, 3).map(([prompt, promptZh]) => ({ prompt, promptZh }));
const topicByCode = code => p3Topics.find(topic => topic.code === String(code));
const base = { level: 'P3', pages: 1, minutes: 15, colour: 'blue', demoContent: true, type: 'number', format: 'demo' };
const familyLabels = { math: 'Math 1–6', excel: 'EXCEL', revision: 'Revision', ps: 'PS' };
const catalog = [];

for (const topic of p3Topics) {
  for (const family of ['math', 'excel']) {
    for (const variant of topic[family]) {
      catalog.push({ ...base, id: `p3-${family}-${topic.code}-${variant}`,
        code: (family === 'excel' ? 'EXCEL ' : '') + topic.code + variant,
        title: topic.title, titleZh: topic.titleZh, topic: topic.title, topicZh: topic.titleZh,
        family, familyLabel: familyLabels[family], variant, topicCode: topic.code, term: topic.term,
        questions: questionsFor([topic.code]) });
    }
  }
}

export const p3SupplementGroups = [];
const revisionRanges = [
  ['3A01', 'first', ['301']], ['3A02', 'first', ['302', '303']],
  ['3A03', 'first', ['304', '305', '306']], ['3A04', 'first', ['307', '308']],
  ['3A05', 'first', ['309', '310', '311']], ['3A06', 'first', ['312', '313']],
  ['3A07', 'first', ['314', '315', '316']], ['3A08', 'first', ['317']],
  ['3B01', 'second', ['318']], ['3B02', 'second', ['319', '320']],
  ['3B03', 'second', ['321', '322']], ['3B04', 'second', ['323', '324']],
  ['3B05', 'second', ['325']], ['3B06', 'second', ['326', '327']],
  ['3B07', 'second', ['328', '329']]
];
const revision = { id: 'revision', label: 'Revision', sections: [] };
for (const [id, term, topicCodes] of revisionRanges) {
  const titleZh = `小三溫習 ${id}`;
  const worksheetIds = ['A1', 'A2', 'B1', 'B2'].map(variant => {
    const worksheetId = `p3-revision-${id}-${variant}`, topic = topicByCode(topicCodes[0]);
    catalog.push({ ...base, id: worksheetId, code: `${id} ${variant}`,
      title: `Revision · ${id}`, titleZh, topic: topic.title, topicZh: topic.titleZh,
      family: 'revision', familyLabel: 'Revision', variant, sectionId: id, term, topicCodes,
      questions: questionsFor(topicCodes) });
    return worksheetId;
  });
  revision.sections.push({ id, label: id, titleZh, term, topicCodes, worksheetIds });
}
p3SupplementGroups.push(revision);

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const starredPs = new Set([5, 10, 11, 12, 13, 14, 15, 16, 17, 25, 26, 34, 35, 36, 38]);
// Some tiny PS category captions in the photo are unclear. These neutral
// section labels group the visible cells without asserting unreadable captions.
const psSections = [
  ['multiplication', 'Multiplication', '乘法應用題', 'first', [13], '306'],
  ['time-first', 'Time', '時間應用題', 'first', [21], '307'],
  ['division', 'Division', '除法應用題', 'first', [14], '311'],
  ['division-problems', 'Problem solving', '應用題', 'first', [15, 16, 17], '311'],
  ['24-hour-time', '24-hour time', '24 小時報時制應用題', 'first', [38], '317'],
  ['addition-subtraction', 'Addition and subtraction', '加減應用題', 'second', [1, 2], '318'],
  ['mixed-operations', 'Mixed operations', '混合計算應用題', 'second', range(3, 5), '319'],
  ['mixed-problems', 'Problem solving', '混合計算應用題', 'second', range(6, 12), '320'],
  ['problem-set-18-20', 'PS 18–20', '應用題 18–20', 'second', range(18, 20), '320'],
  ['fractions', 'Fractions', '分數應用題', 'second', [22], '323'],
  ['comparing-fractions', 'Comparing fractions', '比較分數應用題', 'second', range(23, 25), '324'],
  ['fraction-operations', 'Adding and subtracting fractions', '分數加減應用題', 'second', [26], '325'],
  ['problem-set-27-35', 'PS 27–35', '應用題 27–35', 'second', range(27, 35), '318'],
  ['problem-set-36', 'PS 36', '應用題 36', 'second', [36], '319'],
  ['time-second', 'Time', '時間應用題', 'second', [37], '307']
];
const psGroup = { id: 'ps', label: 'PS', sections: [] };
for (const [id, label, titleZh, term, numbers, topicCode] of psSections) {
  const worksheetIds = numbers.map(number => {
    const worksheetId = `p3-ps-${number}`, starred = starredPs.has(number);
    catalog.push({ ...base, id: worksheetId, code: `PS ${number}${starred ? '*' : ''}`,
      title: `${label} · PS ${number}`, titleZh: `${titleZh} PS ${number}`, topic: label, topicZh: titleZh,
      family: 'ps', familyLabel: 'PS', variant: `${number}${starred ? '*' : ''}`, number, starred,
      sectionId: id, term, topicCode, questions: questionsFor([topicCode]) });
    return worksheetId;
  });
  psGroup.sections.push({ id, label, titleZh, term, topicCodes: [topicCode], worksheetIds });
}
p3SupplementGroups.push(psGroup);

export const p3Worksheets = catalog;
