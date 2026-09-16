# MathConcept workflow demo

A front-end-only prototype for reviewing paperless teaching and centre operations with MathConcept. All students, payment references, bank entries and learning records are fictional.

## Run locally

Requires Node.js 18 or newer. No package installation, database, credentials or backend are needed.

~~~sh
npm start
~~~

Open **http://127.0.0.1:4173**. Use the role switch at the top to change between Admin, Teacher, Parent and Student. Changes are saved in this browser's local storage; **Reset** restores the demonstration data.

## Device priorities

- **Parent: mobile first.** A single-column app layout, persistent bottom tabs, 44px minimum action targets, 16px form inputs, safe-area spacing and bottom-sheet dialogs. The Demo menu contains the presentation controls. The same narrow layout is kept on desktop for client review.
- **Student: large tablet first.** Designed around iPad Pro-size portrait and landscape viewports (1024 × 1366 and 1366 × 1024). A full-width worksheet replaces the desktop sidebar; 48px writing tools and Hand in stay visible while the page scrolls. Notes and typed working open in a side panel. Use Pen to write or Move page to scroll across the sheet.
- **Admin / Teacher: desktop first.** Denser operational views retain their sidebar and tables.

These are browser prototypes of the intended app experiences, not native builds. Actual Apple Pencil behaviour, palm rejection, on-screen keyboard behaviour, offline sync and device performance require validation on real hardware before native implementation. The demo tracks one active drawing pointer to prevent a second touch from replacing or ending an existing stroke.

The demo date is **30 September 2026**. Some sample bank transactions extend into October to demonstrate month-end reconciliation.

## Client walkthroughs

### 1. Paperless lesson

1. **Teacher → My classroom:** mark attendance, open Chloe's folder, or assign a worksheet from the library.
2. **Student → My work:** open Equivalent fractions, write on the page or type an explanation, then hand it in.
3. **Teacher:** open Chloe's submitted work, add annotations and feedback, then request corrections or mark it complete.
4. **Student:** make the requested corrections. Original submissions remain available.
5. **Teacher → Lesson record:** write a summary and share it.
6. **Parent → Handbook:** see the shared summary and marked work.

### 2. One missed hour, two half-hour extensions

1. **Parent → Lessons → Find a time:** select 30-minute extensions.
2. Choose **2 October, 17:00** and **7 October, 17:00**, then request the times.
3. **Admin → Schedule:** approve the request in the calendar's side panel.
4. The replacement bookings appear in red and link to the missed 23 September lesson.
5. **Parent → Lessons:** see zero unbooked minutes and **one reschedule used**.

An ordinary move can also be done by dragging a booking, or by opening it and choosing **Move lesson**. Original bookings stay struck through. Capacity is checked across overlapping time intervals. A move after expiry requires a reason and a manager-approved extension. Undo is available after an ordinary move.

### 3. Receipt first, bank matching later

1. **Parent → Payments:** submit the sample proof for Chloe's invoice.
2. **Admin → Billing → Invoices:** issue the receipt immediately.
3. **Reconciliation:** the new receipt remains unmatched until it is linked to a bank entry.
4. Match **R-1025 / Ethan** to **BANK-101 / WONG**: receipt 1 October, bank 30 September → **Date back**, September report.
5. Match **R-1026 / Lucas** to **BANK-102 / LEE**: receipt 30 September, bank 2 October → **Date forward**, October report.
6. Match **R-1027 / Emma** to **BANK-103 / LAM**: HK$200 difference remains visible.
7. **Director review:** inspect matched totals and exceptions, record the review and export the report as CSV.

Receipt issue dates are never overwritten by bank dates. Amount matching and date adjustments are independent. Unmatched receipts have no assumed bank reporting month.

### 4. Enrolment and staff leave

- **Admin → Students → Assessment & enrolment:** review Mia's assessment and create an enrolment. The sample can include one introductory lesson plus the next block, less an eligible HK$200 assessment deduction.
- **Parent:** select Mia in the child menu to see her assessment and invoice.
- **Teacher → My roster & leave:** request a full day or AM/PM.
- **Admin → Staff & leave:** approve the request and see affected bookings. Approval does not silently move lessons.

## Deliberate prototype boundaries

- No real authentication, authorisation, WhatsApp connection, bank integration, messages, payments or external HQ submissions.
- All role views share browser-local demonstration data. The role switch is a presentation tool, not access control.
- Sample worksheets illustrate the interaction; they are not MathConcept's actual curriculum. Supplied mascot SVGs are preserved under assets/SVG and copied into dist/brand.
- The roster and annual calendar are illustrative. The calendar shows the 48-lesson target and a seven/nine balancing example; it is not a generated operational calendar.
- Recurring future lessons are seeded examples. This is not a full annual timetable engine.
- The sample introductory rate is HK$250 and needs client confirmation.
- Reconciliation currently demonstrates one receipt against one bank entry. Combined sibling payments, partial allocations and split transfers need further discovery.
- Holiday-overlap leave credits are shown in the ledger; full holiday accrual calculations and cross-jurisdiction policy checks are outside this prototype.
- Payment proofs are clearly identified demo confirmations. No bank proof files are uploaded.
- The optional Sites project manifest is preserved for later hosting. Local operation is independent of Sites.

## Project structure

~~~text
dist/index.html       App entry point
dist/styles.css       Responsive visual system
dist/app.js           Screens, interactions, browser-local persistence
dist/model.js         Demo data and workflow rules
dist/brand/           Supplied SVG artwork used by the app
scripts/serve.mjs     Dependency-free local preview server
tests/model.test.mjs  Workflow invariant tests
~~~

## Validation

~~~sh
npm run check
npm test
~~~

Tests cover linked moves, six-student capacity during extensions, atomic split booking, billing-block expiry, receipt-before-match, date-forward/date-back reporting, the assessment deduction window and leave balances.
