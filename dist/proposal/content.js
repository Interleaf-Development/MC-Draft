const feature = (title, intro, body) => `<section class="proposal-feature"><h3>${title}</h3>${intro ? `<p class="feature-intro">${intro}</p>` : ''}${body.replaceAll('<h3>', '<h4>').replaceAll('</h3>', '</h4>')}</section>`;
const detail = (title, body) => `<section class="feature-detail"><h3>${title}</h3>${body}</section>`;
const list = items => `<ul class="plain-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const table = (headers, rows) => `<div class="feature-table-wrap"><table class="feature-table"><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>i===0?`<th scope="row">${x}</th>`:`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const demo = (id,label='MathConcept workflows') => `<div class="demo-wrap"><div class="demo-caption">${id==='rollout'?'':'Interactive demo: '}${label}</div><div class="demo" data-demo="${id}" id="demo-${id}"></div></div>`;

export const chapters = [
 {id:'vision',title:'Proposal overview'},

 {id:'student',title:'Student learning experience',heading:'The student’s digital learning workflow',intro:'Each student’s binder currently stays at the centre for use during lessons, with homework and corrections added by the teacher. After digitisation, students will use their digital binder in the same familiar way. The centre will prepare enough tablets for students to sign in and access their own learning materials when they arrive; the system can also record their attendance at the same time. The digital binder has three sections: past, current and future work. Teachers can send worksheets directly through the system, and students receive them immediately on their tablets. Students mainly use a portrait tablet and stylus to answer. For simple, straightforward questions, the app can use AI on the tablet to mark answers against the reference answers; work can also be passed to the teacher for marking and follow-up corrections.',body:
  demo('student','Student binder and worksheet working')+
  detail('Hybrid learning with paper',`<p>If students or parents prefer to keep using paper, photographs or scans can digitise the student’s records and bring them into the system.</p>`)+
  detail('Writing space and retained work',list([
   'When a worksheet is reopened, saved handwriting remains aligned with the original questions. Teacher marking and student corrections are retained in the same worksheet.',
   'Automatic marking applies only to validated question types. Teachers remain responsible for judging handwritten reasoning and solution methods.'
  ]))+
  detail('Learning at home',`<p>Students can also log in to their account at home, with a desktop, iPad or even phone. Based on what they are learning, our system can use AI to generate interactive self-learning games, practice questions or content for them to learn at home.</p><p>The Maths Kart demo below uses eight single-digit addition questions: students steer towards the correct answer to speed up and slow down if they choose incorrectly. This is a playable example of interactive practice; AI content generation based on student progress is part of the proposed delivery scope.</p>`)+
  demo('game','Maths Kart: addition practice')},

 {id:'teacher',title:'Teacher assignment and feedback',heading:'Teacher assignment and feedback',intro:'Teachers continue using the familiar progress chart. Digitised materials will be stored together in the internal system, rather than on an openly accessible shared cloud drive. Teachers will not need to—and cannot—find or save materials on their personal computers. They only need to select the required content on the student’s progress chart, and the system sends it directly to the student. After choosing a class and student, teachers can click worksheets to assign them, then view answers and follow up corrections. When paper is needed, teachers can print materials within their authorised scope, directly from the system, without first creating or downloading a file on their computer.',body:
  demo('teacher','Class selection, progress and assignment')},

 {id:'library',title:'Materials',heading:'Materials',intro:'',body:
 feature('Existing material digitisation', 'Existing materials can be converted for digital teaching in stages. First organise the catalogue so the original worksheets can be answered and marked on tablets; then gradually organise questions into reusable, editable content. This allows a pilot with selected materials before expanding the library.',
  detail('Preparing and converting the existing library',table(['Stage','Usable result','Review and acceptance'],[
   ['1. Catalogue the collection','Build the catalogue using the existing grades, topics, collections and worksheet numbers, so teachers can find what they need.','Check the classifications, file completeness, duplicate content and which version to use.'],
   ['2. Use the original worksheets on tablets','Preserve the layout of approved worksheets for teacher assignment, student handwriting and teacher marking.','Check layout, page count and writing positions. After this step, materials can be used for digital teaching, but may not yet be editable word by word.'],
   ['3. Prepare reusable questions','Organise verified questions, diagrams and answers as individual items that can later be combined into worksheets.','Choose the grades and collections to prioritise, retaining each question’s source and version.'],
   ['4. Create editable content','Convert text, equations, diagrams and answers into editable content, ready for future authoring and revisions after checking.','Searchable questions are not necessarily ready for editing. Conversion coverage and quality requirements must be agreed separately.']
  ]))+
  detail('Quality checks and migration acceptance',list([
   'Check decimal points, fractions, units, diagrams, question parts and the links between questions and answers, so the converted content is suitable for teaching.',
   'Retain the original materials and revision history, distinguishing duplicate files from different versions. The report will list usable materials, verified questions and outstanding items.',
   'Keep materials that cannot yet be converted faithfully in their original page form for review. Do not count unverified questions as completed editable content.',
   'Accept two outcomes separately: which materials can be used in the system, and how many questions have been verified and are editable. Agree their work scopes and costs separately.',
   'The catalogue demo uses supplied curriculum indexes, with sample questions for P3 and P6. The other worksheets still require their original files; editable conversion is not yet complete.'
  ])))+
 feature('New material creation and approval', '',
detail('Creating and approving new materials',`<p>Build a material-editing platform similar to Wix or Canva, where teachers can create and edit worksheets and interactive exercises by dragging and dropping. The platform can gradually add mathematical-symbol entry and formula editing with tools such as MathType. AI can also generate content, layouts, Python code or custom HTML interactive components for teachers to check and adjust. This gives teachers more freedom to design layouts and turn the same material into online interactive exercises or games, while retaining printing. Where needed, materials can also be exported as PDF or Word documents to fit existing workflows. AI can help generate questions, hints, solutions and interactive content for teachers to review and edit.</p>`)+
  detail('Keeping traditional-format materials',`<p>Existing materials such as PDFs can also be stored in the controlled library and managed alongside new content, with viewing, assignment and printing governed by permissions. Normal teaching accounts do not provide original-file downloads. Originals, answers and student work are managed separately; access and printing must stay within the user’s authorisation.</p>`)+
  detail('Editorial responsibilities and answer access',list([
   'MathConcept names the authors, mathematical reviewers and staff authorised to approve publication.',
   'Student materials, search results and exports must not expose restricted answers or teacher notes.',
   'MathConcept must approve any external processing of curriculum, including its purpose, usage rights and confidentiality conditions. This proposal does not authorise external AI or other content-processing services to use the library.'
  ])))+
 feature('Curriculum access and printing', 'HQ retains the master collection and approves materials before centres and teachers use them. Permissions follow each user’s role, centre and authorised curriculum. Distribution and printing records help HQ review use of the materials.',
  detail('Curriculum access',`<p>Users receive approved materials according to their role, centre and authorised curriculum. Originals, student work and answers are managed separately. HQ decides what may be published and who may access it.</p>`)+
  detail('Authorised printing',`<p>Set which materials may be printed and the permitted volumes, and record whether each print completed, failed or needs follow-up. Select the printers, printing arrangements and usage policy during the pilot, and name the staff responsible for exceptions.</p>`)+
  detail('Tracing the source of a copy',`<p>Use worksheet editions, issuing centres, user accounts and printing records to help establish a copy’s distribution history. Test the usefulness of tracing under agreed scan, photograph and photocopy conditions before confirming the achievable identification results.</p>`)+
  detail('Ending access',`<p>Stop further material access when an account or centre is disabled, or a franchise relationship ends. Previously printed, photographed or separately copied material cannot be recalled.</p>`)+
  detail('Protection scope and practical limits',list([
   'These controls are proposed scope. Access restrictions, printing outcomes and copy-tracing performance require pilot verification.',
   'Readable or printable materials can still be captured or copied. Access limits and records reduce easy bulk copying and support investigation; they cannot prevent every leak.',
   'A copy trace or unusual usage record is an investigation lead. It does not by itself establish who disclosed material or prove misconduct.'
  ])))},
 {id:'system',title:'Centre management',heading:'Centre management',intro:'',body:
 feature('Centre administration', 'The centre can manage enrolment, class arrangements, parent communication and fees in one system, reducing repeated checks between different spreadsheets and records.',
  detail('Enrolment and follow-up',`<p>Handle enrolment, timetables, leave and make-up lessons, parent enquiries, invoices and receipts. Confirm class arrangements and follow up payment differences and other outstanding work.</p>`))+
 feature('Scheduling and parent communication', 'Leave, make-up lessons and timetable changes are handled together in the timetable. Parents can submit leave and preferred replacement dates; staff agree the actual make-up time with parents. The system clearly distinguishes confirmed arrangements from requests awaiting follow-up.',
demo('operations','Leave, timetable changes and make-up lessons')+
detail('Timetable operations',`<p>Drag a lesson to another time or into the leave bin, or drag a student awaiting a make-up lesson back onto the timetable. Keyboard controls are also available. Before confirmation, check teacher availability, class capacity and time clashes.</p>`)+
  detail('Leave and make-up arrangements',`<p>After a successful parent leave request, the original lesson is crossed out and a compact student item appears in the leave bin. Once staff and the parent agree a time, staff can drag the student from the leave bin back onto the timetable to arrange the make-up. The pending item is then removed and the original leave record retained. Submitting a preferred date does not mean the make-up lesson is confirmed.</p>`)+
  detail('One-off, temporary and ongoing timetable changes',`<p>Staff can move one lesson or change the regular timetable from a specified date. Leaving the end date unset makes the change ongoing; setting an end date makes it temporary, with the original arrangement resuming afterwards. Review the affected lessons and compare lesson counts before confirming.</p>`)+
  detail('Changes to lesson counts',`<p>Clearly show the additional or fewer lessons resulting from a timetable change. Staff decide whether to approve extra lessons or retain a corresponding make-up credit when lessons decrease.</p>`)+
  detail('Student and communication records',`<p>View remaining lesson dates, lesson remarks and parent communications. Records stay with the relevant student and lesson so other staff can take over and follow up.</p>`)+
  detail('Change records',`<p>Keep the original lesson and receipt records and record the reason for the change. Document revision and date-handling rules must be agreed separately.</p>`))+
 feature('Invoice review and bank reconciliation', 'Billing follows the sequence: invoice → parent payment proof → staff review and approval → receipt. Bank statements are then checked to confirm whether actual credits match the receipt records. Receipt issuance and bank reconciliation have separate progress records, helping staff follow up unfinished work. Use AI to help review payment proof, issue receipts and complete final reconciliation.',
  demo('billing','Payment review, receipts and final audit')+
  detail('Invoice creation and payment deadlines',table(['Charge','When the invoice is issued','Payment or enrolment rule'],[
   ['Paid assessment','Create the assessment invoice when a paid assessment is booked.','Show the assessment date, amount and payment deadline.'],
   ['First enrolment','Issue the first-enrolment invoice after staff review the application.','Approval of this first payment also activates enrolment.'],
   ['Recurring tuition','Use cycles of four teaching weeks, skipping weeks when the centre is fully closed. Automatically issue the next invoice after the third teaching week.','Payment is due before the child’s first lesson in the next cycle. Renewal payment approval does not activate enrolment again.'],
   ['Parent payment','Show the amount, payment deadline and copyable FPS payment details. The parent uploads payment proof for staff review.','Uploading proof does not issue a receipt; staff must approve the payment.']
  ]))+
  table(['Feature','Included function','Condition or responsibility'],[
   ['Invoice status and queue','Group invoices into 待家長付款 (waiting for parent payment), 待中心核對 (waiting for centre review) and 已發收據 (receipt issued). Open on 待中心核對 by default, with the oldest proofs first.','Show deadlines and overdue bills in the payment queue; show the newest receipts first. Each row is one invoice, so one student can appear in different queues.'],
   ['Search and filters','Find invoices by student name, student number or invoice number. Filter by charge type or billing month and use compact pages of around 25 invoices.','The month filter is optional so older unpaid invoices remain visible.'],
   ['Payment-proof review','Open one review popup from the list, with the invoice on the left and payment proof on the right. Stack the documents vertically on smaller screens. Each document scrolls independently and supports zooming.','Staff can read both documents without leaving their current filtered list.'],
   ['Approval and resubmission','Use 確認並發出收據 (confirm and issue receipt) as one action. Alternatively, return the proof with a required reason so the parent can resubmit.','Returning proof requests corrected evidence, not another payment. Receipt issuance does not establish that the money has been matched to the bank.'],
   ['Successful review','Issue the receipt, close the popup, refresh the current filtered list and briefly show confirmation. Move the invoice to 已發收據.','Approve first-enrolment payment and activate enrolment together; later renewal payments do not repeat activation.'],
   ['Saving and recovery','Block closing the popup or navigating away while saving. If saving fails or the result is uncertain, keep the review open with its contents and recovery action available.','Resolve an uncertain result before issuing another receipt; repeated attempts must not create duplicate receipts.'],
   ['Reminders and archive','Record reminders and prevent repeats within 24 hours. Retain cancelled and void invoices in a separate archive.','Staff can review the reminder and cancellation history.'],
   ['Final audit','Upload bank statements to match bank credits with issued receipts and list unmatched records, extra payments and uncertain matches.','Avoid counting a transaction twice or using the same credit to confirm payment more than once. Staff follow up unexplained differences.'],
   ['Other payment arrangements','Cash, cheques, combined payments, partial payments and refunds follow their respective workflows.','Agree the rules separately. Direct bank connections are optional and require bank confirmation before separate assessment.']
  ])+
  detail('Dates and reconciliation records',list([
   'Record the parent’s payment initiation date, proof submission date, receipt issue date and bank posting date separately; there is no need to assume they are the same.',
   'Show receipt progress and bank reconciliation progress separately. An issued receipt may still await bank reconciliation.',
   'The basic reconciliation approach uses bank statements. Confirm available record formats, matching conditions and payment-allocation rules before live use.',
   'Payment checks and automatic invoicing in the demonstration are simulated. Validate them against representative real records before live use.'
  ])))},
 {id:'franchise',title:'Multi-centre management',heading:'Multi-centre management',intro:'HQ centrally manages material publication, each centre’s curriculum access and operating policies. Each centre handles teaching, parent communication and fees within its authorised scope. New centres can use the same workflow while keeping their student and operational records separate.',body:
  demo('franchise','Tsuen Wan and Hang Hau')+
  table(['Feature','Included function','Condition or responsibility'],[
   ['Centre and role permissions','Set permitted curricula and access to student and operational records by centre and responsibility.','Switching the centre view does not grant access to unauthorised records.'],
   ['Material publication and versions','HQ reviews, publishes and manages material versions, and sets each centre’s curriculum access.','Centres can use only the materials they are authorised to access.'],
   ['Operational reporting and review','Centres view outstanding class and payment work. HQ views agreed reports across centres and unusual access or printing records.','Agree the reporting scope, calculations and review responsibilities in advance. Unusual records are for follow-up and are not proof of misconduct.'],
   ['New centres and staff changes','Support new centre openings, staff transfers and departures, and changes to access, support and handover when a franchise relationship ends.','Confirm interface languages, responsible staff, and the timing and procedure for ending access.']
  ])+detail('Demonstration scope and data ownership',list([
   'Tsuen Wan and Hang Hau use the same workflows with their own centre information, teachers and demonstration records. HQ permissions and cross-centre reporting are proposed additions.',
   'MathConcept retains ownership of its supplied curriculum and operational data. Software ownership, licensing, data export and handover arrangements must be set out in the formal agreement.'
  ]))},

 {id:'rollout',title:'Delivery, pilot and acceptance',heading:'Delivery, pilot and acceptance',intro:'Choose a centre for a pilot using representative materials, devices and everyday workflows. Both parties assess the results against agreed acceptance criteria before deciding the scope and order of the next rollout stage.',body:
  detail('Delivery responsibilities',table(['Party','Required contribution'],[
   ['MathConcept','Provide authorised materials and source records, name curriculum, operations and acceptance owners, arrange pilot users and devices, supply examples of everyday exceptions, and complete review and confirmation within the agreed times.'],
   ['Delivery team','Complete the agreed design and development, material and data import, verification reports, staff training and operating documents, and provide launch support.'],
   ['Joint decisions','Agree the pilot coverage, samples and acceptance criteria, resolve work below the required standard, and confirm the scope, cost and schedule of each later stage.']
  ]))+
  detail('Pilot acceptance schedule',table(['Area','Acceptance example'],[
   ['Teaching','A teacher finds the correct approved worksheet, assigns it and reviews the student’s saved work on an agreed device.'],
   ['Student working','A student resumes saved work after an agreed interruption without lost or misplaced handwriting.'],
   ['Leave and scheduling','A parent leave request updates the original lesson and staff follow-up queue. Staff can drag its leave-bin strip back to a valid calendar slot to confirm the agreed make-up.'],
   ['Billing','Four teaching-week cycles skip fully closed weeks and issue the next invoice after week three, due before the next cycle’s first lesson. Payment proof requires staff approval before a receipt is issued; only first-enrolment approval activates enrolment. Staff cannot close the popup or navigate away during saving. Failed or uncertain reviews remain recoverable without duplicate receipts. Bank reconciliation identifies differences and double allocations.'],
   ['Access','An unauthorised centre cannot obtain originals, another centre’s student records or restricted answers. Disabled accounts cannot continue accessing materials.'],
   ['Printing and tracing','Printing respects permissions and limits, records the outcome and handles failed or repeated attempts clearly. Assess copy-tracing usefulness separately under agreed capture conditions.'],
   ['Migration','Samples preserve the required equations, diagrams and layout. Report and resolve exceptions, or retain the original page form for teaching.'],
   ['Daily operation and recovery','Test core work under agreed normal and interrupted conditions. Confirm recoverable records, expected recovery times, notifications and follow-up responsibilities.']
  ]))+
  demo('rollout','Proposed delivery sequence')},

 {id:'proposal',title:'Scope and commercial terms',heading:'Scope and commercial terms',intro:'This is an initial proposal for the project scope, with no prices yet. After both parties confirm the material preparation scope, operating rules and pilot requirements, a formal quotation and delivery schedule will be prepared.',body:
  table(['Scope category','Proposed content','How it will be agreed'],[
   ['Proposed first phase','Controlled library, teacher worksheet assignment, student binder, centre and parent workflows, invoice handling and bank-statement reconciliation.','Select first-phase features based on the pilot centres, materials and workflows.'],
   ['Later phases','Worksheet authoring, verified editable questions, selected AI assistance, further reporting and use by more centres.','Confirm priorities, quantities and acceptance requirements item by item.'],
   ['Verification first','Bulk material-conversion quality, printing arrangements, handwriting experience and copy tracing.','Test representative samples and usage conditions before confirming the deliverable outcomes.'],
   ['Separate assessment','Direct bank connections, other payment methods, offline work and specialised interactive diagrams.','Confirm actual needs, cooperation from the relevant organisations and processing rules before deciding whether to include them.']
  ])+
  detail('Quotation items and terms',table(['Item','Arrangements to confirm'],[
   ['Platform design and development','Quote against the confirmed functions and acceptance scope; this draft contains no amounts.'],
   ['Material import and content conversion','Quote separately based on the material preparation results, sample tests and agreed quantities.'],
   ['Daily operation and services','Agree usage, service scope, data retention and recovery requirements.'],
   ['Support, maintenance and training','Set out support hours, incident follow-up, system updates, security maintenance, training arrangements and each party’s responsibilities.'],
   ['Payment and delivery dates','Agree payment arrangements, delivery stages and the timetable after confirming scope; this draft makes no price or delivery-date commitment.'],
   ['Ownership and handover','MathConcept retains ownership of its supplied materials and operational data. Ownership of new software and content, licensing, data export and handover when the relationship ends must be agreed separately.']
  ]))+
  detail('Items to confirm before quotation',list([
   'Participating centres and users, and the teaching, operational and billing workflows to prioritise.',
   'Material samples, import coverage and the content to make editable.',
   'Pilot tablets, styluses and printing arrangements.',
   'Decision-makers from both parties, acceptance criteria and responsibility for preparing source records.'
  ]))+`<div class="button-row"><button class="primary-button" data-action="reference" data-ref="scope">Detailed scope <span>↗</span></button><button class="secondary-button" data-action="reference" data-ref="assumptions">Open decisions and responsibilities</button></div>`}
];

export function chapterHTML(c,i){return `<section class="chapter" id="${c.id}" data-chapter="${i}" aria-labelledby="heading-${c.id}"><div class="chapter-heading"><h2 id="heading-${c.id}">${i+1}. ${c.heading}</h2>${c.intro ? `<p class="section-intro">${c.intro}</p>` : ''}</div>${c.body}</section>`}

export const references = {
 scope:{title:'Detailed scope',body:
  `<p class="reference-lead">A working scope for agreement. Proposed capabilities describe the intended delivery outcomes; the demonstration does not establish that they are ready for live use.</p><h3>Curriculum & content</h3>${list([
   'HQ controls the original collection, approved editions and access rights. Teachers find permitted materials through familiar worksheet codes, grades, topics and collections.',
   'Existing worksheets remain usable in their original layout. Reusable questions and verified editable content are introduced in agreed stages.',
   'Authors can arrange content directly on a worksheet, starting from a blank page or reusing approved questions and layouts, and adding equations, diagrams, answers and working space. Preview portrait-tablet and A4 printing before review and publication.',
   'Existing formats such as PDFs can stay in the controlled library for permitted assignment and use. Normal teaching accounts do not provide original-file downloads.',
   'AI can help find examples, draft questions and organise content. External processing of materials requires prior approval; designated editors are responsible for checking content and approving publication.'
  ])}<h3>Teaching & learning</h3>${list([
   'Teachers select classes and students by teaching time and choose and assign worksheets directly from the progress chart.',
   'The proposed native student binder prioritises portrait tablets, with current, completed and future work. It supports classwork, homework, handwritten working, teacher marking and student corrections. This page shows a browser-interface demonstration.',
   'Future work must be released by the teacher. Assigned worksheets retain the version issued for students to answer and teachers to mark.',
   'Check saved work and resuming after interruptions on agreed devices. Offline support must be confirmed separately.'
  ])}<h3>Centre & parent operations</h3>${list([
   'View timetables, teacher availability, lesson remarks, remaining lesson dates and student information.',
   'Parents receive leave confirmation and may suggest replacement dates. Staff agree the replacement and drag the student strip from the leave bin back onto the calendar to book it, retaining the cancelled original lesson.',
   'Single, temporary and ongoing schedule changes are checked for clashes and changes to lesson entitlement before confirmation.',
   'Parent records and communications remain associated with the appropriate student and lesson.'
  ])}<h3>Billing</h3>${list([
   'Create assessment invoices at paid assessment booking and first-enrolment invoices after staff review the application. First-payment approval activates enrolment once.',
   'Recurring tuition follows four teaching-week cycles, skipping fully closed weeks. Issue the next invoice after week three, due before the child’s first lesson in the next cycle.',
   'Parents see the amount, deadline and copyable FPS details, then upload proof. Staff review every payment before issuing its receipt; queues open on 待中心核對.',
   'Review the invoice and proof in one popup with independent scrolling and zoom. Preserve the filtered list, block closing or navigation during saving and retain failed or uncertain reviews for recovery.',
   'Record reminders, reasons for proof resubmission, receipts and cancellation history. Renewal approval does not repeat enrolment activation.',
   'Search by student name, student number or invoice number and filter by charge type and month. The month is optional; pages contain around 25 invoices.',
   'Bank-statement reconciliation offers matching suggestions, prevents double allocation, highlights exceptions and supports a separate final audit.',
   'Cash, cheques, refunds and combined or partial payments require agreed rules. An optional direct bank connection is subject to confirmation.'
  ])}<h3>HQ & franchises</h3>${list([
   'Set data access, curriculum rights and responsibilities by centre and role. Materials require approval before publication, and disabling an account ends its access.',
   'Provide access and printing records, agreed operational reports, material and data import reports, training and support.'
  ])}<h3>Demonstration boundaries</h3><p>The embedded screens let reviewers explore the existing MathConcept workflows using demonstration records. Demonstration records do not sync across devices. Tsuen Wan timetable names and slots come from supplied schedules; payment and other workflow records are examples. P3 and P6 contain sample questions; the remaining catalogue requires its original worksheets. Payment checks are simulated. The addition racing game is a playable practice example; it does not yet use a student’s learning record or AI-generated curriculum. Native app delivery, paper-work capture, adaptive home practice, HQ publishing, editable conversion, worksheet authoring, controlled printing and live access controls remain proposed scope.</p>`},

 safeguards:{title:'Protection & reliability',body:
  `<p class="reference-lead">Protect MathConcept’s teaching materials, keep daily work dependable and make responsibilities clear. These are proposed outcomes to demonstrate and agree during the pilot.</p><h3>Material access</h3>${list([
   'HQ retains control of the master collection and decides which materials each centre may use. Teaching access does not grant unrestricted access to original files.',
   'Staff and students receive access appropriate to their role and assignments. Restricted answers and teacher notes remain unavailable to students.',
   'Changes in employment, centre rights or franchise status lead to the agreed access changes. Printed and photographed content cannot be recalled.'
  ])}<h3>Approved printing & traceability</h3>${list([
   'Printing follows agreed permissions and limits. Authorised staff can review what was issued, by which centre or account, and whether printing succeeded.',
   'Copy tracing aims to connect a recovered copy with its worksheet edition and distribution history. Its usefulness after scanning, photography and photocopying must be measured in the pilot.',
   'A trace supports investigation; it does not prove who disclosed the material. Screenshots, photographs and later copies remain possible, so the proposal cannot guarantee prevention of every leak.'
  ])}<h3>Continuity & recovery</h3>${list([
   'Students can resume saved work after agreed interruptions, with handwriting still attached to the correct questions. Supported devices and any work without a connection are confirmed before acceptance.',
   'Staff can tell whether an assignment, schedule change, payment review or print request completed. Repeated attempts must not unintentionally create duplicate business records or receipts.',
   'Agree how the centre continues teaching and administration during a service interruption, who communicates with affected users and who leads recovery.',
   'Set acceptable recovery times and limits on lost work, then demonstrate recovery of representative curriculum, student work and operational records before launch.',
   'The pilot checks that agreed classes and staff can complete their everyday work together without unacceptable delays.'
  ])}<h3>Content quality & confidentiality</h3>${list([
   'Converted and AI-assisted materials require review for mathematical accuracy, answers and teaching suitability before publication. Uncertain conversions remain in their original page form.',
   'MathConcept decides whether content may be processed externally and under what purpose, permissions and confidentiality conditions. This proposal gives no permission to process the library externally.'
  ])}<h3>Ownership & accountability</h3>${list([
   'MathConcept retains ownership of its supplied curriculum and operational data. The agreement defines ownership and licensing of newly created software and content.',
   'HQ can obtain agreed exports of its materials and records for continuity or handover. Centre access remains limited to each centre’s entitlements.',
   'Name the owners of access decisions, content approval, daily operation, incident response, recovery and support. Agree service expectations and handover provisions before live rollout.'
  ])}`},

 assumptions:{title:'Open decisions & responsibilities',body:
  `<p class="reference-lead">These decisions shape the delivery scope, acceptance measures and cost. MathConcept and the delivery team resolve them during discovery and the pilot.</p><h3>Materials</h3>${list([
   'Confirm the file formats, page counts and condition of the collection, and identify the approved editions.',
   'Choose the grades and worksheet families to make reusable or editable first.',
   'Name the people responsible for mathematical accuracy, answer-key review and publication approval.',
   'Agree whether content may be processed externally, for which purposes and under what confidentiality conditions.'
  ])}<h3>Teaching and devices</h3>${list([
   'Supported tablets and styluses, printing arrangements and devices for the pilot.',
   'Whether offline work is needed, which materials can be used offline and how completed work is handled after reconnecting.',
   'Which question types suit automatic marking or interactive diagrams, which need human review, and the quality requirements for each.'
  ])}<h3>Operations and finance</h3>${list([
   'Confirm leave, make-up expiry, schedule-change and extra-lesson rules.',
   'Confirm the teaching calendar and fully closed weeks used by the four teaching-week billing cycle. Agree receipt wording, the evidence staff review and first-enrolment activation checks. Keep receipt issuance distinct from bank reconciliation.',
   'Confirm available bank statements, matching rules, cash and cheque handling, combined or partial payments, refunds and month-end exceptions. An optional direct bank connection is subject to confirmation.',
   'Agree notification channels, message retention and responsibility for parent communication.'
  ])}<h3>Commercial and rollout</h3>${list([
   'Choose the pilot centre, participants, representative material sample and decision owners.',
   'Set measurable acceptance criteria and agree who decides whether to expand to further centres or overseas.',
   'Agree responsibility for preparing accurate records, ownership and licensing, ongoing operation, recovery, support and handover.',
   'Confirm the price, delivery schedule and recurring costs once the scope and assumptions have been validated.'
  ])}`}
};
