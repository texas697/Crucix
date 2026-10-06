// MFBReader — article modal with always-visible thumbs, AI write-up and "Read more about it".
// Depends on globals from the host page: api() (fetch wrapper with 401 handling), esc(), ME (user profile or null),
// openSettings() (BYOK modal). Falls back gracefully if any is missing.
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const hasFn = (n) => typeof window[n] === 'function';
  const _api = (p, o) => hasFn('api') ? window.api(p, o) : fetch(p, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(o || {}) }).then(async r => { const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`); return b; });
  const _esc = (s) => hasFn('esc') ? window.esc(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const me = () => { try { return (typeof ME !== 'undefined' && ME) ? ME : (window.ME || null); } catch { return window.ME || null; } };

  // --- tiny safe markdown → html ------------------------------------------------
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }
  function mdToHtml(md) {
    const lines = _esc(md || '').replace(/\r/g, '').split('\n');
    let html = '', list = null, para = [];
    const flushP = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
    const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trimEnd();
      if (!l.trim()) { flushP(); closeList(); continue; }
      let m;
      if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { flushP(); closeList(); const lvl = Math.min(3, m[1].length + 1); html += `<h${lvl}>${inline(m[2])}</h${lvl}>`; continue; }
      if (/^(---|\*\*\*)$/.test(l.trim())) { flushP(); closeList(); html += '<hr>'; continue; }
      if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (list !== 'ul') { closeList(); list = 'ul'; html += '<ul>'; } html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { closeList(); list = 'ol'; html += '<ol>'; } html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = l.match(/^>\s?(.*)$/))) { flushP(); closeList(); html += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
      closeList(); para.push(l.trim());
    }
    flushP(); closeList();
    return html;
  }

  // --- modal ----------------------------------------------------------------------
  let overlay = null, current = null, pollTimer = null;
  function ensure() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'rd-overlay'; overlay.id = 'readerOverlay';
    overlay.innerHTML = `<div class="rd-modal" role="dialog" aria-modal="true">
      <div class="rd-head">
        <div class="rd-meta"><div class="rd-kicker" id="rdKicker"></div><div class="rd-title" id="rdTitle"></div></div>
        <div class="rd-actions">
          <span class="rd-thumbs-label">Rate</span>
          <div class="rd-thumbs"><button class="rd-thumb up" id="rdUp" title="Thumbs up — more like this">&#128077;</button><button class="rd-thumb down" id="rdDown" title="Thumbs down — less like this">&#128078;</button></div>
          <a class="rd-btn" id="rdOpen" target="_blank" rel="noopener" href="#">Original &#8599;</a>
          <button class="rd-btn rd-close" id="rdClose" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="rd-body" id="rdBody"></div>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    $('#rdClose', overlay).onclick = close;
    $('#rdUp', overlay).onclick = () => vote(1);
    $('#rdDown', overlay).onclick = () => vote(-1);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('show')) close(); });
    return overlay;
  }
  function close() { if (!overlay) return; overlay.classList.remove('show'); document.body.style.overflow = ''; clearTimeout(pollTimer); current = null; }

  function setThumbs(rating) {
    $('#rdUp', overlay).classList.toggle('on', rating > 0);
    $('#rdDown', overlay).classList.toggle('on', rating < 0);
  }
  async function vote(rating) {
    if (!current?.id) return;
    try {
      const r = await _api(`/api/digest/${current.id}/feedback`, { method: 'POST', body: JSON.stringify({ rating }) });
      current.vote = r.rating; setThumbs(r.rating);
      document.dispatchEvent(new CustomEvent('digest:vote', { detail: { id: current.id, rating: r.rating } }));
    } catch (e) { console.warn('vote failed', e.message); }
  }

  function renderHeader(a) {
    const age = a.publishedAt ? ago(a.publishedAt) : '';
    $('#rdKicker', overlay).innerHTML = `<span class="rd-src ${a.kind === 'thinktank' ? 'thinktank' : ''}">${_esc(a.source || 'web')}</span>${a.kind === 'thinktank' ? '<span>Think tank</span>' : ''}${age ? `<span>${_esc(age)}</span>` : ''}${a.author ? `<span>${_esc(a.author)}</span>` : ''}`;
    $('#rdTitle', overlay).textContent = a.title || '(untitled)';
    const open = $('#rdOpen', overlay); open.href = a.url || '#';
    setThumbs(a.vote || 0);
  }

  function keyCta(what) {
    return `<div class="rd-cta"><div class="big">&#9889; ADD YOUR AI KEY</div><p>${_esc(what)} runs on your own LLM key. Enter it once and it is used only for your requests.</p><button class="rd-btn primary" onclick="window.openSettings && window.openSettings()">Enter API key</button></div>`;
  }

  function renderBody(a) {
    const topics = (a.topics || []).map(t => `<span class="rd-topic" data-topic="${_esc(t)}">${_esc(t)}</span>`).join('');
    const hasKey = !!me()?.llm;
    const authed = !!me();
    let writeup;
    if (a.summarizedBy) {
      writeup = `${mdToHtml(a.summaryMd)}<div class="rd-note" style="margin-top:8px">Write-up by ${_esc(a.summaryModel || 'AI')} · ${a.summarizedBy === 'operator' ? 'site model' : 'your key'}</div>`;
    } else {
      writeup = `${mdToHtml(a.summaryMd || a.description || '')}
        <div style="margin-top:12px">${authed && hasKey
          ? `<button class="rd-btn primary" id="rdSummarize">&#9889; Write this up with my AI</button><span class="rd-note" style="margin-left:10px">TL;DR, key points, why it matters</span>`
          : authed ? keyCta('The AI write-up') : ''}</div>
        ${!a.extracted ? `<div class="rd-note" style="margin-top:10px">Only a short excerpt could be read from this publisher (paywall or bot wall). Use <b>Original</b> for the full piece.</div>` : ''}`;
    }
    const r = a.research;
    let research;
    if (r?.state === 'done' && r.markdown) {
      research = `${mdToHtml(r.markdown)}<div class="rd-note" style="margin-top:8px">Deep dive by ${_esc(r.model || 'your model')} · ${r.completedAt ? ago(r.completedAt) : ''} · <a href="#" id="rdRedo" style="color:var(--accent2)">regenerate</a></div>`;
    } else if (r?.state === 'running') {
      research = progressHtml(r);
    } else {
      research = `<p class="rd-note" style="margin-bottom:10px">Pulls the latest related coverage from across the web (GDELT${window.__HAS_TAVILY__ ? ' + Tavily' : ''}), reads it, and has your model write a cited 1,500-word companion: background, actors, competing interpretations, implications and what to watch.</p>
        ${r?.state === 'error' ? `<div class="rd-note err" style="margin-bottom:10px">Last attempt failed: ${_esc(r.error || 'unknown error')}</div>` : ''}
        ${authed && hasKey ? `<button class="rd-btn primary" id="rdResearch">&#128269; Read more about it</button>` : authed ? keyCta('"Read more about it"') : ''}`;
    }
    $('#rdBody', overlay).innerHTML = `
      <div class="rd-topics">${topics}</div>
      <div id="rdWriteup">${writeup}</div>
      <div class="rd-section"><div class="rd-section-head"><h2>Read more about it</h2></div><div id="rdResearchBox">${research}</div></div>`;
    const sb = $('#rdSummarize', overlay); if (sb) sb.onclick = summarize;
    const rb = $('#rdResearch', overlay); if (rb) rb.onclick = research_;
    const redo = $('#rdRedo', overlay); if (redo) redo.onclick = (e) => { e.preventDefault(); research_(); };
    overlay.querySelectorAll('.rd-topic').forEach(el => el.onclick = () => document.dispatchEvent(new CustomEvent('digest:topic', { detail: el.dataset.topic })));
    if (r?.state === 'running') schedulePoll();
  }
  function progressHtml(r) {
    const label = { searching: 'Searching related coverage…', reading: 'Reading sources…', synthesizing: 'Your model is writing the deep dive…' }[r.stage] || 'Working…';
    return `<div class="rd-note">${label}</div><div class="rd-progress"><span style="width:${r.progress || 5}%"></span></div><div class="rd-note">Usually 30–90 seconds. You can close this and come back; the result is saved to your account.</div>`;
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(async () => {
      if (!current) return;
      try {
        const r = await _api(`/api/digest/${current.id}/research`);
        current.research = r;
        if (r.state === 'running') { const box = $('#rdResearchBox', overlay); if (box) box.innerHTML = progressHtml(r); schedulePoll(); }
        else renderBody(current);
      } catch { schedulePoll(); }
    }, 2500);
  }
  async function summarize() {
    const b = $('#rdSummarize', overlay); if (b) { b.disabled = true; b.textContent = 'WRITING…'; }
    try { const a = await _api(`/api/digest/${current.id}/summarize`, { method: 'POST' }); Object.assign(current, a); renderBody(current); }
    catch (e) { const w = $('#rdWriteup', overlay); w.insertAdjacentHTML('beforeend', `<div class="rd-note err" style="margin-top:8px">${_esc(e.message)}</div>`); if (b) { b.disabled = false; b.innerHTML = '&#9889; Write this up with my AI'; } }
  }
  async function research_() {
    const box = $('#rdResearchBox', overlay);
    box.innerHTML = progressHtml({ stage: 'searching', progress: 3 });
    try { await _api(`/api/digest/${current.id}/research`, { method: 'POST' }); current.research = { state: 'running', stage: 'searching', progress: 3 }; schedulePoll(); }
    catch (e) { current.research = { state: 'error', error: e.message }; renderBody(current); }
  }
  function ago(d) { const ms = Date.now() - new Date(d).getTime(); const h = Math.floor(ms / 3600000); if (h < 1) return 'just now'; if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; }

  async function open(ref) {
    ensure();
    overlay.classList.add('show'); document.body.style.overflow = 'hidden';
    current = { id: ref.id || null, title: ref.title, source: ref.source, url: ref.url, vote: 0 };
    renderHeader(current);
    $('#rdBody', overlay).innerHTML = `<div class="rd-loading">${ref.id ? 'LOADING…' : 'FETCHING ARTICLE…'}</div>`;
    try {
      const a = ref.id ? await _api(`/api/digest/article/${ref.id}`) : await _api('/api/digest/open', { method: 'POST', body: JSON.stringify({ url: ref.url, title: ref.title, source: ref.source }) });
      if (!current) return;
      current = a; renderHeader(a); renderBody(a);
    } catch (e) {
      $('#rdBody', overlay).innerHTML = `<div class="rd-note err" style="padding:20px">${_esc(e.message)}</div><div style="padding:0 20px"><a class="rd-btn" target="_blank" rel="noopener" href="${_esc(ref.url || '#')}">Open original &#8599;</a></div>`;
    }
  }
  window.MFBReader = { open, close, mdToHtml };
})();
