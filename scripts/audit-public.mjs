import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const audit = JSON.parse(fs.readFileSync("content-audit.json", "utf8"));
const registry = JSON.parse(
  fs.readFileSync("src/content/registry.json", "utf8"),
);
const norm = (s) => s.replace(/[\s\u200b\ufeff]+/g, "");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
assert.equal(registry.length, 9);
assert.equal(audit.articleCount, 9);
let mediaCount = 0,
  gifs = 0;
for (const a of audit.articles) {
  const blocks = JSON.parse(
    fs.readFileSync(`src/content/articles/${a.id}/blocks.json`, "utf8"),
  );
  const meta = registry.find((m) => m.id === a.id);
  assert.equal(meta.title, a.title);
  assert.equal(meta.publishedAt, a.publishedAt);
  const text = norm(
    blocks.flatMap((b) => b.runs?.map((r) => r.text) || []).join(""),
  );
  assert.equal(hash(text), a.textSha256, `Text changed: ${a.id}`);
  assert.deepEqual(
    blocks.filter((b) => b.asset).map((b) => b.asset),
    a.media.map((m) => m.target),
  );
  for (const m of [...a.media, a.cover])
    assert.equal(
      hash(fs.readFileSync("public" + m.target)),
      m.sha256,
      `Media changed: ${m.target}`,
    );
  mediaCount += a.media.length;
  gifs += a.media.filter((m) => m.target.endsWith(".gif")).length;
  console.log(`PASS ${a.id}: ${a.title} — original text and media checksums`);
}
assert.equal(mediaCount, 55);
assert.equal(gifs, 5);
console.log("PASS: 9 full articles, 55 body media, 5 GIF, 9 covers");
