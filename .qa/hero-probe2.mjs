// Second pass on the source heroes: first top-level section of each page —
// container boxes, backgrounds, shape dividers, button and counter styling.
import { chromium } from "playwright";

const BASE = "https://spiceroutemagazine.in";
const browser = await chromium.launch();
for (const [path, width] of [["/", 1440], ["/about", 1440], ["/contact", 1440], ["/", 375], ["/about", 375], ["/about", 768], ["/", 768], ["/contact", 768]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".elementor-element")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.top < 950 && r.height > 30;
    });
    const rows = [];
    for (const e of els) {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const interesting = cs.backgroundImage !== "none" || cs.backgroundColor !== "rgba(0, 0, 0, 0)" || e.querySelector(":scope > .elementor-shape") || /button|counter/.test(e.className);
      if (!interesting) continue;
      const shape = e.querySelector(":scope > .elementor-shape");
      rows.push({
        cls: e.className.replace(/elementor-(element|widget|e-con|e-con-full|e-flex|e-parent|e-child|con-inner|section-full_width|section-height-default|section-height-full)\b/g, "").replace(/\s+/g, " ").slice(0, 110),
        box: [r.x, r.y, r.width, r.height].map(Math.round).join(","),
        bgc: cs.backgroundColor, bg: cs.backgroundImage.slice(0, 150), bgpos: cs.backgroundPosition, bgsize: cs.backgroundSize,
        pad: cs.padding, minh: cs.minHeight,
        shape: shape ? { type: shape.getAttribute("data-negative") + " " + shape.className, h: getComputedStyle(shape.querySelector("svg")).height, w: getComputedStyle(shape.querySelector("svg")).width, fill: getComputedStyle(shape.querySelector("path")).fill, d: shape.querySelector("path").getAttribute("d"), vb: shape.querySelector("svg").getAttribute("viewBox"), transform: getComputedStyle(shape).transform } : null,
      });
    }
    const btn = document.querySelector(".elementor-button");
    const b = btn && getComputedStyle(btn);
    const cnt = document.querySelector(".elementor-counter-number-wrapper");
    const c = cnt && getComputedStyle(cnt);
    const nav = document.querySelector(".elementor-nav-menu a, nav a");
    return {
      rows,
      btn: btn && { box: JSON.stringify(btn.getBoundingClientRect()), bgc: b.backgroundColor, pad: b.padding, radius: b.borderRadius, font: b.fontSize + " " + b.fontWeight, color: b.color, shadow: b.boxShadow },
      counter: cnt && { font: c.fontFamily + " " + c.fontSize + "/" + c.lineHeight + " w" + c.fontWeight, color: c.color, text: cnt.innerText },
      fontFaces: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight).slice(0, 12),
    };
  });
  console.log(`\n##### ${path} @${width}`);
  console.log(JSON.stringify(info, null, 1));
  await page.close();
}
await browser.close();
