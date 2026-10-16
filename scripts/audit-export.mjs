import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { load } from "cheerio";
const root = path.resolve("out");
const { basePath } = JSON.parse(
  fs.readFileSync(path.join(root, "deployment.json"), "utf8"),
);
const registry = JSON.parse(
  fs.readFileSync("src/content/registry.json", "utf8"),
);
const norm = (s) => s.replace(/[\s\u200b\ufeff]+/g, "");
const exists = (url) => {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!clean.startsWith("/") || clean.startsWith("//")) return;
  assert(
    !basePath || clean.startsWith(basePath + "/"),
    `Unprefixed asset: ${url}`,
  );
  const file = path.join(root, clean.slice(basePath.length));
  assert(fs.existsSync(file), `Missing exported resource: ${url}`);
};
for (const route of [
  "",
  "archive",
  ...registry.map((a) => "articles/" + a.id),
]) {
  const file = path.join(root, route, "index.html");
  assert(fs.existsSync(file), `Missing ${route}`);
  const $ = load(fs.readFileSync(file, "utf8"));
  $("script[src],link[href],img[src]").each((_, el) => {
    const value = $(el).attr(el.tagName === "link" ? "href" : "src");
    if (value) exists(value);
  });
  if (route.startsWith("articles/")) {
    const id = route.split("/")[1];
    const blocks = JSON.parse(
      fs.readFileSync(`src/content/articles/${id}/blocks.json`, "utf8"),
    );
    assert.equal(
      norm(
        $(".article-body [data-source-text]")
          .map((_, el) => $(el).text())
          .get()
          .join(""),
      ),
      norm(blocks.flatMap((b) => b.runs?.map((r) => r.text) || []).join("")),
    );
    assert.deepEqual(
      $(".article-body img")
        .map((_, el) => $(el).attr("src"))
        .get(),
      blocks.filter((b) => b.asset).map((b) => basePath + b.asset),
    );
  }
  console.log(
    "PASS static route: " + basePath + "/" + (route ? route + "/" : ""),
  );
}
for (const file of fs
  .readdirSync(path.join(root, "_next/static/css"))
  .filter((f) => f.endsWith(".css"))) {
  const css = fs.readFileSync(
    path.join(root, "_next/static/css", file),
    "utf8",
  );
  for (const match of css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) {
    const value = match[1];
    if (value.startsWith("data:") || value.startsWith("http")) continue;
    const url = new URL(
      value,
      "https://audit.test" + basePath + "/_next/static/css/" + file,
    );
    exists(url.pathname);
  }
}
assert(fs.existsSync(path.join(root, ".nojekyll")));
console.log(
  "PASS: root, archive/topic, nine article HTML pages, image order, CSS/JS/image references",
);
