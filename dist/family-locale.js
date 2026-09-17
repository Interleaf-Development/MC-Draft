// Family-facing UI uses Hong Kong Traditional Chinese. Stored records and IDs
// remain language-neutral; never run free-form user messages through this map.
export const isFamilyRole = role => role === 'parent' || role === 'student';
const words = {
  'Admin':'行政', 'Teacher':'老師', 'Parent':'家長', 'Student':'學生',
  'Family':'家長專區', 'My classroom':'我的課堂', 'Overview':'主頁',
  'Lessons':'課堂', 'Handbook':'學習手冊', 'Payments':'繳費', 'Messages':'訊息',
  'My work':'我的功課', 'Past work':'已完成功課', 'Tsuen Wan':'荃灣', 'Hang Hau':'坑口',
  'MathConcept (Tsuen Wan)':'MathConcept（荃灣）', 'MathConcept (Hang Hau)':'MathConcept（坑口）', 'Demo':'示範',
  'Demo controls':'示範設定', 'About this demo':'關於此示範', 'Reset':'重設',
  'Reset demo':'重設示範', 'Reset the demo?':'重設示範？', 'Keep my changes':'保留修改',
  'Continue':'繼續', 'Close':'關閉', 'Close dialog':'關閉視窗', 'Cancel':'取消',
  'Demo restored.':'已還原示範資料。', 'Change undone.':'已復原修改。',
  'Open':'開啟', 'Back':'返回', 'Undo':'復原', 'Date':'日期', 'Reason':'原因',
  'Child':'子女', 'Assessment':'入學評估', 'Completed':'已完成',
  'Shared with parent':'已發佈', 'Draft':'草稿', 'Homework':'家課',
  'Attendance QR':'出席二維碼', 'Scan again (demo)':'再次掃描（示範）',
  'Simulate centre scan':'模擬中心掃描', 'Checked in':'已登記出席',
  'Make-up':'補堂', 'Request leave':'申請請假', 'Leave requested':'已申請請假',
  'Send request':'提交申請', 'Find a time':'選擇時間', 'Booked':'已安排',
  'Arrange a make-up':'安排補堂', 'One lesson':'一次補堂',
  '30-minute extensions':'分兩次延長 30 分鐘', 'Request these times':'申請所選時間',
  'Receipt':'收據', 'Receipt issued':'已發出收據', 'Receipt available':'可查看收據',
  'View invoice':'查看繳費通知', 'View receipt':'查看收據', 'Payment proof':'付款證明',
  'Add payment proof':'上載付款證明', 'Replace proof':'重新上載證明',
  'Submit payment proof':'提交付款證明', 'View proof':'查看證明', 'View result':'查看結果',
  'Proof submitted':'已提交證明', 'Proof needs attention':'付款證明需要跟進',
  'Equivalent fractions':'等值分數', 'Comparing fractions':'比較分數大小',
  'Long division':'直式除法', 'A trip to the market':'到街市購物',
  'Number patterns':'數字規律', 'Understanding decimals':'認識小數',
  'Fractions':'分數', 'Division':'除法', 'Word problems':'文字題',
  'Number sense':'數感', 'Decimals':'小數', 'Mathematics':'數學',
  'P1':'小一', 'P2':'小二', 'P3':'小三', 'P4':'小四', 'P5':'小五', 'P6':'小六',
  'K3':'幼稚園高班', 'S1':'中一', 'S2':'中二',
  'Up next':'待完成', 'In progress':'進行中', 'Ready to mark':'待老師批改',
  'With your teacher':'待老師批改', 'Corrections needed':'需要改正',
  'Working confidently':'表現自信', 'Making progress':'有進步', 'Needs practice':'需要練習',
  'This worksheet cannot be submitted now.':'這份工作紙目前無法提交。',
  'Handed in. Your teacher can review it now.':'已交功課，老師可以開始批改。',
  'Browser storage is full. Changes will last for this session.':'瀏覽器儲存空間已滿，修改只會在本次使用期間保留。',
  'A replacement request is already awaiting confirmation.':'已有補堂申請等候中心確認。',
  'Choose a replacement time.':'請選擇補堂時間。',
  'Choose one full replacement lesson matching the missed lesson.':'請選擇一節與原有課堂相同長度的完整補堂。',
  'Choose an upcoming replacement lesson.':'請選擇今天或之後的補堂日期。',
  'Choose a different time.':'請選擇與原有課堂不同的時間。',
  'This request has already been handled.':'這項申請已處理，請重新查看課堂。',
  'The lesson has changed. Review this request again.':'課堂已更改，請重新查看申請或聯絡中心。',
  'This student has used three reschedules for this block.':'本期已用完三次調堂，請聯絡中心協助。',
  'Times requested. The centre will confirm.':'已提交時間申請，請等候中心確認。',
  'Leave request sent to the centre.':'已向中心提交請假申請。',
  'This lesson cannot be changed.':'這節課堂目前無法更改。',
  'A request for this lesson is already pending.':'這節課堂已有申請等候處理。',
  'Make-up not found.':'找不到補堂紀錄。',
  'Choose at least one replacement.':'請選擇至少一個補堂時段。',
  'The replacement exceeds the remaining make-up time.':'所選時段超出剩餘補堂時間。',
  'A selected time is after the make-up deadline.':'所選時間已超過補堂期限。',
  'Choose a valid lesson time and duration.':'請選擇有效的上課時間及課堂長度。',
  'Choose a time between 09:00 and 19:00.':'請選擇上午 9 時至晚上 7 時內的時段。',
  'Choose an available tutor.':'請選擇有空檔的老師。',
  'This tutor is not available during this session.':'老師在這個時段未能授課。',
  'This tutor is on leave at this time.':'老師在這個時段休假。',
  'This time would exceed six students. Please choose another slot.':'這個時段已滿六人，請選擇其他時段。',
  'Choose a valid check-in date.':'請選擇有效的出席日期。',
  'Choose an active lesson for this student today.':'請選擇學生今天的有效課堂。',
  'There is no scheduled lesson to check in to today.':'今天沒有可登記出席的課堂。',
  'This is not a valid demo check-in pass.':'這不是有效的示範出席碼。',
  'This check-in pass was not issued in this demo.':'這個出席碼並非由此示範發出。',
  'This check-in pass has expired.':'出席碼已過期。',
  'This check-in pass is not valid for today.':'這個出席碼不適用於今天。',
  'This lesson has changed. Open a new check-in pass.':'課堂已更改，請重新開啟出席碼。',
  'This lesson is no longer active and cannot be checked in.':'這節課堂已取消或更改，無法登記出席。',
  'Add the parent’s name and contact number.':'請填寫家長姓名及聯絡電話。',
  'Mia is already enrolled.':'Mia 已完成報名。',
  'For block-only enrolment, choose a first lesson in October or November.':'如只報讀 10 至 11 月課程，請選擇該期間的首次上課日期。',
  'Enrolment and first invoice created.':'已完成報名，並建立首張繳費通知。'
};

