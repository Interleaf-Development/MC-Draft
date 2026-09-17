# MathConcept workflow demo — Tsuen Wan & Hang Hau

A front-end-only prototype for reviewing paperless teaching and centre operations with MathConcept. Tsuen Wan's director is Koko Ko; Hang Hau's director is Rico. All students, payment references, bank entries and learning records are fictional.

Both branches use the same application, styles and workflow code. `dist/branch-config.js` supplies the branch identity and teachers based on the URL. Future feature and UI changes apply to both branches; do not create a separate Hang Hau application fork.

| Branch | Admin | Parent | Student |
| --- | --- | --- | --- |
| Tsuen Wan / 荃灣 | `/` | `/parent/` | `/student/` |
| Hang Hau / 坑口 | `/hh/` | `/hh/parent/` | `/hh/student/` |

Teacher view is available through the role switch or `?role=teacher` at either admin URL. Each branch has its own saved browser demo state and Reset affects only that branch. Tsuen Wan keeps its existing storage key and saved edits. Hang Hau starts with separate fictional data, using the same illustrative 700-student workflows and policies.

## Run locally

Requires Node.js 18 or newer. No package installation, database, credentials or backend are needed.

~~~sh
npm start
~~~

Open **http://127.0.0.1:4173**. Use the role switch in the staff sidebar to change between Admin, Teacher, Parent and Student. Demo information and Reset are alongside it, leaving the staff workbench at full height. Changes are saved in this browser's local storage; **Reset** restores the demonstration data.

## Vercel staging and phone installation

The dedicated **mc-draft** project in **Oscar Lai's projects** hosts this client demo. Import `Interleaf-Development/MC-Draft` with the **Other** framework preset and repository root `./`. `vercel.json` publishes only `dist/`, skips dependency installation, and runs the syntax checks and tests before deployment. No environment variables or backend services are needed. Pushing to `main` updates the shared demo URL.

The root URL opens Tsuen Wan **Admin**; `/hh/` opens Hang Hau **Admin**. Open the matching parent link for the phone walkthrough or student link for the tablet walkthrough. Paths with or without a trailing slash work. Existing `?role=` links remain usable and update to the matching path within the same branch.

Parent and Student have separate install identities, launch URLs and names: **MathConcept 家長** and **MathConcept 學生**. Open each link separately in Safari and choose **Share → Add to Home Screen**, or use Chrome's **Install app** option on Android. Each icon starts in its own role. Admin and Teacher have no install manifest. The demo role switch also updates the current URL; it does not change the identity of an already installed app. Older installations can be removed and replaced with the new role-specific icons.

The app shell and local artwork are cached after the first successful online visit, so the demo can reopen offline. Reopen while online to receive newer files; an already open screen is not forcibly reloaded. Demonstration records remain local to each browser/device and are not synchronised with another phone or desktop. Uploaded proofs and chat attachments are not sent to Vercel.

## Device priorities

Parent and Student screens use **Hong Kong Traditional Chinese (`zh-HK`)**, including new features going forward. Admin and Teacher screens remain English. Shared components select their language by role; user-authored messages, notes and worksheet answers retain their original text. See `AGENTS.md` for the development convention.

- **Parent: mobile first.** Three home shortcuts (上課時間、課堂報告、功課) lead into a seven-day lesson list grouped by date. The bottom bar contains 主頁、課堂、訊息、繳費 and a raised MathConcept icon opening the attendance QR. Homepage lesson cards are read-only; leave requests are available under 課堂. Homework opens read-only for parents. A single-column layout, 44px minimum action targets, 16px form inputs, safe-area spacing and bottom-sheet dialogs support phones. The Demo menu contains presentation controls. The same narrow layout is kept on desktop for client review.
- **Student: large tablet first.** Designed around iPad Pro-size portrait and landscape viewports (1024 × 1366 and 1366 × 1024). A full-width worksheet replaces the desktop sidebar; 48px writing tools and Hand in stay visible while the page scrolls. Notes and typed working open in a side panel. Use Pen to write or Move page to scroll across the sheet.
- **Admin / Teacher: desktop first.** Denser operational views retain their sidebar and tables.

