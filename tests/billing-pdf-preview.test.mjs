import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPaymentPdf } from '../dist/billing-pdf-preview.js';
const settle = () => new Promise(resolve => setImmediate(resolve));
const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQ=';

function fixture({ fail = false } = {}) {
  const calls = { pages: [], rendering: [], destroyed: 0, cancelled: 0 };
  const owner = { createElement: tag => ({ tag, ownerDocument: owner, children: [], attributes: {}, listeners: {}, isConnected: true, textContent: '', style: {},
    setAttribute(key, value) { this.attributes[key] = value; }, append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
    addEventListener(event, callback) { this.listeners[event] = callback; }, getContext() { return {}; }
  }) };
  const target = owner.createElement('div');
  const pdf = { numPages: 3, async getPage(number) {
    calls.pages.push(number);
    return { getViewport: ({ scale }) => ({ width: 3000 * scale, height: 4000 * scale }), cleanup() {}, render(options) {
      calls.rendering.push(options); return { promise: Promise.resolve(), cancel() { calls.cancelled++; } };
    } };
  } };
  const task = { promise: fail ? Promise.reject(new Error('Invalid PDF')) : Promise.resolve(pdf), async destroy() { calls.destroyed++; } };
  const loadPdfLibrary = async () => ({ getDocument(options) { calls.options = options; return task; } });
  return { target, calls, task, loadPdfLibrary };
}

test('PDF preview uses local bytes, bounded canvas and one page at a time', async () => {
  const app = fixture();
  const cancel = renderPaymentPdf(app.target, dataUrl, { loadPdfLibrary: app.loadPdfLibrary });
  await settle();
  assert.deepEqual(app.calls.pages, [1]);
  assert.equal(app.calls.options.url, undefined);
  assert.equal(app.calls.options.isEvalSupported, false);
  assert.ok(app.calls.options.data instanceof Uint8Array);
  assert.equal(new TextDecoder().decode(app.calls.options.data), '%PDF-1.4');
  const [controls, canvas] = app.target.children;
  assert.equal(controls.children[1].textContent, 'Page 1 of 3');
  assert.equal(controls.children[0].disabled, true);
  assert.equal(controls.children[2].disabled, false);
  assert.ok(canvas.width <= 1800 && canvas.height <= 2200);
  controls.children[2].listeners.click(); await settle();
  assert.deepEqual(app.calls.pages, [1, 2]);
  assert.equal(app.target.children[0].children[1].textContent, 'Page 2 of 3');
  cancel();
  assert.equal(app.calls.destroyed, 1);
});

test('closing during library load cannot mount a stale document or start a worker', async () => {
  const app = fixture(); let finishLoad, started = false;
  const cancel = renderPaymentPdf(app.target, dataUrl, { loadPdfLibrary: () => new Promise(resolve => { finishLoad = resolve; }) });
  cancel();
  finishLoad({ getDocument() { started = true; return app.task; } }); await settle();
  assert.equal(started, false);
  assert.equal(app.calls.pages.length, 0);
});

test('invalid PDFs have an actionable fallback and translated copy can be supplied', async () => {
  const app = fixture({ fail: true });
  renderPaymentPdf(app.target, dataUrl, { loadPdfLibrary: app.loadPdfLibrary, copy: { unavailable: '請改用圖片或沒有密碼保護的 PDF。' } });
  await settle();
  assert.equal(app.target.children[0].textContent, '請改用圖片或沒有密碼保護的 PDF。');
  assert.equal(app.calls.pages.length, 0);
});

test('detached payment panes cannot receive rendering results', async () => {
  const app = fixture(); let finishLoad;
  renderPaymentPdf(app.target, dataUrl, { loadPdfLibrary: () => new Promise(resolve => { finishLoad = resolve; }) });
  app.target.isConnected = false;
  finishLoad(await app.loadPdfLibrary()); await settle();
  assert.equal(app.calls.pages.length, 0);
});
