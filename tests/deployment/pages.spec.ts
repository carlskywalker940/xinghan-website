import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import registry from "../../src/content/registry.json";
const origin = (
  process.env.PAGES_TEST_URL || "http://127.0.0.1:4173/xinghan-website/"
).replace(/\/?$/, "/");
const url = (route = "") => origin + route.replace(/^\//, "");
const prefix = new URL(origin).pathname.replace(/\/$/, "");
const folder = process.env.PAGES_SCREENSHOT_DIR || "reports/deployment/static";
const failures = new WeakMap<Page, string[]>();
const norm = (s: string) => s.replace(/[\s\u200b\ufeff]+/g, "");
const home = (page: Page) =>
  page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "首页", exact: true });
const idle = async (page: Page, state = "CONTENT_IDLE") =>
  expect(page.locator(".scene-shell")).toHaveAttribute(
    "data-scene-state",
    state,
  );
async function loadedImages(page: Page, selector = "img") {
  await expect(page.locator(".active-nav-indicator")).toHaveCSS("opacity", "1");
  await page
    .locator(selector)
    .evaluateAll((imgs) =>
      imgs.forEach((img) => ((img as HTMLImageElement).loading = "eager")),
    );
  await expect
    .poll(
      () =>
        page
          .locator(selector)
          .evaluateAll((imgs) =>
            imgs.every(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      { timeout: 30000 },
    )
    .toBe(true);
}
test.beforeEach(async ({ page }) => {
  fs.mkdirSync(folder, { recursive: true });
  await page.bringToFront();
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (new URL(r.url()).origin === new URL(origin).origin && r.status() >= 400)
      errors.push(`${r.status()} ${r.url()}`);
  });
});
test.afterEach(async ({ page }) => expect(failures.get(page)).toEqual([]));
test("首页真实图片、风影变化、资源子路径", async ({ page }) => {
  expect((await page.goto(url()))?.status()).toBe(200);
  await loadedImages(page);
  const sample = () =>
    page
      .locator(".wind-field")
      .evaluate((el) => ({
        leaf: getComputedStyle(el.querySelector(".foliage-upper")!).transform,
        shadow: getComputedStyle(el.querySelector(".wall-shadow-cast")!)
          .transform,
        cloud: getComputedStyle(el.querySelector(".cloud-a")!).transform,
        base: getComputedStyle(el.querySelector(".scene-image")!).transform,
      }));
  const a = await sample();
  await page.waitForTimeout(1600);
  const b = await sample();
  expect(a.leaf).not.toBe(b.leaf);
  expect(a.shadow).not.toBe(b.shadow);
  expect(a.cloud).not.toBe(b.cloud);
  expect(b.base).toBe("none");
  const assets = await page
    .locator("img")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("src")!));
  expect(assets.every((s) => s.startsWith(prefix + "/"))).toBe(true);
  await page.screenshot({
    path: path.join(folder, "home.png"),
    animations: "allow",
  });
});
test("首页与目录五次双向往返、真实目录中间状态", async ({ page }) => {
  await page.goto(url());
  for (let i = 0; i < 5; i++) {
    await page.getByRole("link", { name: "点击进入" }).click();
    await expect(page.locator(".scene-overlay")).toHaveAttribute(
      "data-transition-stage",
      "animating",
    );
    await page.waitForTimeout(350);
    const middle = await page
      .locator(".route-content")
      .first()
      .evaluate((el) => ({
        cards: el.querySelectorAll(".article-card").length,
        opacity: +getComputedStyle(el).opacity,
      }));
    expect(middle.cards).toBe(9);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);
    await idle(page);
    expect(new URL(page.url()).pathname).toBe(prefix + "/archive/");
    await home(page).click();
    await idle(page, "HOME_IDLE");
  }
});
test("归档分类、专题、搜索、来源返回", async ({ page }) => {
  await page.goto(url("archive/"));
  await expect(page.locator(".article-card")).toHaveCount(9);
  const nav = page.getByRole("navigation", { name: "主导航" });
  await nav.getByRole("link", { name: "专题", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(3);
  await expect(
    nav.getByRole("link", { name: "专题", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("navigation", { name: "文章分类" })
    .getByText("制药实践", { exact: true })
    .click();
  await expect(page.locator(".article-card")).toHaveCount(2);
  await page.locator(".article-card").first().click();
  await expect(page.locator(".article-main")).toBeVisible();
  await page.getByRole("link", { name: "← 返回文章" }).click();
  await expect(page.locator(".article-card")).toHaveCount(2);
  await page.goto(url("archive/?q=" + encodeURIComponent("眼睛")));
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page.goto(url("archive/"));
  await loadedImages(page);
  await page.screenshot({
    path: path.join(folder, "archive.png"),
    animations: "allow",
  });
});
for (const a of registry)
  test(`正文直达与刷新 ${a.id} ${a.title}`, async ({ page }) => {
    const response = await page.goto(url(`articles/${a.id}/`));
    expect(response?.status()).toBe(200);
    await expect(page.locator(".article-heading h1")).toHaveText(a.title);
    await loadedImages(page, ".article-body img");
    const blocks = JSON.parse(
      fs.readFileSync(`src/content/articles/${a.id}/blocks.json`, "utf8"),
    );
    expect(
      norm(
        (
          await page
            .locator(".article-body [data-source-text]")
            .allTextContents()
        ).join(""),
      ),
    ).toBe(
      norm(
        blocks
          .flatMap(
            (b: { runs?: { text: string }[] }) =>
              b.runs?.map((r) => r.text) || [],
          )
          .join(""),
      ),
    );
    expect(
      await page
        .locator(".article-body img")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("src"))),
    ).toEqual(
      blocks
        .filter((b: { asset?: string }) => b.asset)
        .map((b: { asset: string }) => prefix + b.asset),
    );
    await page.reload();
    await expect(page.locator(".article-heading h1")).toHaveText(a.title);
    await loadedImages(page, ".article-body img");
  });
test("五张 GIF 在静态站实际播放", async ({ page }) => {
  for (const id of ["02", "04"]) {
    await page.goto(url(`articles/${id}/`));
    await loadedImages(page, ".article-body img");
    const gifs = page.locator('.article-body img[src$=".gif"]');
    await expect(gifs).toHaveCount(id === "04" ? 4 : 1);
    for (const gif of await gifs.all()) {
      await gif.scrollIntoViewIfNeeded();
      await expect
        .poll(
          async () => {
            const a = await gif.screenshot({ animations: "allow" });
            await page.waitForTimeout(180);
            return !a.equals(await gif.screenshot({ animations: "allow" }));
          },
          { timeout: 15000 },
        )
        .toBe(true);
    }
  }
});
test("字号跨篇保存、灯箱、图注与正文目录", async ({ page }) => {
  await page.goto(url("articles/04/"));
  await loadedImages(page);
  const trigger = page.getByRole("button", { name: "字号", exact: true });
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("menuitemradio", { name: "大号" }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".article-body")).toHaveCSS("font-size", "21px");
  const first = page.locator(".media-trigger").first();
  await first.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator(".lightbox img").getAttribute("src")).toMatch(
    new RegExp("^" + prefix + "/media/"),
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lightbox-top")).toContainText("2 / 5");
  await page.keyboard.press("Escape");
  await expect(first).toBeFocused();
  await page.goto(url("articles/09/"));
  await expect(page.locator(".article-body")).toHaveCSS("font-size", "21px");
  const toc = page.locator('.reader-sidebar a[href^="#"]').first();
  await toc.click();
  expect(new URL(page.url()).hash).not.toBe("");
  const caption = page.locator("figcaption").first();
  await caption.scrollIntoViewIfNeeded();
  await expect(caption).toHaveCSS("color", "rgb(120, 114, 103)");
  await page.screenshot({
    path: path.join(folder, "reader-caption.png"),
    animations: "allow",
  });
});
test("系列上下篇、浏览器前进后退、正文返回首页", async ({ page }) => {
  await page.goto(url("articles/04/"));
  await page
    .getByRole("navigation", { name: "连载阅读顺序" })
    .getByText("眼睛后面居然有根管子（中）")
    .click();
  await expect(page).toHaveURL(url("articles/03/"));
  await page
    .getByRole("navigation", { name: "连载阅读顺序" })
    .getByText("眼睛后面居然有根管子（下）")
    .click();
  await expect(page).toHaveURL(url("articles/02/"));
  await page.goBack();
  await expect(page.locator(".article-heading h1")).toContainText("（中）");
  await page.goForward();
  await expect(page.locator(".article-heading h1")).toContainText("（下）");
  await home(page).click();
  await idle(page, "HOME_IDLE");
  await page.goBack();
  await idle(page);
  await expect(page.locator(".article-heading h1")).toContainText("（下）");
});
test.describe("触屏设备", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  test("375px 手机导航与正文基础可用", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url());
    await page.getByRole("link", { name: "点击进入" }).tap();
    await idle(page);
    await page.locator(".article-card").first().tap();
    await expect(page.locator(".article-main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await home(page).tap();
    await idle(page, "HOME_IDLE");
    await page.goto(url("articles/02/"));
    await loadedImages(page, ".article-body img");
    await page.getByRole("button", { name: "字号", exact: true }).tap();
    await page.getByRole("menuitemradio", { name: "小号" }).tap();
    await expect(page.locator(".article-body")).toHaveCSS("font-size", "16px");
    await page.locator("figcaption").first().scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(folder, "mobile-reader.png"),
      animations: "allow",
    });
  });
});
