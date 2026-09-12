#!/usr/bin/env node
// Capture a WordPress site (local or public) as still assets for a reel.
// Zero dependencies: drives Chrome over the DevTools protocol with Node's
// built-in WebSocket (Node 22+). Produces, per URL and per viewport:
//   full.png       full-page screenshot with sticky/fixed chrome hidden
//   viewport.png   above-the-fold screenshot
// plus manifest.json describing every capture (dimensions, title, h1s, CTAs).
//
// Usage:
//   node capture_wp.mjs <out_dir> <url> [url ...]
//   node capture_wp.mjs <out_dir> <url> --viewports desktop,mobile
//   node capture_wp.mjs <out_dir> <url> --hover ".product-card" --click ".add-to-cart"
//   CHROME=/path/to/chrome node capture_wp.mjs ...
//
// ponytail: single sequential page per viewport; a parallel tab pool only if
// a theme tour ever exceeds ~30 pages.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, dpr: 2, mobile: false },
  mobile: { width: 390, height: 844, dpr: 3, mobile: true },
};
const CHROME =
  process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const outDir = args.shift();
const urls = [];
const opts = { viewports: ["desktop", "mobile"], hover: null, click: null, settle: 800 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--viewports") opts.viewports = args[++i].split(",");
  else if (a === "--hover") opts.hover = args[++i];
  else if (a === "--click") opts.click = args[++i];
  else if (a === "--settle") opts.settle = Number(args[++i]);
  else urls.push(a);
}
if (!outDir || !urls.length) {
  console.error("usage: capture_wp.mjs <out_dir> <url> [url ...] [--viewports desktop,mobile] [--hover sel] [--click sel]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

// ---- minimal CDP client --------------------------------------------------
function launchChrome() {
  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME, [
      "--headless=new", "--remote-debugging-port=0", "--no-first-run", "--no-default-browser-check",
      "--hide-scrollbars", "--disable-gpu", "--force-device-scale-factor=1", "--lang=ar",
      `--user-data-dir=${join(outDir, ".chrome-profile")}`, "about:blank",
    ]);
    let err = "";
    proc.stderr.on("data", (d) => {
      err += d.toString();
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve({ proc, wsUrl: m[1] });
    });
    proc.on("exit", (c) => reject(new Error(`chrome exited ${c}: ${err.slice(-400)}`)));
    setTimeout(() => reject(new Error("chrome did not start")), 15000);
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onmessage = (m) => { const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) { const { res, rej } = this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
      else if (msg.method) this.events.push(msg); };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  static open(url) { return new Promise((res, rej) => { const ws = new WebSocket(url); ws.onopen = () => res(new CDP(ws)); ws.onerror = rej; }); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Page-side scripts (run inside the site)
const HYDRATE = `(async () => {
  // reveal lazy content + trigger scroll animations once, then return to top
  const h = document.documentElement.scrollHeight; const step = Math.max(300, innerHeight * 0.7);
  for (let y = 0; y < h + step; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
  scrollTo(0, 0); await new Promise(r => setTimeout(r, 300));
  await (document.fonts && document.fonts.ready);
  await Promise.allSettled([...document.images].filter(i => !i.complete).map(i => i.decode().catch(() => {})));
  // freeze what would otherwise drift between frames
  const s = document.createElement('style'); s.id = '__wpreels';
  s.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important} html{scroll-behavior:auto!important}';
  document.head.appendChild(s);
  [...document.querySelectorAll('video')].forEach(v => { try { v.pause(); } catch (e) {} });
  return { title: document.title, h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
    h1: [...document.querySelectorAll('h1,h2')].slice(0, 12).map(e => e.innerText.trim()).filter(Boolean),
    ctas: [...document.querySelectorAll('a.button,button,.btn,.wp-block-button__link,.elementor-button')].slice(0, 12).map(e => e.innerText.trim()).filter(Boolean) };
})()`;
// Sticky/fixed headers repeat themselves in a full-page capture (the classic seam bug). Pin them
// to static for the full shot only, and put them back afterwards.
const UNSTICK = `(() => { const hit = []; for (const el of document.querySelectorAll('body *')) {
  const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') { hit.push([el, el.style.position, el.style.top]);
    el.style.setProperty('position', 'absolute', 'important'); if (p === 'sticky') el.style.setProperty('position', 'static', 'important'); } }
  window.__restick = () => hit.forEach(([el, pos, top]) => { el.style.position = pos; el.style.top = top; }); return hit.length; })()`;
const RESTICK = `window.__restick && window.__restick()`;
const INTERACT = (sel, kind) => `(async () => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' }); await new Promise(r => setTimeout(r, 200));
  const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, kind: ${JSON.stringify(kind)} }; })()`;

async function capturePage(cdp, sessionId, url, vpName, dir) {
  const vp = VIEWPORTS[vpName];
  const S = (m, p) => Promise.race([cdp.send(m, p, sessionId),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${m} timed out`)), 90000))]);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
  if (vp.mobile) await S("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  await S("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await S("Page.navigate", { url });
  // wait for load event
  const t0 = Date.now();
  while (!cdp.events.some((e) => e.method === "Page.loadEventFired" && e.sessionId === sessionId)) { if (Date.now() - t0 > 60000) throw new Error("load timeout " + url); await sleep(100); }
  await sleep(opts.settle);
  const info = (await S("Runtime.evaluate", { expression: HYDRATE, awaitPromise: true, returnByValue: true })).result.value;
  const shot = async (file) => {
    const { data } = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(dir, file), Buffer.from(data, "base64"));
  };
  await shot("viewport.png");
  const unstuck = (await S("Runtime.evaluate", { expression: UNSTICK, returnByValue: true })).result.value;
  // Full page = viewport-sized slices stitched by ffmpeg. One giant captureScreenshot of a
  // tall page stalls Chrome (observed: >60s, never returns); 900px slices return in ~200ms.
  const pageH = Math.min(info.h, 20000), vh = vp.height, slices = [];
  for (let y = 0; y < pageH; y += vh) {
    const top = Math.min(y, Math.max(0, pageH - vh));
    const got = (await S("Runtime.evaluate", { expression: `(scrollTo(0, ${top}), new Promise(r => setTimeout(() => r(scrollY), 90)))`, awaitPromise: true, returnByValue: true })).result.value;
    const file = `.slice-${String(slices.length).padStart(3, "0")}.png`;
    await shot(file);
    slices.push({ file, y: got });
    if (top >= pageH - vh) break;
  }
  await S("Runtime.evaluate", { expression: "scrollTo(0,0)" });
  // crop the overlap of the final (clamped) slice, then stack everything
  const overlap = slices.length > 1 ? (slices[slices.length - 2].y + vh - slices[slices.length - 1].y) * vp.dpr : 0;
  const inputs = slices.flatMap((sl) => ["-i", join(dir, sl.file)]);
  const last = slices.length - 1;
  const filter = slices.length === 1 ? "[0:v]copy[out]" :
    `[${last}:v]crop=iw:ih-${Math.round(overlap)}:0:${Math.round(overlap)}[l];` + slices.slice(0, last).map((_, i) => `[${i}:v]`).join("") + `[l]vstack=inputs=${slices.length}[out]`;
  await new Promise((res, rej) => { const ff = spawn("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[out]", join(dir, "full.png")]);
    let e = ""; ff.stderr.on("data", (d) => (e += d)); ff.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg stitch: " + e.slice(-300))))); });
  for (const sl of slices) rmSync(join(dir, sl.file), { force: true });
  await S("Runtime.evaluate", { expression: RESTICK });
  const states = [];
  for (const [sel, kind] of [[opts.hover, "hover"], [opts.click, "click"]]) {
    if (!sel) continue;
    const pt = (await S("Runtime.evaluate", { expression: INTERACT(sel, kind), awaitPromise: true, returnByValue: true })).result.value;
    if (!pt) { states.push({ kind, selector: sel, error: "selector not found" }); continue; }
    await S("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y });
    if (kind === "click") {
      await S("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
      await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    }
    await sleep(opts.settle);
    await shot(`${kind}.png`);
    states.push({ kind, selector: sel, file: `${kind}.png`, x: pt.x, y: pt.y });
  }
  return { url, viewport: vpName, width: vp.width, dpr: vp.dpr, slices: slices.length, page_height: info.h, title: info.title, headings: info.h1, ctas: info.ctas,
    unstuck_elements: unstuck, files: { viewport: "viewport.png", full: "full.png" }, states };
}

const { proc, wsUrl } = await launchChrome();
const cdp = await CDP.open(wsUrl);
const manifest = { generated: new Date().toISOString(), captures: [] };
try {
  for (const url of urls) {
    for (const vpName of opts.viewports) {
      const slug = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "home";
      const dir = join(outDir, slug, vpName); mkdirSync(dir, { recursive: true });
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      try { const c = await capturePage(cdp, sessionId, url, vpName, dir); c.dir = join(slug, vpName); manifest.captures.push(c); console.error(`ok  ${vpName.padEnd(7)} ${url}  (${c.page_height}px, ${c.unstuck_elements} sticky hidden)`); }
      catch (e) { manifest.captures.push({ url, viewport: vpName, error: String(e.message) }); console.error(`ERR ${vpName} ${url}: ${e.message}`); }
      await cdp.send("Target.closeTarget", { targetId });
    }
  }
} finally {
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  proc.kill();
}
console.log(JSON.stringify(manifest, null, 2));
