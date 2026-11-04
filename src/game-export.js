export function validateSplash(value) {
  if (!value || typeof value.title !== 'string' || value.title.length > 80 || !Number.isFinite(value.duration) || value.duration < 0.5 || value.duration > 10) throw Error('Pengaturan startup game tidak valid.');
  return { title: value.title, duration: value.duration };
}
const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
export function createGameHTML(scene, splash, logo, runtime) {
  validateSplash(splash);
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(splash.title || scene.name)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#000;color:#eee;font:14px system-ui}canvas{display:block;width:100vw;height:100vh}#ravs-splash{position:fixed;inset:0;background:#05080b;display:grid;place-content:center;text-align:center;z-index:2}#ravs-splash img{width:190px;max-width:55vw;margin:0 auto 12px}#ravs-splash h1{letter-spacing:7px;margin:4px;font-size:28px}#ravs-splash .made-with{color:#9fb8c8;letter-spacing:2px;margin:6px 0 18px}#ravs-splash .game-title{color:#d9e5ec;margin:0 0 14px}#ravs-splash progress{width:220px;accent-color:#00c8f5;margin:auto}#help{position:fixed;bottom:16px;left:20px;color:#ccc}#error{position:fixed;top:20px;left:20px;color:#ff8b8b;z-index:3}
</style></head><body><canvas id="game"></canvas><div id="ravs-splash"><img alt="RAVS Engine logo" src="${escapeHTML(logo)}"><h1>RAVS ENGINE</h1><p class="made-with">Made with RAVS Engine</p><p class="game-title">${escapeHTML(splash.title)}</p><progress max="1" value="0"></progress></div><div id="error" role="alert"></div><div id="help">WASD / panah · geser mouse untuk orbit · scroll untuk zoom</div><script id="ravs-data" type="application/json">${json({scene,splash})}</script><script>${runtime.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
}
