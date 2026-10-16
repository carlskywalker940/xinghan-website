import { capturePage } from "./capture";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import registry from "../../src/content/registry.json";
test.beforeEach(async ({ page }) => {
  await page.bringToFront();
});
const expected = [7, 9, 7, 5, 9, 4, 1, 4, 9];
const norm = (s: string) => s.replace(/[\s\u200b\ufeff]+/g, "");
async function readyImages(page: Page, selector = "img") {
  await expect(page.locator(".active-nav-indicator")).toHaveCSS("opacity", "1");
  await page
    .locator(selector)
    .evaluateAll((imgs) =>
      imgs.forEach((i) => ((i as HTMLImageElement).loading = "eager")),
    );
  await expect
    .poll(() =>
      page
        .locator(selector)
        .evaluateAll((imgs) =>
          imgs.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
}
test("C01-C03 封面主动开合、会话与刷新", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "星汉扶犁" })).toBeVisible();
  await expect(page.getByRole("link", { name: "点击进入" })).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/$/);
  await capturePage(page, {
    path: "reports/v2/01-cover-1440.png",
  });
  await page.getByRole("link", { name: "点击进入" }).click();
  await expect(page.locator(".scene-overlay-active")).toHaveCount(1);
  await page.waitForURL(/\/archive\/?$/);
  await expect(page.locator(".scene-shell")).toHaveAttribute(
    "data-scene-state",
    "CONTENT_IDLE",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("xinghan:entered:v1")),
  ).toBe("1");
  await page.reload();
  await expect(page.locator(".article-card")).toHaveCount(9);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "点击进入" })).toBeVisible();
  await expect(page.locator(".scene-overlay-active")).toHaveCount(0);
});
test("C07-C09 分类、日期、搜索、空状态与回退", async ({ page }) => {
  await page.goto("/archive");
  await expect(page.locator(".article-card")).toHaveCount(9);
  await expect(page.locator(".article-card").first()).toContainText(
    registry[8].title,
  );
  for (const [c, n] of [
    ["目系与眼科", 3],
    ["制药实践", 2],
    ["医理随笔", 1],
    ["生活记录", 2],
    ["草木札记", 1],
    ["全部", 9],
  ] as const) {
    await page
      .getByRole("navigation", { name: "文章分类" })
      .getByText(c, { exact: true })
      .click();
    await expect(page.locator(".article-card")).toHaveCount(n);
  }
  await page.getByLabel("搜索文章标题").fill("蜜丸");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.getByLabel("搜索文章标题").fill("不存在的文章");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByText("没有找到这篇文章。")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator(".article-card")).toHaveCount(9);
  await readyImages(page);
  await capturePage(page, {
    path: "reports/v2/02-archive-1440.png",
    fullPage: true,
  });
});
for (const [i, a] of registry.entries())
  test(`C04-C05,C11-C13 ${a.id} 全文、媒体顺序、刷新与末尾`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const external: string[] = [];
    page.on("request", (r) => {
      if (
        !r.url().startsWith("http://127.0.0.1:3000") &&
        !r.url().startsWith("data:")
      )
        external.push(r.url());
    });
    await page.goto(`/articles/${a.id}`);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: a.title }),
    ).toBeVisible();
    await expect(page.locator(".article-body img")).toHaveCount(expected[i]);
    await readyImages(page, ".article-body img");
    const blocks = JSON.parse(
      fs.readFileSync(`src/content/articles/${a.id}/blocks.json`, "utf8"),
    );
    const text = await page
      .locator(".article-body [data-source-text]")
      .allTextContents();
    expect(norm(text.join(""))).toBe(
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
        .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src"))),
    ).toEqual(
      blocks
        .filter((b: { asset?: string }) => b.asset)
        .map((b: { asset: string }) => b.asset),
    );
    await page.locator(".article-end").scrollIntoViewIfNeeded();
    await expect(page.getByText("— 全文完 —")).toBeVisible();
    await expect(page.locator(".reading-progress")).toHaveAttribute(
      "aria-label",
      /100%/,
    );
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
test("C06 眼部连载顺序 04→03→02", async ({ page }) => {
  await page.goto("/articles/04");
  await page
    .getByRole("navigation", { name: "连载阅读顺序" })
    .getByText("眼睛后面居然有根管子（中）")
    .click();
  await expect(page).toHaveURL(/03\/?$/);
  await page
    .getByRole("navigation", { name: "连载阅读顺序" })
    .getByText("眼睛后面居然有根管子（下）")
    .click();
  await expect(page).toHaveURL(/02\/?$/);
  await expect(
    page
      .getByRole("navigation", { name: "连载阅读顺序" })
      .getByText("系列后篇"),
  ).toHaveCount(0);
});
test("C10,C17 灯箱、键盘、焦点返回", async ({ page }) => {
  await page.goto("/articles/04");
  const first = page.locator(".media-trigger").first();
  await first.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".lightbox-top")).toContainText("1 / 5");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lightbox-top")).toContainText("2 / 5");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(first).toBeFocused();
  await capturePage(page, {
    path: "reports/v2/03-reader-1440.png",
  });
});
test("C11 GIF原始多帧、浏览器加载与实际像素变化", async ({ page }) => {
  const audit = JSON.parse(fs.readFileSync("content-audit.json", "utf8"));
  for (const id of ["02", "04"]) {
    await page.goto(`/articles/${id}`);
    const gifs = page.locator('.article-body img[src$=".gif"]');
    await expect(gifs).toHaveCount(id === "04" ? 4 : 1);
    await readyImages(page, ".article-body img");
    for (const gif of await gifs.all()) {
      await gif.scrollIntoViewIfNeeded();
      await expect
        .poll(
          async () => {
            const a = await gif.screenshot({ animations: "allow" });
            await page.waitForTimeout(180);
            return !a.equals(await gif.screenshot({ animations: "allow" }));
          },
          { timeout: 12000 },
        )
        .toBe(true);
    }
    for (const m of audit.articles
      .find((a: { id: string }) => a.id === id)
      .media.filter((m: { target: string }) => m.target.endsWith(".gif"))) {
      expect(m.frames).toBeGreaterThan(1);
      const bytes = fs.readFileSync("public" + m.target);
      expect(bytes.subarray(0, 3).toString()).toBe("GIF");
    }
  }
});
test("返回目录保留分类与滚动位置", async ({ page }) => {
  await page.goto("/archive?category=目系与眼科");
  await page.locator(".article-card").last().click();
  await page.getByRole("link", { name: "← 返回文章" }).click();
  await expect(page).toHaveURL(/category=/);
  await expect(page.locator(".article-card")).toHaveCount(3);
});
for (const width of [375, 768, 1440, 1920])
  test(`C14 ${width}px 响应式与正文无溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const route of ["/", "/archive", "/articles/09"]) {
      await page.goto(route);
      await readyImages(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 375)
        await capturePage(page, {
          path: `reports/mobile-${route === "/" ? "cover" : route === "/archive" ? "archive" : "reader"}-375.png`,
          fullPage: route === "/archive",
        });
      if (width === 1920 && route === "/archive")
        await capturePage(page, {
          path: "reports/v2/04-archive-1920.png",
        });
    }
  });
test("C15 减少动态、键盘进入", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "点击进入" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/archive\/?$/);
  await expect(page.locator(".opening")).toHaveCount(0);
});
test("C16 离线可用的本地媒体，C18控制台与无效路由", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3000)/, (r) => r.abort());
  await page.goto("/articles/02");
  await readyImages(page);
  expect(errors).toEqual([]);
  await page.goto("/articles/99");
  await expect(
    page.getByRole("heading", { name: "这一页暂未写下" }),
  ).toBeVisible();
});

test("归档滚动恢复、浏览器历史、非法分类", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/archive");
  const last = page.locator(".article-card").last();
  await last.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await last.click();
  await page.getByRole("link", { name: "← 返回文章" }).click();
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(y - 100);
  await page.goto("/archive?category=目系与眼科");
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page
    .getByRole("navigation", { name: "文章分类" })
    .getByText("制药实践", { exact: true })
    .click();
  await expect(page.locator(".article-card")).toHaveCount(2);
  await page.goBack();
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page.goto("/archive?category=不存在");
  await expect(page.locator(".article-card")).toHaveCount(9);
});
