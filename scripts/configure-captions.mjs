import fs from "node:fs";
import assert from "node:assert/strict";
const captions = {
  "02": ["02-0016", "02-0026", "02-0040", "02-0042", "02-0044"],
  "04": ["04-0008", "04-0015"],
  "09": ["09-0007", "09-0016", "09-0028"],
};
const report = [];
for (const [id, ids] of Object.entries(captions)) {
  const dir = `src/content/articles/${id}`;
  const blocks = JSON.parse(fs.readFileSync(`${dir}/blocks.json`));
  const layout = JSON.parse(fs.readFileSync(`${dir}/layout.json`));
  layout.captions = {};
  for (const captionId of ids) {
    const i = blocks.findIndex((b) => b.id === captionId);
    assert(
      i > 0 && blocks[i - 1].asset,
      `Caption ${captionId} must immediately follow its image`,
    );
    layout.captions[blocks[i - 1].id] = [captionId];
    report.push({
      articleId: id,
      imageBlock: blocks[i - 1].id,
      captionBlock: captionId,
      sourceOrder: blocks[i].sourceOrder,
      text: blocks[i].runs.map((r) => r.text).join(""),
    });
  }
  fs.writeFileSync(`${dir}/layout.json`, JSON.stringify(layout, null, 2));
}
const registry = JSON.parse(fs.readFileSync("src/content/registry.json"));
for (const a of registry) {
  const blocks = JSON.parse(
    fs.readFileSync(`src/content/articles/${a.id}/blocks.json`),
  );
  const first = blocks.find(
    (b) => b.runs && b.runs.map((r) => r.text).join("").length > 35,
  );
  if (first) {
    a.excerpt = first.runs
      .map((r) => r.text)
      .join("")
      .slice(0, 80);
    const file = `src/content/articles/${a.id}/meta.json`;
    const meta = JSON.parse(fs.readFileSync(file));
    meta.excerpt = a.excerpt;
    fs.writeFileSync(file, JSON.stringify(meta, null, 2));
  }
}
fs.writeFileSync(
  "src/content/registry.json",
  JSON.stringify(registry, null, 2),
);
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/V2_caption_mapping.json",
  JSON.stringify(report, null, 2),
);
console.log(
  `${report.length} source captions configured without modifying blocks or source order`,
);
