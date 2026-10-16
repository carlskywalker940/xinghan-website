import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const dir = "reports/v2";
await fs.rm(`${dir}/frames`, { recursive: true, force: true });
await fs.mkdir(`${dir}/frames`, { recursive: true });
const browser = await chromium.launch({
  headless: false,
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--window-position=0,0",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${dir}/video`, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
await page.bringToFront();
const video = page.video();
const timeline = [];
const start = Date.now();
const shot = async (name) => {
  await page.screenshot({ path: `${dir}/${name}.png`, animations: "allow" });
  timeline.push({ name, time: Date.now() - start, url: page.url() });
};
const home = () =>
  page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "首页", exact: true });
const idle = async (state = "CONTENT_IDLE") =>
  expect(page.locator(".scene-shell")).toHaveAttribute(
    "data-scene-state",
    state,
  );
const frames = async (name, duration, step) => {
  const initial = Date.now(),
    samples = [];
  let i = 0;
  do {
    const time = Date.now() - initial;
    await page.screenshot({
      path: `${dir}/frames/${name}-${String(i++).padStart(3, "0")}.png`,
      animations: "allow",
    });
    samples.push(time);
    await page.waitForTimeout(step);
  } while (Date.now() - initial < duration);
  timeline.push({
    name,
    samples,
    duration: Date.now() - initial,
    time: Date.now() - start,
  });
};
await page.goto("http://127.0.0.1:3000/");
await expect(page.locator(".foliage-upper")).toBeVisible();
await page.waitForTimeout(600);
await shot("home-final");
await frames("environment", 12000, 300);
await page.getByRole("link", { name: "点击进入" }).click();
await expect(page.locator(".scene-overlay")).toHaveAttribute(
  "data-transition-stage",
  "animating",
);
await frames("forward", 1600, 55);
await idle();
await shot("archive-final");
await home().click();
await frames("reverse", 1800, 55);
await idle("HOME_IDLE");
await page.getByRole("link", { name: "点击进入" }).click();
await idle();
await page
  .getByRole("navigation", { name: "主导航" })
  .getByRole("link", { name: "专题", exact: true })
  .click();
await frames("navigation", 650, 35);
await page.goto("http://127.0.0.1:3000/articles/02");
await expect(page.locator(".article-main")).toBeVisible();
await expect(page.locator(".active-nav-indicator")).toHaveCSS("opacity", "1");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.mouse.move(5, 5);
const fontTrigger = page.getByRole("button", { name: "字号", exact: true });
// Record the hover and selection in continuous video without screenshot-induced pointerleave.
await fontTrigger.hover();
await expect(fontTrigger).toHaveAttribute("aria-expanded", "true");
await page.waitForTimeout(800);
await page.getByRole("menuitemradio", { name: "大号" }).click();
await expect(fontTrigger).toHaveAttribute("aria-expanded", "false");
await page.mouse.move(5, 5);
await page.waitForTimeout(250);
// On this macOS capture surface, screenshots emit pointerleave. Use real keyboard
// actions for the separate still-frame sequence; no animation values are modified.
await fontTrigger.focus();
await page.keyboard.press("ArrowDown");
await expect(fontTrigger).toHaveAttribute("aria-expanded", "true");
await frames("font-open", 400, 40);
await shot("font-menu");
await page.keyboard.press("ArrowLeft");
await page.keyboard.press("Enter");
await frames("font-close", 400, 40);
await page.locator("figcaption").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await shot("caption-final");
await page.waitForTimeout(1000);
await context.close();
await video.saveAs(`${dir}/V2-interactions.webm`);
const mobile = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const mp = await mobile.newPage();
await mp.bringToFront();
await mp.goto("http://127.0.0.1:3000/articles/02");
await mp.locator("figcaption").first().scrollIntoViewIfNeeded();
await mp.screenshot({ path: `${dir}/mobile-caption.png`, animations: "allow" });
await mobile.close();
await fs.writeFile(
  `${dir}/capture-timeline.json`,
  JSON.stringify(timeline, null, 2),
);
await browser.close();
console.log(
  "Captured real browser video, live animation frames, and final views in " +
    dir,
);
