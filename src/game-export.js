export function validateSplash(value) {
  if (!value || typeof value.title !== 'string' || value.title.length > 80 || !Number.isFinite(value.duration) || value.duration < 0.5 || value.duration > 10) throw Error('Pengaturan loading screen tidak valid.');
  return { title: value.title, duration: value.duration };
}
const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
export function createGameHTML(scene, splash, logo, runtime) {
  validateSplash(splash);
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(splash.title || scene.name)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#000;color:#eee;font:14px system-ui}canvas{display:block;width:100vw;height:100vh}#loading{position:fixed;inset:0;background:#000;display:grid;place-content:center;text-align:center;z-index:2}#loading img{width:220px;max-width:60vw;margin:auto}#loading h1{letter-spacing:8px;margin:4px}#loading p{color:#aaa}#loading progress{width:220px;accent-color:#00c8f5;margin:auto}#help{position:fixed;bottom:16px;left:20px;color:#ccc}#error{position:fixed;top:20px;left:20px;color:#ff8b8b;z-index:3}
</style></head><body><canvas id="game"></canvas><div id="loading"><img alt="Logo Ravs" src="${escapeHTML(logo)}"><h1>Ravs</h1><p>${escapeHTML(splash.title)}</p><progress max="1" value="0"></progress><p>Powered by Ravs</p></div><div id="error" role="alert"></div><div id="help">WASD / panah · geser mouse untuk orbit · scroll untuk zoom</div><script id="ravs-data" type="application/json">${json({scene,splash})}</script><script>${runtime.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
}