export function familyText(value, role) {
  if (!isFamilyRole(role) || typeof value !== 'string') return value;
  if (Object.hasOwn(words, value)) return words[value];
  const conflict = /^(.+) already has a lesson with (.+) on (\d{1,2}) ([A-Za-z]+) (\d{4}), (\d{2}:\d{2}–\d{2}:\d{2})\.$/.exec(value);
  if (conflict) {
    const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Sept:9,Oct:10,Nov:11,Dec:12};
    if (months[conflict[4]]) return `${conflict[1]} 已於 ${conflict[5]} 年 ${months[conflict[4]]} 月 ${conflict[3]} 日 ${conflict[6]} 安排了 ${conflict[2]} 的課堂。`;
  }
  return value;
}

export function familyDate(value, role, options = {}) {
  if (!value) return '—';
  if (typeof options === 'boolean') options = options ? {year:'numeric', month:'long', day:'numeric'} : {};
  return new Date(value + 'T12:00:00').toLocaleDateString(isFamilyRole(role) ? 'zh-HK' : 'en-GB', {day:'numeric', month:'short', ...options});
}

const fixtureContent = {
  'Number patterns and multiplication':'數字規律與乘法',
  'Chloe explained her number patterns clearly today. We will build on this with equivalent fractions next lesson.':'Chloe 今天能清楚解釋數字規律，下一課會在這個基礎上學習等值分數。',
  'Complete Number patterns, question 4.':'完成「數字規律」第 4 題。',
  'Great work identifying the pattern.':'做得好，能準確找出數字規律。',
  'Please show your working for question 2.':'請列出第 2 題的計算步驟。',
  'Strong number sense. Further support with word problems and explaining mathematical reasoning would be useful.':'數感良好，建議加強文字題理解及表達數學推理的能力。',
  'Regular programme · 8 lessons':'常規課程 · 8 堂',
  '8-lesson block':'8 堂課程',
  'Oct–Nov 2026':'2026 年 10 至 11 月', 'Aug–Sep 2026':'2026 年 8 至 9 月',
  'Introductory lesson + Oct–Nov 2026':'單堂課程 + 2026 年 10 至 11 月',
  '1 introductory lesson (HK$250) + 8-lesson block − HK$200 assessment deduction':'1 堂單堂課程（HK$250）+ 8 堂課程 − HK$200 評估費扣減',
  '8-lesson block − HK$200 assessment deduction':'8 堂課程 − HK$200 評估費扣減',
  '1 introductory lesson (HK$250) + 8-lesson block':'1 堂單堂課程（HK$250）+ 8 堂課程'
};
export function familyContent(value, role) {
  return isFamilyRole(role) ? fixtureContent[value] ?? familyText(value, role) : value;
}
