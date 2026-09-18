// Developer-only handoff. The local test runner verifies the bank response
// and performs token exchange; this page never claims an account is connected.
const query = new URLSearchParams(window.location.search);
const fragment = new URLSearchParams(window.location.hash.slice(1));
const callback = {};
for (const name of ['code', 'state', 'id_token', 'scope', 'error', 'error_description']) {
  const value = fragment.get(name) ?? query.get(name);
  if (value !== null) callback[name] = value;
}
if (window.location.search || window.location.hash) window.history.replaceState(null, '', window.location.pathname);

document.addEventListener('DOMContentLoaded', () => {
  if (!callback.code && !callback.error) return;
  const panel = document.getElementById('sandbox-response');
  const button = document.getElementById('copy-response');
  const status = document.getElementById('copy-status');
  panel.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(callback));
      status.textContent = 'Copied. Run the local sandbox verifier now.';
    } catch {
      status.textContent = 'Clipboard access was unavailable. Return to the developer running this test.';
    }
  });
  window.setTimeout(() => {
    for (const name of Object.keys(callback)) delete callback[name];
    button.disabled = true;
    status.textContent = 'The response has been cleared. Start a new consent test if needed.';
  }, 120000);
});
