// Worksheet availability transcribed from the supplied PRIMARY 4/5 Content charts.
// Math includes the printed P, Q and R boxes; EXCEL starts in the next column.
// These records describe availability only and contain no worksheet questions.
const topicRows = {
  P4: [
    ['401', 'Properties of multi.', '乘法的性質', 'N', 'ABR', ''],
    ['402', 'Multi', '乘法', 'N', 'ABCDER', 'ABCDE'],
    ['403', 'App of Multi', '乘法應用', 'N', 'ABCD', ''],
    ['404', 'Div (2-digit ÷ 2-digit)', '除法（兩位數除以兩位數）', 'N', 'ABCR', 'AB'],
    ['405', 'Div (3-digit ÷ 2-digit)', '除法（三位數除以兩位數）', 'N', 'ABCR', 'ABCDE'],
    ['406', 'App of Div', '除法應用', 'N', 'ABC', ''],
    ['407', 'Divisibility', '整除性', 'N', 'ABCR', 'A'],
    ['408', 'Rhombuses', '菱形', 'S', 'ABCR', ''],
    ['409', 'Quadrilaterals', '四邊形', 'S', 'ABR', ''],
    ['410', 'Dissecting shapes', '分割圖形', 'S', 'ABCDR', ''],
    ['411', 'Forming shapes', '拼砌圖形', 'S', 'ABCR', ''],
    ['412', 'Multiples', '倍數', 'N', 'AB', 'A'],
    ['413', 'Factors', '因數', 'N', 'ABCR', 'A'],
    ['414', 'Prime & composite numbers', '質數與合成數', 'N', 'ABR', 'A'],
    ['415', 'Common factors', '公因數', 'N', 'ABCPR', 'ABC'],
    ['416', 'Common multiples', '公倍數', 'N', 'ABCPR', 'AB'],
    ['417', 'Directions', '方向', 'S', 'ABCDR', ''],
    ['418', 'Knowing bar charts', '認識棒形圖', 'D', 'AB', ''],
    ['419', 'Making bar charts', '製作棒形圖', 'D', 'ABCR', 'A'],
    ['420', 'Mixed operations', '四則混合計算', 'N', 'ABCDR', ''],
    ['421', 'Problem solving in Mixed operations', '四則混合計算應用題', 'N', 'ABCP', ''],
    ['422', 'Perimeter', '周界', 'M', 'AB', ''],
    ['423', 'Perimeter of squares', '正方形的周界', 'M', 'AP', ''],
    ['424', 'Perimeter of rectangles', '長方形的周界', 'M', 'AP', ''],
    ['425', 'Perimeter of 2-D shapes', '平面圖形的周界', 'M', 'ABCDPR', ''],
    ['426', 'Knowing and comparing area', '認識和比較面積', 'M', 'AB', ''],
    ['427', 'Units of area', '面積單位', 'M', 'ABR', ''],
    ['428', 'Area of squares and rectangles', '正方形和長方形的面積', 'M', 'ABP', 'A'],
    ['429', 'Area of 2D shapes', '平面圖形的面積', 'M', 'ABR', ''],
    ['430', 'Proper/ improper/ mixed fractions', '真分數、假分數和帶分數', 'N', 'ABCR', 'A'],
    ['431', 'Expanding and reducing fractions', '擴分和約分', 'N', 'ABCDER', 'ABCDE'],
    ['432', 'Add of frac. (same denom.)', '同分母分數加法', 'N', 'ABPR', 'A'],
    ['433', 'Sub of frac. (same denom.)', '同分母分數減法', 'N', 'ABCPQR', 'A'],
    ['434', 'Add and sub of frac. (same denom.)', '同分母分數加減法', 'N', 'AP', ''],
    ['435', 'Decimals', '小數', 'N', 'ABCDER', 'ABCD'],
    ['436', 'Add and sub of decimals', '小數加減法', 'N', 'ABCDPR', 'ABCD'],
    ['437', 'Mix. Add and sub of decimals', '小數加減混合計算', 'N', 'ABPR', ''],
    ['438', 'Eulerian paths', '一筆畫', 'E', 'A', ''],
    ['439', 'Sorting diagrams', '分類圖', 'E', 'A', '']
  ],
  P5: [
    ['501', 'Multi digit numbers', '多位數', 'N', 'ABCDR', 'AB'],
    ['502', 'Base and height of triangles and quadrilaterals', '三角形和四邊形的底和高', 'M', 'ABC', ''],
    ['503', 'Area of parallelograms', '平行四邊形的面積', 'M', 'ABPR', ''],
    ['504', 'Area of triangles', '三角形的面積', 'M', 'ABPR', ''],
    ['505', 'Area of trapeziums', '梯形的面積', 'M', 'ABPR', ''],
    ['506', 'Area of polygons', '多邊形的面積', 'M', 'ABCPR', ''],
    ['507', 'Add of frac with diff denominators', '異分母分數加法', 'N', 'ABCDEPR', 'ABCDE'],
    ['508', 'Sub of frac with diff denominators', '異分母分數減法', 'N', 'ABCDPQR', 'ABC'],
    ['509', 'Add and sub of frac', '分數加減法', 'N', 'APR', ''],
    ['510', 'Mult of fractions and whole numbers', '分數與整數相乘', 'N', 'ABCDEPR', 'AB'],
    ['511', 'Mult of fractions', '分數乘法', 'N', 'ABCPQR', 'ABCD'],
    ['512', 'Mult of three fractions', '三個分數相乘', 'N', 'APQR', ''],
    ['513', 'Algebraic expressions', '代數式', 'A', 'ABCDR', ''],
    ['514', 'Simple equations', '簡易方程', 'A', 'ABCDEPR', 'AB'],
    ['515', 'Compound bar charts', '複合棒形圖', 'D', 'ABCDR', ''],
    ['516', 'Circles', '圓', 'S', 'ABCR', ''],
    ['517', 'Cross sections of 3D shapes', '立體圖形的截面', 'S', 'ABCR', ''],
    ['518', '3D shapes', '立體圖形', 'S', 'ABCDEFR', ''],
    ['519', 'Mult of whole numbers and dec', '整數與小數相乘', 'N', 'ABCPR', 'ABC'],
    ['520', 'Mult of decimals', '小數乘法', 'N', 'ABCDPQR', 'ABCD'],
    ['521', 'Div frac by whole numbers', '分數除以整數', 'N', 'ABCPR', 'A'],
    ['522', 'Div of fractions', '分數除法', 'N', 'ABCDPQR', 'A'],
    ['523', 'Mixed operations of frac', '分數四則混合計算', 'N', 'ABCDPR', ''],
    ['524', 'More on algebraic expressions', '代數式進階', 'A', 'ABCR', ''],
    ['525', 'Two step equations', '兩步方程', 'A', 'ABCDPR', 'A'],
    ['526', 'Volume', '體積', 'M', 'ABCDR', ''],
    ['527', 'Volume of cubes and cuboids', '正方體和長方體的體積', 'M', 'ABCDEPR', ''],
    ['528', 'Ancient numerals', '古代數字', 'E', 'ABC', ''],
    ['529', 'Exploration of 3D shapes', '立體圖形探究', 'E', 'ABCR', 'A']
  ]
};

