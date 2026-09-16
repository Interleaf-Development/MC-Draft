import { TODAY, record, studentById, time, dateLabel, uid } from './model.js';
import qrcode from './vendor/qrcode.js';

// Front-end demo passes only. These tokens are kept in the same local demo state;
// this module does not implement authentication, a camera scanner, or a server.
const PREFIX = 'mc-checkin:v1:';
const ACTIVE_STATUSES = new Set(['scheduled', 'makeup']);
const PAYLOAD_PATTERN = /^mc-checkin:v1:[a-z0-9-]{16,80}$/i;

function demoDate(options = {}) {
  const date = options.date ?? TODAY;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid check-in date.');
  }
  return date;
}

function isEligible(booking, date) {
  return booking.date === date && ACTIVE_STATUSES.has(booking.status);
}

/** Returns a stable, opaque pass for a student's eligible lesson today.
 * Mutates state.checkInPasses when issuing the first pass for that booking.
 * Defaults to the earliest lesson; options.bookingId chooses a specific booking.
 * The optional date supports the demo's fixed calendar and expiry tests.
 */
export function makeCheckInPass(state, studentId, options = {}) {
  const date = demoDate(options);
  const eligible = state.bookings
    .filter(b => b.studentId === studentId && isEligible(b, date))
    .sort((a, b) => a.start - b.start);
  const booking = options.bookingId === undefined ? eligible[0] : eligible.find(b => b.id === options.bookingId);
  if (options.bookingId !== undefined && !booking) {
    throw new Error('Choose an active lesson for this student today.');
  }
  if (!booking) throw new Error('There is no scheduled lesson to check in to today.');

  let pass = (state.checkInPasses || []).find(p => p.bookingId === booking.id && p.date === date);
  if (!pass) {
    const token = globalThis.crypto?.randomUUID?.() || (uid('pass') + uid(''));
    pass = { token, bookingId: booking.id, date, expiresDate: date };
    (state.checkInPasses ||= []).push(pass);
  }
  return {
    booking, payload: PREFIX + pass.token, date: pass.date,
    expiresDate: pass.expiresDate, checkedIn: booking.attendance === 'present'
  };
}

/** Generates a real, offline QR Code with a four-module white quiet zone. */
export function qrSvg(payload) {
  if (typeof payload !== 'string' || !PAYLOAD_PATTERN.test(payload)) {
    throw new Error('This is not a valid demo check-in pass.');
  }
  const qr = qrcode(0, 'M');
  qr.addData(payload, 'Byte');
  qr.make();
  return qr.createSvgTag({
    cellSize: 5, margin: 20, scalable: true,
    title: { text: 'Lesson check-in QR code', id: 'checkin-qr-title' },
    alt: { text: 'An opaque demo pass for today’s lesson.', id: 'checkin-qr-description' }
  });
}

/** Validates a locally issued pass and marks the linked lesson present once. */
export function redeemCheckIn(state, payload, options = {}) {
  const date = demoDate(options);
  if (typeof payload !== 'string' || !PAYLOAD_PATTERN.test(payload)) {
    throw new Error('This is not a valid demo check-in pass.');
  }
  const token = payload.slice(PREFIX.length);
  const pass = (state.checkInPasses || []).find(p => p.token === token);
  if (!pass) throw new Error('This check-in pass was not issued in this demo.');
  if (pass.expiresDate < date) throw new Error('This check-in pass has expired.');
  if (pass.date !== date) throw new Error('This check-in pass is not valid for today.');

  const booking = state.bookings.find(b => b.id === pass.bookingId);
  if (!booking || booking.date !== pass.date) {
    throw new Error('This lesson has changed. Open a new check-in pass.');
  }
  if (!ACTIVE_STATUSES.has(booking.status)) {
    throw new Error('This lesson is no longer active and cannot be checked in.');
  }
  const alreadyPresent = booking.attendance === 'present';
  if (!alreadyPresent) {
    booking.attendance = 'present';
    pass.redeemedDate = date;
    record(state,
      'Checked in ' + studentById(booking.studentId).name + ' for ' + dateLabel(booking.date) +
      ', ' + time(booking.start) + ' via demo QR', 'Reception');
  }
  return { booking, alreadyPresent };
}
