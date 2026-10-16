import fs from "node:fs";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const url = "http://127.0.0.1:3000";
async function ready() {
  await page
    .locator("img")
    .evaluateAll((imgs) => imgs.forEach((i) => (i.loading = "eager")));
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.evaluate(() => document.fonts.ready);
}
for (const [route, name] of [
  ["/", "01-cover-1440"],
  ["/archive", "02-archive-1440"],
  ["/articles/01", "03-reader-1440"],
  ["/articles/09", "05-reader-plants-1440"],
]) {
  await page.goto(url + route);
  await ready();
  await page.screenshot({ path: `reports/${name}.png` });
  if (route === "/archive")
    await page.screenshot({ path: "reports/archive-full.png", fullPage: true });
}
await page.setViewportSize({ width: 1920, height: 1080 });
for (const [route, name] of [
  ["/", "cover-1920"],
  ["/archive", "04-archive-1920"],
  ["/articles/01", "reader-1920"],
]) {
  await page.goto(url + route);
  await ready();
  await page.screenshot({ path: `reports/${name}.png` });
}
await page.setViewportSize({ width: 375, height: 812 });
for (const [route, name] of [
  ["/", "mobile-cover-375"],
  ["/archive", "mobile-archive-375"],
  ["/articles/09", "mobile-reader-375"],
]) {
  await page.goto(url + route);
  await ready();
  await page.screenshot({ path: `reports/${name}.png` });
}
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto(url + "/archive");
await ready();
await page.screenshot({
  path: "reports/tablet-archive-768.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1200, height: 750 });
await page.goto(url);
await ready();
await page.waitForTimeout(200);
fs.mkdirSync("reports/opening-frames", { recursive: true });
const times = [];
const start = Date.now();
await page.screenshot({ path: "reports/opening-frames/00.png" });
times.push(0);
await page.getByRole("link", { name: "点击进入" }).click();
for (let i = 1; i <= 18; i++) {
  await page.screenshot({
    path: `reports/opening-frames/${String(i).padStart(2, "0")}.png`,
  });
  times.push(Date.now() - start);
  await page.waitForTimeout(65);
}
fs.writeFileSync("reports/opening-frames/times.json", JSON.stringify(times));
await page.waitForURL("**/archive");
await browser.close();
console.log(
  "Desktop, tablet, mobile screenshots and real opening frames captured.",
);
