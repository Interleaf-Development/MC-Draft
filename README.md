# MathConcept workflow demo — Tsuen Wan & Hang Hau

A front-end-only prototype for reviewing paperless teaching and centre operations with MathConcept. Tsuen Wan's director is Koko Ko; Hang Hau's director is Rico. All students, payment references, bank entries and learning records are fictional.

Both branches use the same application, styles and workflow code. `dist/branch-config.js` supplies the branch identity and teachers based on the URL. Future feature and UI changes apply to both branches; do not create a separate Hang Hau application fork.

| Branch | Admin | Parent | Student |
| --- | --- | --- | --- |
| Tsuen Wan / 荃灣 | `/` | `/parent/` | `/student/` |
| Hang Hau / 坑口 | `/hh/` | `/hh/parent/` | `/hh/student/` |

Teacher view is available through the role switch or `?role=teacher` at either admin URL. Each branch has its own saved browser demo state and Reset affects only that branch. Tsuen Wan keeps its existing storage key and saved edits. Hang Hau starts with separate fictional data, using the same illustrative 700-student workflows and policies.

## Project proposal

The interactive project proposal is at **[/proposal/](https://mc-draft-rho.vercel.app/proposal/)** on the same Vercel site. Edit `dist/proposal/` for future proposal changes; it is a standalone document with its own scripts and styles. It contains 12 chapters and reading/presentation modes, in English or [Hong Kong Traditional Chinese](https://mc-draft-rho.vercel.app/proposal/?lang=zh-HK). The language switch preserves the current chapter and presentation mode. Proposal translations live in `content.zh-HK.js` and `locale.js`; the embedded application keeps its existing staff/family languages. Teaching, student, parent, scheduling, billing and branch examples embed the actual shared application, with an Expand control for full-size use. Only one application frame is active at a time. `?proposal=1` stores its data in a separate sessionStorage namespace, shared across these chapter views in this tab, and never reads or changes the ordinary demo's localStorage. Native authoring, migration and controlled printing are described as proposed features rather than simulated application screens.

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
- **Student: large tablet first.** Designed around iPad Pro-size portrait and landscape viewports (1024 × 1366 and 1366 × 1024). Students browse a visual paper binder. Opening a worksheet removes the binder, navigation and decorative margins, leaving a full-width writing surface with a slim toolbar. Notes and typed working open only when requested; **更多工具 → 紙張大小** provides zoom. Use Pen to write or Move page to scroll across the sheet.
- **Admin / Teacher: desktop first.** Denser operational views retain their sidebar and tables.

These are browser prototypes of the intended app experiences, not native builds. Actual Apple Pencil behaviour, palm rejection, on-screen keyboard behaviour, offline sync and device performance require validation on real hardware before native implementation. The demo tracks one active drawing pointer to prevent a second touch from replacing or ending an existing stroke.

The demo date is **30 September 2026**. Historical July/August transactions demonstrate month-end reconciliation; future invoice due dates remain visible.

## Centre-scale lists and attendance

The demo includes **700 enrolled fictional students** (plus Mia's assessment), searchable student numbers, level/teacher/day/status filters, sorting, and 25/50/100-row pages. Student search supports names, IDs, parent names and the deliberately fictional `0000 xxxx` contact numbers.

- **Parent → central MathConcept icon:** opens a centred QR card over a blurred background, with a separate round close button. The icon has an accessible label without visible text. Open **示範工具 → 模擬中心掃描** to mark the linked booking present; check **Teacher → My classroom** to see the result. Multiple same-day lessons can be selected individually. Duplicate scans do not duplicate attendance, and changed/cancelled/expired lesson passes are rejected. The close button or Escape dismisses the card and returns focus to its trigger.
- **Admin → Students:** a searchable, paginated list stays beside the selected student's record. Search `MC-0701` (or `mc0701`) to find a student near the end of the directory, or combine level, teacher, weekday and status filters. Filtering and paging keep the current profile open until another student is selected.
- **Student record:** student identity, Chinese name, date of birth, school/grade, enrolment date, parent relationship/contact/language/address, remarks, FPS remark, regular lessons and reminder preference. Student information is the first workbench tab. The other tabs replace the entire workbench with recorded lessons and attendance, invoices/receipts, or e-coupons and referrals; the selected student and tab bar stay visible. Names and contact details are fictional; missing information is shown as a dash. No coupon activity is fabricated.
- **Edit details:** edit contact details and remarks in the profile. Unsaved drafts stay with their student when switching tabs or records; Save persists locally and Cancel discards that draft. Core identity, enrolment status and recurring lessons remain read-only. The learning folder opens independently of the teacher's current class, and moving a lesson from history opens its teacher's calendar.
- **Lesson records:** use the searchable student picker; no 700-option dropdown.
- **Teacher → Progress chart:** use the slim left panel to browse past and upcoming classes, choose a student in that class, select worksheet boxes, and send them together as classwork or homework. The chart starts at the student’s grade; the worksheet grade selector lets teachers browse other levels for the same student. Existing assignments open from their status-coloured boxes.
- **Billing, bank matching, conversations and director review:** bounded lists with search/filter or pagination as appropriate. Report totals and exports cover the complete report, across all pages. The schedule stays scoped by date and teacher; pending request queues and folder histories are also paginated.

The QR contains an opaque demo token, with no student name or contact details. This remains a browser-local demonstration: a production scanner, server validation and authentication are not connected. The 700-student dataset demonstrates the interface at that volume; sample teacher timetables illustrate daily operation without generating a full annual schedule for every student.

## Class progress charts and digital worksheets

Teacher opens on the first class on or after the demo date (or the most recent past class). Classes come from the selected teacher’s actual bookings, grouped by date and start time, excluding moved/cancelled/absent lessons. A slim left panel keeps the date picker and previous/next class controls above a vertical list of that class’s students. Class navigation stays horizontal within the panel, and the worksheet chart uses the full height beside it. Selecting a different student resets the chart to their grade. P3 and P6 charts are transcribed from the supplied PRIMARY 3 and PRIMARY 6 indexes, with topics 301–335 and 601–633 and the actual available Math 1–6 and EXCEL letters. Math 1–6, EXCEL, Revision, CE Rev and PS sit side by side in one continuous chart, with SSPA below. Revision cells span their related topics, and CE/PS are grouped by term. Search highlights matching worksheets without breaking these groups. All 336 P6 and 294 P3 worksheet identifiers stay distinct across collections. P3 has Revision and PS but no CE Rev or SSPA. The Desktop progress-record PDFs add P1, P2, P4 and P5, plus Forms 1–3 (S1–S3) and a shared Kindergarten collection. Secondary keeps EX, MC, REV and QUIZ together; Kindergarten includes Little First Steps N1–N15, First Steps 1–60, Problem Solving 101–120 and 126 supplementary worksheet references. Kindergarten is not split into invented K1/K2/K3 levels. Browsing a different worksheet grade never changes the student recipient.

- Choose a class and student, select any unassigned boxes (including across collections), then **Send to student** to make the work available now or **Prepare for later** to keep it locked. **Classwork / Homework** sets the destination type. Switching student, class or worksheet grade clears the selection to prevent sending stale choices. Teachers can send an appropriate worksheet from another grade without changing the student’s enrolment grade.
- Box colours show Prepared, Sent, In progress, To mark, Corrections and Completed. Clicking an assigned box opens that student's existing worksheet rather than creating a duplicate. A prepared worksheet has a **Release to student** action; release preserves its notes and annotations.
- **Learning folder** opens the student's work history. **View student app** opens the selected student's tablet demo, where the assigned sheets show their exact worksheet codes and Traditional Chinese sample questions. Hand in / mark complete updates the same chart. Student entry remembers the last demonstrated student in this browser; Parent keeps its original family examples.
- The supplied images are curriculum indexes, not question files. All opened P3/P6 chart sheets explicitly say **Sample questions · original worksheet not yet uploaded** (or the Traditional Chinese equivalent). Letter variants currently share topic-specific original demo questions. The newly imported levels contain catalogue entries only: they can be selected, prepared and sent to demonstrate delivery, but open with a bilingual missing-file message and cannot be written on, submitted or marked complete until actual question files are connected. The P4 source prints PS 35 twice; both boxes deliberately share one worksheet identity. Original identifiers, stars and page references are retained. Real PDFs/question content must be connected later.
- Both branches share this feature and use their own existing teacher/student fixtures and local storage. Sending is immediate within this browser's demo state; there is no cross-device delivery or backend.

### Student binder

The three physical-style dividers are **做好了** (past), **現在做** (current, shown first) and **稍後做** (future). Current work appears as paper previews, with teacher sticky notes on corrections. Submitted sheets stay here as **交給老師了**, read-only while awaiting review. Teacher-approved completed work moves to Past and stays available for read-only revisiting.

Future work sits in a sealed pocket with no worksheet preview or answering access, including through the parent homework screen. Only a teacher's release moves prepared work into Current; finishing another sheet never unlocks it automatically. Previously sent work remains accessible. Opening a page gives the writing area the full screen below its slim toolbar, with notes and zoom available on demand.

## Teacher schedules

**Off-time shading:** Tsuen Wan calendars grey the recurring off-time blocks marked in the same Regular sheets, including partial days and the 13:00–14:00 lunch break. Empty white source slots remain white. This is visual shading; existing saved lessons and drag/drop rules are retained.

**Tsuen Wan source timetable:** The demo reference week (28 September–4 October 2026) uses the Regular sheet from the eight tutor files in `mc-twn-schedule-edited`. The import contains only names and tutor/weekday/time slots: 749 tutor-scoped pupil entries and 815 weekly lesson slots. Names are kept as supplied; matching names across tutors are not assumed to be the same child. Grade, source IDs, contacts, notes, attendance and payment details are excluded. Slots use the table’s hourly blocks, with explicit minute offsets retained. Unspecified lesson durations use one hour. Older dated sheets are not imported.

The one-time migration replaces untouched synthetic lessons and preserves browser edits and linked workflow examples. The other workflows retain their existing sample data, without creating financial or contact records for imported pupils. Hang Hau is unchanged. Imported schedules are shown in the demo reference week, rather than expanded into an annual timetable.

**Leave bin:** Admin and Teacher schedules have a drop area above Pending make-ups. Drag an unattended lesson there to record leave without choosing a replacement time; the original booking is crossed out and the linked make-up remains in the follow-up queue. Teachers see their own cases; Admin can contact the parent and arrange the make-up later. Pending entries show only the student name, grade and original lesson date. Admin can click a strip to arrange its make-up. An immediate Undo restores the lesson. Staff can also record a past missed lesson, retaining its original entitlement and deadline. Receipts and payment amounts are unchanged.

- Tabs for **Koko, Ming, Oscar, Peter, Polly, Shileen, Tiffany and Winky**, with day and week views for **Monday–Sunday, 09:00–19:00**. The centre opens seven days a week; each teacher’s roster still controls their availability.
- Hang Hau uses **Rico, John, Leo, Amy, Melissa and Jason**. Its names, staffing, class bookings and parent-facing teacher labels all follow the branch configuration.
- Available classes from **16:00 to 19:00** contain five or six students in the sample week, with a few seats retained for the rescheduling walkthrough. Every seeded student stays with their assigned teacher. Older untouched cross-teacher examples are replaced on reload; saved moves, notes, attendance and linked bookings are preserved.
- **Admin:** click a student card to update **Student info** below **Pending make-ups**, including parent contact, remaining paid lesson dates, collapsed lesson details and remark editing. The compact date pills follow issued-receipt lesson plans and confirmed moves; unarranged make-up minutes are separate. **View profile** sits at the bottom right. Drag a card to move its lesson. Switching cards keeps unsaved lesson remarks in this session.
- **Admin:** right-click a student card (or press **Shift+F10** when focused) to set its cell colour. **Green = New student**; choose **Default** to clear it. Colours are saved per lesson in this browser and follow a dragged/moved booking.
- One time column at the left, compact student cards and a small green tick for attended lessons. Hover or open a card for exact lesson times and remarks. Longer lessons also appear in the following hour with a continuation arrow.
- Drag within a teacher's schedule, or choose **Move lesson**, switch teacher tabs and select the destination. Half-hour starts keep their minute offset. Original bookings remain struck through, replacements show their source date, and Undo restores the move.
- While dragging in **Week** view, hold at the timetable's left or right edge for a moment to see the previous or next week. Keep holding to continue across weeks, then drop into a time slot. Leaving the edge cancels the countdown; changing weeks alone never moves the lesson.
- Capacity labels are hidden; the six-student overlap check still applies. Adding a lesson supports half-hour start times and 30/60/90-minute durations that end by 19:00.
- The staff make-up chooser filters by date and teacher, with available half-hour starts across the same opening hours. Parents only provide optional preferred dates for CS follow-up; they cannot select or reserve a slot. Staff can arrange full lessons, 30-minute exceptions and split extensions, which remain linked to the student's existing lessons.
- Teachers can view their **My schedule** calendar and leave balance together. Managers retain the teacher tabs and editing controls.
- The eight teacher names are provided by the user; rosters and bookings are illustrative. AM/PM uses a 14:00 boundary for the demo and requires confirmation with the centre.

## Client walkthroughs

### 1. Paperless lesson

1. **Teacher → My classroom:** mark attendance and open Chloe's folder. Use **Progress chart** to send work now or prepare it for later.
2. **Student → 現在做:** open Equivalent fractions, write on the page or type an explanation in the notes panel, then choose **交給老師**.
3. **Teacher:** open Chloe's submitted work, add annotations and feedback, then request corrections or mark it complete.
4. **Student:** make the requested corrections. Original submissions remain available.
5. **Teacher → Lesson record:** write a summary and share it.
6. **Parent → Handbook:** see the shared summary and marked work.

### 2. Confirmed parent leave and staff-arranged make-ups

1. **Parent → 課堂 → 申請請假:** select the existing lesson and optionally give a reason. **確認請假** confirms leave immediately, crosses out the original booking in the admin timetable, and adds it to **Pending make-ups**. No approval is needed for leave and no replacement lesson is created.
2. A **請假已確認** dialog offers up to three optional preferred dates and a note. **暫時略過** keeps confirmed leave and the pending follow-up. The dialog and **請假及補堂** section clearly state that CS will contact the parent to agree the date and time; suggestions are not bookings. Parents can return to **提供意願日期** / **更改意願日期** later. There is no parent time, teacher or availability picker.
3. **Admin → Schedule → Pending make-ups:** see the original lesson, leave reason and suggested dates. **Contact parent** opens the relevant local demo chat without sending anything. **Arrange make-up** lets staff select and confirm an actual slot after speaking with the parent. Only this step adds a replacement lesson; capacity and deadline checks still apply.
4. Once staff book the make-up, the parent's lesson list shows the confirmed replacement and the completed case leaves the pending queue. A fully used case cannot accept new preferences. Existing pending requests migrate to confirmed leave and nonbinding date preferences; previously booked replacement lessons are preserved.

Staff can still arrange the exceptional split make-up after discussing it with the parent:

1. **Admin → Schedule → Pending make-ups → Arrange make-up:** select **30-minute extensions** for Chloe.
2. Choose **2 October, 17:00** and **7 October, 17:00**, then **Confirm booking**.
3. The replacement bookings appear in red and link to the missed 23 September lesson. Parents only see the centre-arranged lessons.

An ordinary move can also be done by dragging a booking, or by opening it and choosing **Move lesson**. Original bookings stay struck through. Capacity is checked across overlapping time intervals. A move after expiry requires a reason and a manager-approved extension. Undo is available after an ordinary move.

### 3. Invoice payments and final audit

1. **Billing & reconciliation** opens on **Waiting for centre review**, ordered by oldest proof upload. Each row is an invoice, so a student may appear in multiple queues. **Waiting for parent payment** shows deadlines, overdue invoices and replacement-proof requests. **Receipt issued** shows newest receipts first. Cancelled or void invoices are kept in **Archive**.
2. Search by student name, student number or invoice, with charge-type and optional billing-month filters. All months is the default. Local queries return only the requested 25-row page; this demo has no network pagination API.
3. **Auto-sent** defaults on: new proofs passing the simulated checks issue a receipt immediately. Turning it off sends new submissions to centre review. Changing this setting does not retroactively process existing invoices. Original proof acknowledgements remain historical documents.
4. **Review payment** opens invoice and proof side by side (stacked on smaller screens). Confirming creates one receipt, while returning a proof requires a reason. The parent sees a replacement-proof request, not a request to pay again. Failed saves roll back the change and keep the review open; successful saves preserve the list filters and page.
5. **Remind parent to pay** / **Remind to replace proof** records a simulated reminder with a 24-hour cooldown. No message or receipt is actually sent externally in this demo.
6. **Final audit** imports a local CSV or fictional sample and compares bank entries against issued receipts. Unique matches, ambiguous entries, amount differences, missing deposits and cash/cheque follow-up remain visible. Statement history, unmatched credits, bank ledger and billing report are available here. Re-importing a statement does not duplicate bank entries; audit matches do not issue another parent document.
7. Proof extraction and matching are demo simulations. State and uploaded files stay in this browser; there is no bank connection, real OCR, delivery service or production ledger.

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

## Regular schedule changes

- **Admin → Schedule → select a student → Change regular schedule**, or use the same action under **Students → Student information**.
- Choose **Change from** and the new weekly day, time and teacher. The paid period is selected automatically from the start date; no receipt selector is shown. Tick **Final date** to reveal an inclusive end date for a temporary change; leave it unticked for a permanent change. **Review lesson count** compares the actual dated plan before saving: e.g. **8 → 9** or **8 → 7**.
- More lessons: explicitly allow the extra lesson at the same fee, or retain the original count and exclude the final surplus date(s). Recorded attendance and leave are never selected for exclusion.
- Fewer lessons: explicitly grant the missing lesson(s) as a make-up entitlement for CS to arrange, or accept the lower count. Schedule-adjustment make-ups do not use the parent's three voluntary reschedules.
- Temporary changes preserve paid lessons outside the selected range and return to the previous day, time and teacher afterwards, including after reload. The review shows the resumption date. Applying updates the regular rule and dated timetable. Existing attendance, leave and one-off make-ups remain linked. Capacity, teacher availability and any configured closures are checked again when saving.
- The receipt receives a new document version such as **R-1028-A1**, with exact lesson dates and any make-up entitlement. It retains the original receipt date and payment amount and shows the actual amendment date. Original and previous versions remain available under **Receipt versions**. The bank link and single payment ledger entry are preserved.
- Walkthrough: **Oliver Ho → Change from 1 October → Thursday 14:00**, keeping Koko (Tsuen Wan) or Rico (Hang Hau), gives **8 Wednesdays → 9 Thursdays**. To demonstrate a shortfall from an unchanged fixture, choose **7 October → Tuesday 16:00 with Ming / John** for **8 → 7**.
- This demo reviews one paid period per change; a final date must stay within that period. Another overlapping paid period (or future paid period for a permanent change) or an unclassified separate booking is flagged for joint review instead of being silently overwritten. A receipt/calendar mismatch needs an explicit dated plan; no annual holiday calendar is assumed.

## Deliberate prototype boundaries

- No real authentication, authorisation, WhatsApp connection, bank integration, messages, payments or external HQ submissions.
- All role views share browser-local demonstration data. The role switch is a presentation tool, not access control.
- Sample worksheets illustrate the interaction; they are not MathConcept's actual curriculum. Supplied mascot SVGs are preserved under assets/SVG and copied into dist/brand.
- Old staff leave requests stay inactive during migration; saved confirmed staff leave remains active. Parent leave requests migrate to automatically confirmed leave and CS follow-up.
- Staff rosters are illustrative.
- Recurring future lessons are seeded examples. This is not a full annual timetable engine.
- The sample introductory rate is HK$250 and needs client confirmation.
- Reconciliation currently demonstrates one receipt against one bank entry. Combined sibling payments, partial allocations and split transfers need further discovery.
- Holiday-overlap leave credits are shown in the ledger; full holiday accrual calculations and cross-jurisdiction policy checks are outside this prototype.
- Payment-proof OCR/AI checks are explicitly simulated. Selected files stay in this browser; CSV bank statements are parsed locally. No actual verification, settlement or external receipt delivery occurs.
- The optional Sites project manifest is preserved for later hosting. Local operation is independent of Sites.

## Maths kart prototype

- Open **`/game1/`** for the standalone Hong Kong Chinese kart game. It is not linked into the student app or proposal yet.
- The kart drives automatically through eight single-digit addition questions. Each checkpoint stops the kart for three seconds, then reveals an active three-lane answer approach.
- Use **← / →**, **A / D**, the lane buttons, or a horizontal swipe on the track. A correct box gives a speed boost; a wrong box causes a short spin and slower recovery, with the correct sum shown.
- Pause with the pause button, **P** or **Escape**. Leaving the tab pauses automatically. Sound can be muted before starting. Results show the score and any sums to practise; replay starts a fresh race.
- Original canvas artwork and synthesised audio run locally, with no external game assets, accounts or saved student results. Timing and speed values live in `dist/game1/engine.js`.

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
dist/billing-automation.js   Proof screening, acknowledgement issuance and statement matching
dist/billing-proof-ui.js     Parent proof upload and review flow
dist/receipts-ui.js          Retained legacy receipt-register helpers
dist/receipts.css            Shared receipt register layout
dist/bank-check-ui.js        Payment queues, statement preview, shared bank ledger and history
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
