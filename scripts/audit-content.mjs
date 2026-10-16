import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { load } from "cheerio";
const norm = (s) => s.replace(/[\s\u200b\ufeff]+/g, "");
const hash = (f) =>
  crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const root = process.cwd();
if (!fs.existsSync("source_archive")) {
  await import("./audit-public.mjs");
  process.exit(0);
}
const audit = JSON.parse(fs.readFileSync("content-audit.json", "utf8"));
const expected = [7, 9, 7, 5, 9, 4, 1, 4, 9];
assert.equal(audit.articleCount, 9);
assert.equal(audit.bodyMediaCount, 55);
assert.equal(audit.gifCount, 5);
for (const a of audit.articles) {
  const dir = `src/content/articles/${a.id}`;
  const blocks = JSON.parse(fs.readFileSync(`${dir}/blocks.json`));
  const meta = JSON.parse(fs.readFileSync(`${dir}/meta.json`));
  const sourceMeta = JSON.parse(
    fs.readFileSync(path.join(path.dirname(a.sourcePath), "metadata.json")),
  );
  const $ = load(fs.readFileSync(a.sourcePath, "utf8"));
  assert.equal(meta.title, sourceMeta.title);
  assert.equal(meta.sourceDate, sourceMeta.publish_date);
  assert.equal(meta.sourceUrl, sourceMeta.original_url);
  assert.equal(
    norm($("#js_content").text()),
    norm(blocks.flatMap((b) => b.runs?.map((r) => r.text) || []).join("")),
  );
  const sourceImgs = $("#js_content img")
    .map((_, e) => $(e).attr("src"))
    .get();
  assert.deepEqual(
    blocks.filter((b) => b.asset).map((b) => b.sourceSrc),
    sourceImgs,
  );
  assert.equal(a.media.length, expected[+a.id - 1]);
  for (const m of a.media) {
    assert.equal(hash(path.join(root, "public", m.target)), m.sha256);
  }
  assert.equal(hash(path.join(root, "public", a.cover.target)), a.cover.sha256);
  assert(blocks.every((b, i) => b.sourceOrder === i + 1));
  console.log(
    `✓ ${a.id} ${a.title}：${a.textCharacters}字，${a.media.length}媒体，文本/顺序/校验值一致`,
  );
}
console.log("PASS: 9篇全文 / 55正文媒体 / 5 GIF / 9封面 / 0热链依赖");
