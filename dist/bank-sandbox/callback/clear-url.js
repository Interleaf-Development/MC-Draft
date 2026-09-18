// This is a registration placeholder, not an OAuth callback implementation.
// Never display, persist or treat an incoming code/state as a verified connection.
// Remove callback parameters before the page loads any further resources.
if (window.location.search || window.location.hash) {
  window.history.replaceState(null, '', window.location.pathname);
}
