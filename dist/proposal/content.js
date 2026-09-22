const detail = (title, body) => `<details class="chapter-details"><summary>${title}<span>+</span></summary><div>${body}</div></details>`;
const list = items => `<ul class="plain-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const note = (label,text) => `<div class="editorial-note"><strong>${label}</strong><p>${text}</p></div>`;
const demo = (id,label='Existing MathConcept demo') => `<div class="demo-wrap"><div class="demo-caption"><span>${label}</span><span>${id==='rollout'?'Proposed delivery sequence':'Interactive demo'}</span></div><div class="demo" data-demo="${id}" id="demo-${id}"></div></div>`;
const proposedFlow = (label,steps,text) => `<div class="proposed-flow"><span class="field-label">${label}</span><ol>${steps.map(step=>`<li>${step}</li>`).join('')}</ol><p>${text}</p></div>`;

export const chapters = [
 {id:'vision',title:'The proposal'},
 {id:'system',title:'One connected system',kicker:'A shared operating model',heading:'From HQ’s curriculum<br>to a student’s next lesson.',intro:'Connect curriculum, teaching and centre operations around the same students and lessons. Each role has clear responsibilities and access to the information it needs.',body:
  demo('system')+
  detail('How the roles connect',list([
   'HQ approves teaching materials, decides which centres may use them and sets shared operating policies.',
   'Centre staff manage enrolment, schedules, parent requests and billing, with unresolved work visible for follow-up.',
   'Teachers find approved materials, assign work to students and review learning and corrections.',
   'Students work in their binder; parents manage leave, arrangements and payments through a separate app.',
   'Work already assigned keeps the approved edition used at the time. Answer keys remain available only to authorised staff.'
  ]))+
  note('One system, distinct responsibilities','Explore the existing Admin, Teacher, Parent and Student interfaces. HQ publishing, curriculum permissions and connections to live business services are proposed additions.')},

 {id:'protection',title:'Protect the curriculum',kicker:'Controlled distribution',heading:'Keep the originals private.<br>Make teaching access easy.',intro:'Give teachers and students the materials they are entitled to use while keeping control of the master collection with HQ. Approved printing and copy records support responsible distribution.',body:
  proposedFlow('Proposed access & printing workflow',['HQ approves materials','Staff receive permitted access','Approved viewing or printing','Distribution record'],'HQ decides which materials each centre and role may use. The proposed controls record access and approved printing so that distribution can be reviewed.')+
  `<div class="three-columns"><article><h3>Access by role</h3><p>HQ controls the master collection. Centres use their permitted curriculum. Students open work assigned and released to them.</p></article><article><h3>Approved printing</h3><p>Staff print within agreed permissions and limits, with a record of what was issued and whether printing succeeded.</p></article><article><h3>Traceable copies</h3><p>A distributed copy can be linked to its worksheet edition and issuing centre or account to support investigation.</p></article></div>`+
  detail('Protection outcomes and limits',list([
   'Routine teaching access does not give centres or students unrestricted access to the original-file collection.',
   'HQ sets printing rights and limits. Print records distinguish successful, failed and repeated attempts so that staff can resolve exceptions.',
   'The pilot assesses whether copy tracing remains useful after representative scans, photographs and photocopies. Any claim about recovery depends on those results.',
   'Screenshots, photography and later copying remain possible. These controls reduce easy bulk copying and support investigation; they cannot prevent every leak.',
   'Tracing a copy identifies its distribution history. It does not prove which person leaked it.',
   'Staff departures and franchise offboarding end future access. Previously printed or photographed material cannot be recalled.'
  ]))},

 {id:'library',title:'Use the existing library',kicker:'Preserve, organise, upgrade',heading:'Bring 200,000+ files forward.<br>Keep their teaching value.',intro:'Help teachers find and assign the existing collection, then progressively make priority questions reusable and editable without losing their mathematical meaning or original layout.',body:
  demo('library','Curriculum catalogue & assignment')+
  note('Existing catalogue','The demo uses the supplied curriculum indexes. P3 and P6 include sample questions; access to the original worksheets and editable conversion remain proposed work.')+
  `<div class="three-columns numbered"><article><span>01</span><h3>Preserve teaching value</h3><p>Keep worksheets readable in their original layout, with search, controlled access and room for digital working.</p></article><article><span>02</span><h3>Reuse approved questions</h3><p>Bring existing questions and diagrams into new worksheets while retaining their curriculum context and edition history.</p></article><article><span>03</span><h3>Edit verified content</h3><p>Make priority questions editable after their wording, equations, diagrams and answers have been checked.</p></article></div>`+
  detail('Migration scope and acceptance',list([
   'Confirm the collection’s file formats, page counts, condition and approved editions before agreeing coverage and cost. A file count is not a question count.',
   'Retain the original collection and the history of revised editions. Identify duplicate materials without confusing them with intentional revisions.',
   'Teachers can find approved worksheets by grade, topic, collection and the worksheet codes already used in their progress charts.',
   'Search results may need correction. The original page remains the teaching reference until any converted question has been verified.',
   'Review decimal points, fractions, units, diagrams, question parts and corresponding answers. Questions that cannot yet be converted faithfully remain usable in their original page form.',
   'Report library coverage and verified editable questions separately, with outstanding exceptions visible. Migration and editable conversion have separate scopes and acceptance measures.'
  ]))},

 {id:'authoring',title:'Create new materials',kicker:'Create, review, publish',heading:'A worksheet studio<br>built for the way maths is taught.',intro:'Combine approved questions with new material, check the answers and give students enough room to think. Prepare the same worksheet for portrait tablets and A4 printing.',body:
  proposedFlow('Proposed authoring workflow',['Create or select questions','Review answers and layout','Publish an approved edition'],'Authors prepare materials, reviewers check their accuracy and presentation, and teachers assign the published edition. The worksheet studio and AI assistance are proposed additions.')+
  `<div class="two-columns"><article><h3>Questions ready for reuse</h3><p>Keep each question’s wording, mathematical notation, diagrams, answers and marking guidance together. Curriculum labels help authors find the right material.</p></article><article><h3>AI with editorial review</h3><p>AI can suggest relevant questions, draft variations and assist conversion. Authors remain responsible for the accuracy, difficulty and suitability of published work.</p></article></div>`+
  detail('Authoring outcomes and review responsibilities',list([
   'Authors can prepare questions with text, equations, images, answer spaces and handwriting space. Interactive diagrams are prioritised by teaching need.',
   'AI suggestions remain drafts until reviewed. Publication checks cover mathematical accuracy, meaning, difficulty, diagrams, answers and worked solutions.',
   'MathConcept must approve whether its curriculum may be processed externally, for what purpose and under what confidentiality conditions. This proposal does not authorise external processing of the library.',
   'Students cannot obtain restricted answers or teacher notes through their learning materials, searches or exports.',
   'Authors can preview tablet and A4 use before publishing. Questions remain readable, related parts stay together and students have sufficient working space.',
   'Updating a worksheet creates a new edition. Work already issued remains tied to the edition the student received.'
  ]))},

 {id:'teacher',title:'The teacher workbench',kicker:'Prepare and teach',heading:'The progress chart<br>becomes the workbench.',intro:'Choose a class, select a student and assign the next useful worksheet. A student’s grade provides a starting point, with other levels available when the teacher judges them appropriate.',body:
  demo('teacher')+
  note('Connected example','Choose worksheets, select “Send to student”, then “View student app” to open that student’s binder. “Prepare for later” keeps work locked until the teacher releases it.')+
  detail('Teaching workflow',list([
   'Teachers move between their scheduled classes and students while keeping each student’s progress in view.',
   'The progress chart brings worksheet collections together, with navigation by grade, topic and familiar worksheet codes.',
   'Teachers can distinguish assigned work, student progress, work awaiting marking and corrections, and open the work behind each status.',
   'Approved worksheets can be assigned as classwork or homework. Work prepared for a later lesson stays unavailable until released.',
   'A student’s working, teacher marks and corrections remain associated with the correct question and the edition originally assigned.'
  ]))},

 {id:'student',title:'The student workspace',kicker:'A familiar binder, made digital',heading:'More room for working.<br>Less interface to think about.',intro:'Give students three familiar places: work to do now, completed work and work prepared for later. Prioritise a clear writing surface on portrait tablets.',body:
  demo('student')+
  detail('Student experience and acceptance',list([
   'Current work includes corrections from a previous lesson. Completed work remains available for revision.',
   'Students cannot open future work before the teacher releases it.',
   'Students can focus on a full-screen writing surface. Parent and student interfaces use Hong Kong Traditional Chinese.',
   'Handwritten working stays with the correct question when students return to a worksheet or change how they view it.',
   'The pilot checks comfortable stylus use, accidental touch handling and whether students can resume saved work after agreed interruptions on supported devices. Any need to work without a connection must be agreed separately.',
   'Automatic marking is limited to question types whose results have been validated. Teachers continue to review handwritten reasoning and award method marks.'
  ]))},

 {id:'operations',title:'Centre & parent coordination',kicker:'Keep arrangements clear',heading:'A schedule staff can trust.<br>A clear next step for parents.',intro:'Record leave promptly and let staff agree the replacement lesson with the parent. Show the effect of temporary and permanent changes on lesson entitlement before confirming them.',body:
  demo('operations')+
  `<div class="two-columns"><article><h3>Parents request leave</h3><p>The app confirms leave and invites optional preferred dates. Parents are told that centre staff will contact them to complete the make-up arrangement.</p></article><article><h3>Staff confirm arrangements</h3><p>The cancelled lesson is marked in the timetable and retained in the leave bin. A replacement becomes scheduled when staff confirm the agreed time.</p></article></div>`+
  detail('Scheduling rules and communication',list([
   'Staff can drag lessons to a new slot or into the leave bin, and clearly see which arrangements still need follow-up.',
   'Teacher availability, class capacity and timetable clashes are checked before a change is confirmed.',
   'Changes have a start date and, when temporary, an end date. The original regular schedule resumes after a temporary change ends.',
   'Staff see any increase or reduction in affected lessons before confirming a change. Extra lessons and make-up credits require an explicit decision.',
   'Related receipt and schedule amendments remain linked, with the previous records and reasons for changes available for review. Document revision and date rules must be agreed.',
   'Staff can see remaining lesson dates. Parent communications and lesson remarks stay associated with the relevant student and lesson.'
  ]))},

 {id:'billing',title:'Payments & final audit',kicker:'Make the next action obvious',heading:'Know what needs attention.<br>Close the loop with the bank.',intro:'Follow each invoice through payment proof, centre review and receipt issuance. A separate final audit checks issued receipts against bank records and highlights unresolved differences.',body:
  demo('billing')+
  note('Receipt issuance and reconciliation are separate','The proposed “Auto-sent” policy issues a receipt after payment proof passes agreed checks. It does not confirm that the money has been matched to the bank. Manual review remains an alternative, and final audit identifies differences.')+
  detail('Billing rules and exceptions',list([
   'Each invoice has its own status. A student can have an older unpaid invoice, another awaiting review and a completed invoice at the same time.',
   'Staff start with invoices requiring centre review. Deadlines and overdue bills remain visible, older proofs receive attention first and recent receipts are easy to find.',
   'Staff can find invoices by student name, student number or invoice number, and narrow results by charge type or billing month. The month filter is optional so older unpaid invoices stay visible; compact pages of around 25 invoices keep large queues manageable.',
   'Staff review an invoice alongside its payment proof. Approval issues the receipt; returning proof requires a reason and requests replacement evidence rather than another payment.',
   'Unsuccessful updates leave the review available to complete. Reminders are recorded and cannot be repeated within 24 hours. Cancelled and void invoices remain available in a separate archive.',
   '“Auto-sent” is the proposed centre default. Failed or uncertain proof checks go to staff review. Payment checks in this demonstration are simulated; real checks require validation before use.',
   'Statement reconciliation prevents duplicate transaction records and double allocation of a bank credit, and flags missing, extra or ambiguous matches. Payment initiation, proof submission, receipt issuance and bank posting dates remain distinct.',
   'Cash, cheques, combined payments, partial payments and refunds require agreed handling. Bank-statement import is the baseline; an optional direct bank connection is subject to confirmation.'
  ]))},

 {id:'franchise',title:'Operate across centres',kicker:'Grow with consistent control',heading:'HQ sets the standards.<br>Centres run the day.',intro:'Give each franchise the curriculum and operating tools it needs, with clear boundaries between centres and central responsibility for publishing and access policies.',body:
  demo('franchise','Tsuen Wan & Hang Hau')+
  note('Shared application','Both centres use the same application, with their own identity, teachers and demonstration records. HQ permissions and network reporting are proposed additions.')+
  detail('Network governance',list([
   'A centre can access only the student records and curriculum it is permitted to use, including when staff work across more than one centre.',
   'HQ controls publication, approved editions and curriculum entitlements. Teaching and operational responsibilities follow an agreed set of roles.',
   'Unusual access or printing volumes can be flagged for review against agreed thresholds. A flag prompts investigation rather than an accusation.',
   'HQ and authorised centre staff can see unresolved scheduling and payment work. Comparisons across centres use agreed reporting definitions.',
   'Expansion includes centre onboarding, staff changes, franchise offboarding, support coverage and language requirements.',
   'MathConcept retains ownership of its supplied curriculum and operational data. The agreement defines ownership and licensing of the new software, data export and handover rights.'
  ]))},

 {id:'rollout',title:'Migration, pilot & rollout',kicker:'Prove the workflow, then expand',heading:'Start with one centre.<br>Build evidence for the next.',intro:'Validate real materials, devices and staff routines before expanding. Each stage ends with a decision against agreed success measures and any outstanding exceptions.',body:
  demo('rollout','Delivery roadmap')+
  `<div class="two-columns responsibility"><article><h3>MathConcept provides</h3><p>Authorised materials and business records, curriculum and operations owners, representative exceptions, pilot users and timely review decisions.</p></article><article><h3>The delivery team provides</h3><p>The agreed solution, migration support, evidence of acceptance results, staff training, operating guidance and support during launch.</p></article></div>`+
  detail('Pilot acceptance examples',list([
   'A teacher finds the correct approved worksheet, assigns it and reviews the student’s saved work on an agreed device.',
   'A student resumes saved work after an agreed interruption without lost or misplaced handwriting.',
   'A parent leave request updates the original lesson and staff follow-up queue without confirming a replacement time prematurely.',
   'An invoice follows the agreed receipt policy. Statement reconciliation flags unexplained differences and prevents a bank credit from being allocated twice.',
   'An unauthorised centre cannot obtain the original-file collection, another centre’s student records or restricted answer keys.',
   'Approved printing respects permissions and limits, records the outcome and handles failed or repeated attempts clearly. Copy-tracing usefulness is assessed separately under agreed capture conditions.',
   'Migration samples preserve the required equations and layout. Exceptions are reported and resolved, or retained in their original page form for teaching.'
  ]))},

 {id:'proposal',title:'Scope, investment & next steps',kicker:'A clear basis for delivery',heading:'Agree the first release.<br>Make the next decision concrete.',intro:'This draft gives MathConcept a proposed direction and working examples to review. Scope, price and delivery dates follow agreement on the library, operating rules and pilot requirements.',body:
  `<div class="scope-matrix"><article><span class="scope-label">FOUNDATION</span><h3>Proposed first release</h3><p>Controlled library, teacher assignment, student binder, centre and parent workflows, invoice review and statement reconciliation for the agreed pilot.</p></article><article><span class="scope-label">STAGED DEVELOPMENT</span><h3>Authoring & expansion</h3><p>Worksheet creation, verified editable questions, selected AI assistance, broader reporting and rollout to additional centres.</p></article><article><span class="scope-label">FEASIBILITY CHECKS</span><h3>Validate before committing</h3><p>Conversion accuracy, approved printing on supported equipment, handwriting continuity and copy-tracing results. An optional direct bank connection and additional payment methods are subject to confirmation.</p></article></div><div class="commercial-panel"><div><span class="eyebrow">COMMERCIAL BASIS</span><h3>Separate the investment into clear parts.</h3></div><div class="cost-lines"><div><span>Solution design & delivery</span><strong>To be scoped</strong></div><div><span>Library migration & editable conversion</span><strong>Quoted separately</strong></div><div><span>Ongoing operation & services</span><strong>Usage assumptions required</strong></div><div><span>Support, maintenance & training</span><strong>Service terms to agree</strong></div></div></div><div class="decision-box"><span>THE NEXT DECISION</span><h3>Agree a representative pilot and its success measures.</h3><p>Confirm the participating centre, material sample, supported teaching and printing equipment, decision owners and priority workflows. Use that agreement to prepare the delivery plan and commercial proposal.</p><div class="button-row"><button class="primary-button" data-action="reference" data-ref="scope">Read the detailed scope <span>↗</span></button><button class="secondary-button" data-action="reference" data-ref="assumptions">Review open decisions</button></div></div>`+
  detail('Ownership, support and handover',list([
   'MathConcept retains ownership of its supplied curriculum and operational data. Ownership and licensing of new software and new content are defined in the agreement.',
   'Agree who is responsible for daily operation, authorised administration, continuity during interruptions, recovery of records, data export and handover.',
   'Set support hours, incident response responsibilities, maintenance responsibilities and expectations for any ongoing services.',
   'A later commercial proposal will state costs and timelines based on validated scope. This draft commits no price or delivery date.'
  ]))}
];

export function chapterHTML(c,i){return `<section class="chapter" id="${c.id}" data-chapter="${i}" aria-labelledby="heading-${c.id}"><div class="eyebrow">${String(i+1).padStart(2,'0')} / ${c.kicker}</div><div class="chapter-heading"><h2 id="heading-${c.id}">${c.heading}</h2><p class="section-intro">${c.intro}</p></div>${c.body}</section>`}

export const references = {
 scope:{title:'Detailed scope',body:
  `<p class="reference-lead">A working scope for agreement. Proposed capabilities describe the intended delivery outcomes; the demonstration does not establish that they are ready for live use.</p><h3>Curriculum & content</h3>${list([
   'HQ controls the original collection, approved editions and access rights. Teachers find permitted materials through familiar worksheet codes, grades, topics and collections.',
   'Existing worksheets remain usable in their original layout. Reusable questions and verified editable content are introduced in agreed stages.',
   'Authors can prepare text, equations, diagrams and working space, preview tablet and A4 use, and submit materials for review and publication.',
   'AI may help find questions, draft variations and assist conversion, subject to MathConcept’s content-processing permissions and human approval before publication.'
  ])}<h3>Teaching & learning</h3>${list([
   'Teachers select scheduled classes and students, review progress and assign appropriate materials across grade levels.',
   'Students receive classwork, homework and corrections in their binder. Future work stays unavailable until released; completed work remains available for review.',
   'Assignments retain the issued edition, with student handwriting, teacher marking and corrections kept with the correct questions.',
   'The pilot verifies writing and saved-work continuity on supported devices. Work without a connection requires separately agreed scope and acceptance measures.'
  ])}<h3>Centre & parent operations</h3>${list([
   'Staff manage schedules, teacher availability, lesson remarks, remaining lessons and student information.',
   'Parents receive leave confirmation and may suggest replacement dates. Staff agree and confirm make-up lessons, with outstanding arrangements visible.',
   'Single, temporary and ongoing schedule changes are checked for clashes and changes to lesson entitlement before confirmation.',
   'Parent records and communications remain associated with the appropriate student and lesson.'
  ])}<h3>Billing</h3>${list([
   'Staff follow invoice status, review payment proofs, apply the agreed receipt policy, send recorded reminders and retain receipt and cancellation history.',
   'Invoices can be found by student or invoice details and filtered by charge type or billing month.',
   'Bank-statement reconciliation offers matching suggestions, prevents double allocation, highlights exceptions and supports a separate final audit.',
   'Cash, cheques, refunds and combined or partial payments require agreed rules. An optional direct bank connection is subject to confirmation.'
  ])}<h3>HQ & franchises</h3>${list([
   'Each centre and role receives the permitted curriculum and records. HQ controls publication, access approval and revocation.',
   'Access and printing records support review; shared reporting highlights unresolved operational work.',
   'Migration acceptance, training, continuity, support and ownership arrangements are agreed before expansion.'
  ])}<h3>Demonstration boundaries</h3><p>The embedded screens let reviewers explore the existing MathConcept workflows using demonstration records. Demonstration records do not sync across devices. Tsuen Wan timetable names and slots come from supplied schedules; payment and other workflow records are examples. P3 and P6 contain sample questions; the remaining catalogue requires its original worksheets. Payment checks are simulated. HQ publishing, editable conversion, worksheet authoring, controlled printing and live access controls remain proposed scope.</p>`},

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
   'Confirm the tablets, styluses and printing equipment to be supported, with representative users for the pilot.',
   'Decide whether students must work without a connection, and agree how access and saved work should behave during an interruption.',
   'Prioritise question types for automatic marking, interactive diagrams and teacher review.',
   'Agree printing permissions, limits and the capture conditions used to assess copy-tracing usefulness.'
  ])}<h3>Operations and finance</h3>${list([
   'Confirm leave, make-up expiry, schedule-change and extra-lesson rules.',
   'Agree receipt wording and the evidence required by the Auto-sent policy. Keep receipt issuance distinct from bank reconciliation.',
   'Confirm available bank statements, matching rules, cash and cheque handling, combined or partial payments, refunds and month-end exceptions. An optional direct bank connection is subject to confirmation.',
   'Agree notification channels, message retention and responsibility for parent communication.'
  ])}<h3>Commercial and rollout</h3>${list([
   'Choose the pilot centre, participants, representative material sample and decision owners.',
   'Set measurable acceptance criteria and agree who decides whether to expand to further centres or overseas.',
   'Agree responsibility for preparing accurate records, ownership and licensing, ongoing operation, recovery, support and handover.',
   'Confirm the price, delivery schedule and recurring costs once the scope and assumptions have been validated.'
  ])}`}
};
