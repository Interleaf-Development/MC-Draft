const detail = (title, body) => `<section class="feature-detail"><h3>${title}</h3>${body}</section>`;
const list = items => `<ul class="plain-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const table = (headers, rows) => `<div class="feature-table-wrap"><table class="feature-table"><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>i===0?`<th scope="row">${x}</th>`:`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const demo = (id,label='MathConcept workflows') => `<div class="demo-wrap"><div class="demo-caption">${id==='rollout'?'':'Interactive demo: '}${label}</div><div class="demo" data-demo="${id}" id="demo-${id}"></div></div>`;

export const chapters = [
 {id:'vision',title:'Proposal overview'},

 {id:'student',title:'Student learning experience',heading:'Student learning experience',intro:'Keep the familiar past, current and future binder while moving worksheet delivery, handwriting and corrections into a proposed native student app. Portrait tablets are the primary learning format. The interactive screen below is a browser demonstration of the intended workflow.',body:
  demo('student','Student binder and worksheet working')+
  detail('From the paper binder to digital learning',table(['Stage','Current paper workflow','Proposed student experience'],[
   ['Prepare the lesson','The teacher finds the worksheet in folders, prints it and places the copy in the student’s binder.','The teacher selects the worksheet from the progress chart and sends it to the student, or prepares it for a later lesson.'],
   ['Find the right work','The binder separates past work, current work and corrections, and future worksheets.','A visual binder keeps the same three groups. Current work opens directly; future work stays locked until the teacher releases it.'],
   ['Complete the worksheet','The student writes and shows working on the printed page.','The student opens a portrait worksheet and writes with a stylus. Binder navigation moves out of the way to preserve the working area.'],
   ['Mark and correct','The teacher marks the paper and returns unfinished work or corrections for the next lesson.','Teacher marks and correction requests stay with the relevant question. The student resumes that work in the current section with earlier working retained.'],
   ['Keep completed work','Finished worksheets remain in the past section for revision.','Completed worksheets move into past work with their handwriting, marks and corrections available for review.']
  ]))+
  detail('Student workspace requirements',list([
   'Use a simple visual binder in Hong Kong Traditional Chinese. Opening a worksheet prioritises the page and handwriting space over menus or progress information.',
   'Retain handwriting with the correct question when the student returns to a worksheet or changes the view. Keep the assigned edition with the student’s work.',
   'Apply automatic marking only to validated question types. Teachers review handwritten reasoning and award method marks.'
  ]))+
  detail('Device acceptance',list([
   'Validate the native student app on agreed portrait tablets and styluses, including comfortable writing, accidental touch handling and saved-work continuity.',
   'Confirm that students can resume saved work after agreed interruptions without lost or misplaced handwriting. Any requirement to work without a connection needs separately agreed scope and acceptance measures.'
  ]))},

 {id:'teacher',title:'Teacher assignment and feedback',heading:'Teacher assignment and feedback',intro:'Teachers move from finding and printing individual files to selecting approved worksheets from each student’s progress chart. Assignment, release, marking and corrections connect directly to the student’s digital binder.',body:
  demo('teacher','Class selection, progress and assignment')+
  `<p class="demo-context">In the demo, choose worksheets and select “Send to student”, then “View student app” to open that student’s binder. “Prepare for later” keeps the work locked.</p>`+
  table(['Teaching step','Included function'],[
   ['1. Select the class and student','Move between scheduled classes and students while keeping the selected student’s progress in view. The student’s grade is the starting point; other levels remain available.'],
   ['2. Choose suitable worksheets','Browse approved collections by grade, topic and familiar worksheet code. See assigned work, work awaiting marking and outstanding corrections on the progress chart.'],
   ['3. Send or prepare work','Assign selected worksheets as classwork or homework. Prepare work for a later lesson without making it available to the student before release.'],
   ['4. Review and return corrections','Open the student’s working, record marks and request corrections. Keep feedback with the correct question and originally assigned edition.'],
   ['5. Plan the next lesson','Use completed work and outstanding corrections to select the next assignment. Teachers remain responsible for judging suitable difficulty and readiness.']
  ])},

 {id:'library',title:'Digitising existing materials',heading:'Digitising existing materials',intro:'Make the existing teaching-material library usable for digital lessons in stages. Original worksheets can support teaching while selected material is prepared for question reuse and verified editing.',body:
  demo('library','Curriculum catalogue and assignment')+
  `<p class="demo-context">The catalogue demo uses the supplied curriculum indexes, with sample questions for P3 and P6. Original-worksheet access and editable conversion remain proposed work.</p>`+
  table(['Stage','Usable result','Review and acceptance'],[
   ['1. Catalogue the collection','Organise approved materials by grade, topic, collection and familiar worksheet codes. Identify formats, condition, duplicates and existing editions.','Confirm the approved source for each worksheet. Preserve intentional revisions and correct catalogue exceptions.'],
   ['2. Use the original worksheets digitally','Preserve the original page layout and allow teachers to assign worksheets for digital handwriting. Keep the original collection within the controlled library.','Check readability, equations, diagrams and working space on the agreed tablets. The original page remains the teaching reference until converted content is verified.'],
   ['3. Prepare reusable questions','Make selected questions, diagrams and corresponding answers available for use in new worksheets, retaining their source and curriculum context.','Agree which worksheet families to prioritise. Check question boundaries, related parts and answer associations before reuse.'],
   ['4. Approve editable content','Let authorised authors edit verified wording, equations, diagrams and answers and publish new editions.','Review mathematical accuracy against the original. Material that cannot yet be converted faithfully remains usable in its original page form.']
  ])+
  detail('Migration acceptance',list([
   'Begin with representative materials and agree coverage before extending the work. Check decimal points, fractions, units, diagrams, question parts and their corresponding answers against the originals.',
   'Report catalogue coverage, worksheets ready for digital use, reusable questions, verified editable content and unresolved exceptions separately.',
   'Library migration and editable conversion have separate scopes and acceptance measures. Confirm the delivery scope and cost after reviewing the collection.'
  ]))},

 {id:'authoring',title:'Creating new digital worksheets',heading:'Creating new digital worksheets',intro:'The proposed worksheet studio lets authors create a worksheet from a blank page, reuse approved questions and prepare material for both tablet learning and authorised printing. Authors control the content and layout; AI assistance supports drafting under review.',body:
  table(['Feature','Included function','Condition or responsibility'],[
   ['Visual authoring from scratch','Arrange headings, instructions, questions, equations, images, diagrams and answer areas on a page. Adjust the layout and reserve sufficient space for working.','Provide agreed question and layout tools that curriculum authors can use without coding.'],
   ['Reusable questions and layout blocks','Build worksheets from approved questions, common instructions, page sections and layouts. Keep source, curriculum labels, answers and marking guidance with each question.','Authors select suitable content and check the assembled worksheet as a whole.'],
   ['Digital responses and diagrams','Create handwriting areas, typed answers and selected interactive question or diagram types. Keep student responses associated with the right question.','Agree supported interactions and automatic-marking rules by teaching need. Handwritten reasoning remains subject to teacher review.'],
   ['AI drafting and assistance','Draft questions from an author’s brief, suggest variations and help find suitable approved questions.','AI output remains a draft. An authorised reviewer checks mathematical meaning, difficulty, diagrams, answers and worked solutions before publication.'],
   ['Traditional PDFs and other supplied materials','Keep approved traditional-format worksheets in the controlled library for permitted viewing, assignment and authorised printing. They can be used alongside newly authored material.','Importing a PDF does not automatically make its questions editable or interactive. Centre access does not grant unrestricted access to the original-file collection.'],
   ['Tablet and print preview','Preview portrait-tablet and A4 layouts before publication.','Questions must remain readable, related parts must stay together and students must have sufficient working space in both formats.'],
   ['Approval and editions','Submit a draft for review and publish an approved edition for teachers to assign. An update creates a new edition.','MathConcept names content reviewers and publication approvers. Work already issued retains the edition received by the student.'],
   ['Restricted content','Keep answer keys and teacher notes unavailable through student materials, searches and exports.','Apply the agreed content permissions.']
  ])+
  detail('Content-processing permission',`<p>MathConcept must approve whether curriculum may be processed externally, for which purposes and under what confidentiality conditions. This proposal does not authorise external processing of the library. Worksheet authoring and AI assistance are proposed additions.</p>`) },

 {id:'protection',title:'Curriculum access and printing',heading:'Curriculum access and printing',intro:'HQ controls the master collection and decides which materials each centre and user may use. Proposed access and printing records support review of material distribution.',body:
  table(['Feature','Included function','Condition or responsibility'],[
   ['Curriculum access','Provide centres with permitted curriculum and students with assigned, released work. Routine teaching access does not grant unrestricted access to the original-file collection.','HQ approves centre and role permissions.'],
   ['Approved printing','Apply printing permissions and limits; record the material issued and distinguish successful, failed and repeated attempts.','HQ sets printing rights and limits. Staff review failed or repeated requests.'],
   ['Copy records','Link a distributed copy to its worksheet edition and issuing centre or account.','Use distribution history to support investigation. A trace does not prove who disclosed the material.'],
   ['Access withdrawal','End future access when staff leave or a franchise is offboarded.','Previously printed or photographed material cannot be recalled.']
  ])+
  detail('Pilot verification and limits',list([
   'Test approved printing on the agreed equipment, including failed requests and repeat attempts.',
   'Assess copy tracing using representative scans, photographs and photocopies. Any recovery claim depends on the measured results.',
   'Screenshots, photography and later copying remain possible. These controls reduce easy bulk copying and support investigation; they cannot prevent every leak.'
  ]))},

 {id:'system',title:'Roles, permissions and shared records',heading:'Roles, permissions and shared records',intro:'Centre administration uses the same student and lesson records as teaching. The responsibilities below define who manages each part of the service, with access limited to the centre, role and work assigned.',body:
  demo('system','User roles and connected workflows')+
  table(['User group','Included functions','Responsibility'],[
   ['HQ','Approve teaching materials and editions; grant curriculum access to centres; set shared operating policies.','Own publication decisions, curriculum entitlements and network policies.'],
   ['Centre staff','Manage enrolment, timetables, parent requests, invoices and unresolved operational work.','Confirm lesson arrangements, approve payment proofs, issue receipts and follow up outstanding items.'],
   ['Teachers','Find approved materials, assign classwork and homework, review progress, mark work and request corrections.','Choose suitable work and decide when prepared assignments are released.'],
   ['Students','Complete assigned work, submit corrections and revisit completed work in a digital binder.','Access only the work assigned and released to them.'],
   ['Parents','Submit leave requests and preferred replacement dates; manage payment proofs and relevant communications.','Provide the information needed for staff to confirm arrangements and review payments.']
  ])+
  detail('Shared records and access',list([
   'Assignments retain the approved edition issued to the student. Student working, teacher marks and corrections stay associated with that edition.',
   'Each role receives the records and materials it is permitted to use. Answer keys and teacher notes are restricted to authorised staff.',
   'The existing demo includes Admin, Teacher, Parent and Student workflows. Demonstration records do not sync across devices. HQ publishing, curriculum permissions and live business-service connections are proposed additions.'
  ]))},

 {id:'operations',title:'Scheduling and parent communication',heading:'Scheduling and parent communication',intro:'Parents submit leave requests and staff confirm replacement lessons. Staff review availability, timetable clashes and changes to lesson entitlement before confirming an arrangement.',body:
  demo('operations','Leave, timetable changes and make-up lessons')+
  table(['Feature','Included function','Condition or responsibility'],[
   ['Parent leave request','Confirm the leave request and invite optional preferred replacement dates. Tell the parent that centre staff will contact them to complete the make-up arrangement.','Submitting leave or preferred dates does not confirm a replacement time.'],
   ['Leave and make-up tracking','Mark the cancelled lesson in the timetable and retain a student strip in the leave bin. Drag the strip back onto the calendar to book the agreed replacement lesson.','Keep the original cancelled lesson visible and remove the completed arrangement from the pending bin. A preferred date alone does not book a lesson.'],
   ['Timetable changes','Drag lessons to a new slot or into the leave bin, then drag pending make-ups back to the calendar when a replacement is agreed. Check teacher availability, class capacity and clashes before confirmation.','Staff resolve conflicts before confirming the change. A non-drag alternative remains available.'],
   ['Temporary and ongoing changes','Record the start date and, for temporary changes, the end date. Resume the original regular schedule when a temporary change ends.','Staff review the affected date range.'],
   ['Lesson entitlement','Show any increase or reduction in affected lessons before confirmation and display remaining lesson dates.','Extra lessons and make-up credits require an explicit decision.'],
   ['Communication and records','Keep parent communications and lesson remarks with the relevant student and lesson. Link related receipt and schedule amendments, retaining previous records and reasons for changes.','Agree document revision and date rules.']
  ])},

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
   ['Delivery team','Provide the agreed solution, migration support, acceptance evidence, staff training, operating guidance and support during launch.']
  ]))+
  detail('Pilot acceptance schedule',table(['Area','Acceptance example'],[
   ['Teaching','A teacher finds the correct approved worksheet, assigns it and reviews the student’s saved work on an agreed device.'],
   ['Student working','A student resumes saved work after an agreed interruption without lost or misplaced handwriting.'],
   ['Leave and scheduling','A parent leave request updates the original lesson and staff follow-up queue. Staff can drag its leave-bin strip back to a valid calendar slot to confirm the agreed make-up.'],
   ['Billing','Four teaching-week cycles skip fully closed weeks and issue the next invoice after week three. Payment proof waits for staff approval; first-payment approval activates enrolment once. Failed or uncertain reviews remain recoverable without duplicate receipts. Final audit flags unexplained differences and prevents double allocation.'],
   ['Access','An unauthorised centre cannot obtain the original-file collection, another centre’s student records or restricted answer keys.'],
   ['Printing and tracing','Printing respects permissions and limits, records the outcome and handles failed or repeated attempts clearly. Assess copy-tracing usefulness separately under agreed capture conditions.'],
   ['Migration','Samples preserve the required equations and layout. Report and resolve exceptions, or retain the original page form for teaching.']
  ]))+
  demo('rollout','Proposed delivery sequence')},

 {id:'proposal',title:'Scope and commercial terms',heading:'Scope and commercial terms',intro:'This document is a scope proposal for review, not a priced quotation. No price or delivery date is committed. A commercial quotation follows confirmation of the material collection, operating rules and pilot requirements.',body:
  detail('Proposed delivery scope',table(['Work package','Scope','Basis for agreement'],[
   ['First release','Controlled library, teacher assignment, student binder, centre and parent workflows, invoice review and statement reconciliation for the agreed pilot.','Confirm pilot users, material coverage, supported equipment and acceptance measures.'],
   ['Staged development','Worksheet authoring, verified editable questions, selected AI assistance, broader reporting and additional centres.','Prioritise and quote the agreed stages.'],
   ['Feasibility assessment','Conversion accuracy, approved printing on supported equipment, handwriting continuity and copy tracing.','Use pilot evidence to confirm achievable coverage. An optional direct bank connection and additional payment methods require confirmation.']
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
   'Authors can start from a blank page or reuse approved questions and layout blocks, create text, equations, diagrams and answer areas, preview tablet and A4 use, and submit materials for review and publication.',
   'AI may help find questions, draft variations and assist conversion, subject to MathConcept’s content-processing permissions and human approval before publication.'
  ])}<h3>Teaching & learning</h3>${list([
   'Teachers select scheduled classes and students, review progress and assign appropriate materials across grade levels.',
   'The proposed native student app prioritises portrait tablets. Its visual binder groups current classwork, homework and corrections, locked future work, and completed work for review; opening a worksheet prioritises handwriting space.',
   'Assignments retain the issued edition, with student handwriting, teacher marking and corrections kept with the correct questions.',
   'The pilot verifies writing and saved-work continuity on supported devices. Work without a connection requires separately agreed scope and acceptance measures.'
  ])}<h3>Centre & parent operations</h3>${list([
   'Staff manage schedules, teacher availability, lesson remarks, remaining lessons and student information.',
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
  ])}<h3>Demonstration boundaries</h3><p>The embedded screens let reviewers explore the existing MathConcept workflows using demonstration records. Demonstration records do not sync across devices. Tsuen Wan timetable names and slots come from supplied schedules; payment and other workflow records are examples. P3 and P6 contain sample questions; the remaining catalogue requires its original worksheets. Payment checks are simulated. Native app delivery, HQ publishing, editable conversion, worksheet authoring, controlled printing and live access controls remain proposed scope.</p>`},

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
