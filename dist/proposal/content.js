const detail = (title, body) => `<section class="feature-detail"><h3>${title}</h3>${body}</section>`;
const list = items => `<ul class="plain-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const table = (headers, rows) => `<div class="feature-table-wrap"><table class="feature-table"><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>i===0?`<th scope="row">${x}</th>`:`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const demo = (id,label='MathConcept workflows') => `<div class="demo-wrap"><div class="demo-caption">${id==='rollout'?'':'Interactive demo: '}${label}</div><div class="demo" data-demo="${id}" id="demo-${id}"></div></div>`;

export const chapters = [
 {id:'vision',title:'Proposal overview'},

 {id:'student',title:'Student learning experience',heading:'Student learning experience',intro:'Students currently keep their paper binders at the centre, with homework and corrections added by their teacher. The digital binder keeps the familiar past, current and future sections. Centres provide tablets for students to sign in, access their work and record attendance. Teachers send worksheets directly to the binder; students use a portrait tablet and stylus to complete them. For validated, straightforward question types, AI-assisted marking can check answers and provide immediate feedback against approved answers. Teachers continue to review work and follow up corrections.',body:
  demo('student','Student binder and worksheet working')+
  detail('Paper and digital learning together',`<p>Students who continue using paper can receive authorised printed worksheets. After completing the work, a photograph or scan is uploaded to the student’s learning record, keeping paper work available alongside digital assignments for teacher review and follow-up.</p>`)+
  detail('Writing space and retained work',list([
   'Opening a worksheet prioritises the page and stylus working area. When the student returns, saved handwriting remains aligned with the original questions; teacher marking and student corrections stay with the same assignment and issued edition.',
   'Automatic marking applies only to validated question types. Teachers remain responsible for judging handwritten reasoning and solution methods.'
  ]))+
  detail('Learning at home',`<p>Students can sign into their account from home on a computer, tablet or phone. Based on the topics they are learning, the proposed system can use AI to help prepare interactive practice, learning games and supporting explanations. Approved content and agreed teaching rules guide the questions, difficulty and feedback. Future worksheets remain unavailable until the teacher releases them.</p><p>The addition racing game below demonstrates one possible form of practice, using eight single-digit addition questions. Students steer towards an answer box, gaining a speed boost for a correct answer and slowing down after a wrong one. The playable example does not yet adapt to a student’s learning record or generate curriculum content with AI.</p>`)+
  demo('game','Maths Kart: addition practice')},

 {id:'teacher',title:'Teacher assignment and feedback',heading:'Teacher assignment and feedback',intro:'Teachers continue using the familiar progress chart, with digitised materials held in a controlled internal library. They select a scheduled class and student, choose the appropriate worksheets and send them directly to the student’s binder, then use AI-assisted marking, review answers and follow up corrections. There is no need to search personal computer folders or save teaching originals locally. When paper is needed, authorised teachers can request printing directly from the system without first downloading a source file. Normal teaching accounts do not provide original-file downloads.',body:
  demo('teacher','Class selection, progress and assignment')},

 {id:'library',title:'Material digitisation and authoring',heading:'Digitising materials and creating new worksheets',intro:'Prepare the existing teaching-material library for digital lessons in stages. First organise the catalogue and make approved original worksheets available for tablet working and marking. Then prepare reusable questions and verified editable content. Alongside this migration, a visual authoring workspace lets approved authors create new worksheets and interactive activities for digital learning and authorised printing.',body:
  demo('library','Curriculum catalogue and assignment')+
  detail('Preparing and converting the existing library',table(['Stage','Usable result','Review and acceptance'],[
   ['1. Catalogue the collection','Organise materials by grade, topic, collection and familiar worksheet codes. Identify formats, condition, duplicates and existing editions.','Confirm the approved source for each worksheet. Preserve intentional revisions and correct catalogue exceptions.'],
   ['2. Use the original worksheets digitally','Preserve the approved page layout for teacher assignment, student handwriting and marking. Keep the original collection within the controlled library.','Check layout, page count, equations, diagrams and working space on the agreed tablets. A worksheet can be ready for digital teaching without yet being editable.'],
   ['3. Prepare reusable questions','Make verified questions, diagrams and corresponding answers available for use in new worksheets, retaining their source and curriculum context.','Agree which grades and worksheet families to prioritise. Check question boundaries, related parts and answer associations before reuse.'],
   ['4. Approve editable content','Let authorised authors edit verified wording, equations, diagrams and answers and publish new editions.','Searchable content is not necessarily suitable for editing. Agree conversion coverage and quality requirements, and verify mathematical accuracy against the original.']
  ]))+
  detail('Quality checks and migration acceptance',list([
   'Check decimal points, fractions, units, diagrams, question parts and corresponding answers against the original materials.',
   'Retain original editions and revision history, distinguishing duplicate files from intentional versions. Report catalogue coverage, worksheets ready for digital use, verified questions and outstanding items separately.',
   'Keep materials that cannot yet be converted faithfully in their original page form for review. Do not count unverified questions as completed editable content.',
   'Accept library migration and verified editable conversion as separate outcomes, with separate work scopes and costs.',
   'The catalogue demo uses supplied curriculum indexes, with sample questions for P3 and P6. The other worksheets still require their original files; editable conversion is not yet complete.'
  ]))+
  detail('Visual worksheet and activity creation',`<p>Authors can start with a blank page and drag text, mathematical symbols, equations, images, diagrams, answer fields and working areas into place. The same material can support online exercises or learning games while retaining a clear printed version. AI can help draft questions, hints, solutions, layouts and interactive content for authors to check and refine.</p>`)+
  detail('Reuse, review and publication',`<p>Authors can reuse approved questions and layouts, retaining their source and edition. They set handwriting, typed-answer or diagram response areas, with answers and marking guidance. They preview portrait-tablet and A4 versions to check readability, page breaks and writing space. AI output remains a draft: the wording, answers, difficulty and solution methods require review before publication. An approved revision becomes a new edition; work already issued retains the version received by the student.</p><p>The supported response formats, interactive question types and automatic-marking rules are agreed against teaching needs and pilot results.</p>`)+
  detail('Traditional formats and authorised export',`<p>Existing PDF and other traditional-format materials can remain in the controlled library alongside newly authored content, with access, assignment and printing governed by permissions. Where an established workflow or handover requires it, specifically authorised HQ users can export agreed materials as PDF or Word documents. This export permission is separate from normal teaching access; general teacher accounts do not provide original-file downloads.</p>`)+
  detail('Editorial responsibilities and answer access',list([
   'MathConcept names the authors, mathematical reviewers and staff authorised to approve publication.',
   'Student materials, search results and exports must not expose restricted answers or teacher notes.',
   'MathConcept must approve any external processing of curriculum, including its purpose, usage rights and confidentiality conditions. This proposal does not authorise external AI or other content-processing services to use the library.'
  ]))},

 {id:'protection',title:'Curriculum access and printing',heading:'Curriculum access and printing',intro:'HQ retains the master collection and approves materials before centres and teachers use them. Permissions follow each user’s role, centre and authorised curriculum. Distribution and printing records help HQ review use of the materials.',body:
  detail('Curriculum access',`<p>Users receive the approved materials permitted for their role, centre and curriculum. Originals, student work and answer keys are managed separately. HQ determines what can be published and who may access it; teaching access does not grant unrestricted access to the original collection.</p>`)+
  detail('Authorised printing',`<p>Set which materials may be printed and the permitted volumes, and record whether each request completed, failed or needs follow-up. Agree the printers, printing arrangements and usage policy during the pilot, with named staff responsible for exceptions. Teachers request printing without downloading originals; the centre’s procedures also cover access to printing equipment and the care of printed copies.</p>`)+
  detail('Tracing the source of a copy',`<p>Use worksheet editions, issuing centres, user accounts and printing records to help establish a copy’s distribution history. Test the usefulness of tracing under agreed scan, photograph and photocopy conditions before confirming the achievable identification results.</p>`)+
  detail('Ending access',`<p>Stop further material access when an account or centre is disabled, or a franchise relationship ends. Previously printed, photographed or separately copied material cannot be recalled.</p>`)+
  detail('Protection scope and practical limits',list([
   'These controls are proposed scope. Access restrictions, printing outcomes and copy-tracing performance require pilot verification.',
   'Readable or printable materials can still be captured or copied. Access limits and records reduce easy bulk copying and support investigation; they cannot prevent every leak.',
   'A copy trace or unusual usage record is an investigation lead. It does not by itself establish who disclosed material or prove misconduct.'
  ]))},

 {id:'system',title:'Centre administration and scheduling',heading:'Centre administration, scheduling and parent communication',intro:'Staff manage enrolment, class arrangements, parent communication and fees in one system, using the relevant student and lesson records. Leave, make-up lessons and timetable changes are handled together, with confirmed arrangements clearly separated from requests still awaiting staff follow-up.',body:
  demo('operations','Leave, timetable changes and make-up lessons')+
  detail('Enrolment and student records',`<p>Staff review applications, maintain student information and arrange assessments and first-enrolment invoices. Approval of the first-enrolment payment activates enrolment. Authorised staff can find remaining lesson dates, lesson remarks and relevant records when following up a student’s case.</p>`)+
  detail('Timetables and availability',`<p>View teachers’ schedules, unavailable periods and attendance records. Student sign-in or QR check-in supports the centre’s attendance process. Move a lesson to another slot or into the leave bin, and drag an agreed make-up lesson back onto the calendar. Keyboard controls provide an alternative to dragging. Before confirming a move, staff check teacher availability, class capacity and time clashes.</p>`)+
  detail('Leave and make-up arrangements',`<p>A successful parent leave request marks the original lesson as cancelled and adds a compact student strip to the leave bin. Parents can suggest preferred replacement dates; the app makes clear that staff will contact them to complete the arrangement. Once the time is agreed, staff move the strip to the confirmed calendar slot. The pending item is removed and the original leave record is retained. A suggested date alone never confirms a replacement lesson.</p>`)+
  detail('One-off, temporary and ongoing timetable changes',`<p>Staff can move one lesson or change the regular timetable from a specified date. Leaving the end date unset makes the change ongoing; setting an end date makes it temporary, with the original arrangement resuming afterwards. Review the affected lessons and compare lesson counts before confirming.</p>`)+
  detail('Changes to lesson entitlement',`<p>Show additional or fewer lessons resulting from a timetable change. Staff explicitly decide whether to allow an extra lesson or retain a make-up credit for a reduction. Link schedule and receipt amendments, retain the previous records and record the reason for the change. Document revision and date-handling rules are agreed separately.</p>`)+
  detail('Parent communication and handover',`<p>Parents, teachers and centre staff communicate through the app. Keep messages, lesson remarks and follow-up records with the relevant student and lesson, so an authorised colleague can take over a case with the necessary context.</p>`)+
  detail('Payment work and outstanding actions',`<p>Staff can use AI to organise information from uploaded payment proof, then check it against the invoice before approving and issuing a receipt. They handle payment reminders and separately complete final bank reconciliation. The billing section below sets out the queues and confirmation rules. Scheduling requests and unresolved payment differences remain visible for follow-up.</p>`)+
  detail('Records, permissions and demonstration scope',list([
   'Each role sees only the student records and materials it is permitted to use. Assigned work retains its issued edition, and restricted answers remain available only to authorised staff.',
   'The demo includes Admin, Teacher, Parent and Student workflows. Demonstration records do not sync across devices; payment checks are simulated.',
   'HQ publishing, curriculum permissions, controlled printing and live operational support are proposed additions. Delivery follows the agreed scope and acceptance conditions.'
  ]))},

 {id:'billing',title:'Invoice review and bank reconciliation',heading:'Invoice review and bank reconciliation',intro:'Billing follows one sequence: invoice → parent payment proof → staff approval → receipt. Final audit separately compares issued receipts with bank records and identifies unresolved differences.',body:
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
   ['Final audit','Upload bank statements to compare with issued receipts. Suggest matches, prevent duplicate transaction records and double allocation of a bank credit, and flag missing, extra or ambiguous matches.','Keep final audit separate from payment approval; staff resolve unexplained differences.'],
   ['Transaction dates','Keep payment initiation, proof submission, receipt issuance and bank posting dates distinct.','Use the relevant date for review and final audit.']
  ])+
  detail('Payment exceptions and validation',list([
   'Agree handling for cash, cheques, combined payments, partial payments and refunds. An optional direct bank connection is subject to confirmation.',
   'Payment checks and automatic invoicing in the demonstration are simulated. Validate proof review, billing dates and reconciliation rules against representative records before live use.'
  ]))},

 {id:'franchise',title:'Multi-centre management',heading:'Multi-centre management',intro:'HQ manages curriculum publication and common policies. Each centre carries out teaching and administration within its permitted curriculum and student records.',body:
  `<p class="demo-context">Tsuen Wan and Hang Hau use the same application with their own centre identity, teachers and demonstration records. HQ permissions and network reporting are proposed additions. Ownership, licensing and handover terms are set out in the commercial section.</p>`+
  demo('franchise','Tsuen Wan and Hang Hau')+
  table(['Feature','Included function','Condition or responsibility'],[
   ['Centre and staff access','Limit access to permitted student records and curriculum, including staff who work across several centres.','Agree roles and responsibilities, then grant and withdraw access accordingly.'],
   ['Central publication','Control approved editions and curriculum entitlements across the network.','HQ approves publication and centre access.'],
   ['Access and printing review','Flag unusual access or printing volumes using agreed thresholds.','A flag prompts investigation; it does not establish misconduct.'],
   ['Operational reporting','Show unresolved scheduling and payment work to HQ and authorised centre staff.','Agree consistent reporting definitions before comparing centres.'],
   ['Centre rollout and changes','Cover centre onboarding, staff changes, franchise offboarding, support coverage and language requirements.','Confirm the requirements for each expansion stage.']
  ])},

 {id:'rollout',title:'Delivery, pilot and acceptance',heading:'Delivery, pilot and acceptance',intro:'Use a representative centre, material sample and supported equipment to validate teaching and operational workflows. Each delivery stage ends with review of agreed acceptance measures and outstanding exceptions.',body:
  detail('Delivery responsibilities',table(['Party','Required contribution'],[
   ['MathConcept','Provide authorised materials and accurate business records, curriculum and operations owners, representative exceptions, pilot users and timely review decisions.'],
   ['Delivery team','Provide the agreed solution, migration support, acceptance evidence, staff training, operating guidance and support during launch.'],
   ['Joint decisions','Agree the pilot coverage, samples and acceptance criteria, resolve work below the required standard, and confirm the scope, cost and schedule of each later stage.']
  ]))+
  detail('Pilot acceptance schedule',table(['Area','Acceptance example'],[
   ['Teaching','A teacher finds the correct approved worksheet, assigns it and reviews the student’s saved work on an agreed device.'],
   ['Student working','A student resumes saved work after an agreed interruption without lost or misplaced handwriting.'],
   ['Paper and home learning','An uploaded photograph or scan is attached to the correct student and worksheet for review. Agreed home practice follows the student’s learning topics and approved content rules; unreleased work remains inaccessible.'],
   ['Leave and scheduling','A parent leave request updates the original lesson and staff follow-up queue. Staff can drag its leave-bin strip back to a valid calendar slot to confirm the agreed make-up.'],
   ['Billing','Four teaching-week cycles skip fully closed weeks and issue the next invoice after week three. Payment proof waits for staff approval; first-payment approval activates enrolment once. Failed or uncertain reviews remain recoverable without duplicate receipts. Final audit flags unexplained differences and prevents double allocation.'],
   ['Access','An unauthorised centre cannot obtain the original-file collection, another centre’s student records or restricted answer keys.'],
   ['Printing and tracing','Printing respects permissions and limits, records the outcome and handles failed or repeated attempts clearly. Assess copy-tracing usefulness separately under agreed capture conditions.'],
   ['Migration','Samples preserve the required equations, diagrams and layout. Report and resolve exceptions, or retain the original page form for teaching.'],
   ['Daily operation and recovery','Test core work under agreed normal and interrupted conditions. Confirm recoverable records, expected recovery times, notifications and follow-up responsibilities.']
  ]))+
  demo('rollout','Proposed delivery sequence')},

 {id:'proposal',title:'Scope and commercial terms',heading:'Scope and commercial terms',intro:'This document is a scope proposal for review, not a priced quotation. No price or delivery date is committed. A commercial quotation follows confirmation of the material collection, operating rules and pilot requirements.',body:
  detail('Proposed delivery scope',table(['Work package','Scope','Basis for agreement'],[
   ['First release','Controlled library, teacher assignment, student binder, centre and parent workflows, invoice review and statement reconciliation for the agreed pilot.','Confirm pilot users, material coverage, supported equipment and acceptance measures.'],
   ['Staged development','Worksheet authoring, verified editable questions, selected AI assistance for creation and home practice, broader reporting and additional centres.','Prioritise and quote the agreed stages.'],
   ['Feasibility assessment','Conversion accuracy, approved printing on supported equipment, handwriting continuity and copy tracing.','Use representative materials and pilot evidence to confirm achievable coverage.'],
   ['Separate assessment','Direct bank connections, additional payment methods, offline work and specialised interactive diagrams.','Confirm demand, relevant third-party cooperation and operating rules before including them in the delivery scope.']
  ]))+
  detail('Quotation structure',table(['Cost component','Basis of quotation','Amount'],[
   ['Solution design and delivery','Agreed workflows, roles, pilot scope and acceptance requirements.','To be confirmed'],
   ['Library migration and editable conversion','Confirmed collection and conversion priorities; quoted as separate work scopes.','To be confirmed'],
   ['Ongoing operation and services','Agreed usage assumptions and ongoing service requirements.','To be confirmed'],
   ['Support, maintenance and training','Support hours, responsibilities, maintenance coverage and training requirements.','To be confirmed']
  ]))+
  detail('Ownership, operation and handover',list([
   'MathConcept retains ownership of its supplied curriculum and operational data. The agreement defines ownership and licensing of new software and newly created content.',
   'Agree responsibility for daily operation, authorised administration, continuity during interruptions, recovery of records, data export and handover rights.',
   'Set support hours, incident response and maintenance responsibilities, together with expectations for ongoing services.',
   'The commercial quotation will state costs, recurring charges, delivery schedule and service terms after validation of scope and assumptions.'
  ]))+
  detail('Information required to prepare the quotation',`<ol class="plain-list"><li>Confirm the pilot centre, participants, decision owners and priority workflows.</li><li>Select representative materials, teaching devices and printing equipment.</li><li>Agree operating rules, responsibilities and measurable acceptance criteria.</li><li>Prepare the delivery plan and quotation from the confirmed scope.</li></ol><div class="button-row"><button class="secondary-button" data-action="reference" data-ref="scope">Detailed scope</button><button class="secondary-button" data-action="reference" data-ref="assumptions">Open decisions and responsibilities</button></div>`)}
];

export function chapterHTML(c,i){return `<section class="chapter" id="${c.id}" data-chapter="${i}" aria-labelledby="heading-${c.id}"><div class="eyebrow">Section ${String(i+1).padStart(2,'0')}</div><div class="chapter-heading"><h2 id="heading-${c.id}">${c.heading}</h2><p class="section-intro">${c.intro}</p></div>${c.body}</section>`}

export const references = {
 scope:{title:'Detailed scope',body:
  `<p class="reference-lead">A working scope for agreement. Proposed capabilities describe the intended delivery outcomes; the demonstration does not establish that they are ready for live use.</p><h3>Curriculum & content</h3>${list([
   'HQ controls the original collection, approved editions and access rights. Teachers find permitted materials through familiar worksheet codes, grades, topics and collections.',
   'Existing worksheets remain usable in their original layout. Reusable questions and verified editable content are introduced in agreed stages.',
   'Authors can use a visual drag-and-drop workspace to create worksheets and interactive exercises with text, equations, diagrams and answer areas, or reuse approved questions and layouts. Preview portrait-tablet and A4 versions and submit materials for review before publication.',
   'Traditional materials remain in the controlled library. Specifically authorised HQ users can export agreed materials as PDF or Word; normal teaching accounts do not provide original-file downloads.',
   'AI may help find questions, draft variations, hints, solutions and interactive content, and assist conversion, subject to MathConcept’s content-processing permissions and human approval before publication.'
  ])}<h3>Teaching & learning</h3>${list([
   'Teachers select scheduled classes and students, review progress and assign appropriate materials across grade levels. Authorised printing starts from the system without requiring a teacher to download the source file.',
   'The proposed native student app prioritises portrait tablets. Its visual binder groups current classwork, homework and corrections, locked future work, and completed work for review; opening a worksheet prioritises handwriting space.',
   'Assignments retain the issued edition, with student handwriting, teacher marking and corrections kept with the correct questions.',
   'Centres can provide tablets for students to sign in, access their learning materials and record attendance; parents can also use QR check-in. Paper work can be photographed or scanned and attached to the correct student and worksheet for teacher review.',
   'Students can sign in from home on a computer, tablet or phone. Proposed AI-assisted games, practice and explanations follow current learning topics and agreed teaching rules; future assignments remain locked until release.',
   'The proposed native apps cover iOS/iPadOS and Android, with desktop use through a browser. The pilot verifies writing and saved-work continuity on agreed devices, operating-system versions and styluses. Work without a connection requires separately agreed scope and acceptance measures.'
  ])}<h3>Centre & parent operations</h3>${list([
   'Staff arrange assessments, review enrolment applications and manage schedules, teacher availability, attendance records, lesson remarks, remaining lesson dates and student information.',
   'Parents receive leave confirmation and may suggest replacement dates. Staff agree the replacement and drag the student strip from the leave bin back onto the calendar to book it, retaining the cancelled original lesson.',
   'Single, temporary and ongoing schedule changes are checked for clashes and changes to lesson entitlement before confirmation.',
   'Parent records and communications remain associated with the appropriate student and lesson.'
  ])}<h3>Billing</h3>${list([
   'Create assessment invoices at paid assessment booking and first-enrolment invoices after staff review the application. First-payment approval activates enrolment once.',
   'Recurring tuition follows four teaching-week cycles, skipping fully closed weeks. Issue the next invoice after week three, due before the child’s first lesson in the next cycle.',
   'Parents see the amount, deadline and copyable FPS details, then upload proof. Staff review every payment before issuing its receipt; queues open on 待中心核對.',
   'Review the invoice and proof in one popup with independent scrolling and zoom. Preserve the filtered list, block closing or navigation during saving and retain failed or uncertain reviews for recovery.',
   'Record reminders, reasons for proof resubmission, receipts and cancellation history. Renewal approval does not repeat enrolment activation.',
   'Invoices can be found by student or invoice details and filtered by charge type or billing month.',
   'Bank-statement reconciliation offers matching suggestions, prevents double allocation, highlights exceptions and supports a separate final audit.',
   'Cash, cheques, refunds and combined or partial payments require agreed rules. An optional direct bank connection is subject to confirmation.'
  ])}<h3>HQ & franchises</h3>${list([
   'Each centre and role receives the permitted curriculum and records. HQ controls publication, access approval and revocation.',
   'Access and printing records support review; shared reporting highlights unresolved operational work.',
   'Migration acceptance, training, continuity, support and ownership arrangements are agreed before expansion.'
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
   'Photographs and scans must be linked to the correct student and assignment. Home practice follows approved content rules and cannot release future worksheets or expose restricted answers.',
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
   'Confirm the supported iOS/iPadOS and Android devices and versions, desktop browsers, styluses and printing equipment, with representative users for the pilot.',
   'Agree who uploads paper work, how it is linked to the student and worksheet, and the image quality required for review. Confirm the topics, difficulty, AI-content checks and feedback rules for home practice.',
   'Decide whether students must work without a connection, and agree how access and saved work should behave during an interruption.',
   'Prioritise question types for automatic marking, interactive diagrams and teacher review.',
   'Agree printing permissions, limits and the capture conditions used to assess copy-tracing usefulness.'
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
