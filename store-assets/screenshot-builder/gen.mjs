import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Builds branded App Store / Play store screenshots: a real in-app capture
// dropped into a CSS device mockup over the TrendyWheels gradient with an
// Anton caption. Render the emitted HTML with headless Chrome (see render.sh).

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = (f) => resolve(HERE, "sources", f);
const OUT = (p) => resolve(HERE, "..", p); // -> store-assets/<dir>/<file>

// brand palette (packages/ui-tokens)
const PINK = "#FF0065", BLUE = "#2B0FF8", CYAN = "#00C7EA", LIME = "#A9F453", INK = "#02011F";
const GLOW = {
  [PINK]: "rgba(255,0,101,.55)",
  [BLUE]: "rgba(43,15,248,.55)",
  [CYAN]: "rgba(0,199,234,.52)",
  [LIME]: "rgba(169,244,83,.45)",
};

// per-platform output canvas + layout (px)
const SPEC = {
  ios: { dir:"ios-6.7", CW:1290, CH:2796, PAD:96, PADB:74, KICK:31, TITLE:94, RULE:96, RH:8, CAPM:28,
         GAP:46, DRAD:80, BEZ:16, SRAD:62, DAR:"1284/2637", ISLAND:true, ISLT:16, ISLW:250, ISLH:30,
         WM:36, DOT:13, DOTON:32, DOTG:13 },
  and: { dir:"android-phone", CW:1080, CH:1920, PAD:70, PADB:54, KICK:23, TITLE:70, RULE:72, RH:6, CAPM:21,
         GAP:34, DRAD:62, BEZ:13, SRAD:49, DAR:"1080/2220", ISLAND:false, ISLT:0, ISLW:0, ISLH:0,
         WM:27, DOT:10, DOTON:26, DOTG:10 },
};

// the story. order == upload order. <b> marks the accent-coloured word(s).
const FRAMES = [
  { p:"ios", src:"ios-1-home.jpg",       a:PINK, k:"Buy · Rent · Sell · Service", t:"Egypt's <b>golf-cart</b> super-app" },
  { p:"ios", src:"ios-2-catalog.jpg",    a:CYAN, k:"Marketplace",                 t:"Buy new &amp; used — <b>real prices</b>" },
  { p:"ios", src:"ios-3-categories.jpg", a:BLUE, k:"Explore",                     t:"Find your ride <b>in seconds</b>" },
  { p:"ios", src:"ios-4-sell.jpg",       a:LIME, k:"Got a cart?",                 t:"Sell, rent out, or <b>trade in</b>" },
  { p:"ios", src:"ios-5-service.jpg",    a:PINK, k:"Service",                     t:"Book service. <b>Track repairs</b> live." },
  { p:"ios", src:"ios-6-transport.jpg",  a:CYAN, k:"Transport",                   t:"<b>Door-to-door</b> cart transport" },

  { p:"and", src:"and-1-home.jpg",       a:PINK, k:"All-in-one",   t:"Egypt's <b>golf-cart</b> super-app" },
  { p:"and", src:"and-2-browse.jpg",     a:BLUE, k:"Marketplace",  t:"Browse new &amp; used — <b>top brands</b>" },
  { p:"and", src:"and-3-detail.jpg",     a:CYAN, k:"Every detail", t:"Full specs &amp; photos — <b>then book</b>" },
  { p:"and", src:"and-4-service.jpg",    a:LIME, k:"Service",      t:"Book service. <b>Track repairs</b> live." },
  { p:"and", src:"and-5-allinone.jpg",   a:PINK, k:"One app",      t:"Buy · Rent · Sell · <b>Service</b>" },
];

const mime = (f) => f.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
const dataUri = (f) => `data:${mime(f)};base64,${readFileSync(f).toString("base64")}`;

const counts = { ios: FRAMES.filter(f=>f.p==="ios").length, and: FRAMES.filter(f=>f.p==="and").length };
const idx = { ios:0, and:0 };
const manifest = [];
mkdirSync(resolve(HERE, "work"), { recursive: true });
mkdirSync(OUT("ios-6.7"), { recursive: true });
mkdirSync(OUT("android-phone"), { recursive: true });

