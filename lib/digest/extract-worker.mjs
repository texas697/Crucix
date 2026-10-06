// Runs extractArticle() off the main thread so a pathological page can never block the event loop.
import { parentPort } from 'worker_threads';
import { extractArticle } from './extract.mjs';
parentPort.on('message', ({ html, url }) => {
  try { parentPort.postMessage({ ok: true, result: extractArticle(html, url) }); }
  catch (err) { parentPort.postMessage({ ok: false, error: err.message }); }
});