const codes = (start, end = start) => Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
const variants = (start, end = start) => codes(start, end);
const supplement = (family, id, label, titleZh, term, topicCodes, values) => ({
  family, id, label, titleZh, term, topicCodes, variants: values
});
const revision = (id, levelZh, term, start, end = start) => supplement(
  'revision', id, id, `${levelZh}溫習 ${id}`, term, codes(start, end), ['A1', 'A2', 'B1', 'B2']
);
const ceVariants = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4'];

// Revision topic spans follow the merged cells, not the position of the label.
// PS topic associations are thematic where clear; an empty array means that
// the source does not identify a corresponding topic in this level's chart.
const p4Supplements = [
  revision('4A01', '小四', 'first', 401, 403),
  revision('4A02', '小四', 'first', 404, 407),
  revision('4A03', '小四', 'first', 408, 409),
  revision('4A04', '小四', 'first', 410, 411),
  revision('4A05', '小四', 'first', 412, 414),
  revision('4A06', '小四', 'first', 415, 416),
  revision('4A07', '小四', 'first', 417),
  revision('4A08', '小四', 'first', 418, 419),
  revision('4B01', '小四', 'second', 420, 421),
  revision('4B02', '小四', 'second', 422, 425),
  revision('4B03', '小四', 'second', 426, 429),
  revision('4B04', '小四', 'second', 430, 431),
  revision('4B05', '小四', 'second', 432, 434),
  revision('4B06', '小四', 'second', 435),
  revision('4B07', '小四', 'second', 436, 437),
  supplement('ce', '4F', '4F', '小四上學期總溫習', 'first', codes(401, 419), [...ceVariants]),
  supplement('ce', '4S', '4S', '小四下學期總溫習', 'second', codes(420, 437), [...ceVariants]),
  supplement('ce', 'P4', 'P4', '小四綜合溫習', 'extended', [], ['01', '02']),
  supplement('ps', 'p4-mixed-add-sub-multiply', 'Mixed +-x', '加減乘混合應用題', 'first', [], variants(1, 5)),
  supplement('ps', 'p4-multiply-divide', 'x & ÷', '乘除應用題', 'first', codes(402, 406), variants(6, 7)),
  supplement('ps', 'p4-lcm-hcf', 'LCM and HCF', '最小公倍數和最大公因數應用題', 'first', codes(412, 416), variants(8, 11)),
  supplement('ps', 'p4-mixed-operations', '+-x÷', '四則混合應用題', 'second', codes(420, 421), variants(12, 21)),
  supplement('ps', 'p4-perimeter', 'Perimeter', '周界應用題', 'second', codes(422, 425), variants(22, 25)),
  supplement('ps', 'p4-area', 'Area', '面積應用題', 'second', codes(426, 429), variants(26, 30)),
  supplement('ps', 'p4-area-perimeter', 'Area and Peri.', '面積和周界應用題', 'second', codes(422, 429), variants(31, 32)),
  // The chart prints 35 twice (bottom of the first column and top of the next).
  // Retain both chart positions without inventing a replacement worksheet code.
  supplement('ps', 'p4-fraction-add-subtract', '+ - of frac', '分數加減應用題', 'second', codes(432, 434), ['33', '34', '35', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44']),
  supplement('ps', 'p4-fraction-mixed', 'Mixed +-x of frac', '分數加減乘混合應用題', 'second', [], variants(45, 50)),
  supplement('ps', 'p4-decimal', 'Decimal', '小數應用題', 'second', codes(435, 437), variants(51, 64))
];

const p5Supplements = [
  revision('5A01', '小五', 'first', 501),
  revision('5A02', '小五', 'first', 502, 506),
  revision('5A03', '小五', 'first', 507, 509),
  revision('5A04', '小五', 'first', 510, 512),
  revision('5A05', '小五', 'first', 513, 514),
  revision('5A06', '小五', 'first', 515),
  revision('5B01', '小五', 'second', 516),
  revision('5B02', '小五', 'second', 517, 518),
  revision('5B03', '小五', 'second', 519, 520),
  revision('5B04', '小五', 'second', 521, 523),
  revision('5B05', '小五', 'second', 524, 525),
  revision('5B06', '小五', 'second', 526, 527),
  supplement('ce', '5F', '5F', '小五上學期總溫習', 'first', codes(501, 515), [...ceVariants]),
  supplement('ce', '5S', '5S', '小五下學期總溫習', 'second', codes(516, 527), [...ceVariants]),
  supplement('ce', 'P5', 'P5', '小五綜合溫習', 'extended', [], ['01', '02']),
  supplement('ps', 'p5-estimation', 'Est.', '估算應用題', 'first', ['501'], ['1']),
  supplement('ps', 'p5-mixed-operations', 'Mix.Op.', '混合計算應用題', 'first', [], ['2*', '3*', '4*']),
  supplement('ps', 'p5-fraction-add-subtract', '+&-of frac', '分數加減應用題', 'first', codes(507, 509), ['5*', '6*', '7*', '8*', '9*']),
  supplement('ps', 'p5-fraction-multiply', 'x of frac', '分數乘法應用題', 'first', codes(510, 512), ['10', '11', '12', '13*', '14', '15']),
  supplement('ps', 'p5-fraction-add-subtract-multiply', '+ - x frac', '分數加減乘應用題', 'first', codes(507, 512), variants(16, 19)),
  supplement('ps', 'p5-area', 'Area', '面積應用題', 'first', codes(502, 506), ['20*', '21*']),
  supplement('ps', 'p5-decimal-add', '+ of dec', '小數加法應用題', 'second', [], variants(22, 23)),
  supplement('ps', 'p5-decimal-subtract', '- of dec', '小數減法應用題', 'second', [], variants(24, 25)),
  supplement('ps', 'p5-decimal-add-subtract', '+ - of dec', '小數加減應用題', 'second', [], ['26*', '27*', '28*', '29*']),
  supplement('ps', 'p5-decimal-mixed-add-subtract', 'mixed + - of dec', '小數加減混合應用題', 'second', [], ['30*', '31', '32', '33']),
  supplement('ps', 'p5-decimal-multiply', 'x dec', '小數乘法應用題', 'second', codes(519, 520), variants(34, 35)),
  supplement('ps', 'p5-decimal-add-subtract-multiply', '+-x dec', '小數加減乘應用題', 'second', codes(519, 520), ['36*', '37*']),
  supplement('ps', 'p5-fraction-divide', '÷ of frac', '分數除法應用題', 'second', codes(521, 522), variants(38, 39)),
  supplement('ps', 'p5-fraction-mixed-divide', 'mix ÷ of frac', '分數除法混合應用題', 'second', codes(521, 522), ['40*', '41', '42']),
  supplement('ps', 'p5-fraction-mixed', 'mix op. of frac', '分數四則混合應用題', 'second', ['523'], ['43*', '44*', '45*', '46*', '47*', '48*']),
  supplement('ps', 'p5-volume', 'volume', '體積應用題', 'second', codes(526, 527), ['49*', '50', '51*', '52']),
  supplement('ps', 'p5-equations', 'Simple eq.', '簡易方程應用題', 'second', ['514', '525'], ['53*', '54*', '55*', '56*', '57*']),
  // Mock labels are printed separately from SSPA 5B; keep their own groups.
  supplement('sspa', 'mock-5A', 'Mock 5A', '小五模擬試卷 5A', 'first', [], variants(1, 10)),
  supplement('sspa', 'mock-5B', 'Mock 5B', '小五模擬試卷 5B', 'second', [], variants(1, 10)),
  supplement('sspa', 'sspa-5B', 'SSPA 5B', '小五呈分試練習 5B', 'second', [], variants(1, 6))
];

export const primaryUpperRecords = Object.fromEntries(Object.entries(topicRows).map(([level, rows]) => [level, {
  source: `Math_${level}_content.pdf`,
  topics: rows.map(([code, title, titleZh, category, math, excel]) => ({
    code, title, titleZh, category,
    term: Number(code) <= (level === 'P4' ? 419 : 515) ? 'first' : Number(code) <= (level === 'P4' ? 437 : 527) ? 'second' : 'extended',
    math: [...math], excel: [...excel]
  })),
  supplements: level === 'P4' ? p4Supplements : p5Supplements
}]));