for (const f of FRAMES) {
  const s = SPEC[f.p];
  const n = ++idx[f.p];
  const total = counts[f.p];
  const dots = Array.from({length: total}, (_, i) => `<span class="${i===n-1?"on":""}"></span>`).join("");
  const island = s.ISLAND ? `<div class="island"></div>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${s.CW}px;height:${s.CH}px;overflow:hidden}
body{font-family:'Source Sans 3',system-ui,sans-serif;background:${INK};
 background-image:
  radial-gradient(58% 42% at 82% 6%, ${GLOW[f.a]}, transparent 70%),
  radial-gradient(54% 40% at 10% 102%, rgba(43,15,248,.40), transparent 72%),
  linear-gradient(158deg,#13123f 0%, #0a0930 42%, ${INK} 100%);}
.stage{width:100%;height:100%;display:flex;flex-direction:column;padding:${s.PAD}px ${s.PAD}px ${s.PADB}px}
.cap{flex:0 0 auto;text-align:center}
.kick{font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${f.a};
 font-size:${s.KICK}px;margin-bottom:.55em;text-shadow:0 1px 14px rgba(0,0,0,.45)}
.title{font-family:'Anton',Impact,sans-serif;color:#fff;line-height:1.03;font-size:${s.TITLE}px;
 letter-spacing:.006em;text-transform:uppercase;text-shadow:0 6px 34px rgba(0,0,0,.5)}
.title b{color:${f.a};font-weight:inherit}
.rule{width:${s.RULE}px;height:${s.RH}px;border-radius:99px;background:${f.a};
 margin:${s.CAPM}px auto 0;box-shadow:0 0 26px ${f.a}}
.dwrap{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:0;margin-top:${s.GAP}px}
.device{position:relative;height:100%;aspect-ratio:${s.DAR};max-width:100%;background:#07070f;
 border-radius:${s.DRAD}px;padding:${s.BEZ}px;
 box-shadow:0 44px 96px -22px rgba(0,0,0,.68),0 0 0 1.5px rgba(255,255,255,.07),inset 0 0 0 1px rgba(255,255,255,.05)}
.screen{position:relative;width:100%;height:100%;border-radius:${s.SRAD}px;overflow:hidden;background:#000}
.screen img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.island{position:absolute;top:${s.ISLT}px;left:50%;transform:translateX(-50%);width:${s.ISLW}px;height:${s.ISLH}px;background:#000;border-radius:99px;z-index:3}
.foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;margin-top:${s.GAP}px}
.wm{font-family:'Anton',sans-serif;color:#fff;font-size:${s.WM}px;letter-spacing:.02em;text-transform:uppercase;opacity:.95}
.wm i{color:${f.a};font-style:normal}
.dots{display:flex;gap:${s.DOTG}px;align-items:center}
.dots span{width:${s.DOT}px;height:${s.DOT}px;border-radius:99px;background:rgba(255,255,255,.30)}
.dots span.on{background:${f.a};width:${s.DOTON}px}
</style></head><body><div class="stage">
<div class="cap"><div class="kick">${f.k}</div><div class="title">${f.t}</div><div class="rule"></div></div>
<div class="dwrap"><div class="device"><div class="screen"><img src="${dataUri(SRC(f.src))}"></div>${island}</div></div>
<div class="foot"><div class="wm">Trendy<i>Wheels</i></div><div class="dots">${dots}</div></div>
</div></body></html>`;

  const nn = String(n).padStart(2, "0");
  const htmlPath = resolve(HERE, "work", `${f.p}_${nn}.html`);
  writeFileSync(htmlPath, html);
  manifest.push(`${htmlPath}|${s.CW}|${s.CH}|${OUT(`${s.dir}/${nn}.png`)}`);
}
writeFileSync(resolve(HERE, "work", "manifest.txt"), manifest.join("\n") + "\n");
console.log(`generated ${FRAMES.length} frames -> work/manifest.txt`);
