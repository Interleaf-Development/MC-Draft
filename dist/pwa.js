// Installation is optional; the normal web demo still works without a worker.
if ('serviceWorker' in navigator && window.isSecureContext) {
  const register = () => navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none'
  }).then(registration => {
    // Recheck staging updates when connectivity returns, without reloading drafts.
    window.addEventListener('online', () => registration.update().catch(() => {}));
  }).catch(() => {
    // Protected previews or a first visit without a connection may not install.
    // Leave the current page usable and try registration again on its next load.
  });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
