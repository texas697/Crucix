// UrlState — the address bar as the source of truth for UI state.
// Pages describe their state as a path (array of segments) plus a flat set of query params; this helper reads the
// current URL back into that shape and writes it with pushState (a step the back button can undo) or replaceState
// (an in-place correction). Empty / null / undefined params are dropped so URLs only carry non-default state.
(function () {
  function parse() {
    const u = new URL(location.href);
    return {
      path: u.pathname.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } }),
      q: Object.fromEntries(u.searchParams.entries()),
    };
  }
  function build(path, q) {
    const segs = (Array.isArray(path) ? path : String(path || '').split('/')).filter(s => s !== '' && s != null).map(encodeURIComponent);
    const sp = new URLSearchParams();
    Object.entries(q || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v)); });
    const s = sp.toString();
    return '/' + segs.join('/') + (s ? '?' + s : '');
  }
  // Returns true when the URL changed.
  function set(path, q, opts) {
    const { push = false, state = null } = opts || {};
    const url = build(path, q);
    if (url === location.pathname + location.search) {
      if (state && push) history.replaceState(state, '', url);
      return false;
    }
    if (push) history.pushState(state || {}, '', url); else history.replaceState(state || history.state || {}, '', url);
    return true;
  }
  // The path to send the login page back to after sign-in: the full current location, not just the path.
  function here() { return location.pathname + location.search; }
  window.UrlState = { parse, build, set, here };
})();
