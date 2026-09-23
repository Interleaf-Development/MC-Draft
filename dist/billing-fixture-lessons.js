// Only the fictional ledger constructors call this helper. It deliberately has
// no state, timetable, or model dependency: saved records are never migrated here.
const fixturePeriods = {
  'Jul–Aug 2026': '2026-07-01',
  'Aug–Sep 2026': '2026-08-01',
  'Oct–Nov 2026': '2026-10-01'
};
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const FIXTURE_LESSON_SOURCE = 'demo-fixture';

export function fixtureLessonDocument(student, invoice, receipt) {
  const first = fixturePeriods[invoice?.period];
  const weekday = weekdays.indexOf(student?.day) + 1;
  const clock = / · (\d{2}):(\d{2})$/.exec(student?.regular || '');
  if (!first || !weekday || !clock || !student?.tutor || !receipt
    || invoice.studentId !== student.id || receipt.studentId !== student.id
    || invoice.receiptId !== receipt.id || receipt.invoiceId !== invoice.id) return null;
  const start = Number(clock[1]) * 60 + Number(clock[2]);
  const duration = student.sessions?.[0]?.duration || 60;
  if (Number(clock[1]) > 23 || Number(clock[2]) > 59 || !Number.isFinite(duration) || duration <= 0) return null;
  const day = new Date(first + 'T12:00:00Z');
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 2, 0, 12));
  const lessonDates = [];
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    if ((day.getUTCDay() + 6) % 7 + 1 === weekday) lessonDates.push({ date: day.toISOString().slice(0, 10), start, duration, tutor: student.tutor });
  }
  return {
    description: invoice.description, period: invoice.period, due: invoice.due,
    receiptDate: receipt.issuedDate,
    paymentDate: receipt.paymentDate || invoice.claimedPaymentDate || invoice.proofReview?.extracted?.paymentDate,
    lessonCount: lessonDates.length, lessonDates, makeUpLessonCount: 0
  };
}

export function enrichNewFixtureBundle(bundle, student) {
  if (bundle.receipt?.originalDocument || bundle.receipt?.revisions || bundle.invoice?.lessonPlan) return bundle;
  const document = fixtureLessonDocument(student, bundle.invoice, bundle.receipt);
  if (document) {
    Object.assign(bundle.invoice, { lessonCount: document.lessonCount, lessonPlan: { source: FIXTURE_LESSON_SOURCE, lessonCount: document.lessonCount, lessonDates: structuredClone(document.lessonDates), makeUpLessonCount: 0 } });
    bundle.receipt.originalDocument = document;
  }
  return bundle;
}

// Shared constructor keeps recognition of the old paid workflow example exact.
// Its financial fields stay identical to the original fictional record.
export function firstTuitionFixture(payer) {
  const invoice = {
    id: 'INV-8003', studentId: 'chloe', amount: 1800, chargeType: 'first-tuition',
    period: 'Jul–Aug 2026', periodStart: '2026-07-01', issued: '2026-06-20', due: '2026-07-01',
    description: 'First tuition · assessment credit included', proof: true,
    proofDate: '2026-06-23', proofSubmittedAt: '2026-06-23T11:30:00+08:00', receiptId: 'R-8003',
    proofDisposition: 'confirmed', workflowFixture: true, claimedPaymentDate: '2026-06-23',
    proofPayer: payer, proofReference: 'DEMO INV-8003', paymentMethod: 'fps',
    proofReview: {
      id: 'fixture-proof-INV-8003', mode: 'demo', fixture: true, scenario: 'pass', status: 'passed',
      submittedDate: '2026-06-23', submittedAt: '2026-06-23T11:30:00+08:00',
      checks: [{ key: 'isPaymentProof', label: 'Payment proof', status: 'pass', detail: 'Fictional transfer confirmation.' }],
      extracted: { recipient: 'MathConcept', amount: 1800, payer, reference: 'DEMO INV-8003', paymentDate: '2026-06-23' }, reasons: []
    }
  };
  const receipt = {
    id: 'R-8003', invoiceId: invoice.id, studentId: invoice.studentId, amount: invoice.amount,
    proofDate: invoice.proofDate, issuedDate: invoice.proofDate, issuedAt: invoice.proofSubmittedAt,
    documentType: 'receipt', issuedBy: 'Centre review', bankId: null, note: '', workflowFixture: true
  };
  return { invoice, receipt };
}
