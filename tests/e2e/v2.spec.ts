import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import sharp from "sharp";
import { capturePage } from "./capture";
async function captureFrame(page: Page, path: string) {
  await capturePage(page, { path });
}
test.beforeEach(async ({ page }) => {
  await page.bringToFront();
});
const idle = async (page: Page, state = "CONTENT_IDLE") => {
  await expect(page.locator(".scene-shell")).toHaveAttribute(
    "data-scene-state",
    state,
  );
};
const home = (page: Page) =>
  page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "首页", exact: true });

test("V2 双向实际中间帧与连续五次进出，无空纸占位", async ({ page }) => {
  await page.goto("/");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 5; i++) {
    await page.getByRole("link", { name: "点击进入" }).click();
    await expect(page.locator(".scene-overlay")).toHaveAttribute(
      "data-transition-stage",
      "animating",
    );
    await page.waitForTimeout(450);
    const mid = await page
      .locator(".route-content")
      .first()
      .evaluate((el) => ({
        opacity: +getComputedStyle(el).opacity,
        scale: new DOMMatrix(getComputedStyle(el).transform).a,
        cards: el.querySelectorAll(".article-card").length,
      }));
    expect(mid.cards).toBe(9);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(mid.scale).toBeGreaterThan(0.73);
    expect(mid.scale).toBeLessThan(1);
    if (i === 0) await captureFrame(page, "reports/v2/forward-middle.png");
    await idle(page);
    await expect(page.locator(".scene-overlay-active")).toHaveCount(0);
    await home(page).click();
    await expect(page.locator(".scene-shell")).toHaveAttribute(
      "data-scene-state",
      "CLOSING",
    );
    await page.waitForTimeout(550);
    expect(
      await page
        .locator(".scene-capture")
        .evaluate((el) => +getComputedStyle(el).opacity),
    ).toBeLessThan(1);
    if (i === 0) await captureFrame(page, "reports/v2/reverse-middle.png");
    await idle(page, "HOME_IDLE");
    await expect(page.getByRole("link", { name: "点击进入" })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("V2 专题、正文、首页、浏览器前后退与刷新", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "专题", exact: true })
    .click();
  await idle(page);
  await expect(page.locator(".article-card")).toHaveCount(3);
  await home(page).click();
  await idle(page, "HOME_IDLE");
  await page.getByRole("link", { name: "点击进入" }).click();
  await idle(page);
  await page.locator(".article-card").first().click();
  await expect(page.locator(".article-main")).toBeVisible();
  await home(page).click();
  await idle(page, "HOME_IDLE");
  await page.goBack();
  await idle(page);
  await expect(page.locator(".article-main")).toBeVisible();
  await page.goForward();
  await idle(page, "HOME_IDLE");
  await page.reload();
  await expect(page.getByRole("link", { name: "点击进入" })).toBeVisible();
});
test("V2 快速连点和转场中断不会永久锁定", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "点击进入" }).dblclick({ delay: 30 });
  await idle(page);
  await home(page).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "结束转场" }).click();
  await expect(page.locator(".scene-overlay-active")).toHaveCount(0);
  await home(page).click();
  await idle(page, "HOME_IDLE");
  await page.getByRole("link", { name: "点击进入" }).click();
  await idle(page);
});
test("V2 共享导航横杠连续移动，DOM持久且缩放后对齐", async ({ page }) => {
  await page.goto("/archive");
  await page.waitForTimeout(400);
  await page
    .locator(".active-nav-indicator")
    .evaluate((el) => el.setAttribute("data-persistent", "yes"));
  const before = await page
    .locator(".active-nav-indicator")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "专题", exact: true })
    .click();
  await page.waitForTimeout(110);
  const middle = await page
    .locator(".active-nav-indicator")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
  await page.waitForTimeout(350);
  const after = await page
    .locator(".active-nav-indicator")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
  expect(middle).toBeGreaterThan(before);
  expect(middle).toBeLessThan(after);
  await expect(page.locator(".active-nav-indicator")).toHaveAttribute(
    "data-persistent",
    "yes",
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(450);
  const delta = await page
    .getByRole("navigation", { name: "主导航" })
    .evaluate((nav) => {
      const l = nav
          .querySelector(".active-nav-indicator")!
          .getBoundingClientRect(),
        a = nav.querySelector('[aria-current="page"]')!.getBoundingClientRect();
      return Math.abs(l.left - a.left) + Math.abs(l.width - a.width);
    });
  expect(delta).toBeLessThan(2);
});
test("V2 日期降序且无资源编号，原文章章节号保留", async ({ page }) => {
  await page.goto("/archive?sort=source");
  const dates = await page
    .locator(".card-meta time")
    .evaluateAll((nodes) =>
      nodes.map((n) => Date.parse(n.getAttribute("datetime")!)),
    );
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
  await expect(page.locator(".source-id")).toHaveCount(0);
  await expect(page.getByText("源文件编号", { exact: true })).toHaveCount(0);
  await page.goto("/articles/09");
  await expect(page.getByText("文章编号", { exact: true })).toHaveCount(0);
  await expect(page.locator(".article-body > p").first()).toHaveText("01");
});
test("V2 字号悬停、三档选择后收缩、跨篇持久、键盘和外部关闭", async ({
  page,
}) => {
  await page.goto("/articles/01");
  const trigger = page.getByRole("button", { name: "字号", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  for (const [label, size] of [
    ["小号", 16],
    ["中号", 18],
    ["大号", 21],
  ] as const) {
    await page.mouse.move(5, 5);
    await page.waitForTimeout(220);
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(800);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("menuitemradio", { name: label }).click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".article-body")).toHaveCSS(
      "font-size",
      `${size}px`,
    );
  }
  await page.goto("/articles/04");
  await expect(page.locator(".article-body")).toHaveCSS("font-size", "21px");
  await page.reload();
  await expect(page.locator(".article-body")).toHaveCSS("font-size", "21px");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.locator(".article-heading h1").click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
test("V2 图注紧随原图、小字浅色、无增删换序", async ({ page }) => {
  const mappings = JSON.parse(
    fs.readFileSync("docs/V2_caption_mapping.json", "utf8"),
  );
  for (const id of ["02", "04", "09"]) {
    await page.goto(`/articles/${id}`);
    for (const m of mappings.filter(
      (m: { articleId: string }) => m.articleId === id,
    )) {
      const c = page.locator(`[id="${m.captionBlock}"]`);
      await expect(c).toHaveText(m.text);
      expect(await c.evaluate((el) => el.tagName)).toBe("FIGCAPTION");
      expect(await c.evaluate((el) => el.parentElement?.id)).toBe(m.imageBlock);
      const values = await c.evaluate((el) => ({
        size: parseFloat(getComputedStyle(el).fontSize),
        body: parseFloat(
          getComputedStyle(el.closest(".article-body")!).fontSize,
        ),
        color: getComputedStyle(el).color,
      }));
      expect(values.size).toBeLessThan(values.body);
      expect(values.color).toBe("rgb(120, 114, 103)");
    }
    const order = await page
      .locator(".article-body [data-source-order]")
      .evaluateAll((nodes) =>
        nodes.map((n) => Number(n.getAttribute("data-source-order"))),
      );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  }
  await page.locator("figcaption").first().scrollIntoViewIfNeeded();
  await capturePage(page, {
    animations: "disabled",
    path: "reports/v2/caption-plants.png",
  });
});
test("V2 风向、树叶墙影同源变化、山体静止、暂停与减少动态", async ({
  page,
}) => {
  await page.goto("/");
  const sample = () =>
    page.locator(".wind-field").evaluate((el) => {
      const leaf = el.querySelector(".foliage-upper")!,
        shadow = el.querySelector(".wall-shadow-cast")!,
        cloud = el.querySelector(".cloud-a")!;
      return {
        wind: getComputedStyle(el).getPropertyValue("--wind"),
        leafWind: getComputedStyle(leaf).getPropertyValue("--wind"),
        shadowWind: getComputedStyle(shadow).getPropertyValue("--wind"),
        leaf: getComputedStyle(leaf).transform,
        shadow: getComputedStyle(shadow).transform,
        cloud: getComputedStyle(cloud).transform,
        leafStart: leaf.getAnimations()[0]?.startTime,
        shadowStart: shadow.getAnimations()[0]?.startTime,
        base: getComputedStyle(el.querySelector(".scene-image")!).transform,
      };
    });
  const wallClip = { x: 1300, y: 180, width: 115, height: 340 };
  const wallBefore = await page.screenshot({
    clip: wallClip,
    animations: "allow",
  });
  const a = await sample();
  await page.waitForTimeout(1900);
  const b = await sample();
  const wallAfter = await page.screenshot({
    clip: wallClip,
    animations: "allow",
  });
  const pixelsA = await sharp(wallBefore).removeAlpha().raw().toBuffer();
  const pixelsB = await sharp(wallAfter).removeAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < pixelsA.length; i++)
    if (Math.abs(pixelsA[i] - pixelsB[i]) > 4) changed++;
  expect(changed).toBeGreaterThan(100);
  expect(a.leaf).not.toBe(b.leaf);
  expect(a.shadow).not.toBe(b.shadow);
  expect(a.cloud).not.toBe(b.cloud);
  expect(b.leafStart).toBe(b.shadowStart);
  expect(b.wind).toBe(b.leafWind);
  expect(b.wind).toBe(b.shadowWind);
  expect(b.base).toBe("none");
  await page.getByRole("button", { name: "暂停动态" }).click();
  await page.waitForTimeout(100);
  const frozen = await sample();
  await page.waitForTimeout(700);
  expect(await sample()).toEqual(frozen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".foliage-upper")).not.toBeVisible();
  await page.getByRole("link", { name: "点击进入" }).click();
  await expect(page.locator(".scene-overlay-active")).toHaveCount(0);
  await expect(page.locator(".article-card")).toHaveCount(9);
});
test("V2 手机导航双向、触摸字号和图注不溢出", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/archive");
  await home(page).tap();
  await idle(page, "HOME_IDLE");
  await page.getByRole("link", { name: "点击进入" }).tap();
  await idle(page);
  await page.goto("/articles/02");
  const trigger = page.getByRole("button", { name: "字号", exact: true });
  await trigger.tap();
  await page.getByRole("menuitemradio", { name: "小号" }).tap();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capturePage(page, {
    animations: "disabled",
    path: "reports/v2/mobile-reader.png",
  });
  await context.close();
});
