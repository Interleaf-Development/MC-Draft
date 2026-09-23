// Payment proofs stay in this browser. Only the local renderer and worker are loaded.
let libraryPromise;
const loadLibrary = () => libraryPromise ??= import('./vendor/pdfjs/pdf.min.js').then(library => {
  library.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.js', import.meta.url).href;
  return library;
});

/** Render one PDF page at a time to bound memory; return a cancellation callback. */
export function renderPaymentPdf(target, dataUrl, { loadPdfLibrary = loadLibrary, label = '付款證明', copy = {} } = {}) {
  const text = { loading: '正在開啟 PDF…', previous: '上一頁', next: '下一頁', page: (current, total) => `第 ${current} 頁，共 ${total} 頁`, unavailable: '未能預覽此 PDF。請家長提供圖片或沒有密碼保護的 PDF。', ...copy };
  let disposed = false, documentTask, pdf, renderTask, pageNumber = 1, version = 0;
  const owner = target.ownerDocument;
  const status = owner.createElement('p');
  status.className = 'billingflow-pdf-status'; status.setAttribute('role', 'status'); status.textContent = text.loading;
  target.replaceChildren(status);
  const current = () => !disposed && target.isConnected;
  const cancel = () => {
    disposed = true; version++;
    renderTask?.cancel();
    documentTask?.destroy()?.catch?.(() => {});
  };
  const fail = () => {
    if (!current()) return;
    status.textContent = text.unavailable;
    target.replaceChildren(status);
  };
  async function showPage(number) {
    const request = ++version;
    renderTask?.cancel();
    try {
      const page = await pdf.getPage(number);
      if (!current() || request !== version) return;
      const base = page.getViewport({ scale: 1 });
      // Bound each page bitmap to approximately four megapixels.
      const scale = Math.min(2, 1800 / base.width, 2200 / base.height);
      const viewport = page.getViewport({ scale });
      const canvas = owner.createElement('canvas');
      canvas.className = 'billingflow-pdf-canvas'; canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${label} · ${text.page(number, pdf.numPages)}`);
      const controls = owner.createElement('div'); controls.className = 'billingflow-pdf-pages';
      const previous = owner.createElement('button'), next = owner.createElement('button'), count = owner.createElement('span');
      previous.type = next.type = 'button'; previous.textContent = '‹'; next.textContent = '›';
      previous.setAttribute('aria-label', text.previous); next.setAttribute('aria-label', text.next);
      previous.disabled = number === 1; next.disabled = number === pdf.numPages;
      count.textContent = text.page(number, pdf.numPages);
      previous.addEventListener('click', () => { if (pageNumber > 1) void showPage(pageNumber - 1); });
      next.addEventListener('click', () => { if (pageNumber < pdf.numPages) void showPage(pageNumber + 1); });
      controls.append(previous, count, next);
      pageNumber = number;
      target.replaceChildren(controls, canvas);
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      await renderTask.promise;
      if (!current() || request !== version) return;
      page.cleanup();
    } catch (error) {
      if (error?.name !== 'RenderingCancelledException' && request === version) fail();
    }
  }
  void (async () => {
    try {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:application/pdf;base64,')) throw new Error('Invalid PDF');
      const data = Uint8Array.from(atob(dataUrl.slice('data:application/pdf;base64,'.length)), character => character.charCodeAt(0));
      const library = await loadPdfLibrary();
      if (!current()) return;
      documentTask = library.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
      documentTask.onPassword = () => { fail(); void documentTask.destroy().catch(() => {}); };
      pdf = await documentTask.promise;
      if (!current()) { void documentTask.destroy().catch(() => {}); return; }
      await showPage(1);
    } catch { fail(); }
  })();
  return cancel;
}