These are browser prototypes of the intended app experiences, not native builds. Actual Apple Pencil behaviour, palm rejection, on-screen keyboard behaviour, offline sync and device performance require validation on real hardware before native implementation. The demo tracks one active drawing pointer to prevent a second touch from replacing or ending an existing stroke.

The demo date is **30 September 2026**. Historical July/August transactions demonstrate month-end reconciliation; future invoice due dates remain visible.

## Centre-scale lists and attendance

The demo includes **700 enrolled fictional students** (plus Mia's assessment), searchable student numbers, level/teacher/day/status filters, sorting, and 25/50/100-row pages. Student search supports names, IDs, parent names and the deliberately fictional `0000 xxxx` contact numbers.

- **Parent → central MathConcept icon:** opens a centred QR card over a blurred background, with a separate round close button. The icon has an accessible label without visible text. Open **示範工具 → 模擬中心掃描** to mark the linked booking present; check **Teacher → My classroom** to see the result. Multiple same-day lessons can be selected individually. Duplicate scans do not duplicate attendance, and changed/cancelled/expired lesson passes are rejected. The close button or Escape dismisses the card and returns focus to its trigger.
- **Admin → Students:** a searchable, paginated list stays beside the selected student's record. Search `MC-0701` (or `mc0701`) to find a student near the end of the directory, or combine level, teacher, weekday and status filters. Filtering and paging keep the current profile open until another student is selected.
- **Student record:** student identity, Chinese name, date of birth, school/grade, enrolment date, parent relationship/contact/language/address, remarks, FPS remark, regular lessons and reminder preference. Student information is the first workbench tab. The other tabs replace the entire workbench with recorded lessons and attendance, invoices/receipts, or e-coupons and referrals; the selected student and tab bar stay visible. Names and contact details are fictional; missing information is shown as a dash. No coupon activity is fabricated.
- **Edit details:** edit contact details and remarks in the profile. Unsaved drafts stay with their student when switching tabs or records; Save persists locally and Cancel discards that draft. Core identity, enrolment status and recurring lessons remain read-only. The learning folder opens independently of the teacher's current class, and moving a lesson from history opens its teacher's calendar.
- **Add lesson / Lesson records:** use the searchable student picker; no 700-option dropdown.
- **Teacher → Worksheet library → Assign:** defaults to the current class. Switch to **Whole centre** to find more students. Selections persist across searches/pages; **Review** shows only selected students before assignment.
- **Billing, bank matching, conversations and director review:** bounded lists with search/filter or pagination as appropriate. Report totals and exports cover the complete report, across all pages. The schedule stays scoped by date and teacher; pending request queues and folder histories are also paginated.

The QR contains an opaque demo token, with no student name or contact details. This remains a browser-local demonstration: a production scanner, server validation and authentication are not connected. The 700-student dataset demonstrates the interface at that volume; sample teacher timetables illustrate daily operation without generating a full annual schedule for every student.

## Teacher schedules

- Tabs for **Koko, Ming, Oscar, Peter, Polly, Shileen, Tiffany and Winky**, with day and week views for **Monday–Sunday, 09:00–19:00**. The centre opens seven days a week; each teacher’s roster still controls their availability.
- Hang Hau uses **Rico, John, Leo, Amy, Melissa and Jason**. Its names, staffing, class bookings and parent-facing teacher labels all follow the branch configuration.
- Available classes from **16:00 to 19:00** contain five or six students in the sample week, with a few seats retained for the rescheduling walkthrough. Every seeded student stays with their assigned teacher. Older untouched cross-teacher examples are replaced on reload; saved moves, notes, attendance and linked bookings are preserved.
- **Admin:** click a student card to update **Student info** below **Parent requests**, including parent contact, lesson details, remark editing, **Move lesson** and **View profile**. Switching cards keeps unsaved lesson remarks in this session.
- **Admin:** right-click a student card (or press **Shift+F10** when focused) to set its cell colour. **Green = New student**; choose **Default** to clear it. Colours are saved per lesson in this browser and follow a dragged/moved booking.
- One time column at the left, compact student cards and a small green tick for attended lessons. Hover or open a card for exact lesson times and remarks. Longer lessons also appear in the following hour with a continuation arrow.
- Drag within a teacher's schedule, or choose **Move lesson**, switch teacher tabs and select the destination. Half-hour starts keep their minute offset. Original bookings remain struck through, replacements show their source date, and Undo restores the move.
- While dragging in **Week** view, hold at the timetable's left or right edge for a moment to see the previous or next week. Keep holding to continue across weeks, then drop into a time slot. Leaving the edge cancels the countdown; changing weeks alone never moves the lesson.
- Capacity labels are hidden; the six-student overlap check still applies. Adding a lesson supports half-hour start times and 30/60/90-minute durations that end by 19:00.
- The single-lesson make-up chooser filters by date and teacher, with available half-hour starts across the same opening hours. Parents can request one full 60- or 90-minute lesson. Only staff can arrange 30-minute exceptions and split extensions, which remain linked to the student's existing lessons. Any remaining balance below 60 minutes is arranged by the centre.
- Teachers can view their **My schedule** calendar and leave balance together. Managers retain the teacher tabs and editing controls.
- The eight teacher names are provided by the user; rosters and bookings are illustrative. AM/PM uses a 14:00 boundary for the demo and requires confirmation with the centre.

## Client walkthroughs

### 1. Paperless lesson

1. **Teacher → My classroom:** mark attendance, open Chloe's folder, or assign a worksheet from the library.
2. **Student → My work:** open Equivalent fractions, write on the page or type an explanation, then hand it in.
3. **Teacher:** open Chloe's submitted work, add annotations and feedback, then request corrections or mark it complete.
4. **Student:** make the requested corrections. Original submissions remain available.
5. **Teacher → Lesson record:** write a summary and share it.
6. **Parent → Handbook:** see the shared summary and marked work.

### 2. Staff-arranged exception: two half-hour extensions

After a parent submits leave under **課堂**, the make-up picker opens automatically. **稍後再安排** keeps the leave request pending without selecting a replacement; **選擇補堂時間** on that lesson reopens the picker. Choosing a full replacement adds the proposed time to the same request. Staff see the proposal under **Parent requests** and approve leave and its replacement together, with availability checked again at approval. No booking or make-up credit is created before approval.

Parents request full lessons in the app. If a parent asks in person and the centre agrees to a split exception:

1. **Admin → Schedule → Pending make-ups → Find a time:** select **30-minute extensions** for Chloe.
2. Choose **2 October, 17:00** and **7 October, 17:00**, then **Confirm booking**.
3. The replacement bookings appear in red and link to the missed 23 September lesson.
4. **Parent → Lessons:** see the centre-arranged bookings, zero unbooked minutes and **one reschedule used**.

An ordinary move can also be done by dragging a booking, or by opening it and choosing **Move lesson**. Original bookings stay struck through. Capacity is checked across overlapping time intervals. A move after expiry requires a reason and a manager-approved extension. Undo is available after an ordinary move.

### 3. Automatic receipts and bank reconciliation

1. **Parent → Payments → Submit payment proof:** choose a local image/PDF (up to 2 MB) or **Use demo proof**. The **Demo check** selector simulates valid, wrong-recipient, wrong-amount, unreadable, non-payment and duplicate-proof outcomes. It does not run real OCR or AI against uploaded files.
2. Submit a valid proof: a receipt is issued immediately and is available to the parent. No bank match is created at this step. Failed or uncertain checks remain visible for review and corrected-proof submission.
3. **Admin → Billing & reconciliation → Receipts & reconciliation → Upload statement:** use the fictional sample or a local CSV. Preview rows, then **Import & check**. Clear, unique matches link automatically; Koko reviews ambiguous deposits, amount differences and missing matches. Re-importing the same statement does not duplicate deposits or receipts.
4. The sample includes **Ethan / R-1025** (receipt 1 August, bank 31 July → date back), **Lucas / R-1026** (receipt 31 July, bank 2 August → date forward), **Emma / R-1027** (HK$200 short), an ambiguous payment and an unidentified deposit. Chloe’s default proof reference matches her sample deposit.
5. **HQ report:** choose a bank-credit month, inspect the matched ledger and export CSV. Receipt dates stay unchanged; unmatched receipts have no assumed reporting month. Open **Details** for the proof and bank dates; changing an existing match is a separate action.

**Admin → Billing & reconciliation → Receipts & reconciliation:** browse a Monday–Sunday board with seven date columns, jump to a week, or search by student, parent, receipt or payment reference. Every receipt appears under its date sent, showing the student and amount. Green cards have a saved bank match; yellow cards need review and appear first within each day. Suggested matches remain neutral until the bank check confirms them. Select an entry to inspect its bank match, receipt and payment proof together. Busy days scroll within the board without hiding later days behind pagination. This demo issues and sends receipts together, so the register uses the original receipt issue date; bank date-forward/back adjustments do not move a receipt between groups. Saved uploads open as images/PDFs, while fixture evidence is explicitly labeled as fictional.

The weekly receipt board and reconciliation share one tab. **Upload statement** checks receipts and updates their colours and order in place. The status filter applies to the displayed week; **Needs review · all dates** opens unresolved receipts from any week so older cases are not hidden. **Unmatched deposits** and **Statement history** open on demand. Opening a receipt or proof from a bank review retains the selected deposit and unsaved note when returning.

Billing fixtures represent 700 enrolled students, with current October–November invoices for active students and historical invoices for paused students. Ethan and Lucas also have separate current invoices alongside their historical date-adjustment examples. Most received proofs already have receipts and bank matches; a small number deliberately illustrate an unreadable proof, missing deposits, an amount difference and ambiguous deposits. Adult payer names, receipt/proof amounts and invoice dates are consistent. Completed payment events do not occur after the fixed demo date (30 September); future due dates remain valid. Existing saved interactions survive a guarded, versioned fixture upgrade.

CSV columns: `Date`, `Amount`, `Reference`, `Payer`, `Transaction ID`, `Direction`. Dates use `YYYY-MM-DD`. Date, Amount and either Reference or Transaction ID are required. Direction is optional (credit/debit); outgoing rows are ignored. Quoted commas/newlines are supported. PDF/image statement extraction is not connected; the screen offers a fictional sample without claiming it read an uploaded document.

Automatic bank matches require an exact amount, strong reference/full-payer identity and a date within seven days of the proof’s payment date. The seven-day window is a demo assumption to confirm with Koko. A surname or amount alone is insufficient; competing candidates stay unlinked. Original bank transaction IDs are used for deduplication when available.

### 4. Enrolment and staff leave

- **Admin → Students → Assessment & enrolment:** review Mia's assessment and create an enrolment. The sample can include one introductory lesson plus the next block, less an eligible HK$200 assessment deduction.
- **Parent:** select Mia in the child menu to see her assessment and invoice.
- **Teacher → My schedule:** view the leave balance and history below the calendar. Staff discuss leave with the owner outside the app.
- **Admin → Schedule → select a teacher → Set leave:** Koko records a full day or working AM/PM half directly. Saving immediately updates the balance and marks the teacher on leave; there is no request or approval stage. **Details** shows the calculation, regular working days and history, with **Remove** for corrections. Affected lessons link back to that teacher’s date; existing lessons stay visible for rescheduling.

### 5. Conversations

- **Admin / Teacher → Conversations:** WhatsApp-style shared inbox with chat search and conversation search. New chat searches the full student directory; the visible list is bounded.
- Open a parent chat or the staff-only Tsuen Wan team group. Send text, reply, react, add emoji or share a worksheet. Photos, PDFs and text documents under 2 MB can be attached locally.
- **Parent → Messages:** mobile chat list and full-screen conversation with Back navigation. Only the selected child’s centre conversation is shown; staff groups stay in staff views. Student tablets have no chat.
- Drafts stay with each chat while navigating. Read indicators and sent messages persist locally. Enter sends; Shift+Enter adds a line.
- Calls, voice recording, three-dot menus and filter chips are omitted. Previously archived chats remain accessible when present. Attachments remain in this browser; no external upload occurs.

## Deliberate prototype boundaries

- No real authentication, authorisation, WhatsApp connection, bank integration, messages, payments or external HQ submissions.
- All role views share browser-local demonstration data. The role switch is a presentation tool, not access control.
- Sample worksheets illustrate the interaction; they are not MathConcept's actual curriculum. Supplied mascot SVGs are preserved under assets/SVG and copied into dist/brand.
- Old prototype requests stay inactive during migration; saved confirmed leave remains active.
- Staff rosters are illustrative.
- Recurring future lessons are seeded examples. This is not a full annual timetable engine.
- The sample introductory rate is HK$250 and needs client confirmation.
- Reconciliation currently demonstrates one receipt against one bank entry. Combined sibling payments, partial allocations and split transfers need further discovery.
- Holiday-overlap leave credits are shown in the ledger; full holiday accrual calculations and cross-jurisdiction policy checks are outside this prototype.
- Payment-proof OCR/AI checks are explicitly simulated. Selected files stay in this browser; CSV bank statements are parsed locally. No actual verification, settlement or external receipt delivery occurs.
- The optional Sites project manifest is preserved for later hosting. Local operation is independent of Sites.

## Project structure

~~~text
dist/index.html       Admin / Teacher browser entry
dist/parent/          Parent entry and install manifest
dist/student/         Student entry and install manifest
dist/entry-points.js  Role URLs and install metadata
dist/pwa.js           Service worker registration
dist/sw.js            Static app cache and offline fallback
dist/icons/           App and Apple home-screen icons
dist/styles.css       Responsive visual system
dist/scale.css        Bounded lists, pickers and QR presentation
dist/schedule.css     Teacher tabs and compact 09:00–19:00 timetable
dist/student-directory.css  Persistent student list and profile layout
dist/student-profile.js     Fictional profile fields and validated local edits
dist/conversations.js        Local chat model and viewer scoping
dist/conversations-ui.js     Chat list, messages and composer interactions
dist/conversations.css       WhatsApp-style desktop and mobile chat layout
dist/billing-automation.js   Proof screening, receipt automation and statement matching
dist/billing-proof-ui.js     Parent proof upload and review flow
dist/receipts-ui.js          Weekly receipts with matching indicators and proof access
dist/receipts.css            Shared receipt register layout
dist/bank-check-ui.js        Statement preview, exception review and import history
dist/statement-csv.js        Validated local CSV statement parser
dist/billing-automation.css  Mobile proof and desktop reconciliation layouts
dist/checkin.js       Local lesson passes and attendance demo
dist/vendor/          Offline QR encoder and its MIT licence
dist/app.js           Screens, interactions, browser-local persistence
dist/model.js         Demo data and workflow rules
dist/brand/           Supplied SVG artwork used by the app
scripts/serve.mjs     Dependency-free local preview server
vercel.json           Static Vercel deployment configuration
tests/model.test.mjs  Workflow invariant tests
~~~

## Validation

~~~sh
npm run check
npm test
~~~

Tests also cover 700-student search/filter/pagination, idempotent sample-data migration, eight teacher schedules, opening/closing boundaries, AM/PM leave and attendance-pass validation. Workflow tests cover linked moves, six-student capacity during extensions, atomic split booking, billing-block expiry, receipt-before-match, date-forward/date-back reporting, the assessment deduction window and leave balances.
