import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { load } from "cheerio";
import sharp from "sharp";
const root = process.cwd();
const supplied = process.argv[2] || path.join(root, "source_archive");
const source = fs.existsSync(supplied)
  ? supplied
  : path.join(root, "source_archive");
export const normalize = (s) => s.replace(/[\s\u200b\ufeff]+/g, "");
export const hash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const categories = [
  "制药实践",
  "目系与眼科",
  "目系与眼科",
  "目系与眼科",
  "医理随笔",
  "生活记录",
  "生活记录",
  "制药实践",
  "草木札记",
];
const registry = [];
const audits = [];
for (const folder of fs
  .readdirSync(source)
  .filter((x) => /^\d\d_/.test(x))
  .sort()) {
  const dir = path.join(source, folder);
  const original = JSON.parse(
    fs.readFileSync(path.join(dir, "metadata.json"), "utf8"),
  );
  const id = String(original.id).padStart(2, "0");
  const dest = path.join(root, "src/content/articles", id);
  const media = path.join(root, "public/media/articles", id);
  fs.mkdirSync(dest, { recursive: true });
  fs.mkdirSync(media, { recursive: true });
  const backup = path.join(root, "source_archive", folder);
  fs.mkdirSync(backup, { recursive: true });
  if (path.resolve(dir) !== path.resolve(backup))
    fs.cpSync(path.join(dir, "images"), path.join(backup, "images"), {
      recursive: true,
    });
  for (const f of [
    "metadata.json",
    "article.html",
    "article.md",
    "article.txt",
    "original.html",
  ])
    if (path.resolve(dir) !== path.resolve(backup))
      fs.copyFileSync(path.join(dir, f), path.join(backup, f));
  const html = fs.readFileSync(path.join(dir, "article.html"), "utf8");
  const $ = load(html);
  const blocks = [];
  let runs = [];
  let alignment = "justify";
  const flush = () => {
    if (normalize(runs.map((x) => x.text).join(""))) {
      blocks.push({ kind: "paragraph", runs, align: alignment });
    }
    runs = [];
  };
  function walk(node, style = {}) {
    if (node.type === "text") {
      if (node.data.trim() || runs.length)
        runs.push({ text: node.data, ...style });
      return;
    }
    if (!node.tagName) {
      for (const ch of node.children || []) walk(ch, style);
      return;
    }
    const tag = node.tagName;
    if (["script", "style", "svg", "iframe", "noscript"].includes(tag)) return;
    const a = node.attribs || {};
    const css = a.style || "";
    const st = { ...style };
    if (
      ["strong", "b"].includes(tag) ||
      /font-weight:\s*(bold|[6-9]00)/.test(css)
    )
      st.bold = true;
    if (["em", "i"].includes(tag)) st.italic = true;
    if (tag === "u" || /text-decoration[^;]*underline/.test(css))
      st.underline = true;
    if (tag === "a" && /^https?:\/\//.test(a.href || "")) st.href = a.href;
    if (tag === "img") {
      flush();
      const filename = path.basename(a.src || "");
      blocks.push({
        kind: filename.endsWith(".gif") ? "gif" : "image",
        asset: `/media/articles/${id}/${filename}`,
        sourceSrc: a.src,
        alt: `${original.title} · 原文插图 ${blocks.filter((x) => x.asset).length + 1}`,
        sourceStyle: css,
      });
      return;
    }
    if (tag === "br") {
      if (runs.length) runs.push({ text: "\n" });
      return;
    }
    const boundary = [
      "p",
      "section",
      "div",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "li",
    ].includes(tag);
    if (boundary) flush();
    const oldAlign = alignment;
    const match = css.match(/text-align:\s*(center|left|right|justify)/);
    if (match) alignment = match[1];
    for (const ch of node.children || []) walk(ch, st);
    if (boundary) flush();
    alignment = oldAlign;
  }
  walk($("#js_content")[0] || $("body")[0]);
  flush();
  const textSource = normalize($("#js_content").text());
  const textOutput = normalize(
    blocks.flatMap((b) => b.runs?.map((r) => r.text) || []).join(""),
  );
  if (textSource !== textOutput)
    throw new Error(
      `Text changed: ${id} ${textSource.length}/${textOutput.length}`,
    );
  const mediaAudit = [];
  const images = {};
  for (const [i, b] of blocks.entries()) {
    b.id = `${id}-${String(i + 1).padStart(4, "0")}`;
    b.sourceOrder = i + 1;
    if (!b.asset) continue;
    const filename = path.basename(b.asset);
    const file = path.join(dir, "images", filename);
    const target = path.join(media, filename);
    fs.copyFileSync(file, target);
    const info = await sharp(file, { animated: true }).metadata();
    const h = info.pageHeight || info.height;
    let maxWidth = 340,
      layout = "contained";
    if (
      (id === "02" &&
        ["002", "005", "006", "007", "008"].some((n) =>
          filename.includes(n),
        )) ||
      (id === "04" && filename.includes("003")) ||
      id === "07" ||
      (id === "09" &&
        ["002", "004", "006", "009"].some((n) => filename.includes(n)))
    )
      maxWidth = 760;
    if (
      id === "09" &&
      ["003", "005", "007", "008"].some((n) => filename.includes(n))
    ) {
      layout = "divider";
      maxWidth = 720;
    }
    if (id === "09" && filename.includes("001")) maxWidth = 130;
    b.width = info.width;
    b.height = h;
    images[filename] = { layout, maxWidth };
    mediaAudit.push({
      source: b.sourceSrc,
      target: b.asset,
      width: info.width,
      height: h,
      frames: info.pages || 1,
      bytes: fs.statSync(file).size,
      sha256: hash(file),
      sourceOrder: b.sourceOrder,
    });
  }
  const coverFile = path.join(dir, original.cover_local_path);
  fs.copyFileSync(coverFile, path.join(media, "image_000.jpg"));
  const date = original.publish_date.match(
    /(\d+)年(\d+)月(\d+)日\s*(\d+):(\d+)/,
  );
  const publishedAt = `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}T${date[4]}:${date[5]}:00+08:00`;
  const fulltext = blocks
    .filter((b) => b.runs)
    .map((b) => b.runs.map((r) => r.text).join(""))
    .join("");
  const meta = {
    id,
    slug: id,
    title: original.title,
    author: original.author,
    publishedAt,
    sourceDate: original.publish_date,
    sourceUrl: original.original_url,
    category: categories[Number(id) - 1],
    series: ["02", "03", "04"].includes(id) ? "eye-tube" : null,
    seriesOrder: { "04": 1, "03": 2, "02": 3 }[id] || null,
    cover: `/media/articles/${id}/image_000.jpg`,
    excerpt: fulltext.replace(/^第\d+篇/, "").slice(0, 80),
    sourcePath: `source_archive/${folder}/article.html`,
  };
  const layoutFile = path.join(dest, "layout.json");
  if (!fs.existsSync(layoutFile))
    fs.writeFileSync(
      layoutFile,
      JSON.stringify(
        { articleId: id, images, toc: [], preserveSourceOrder: true },
        null,
        2,
      ),
    );
  fs.writeFileSync(path.join(dest, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(dest, "blocks.json"),
    JSON.stringify(blocks, null, 2),
  );
  registry.push(meta);
  audits.push({
    id,
    title: meta.title,
    publishedAt,
    sourceUrl: meta.sourceUrl,
    sourcePath: meta.sourcePath,
    textCharacters: textSource.length,
    textSha256: crypto.createHash("sha256").update(textSource).digest("hex"),
    blocks: blocks.length,
    media: mediaAudit,
    cover: {
      source: original.cover_local_path,
      target: meta.cover,
      sha256: hash(coverFile),
    },
  });
}
fs.writeFileSync(
  path.join(root, "src/content/registry.json"),
  JSON.stringify(registry, null, 2),
);
fs.writeFileSync(
  path.join(root, "content-audit.json"),
  JSON.stringify(
    {
      articleCount: registry.length,
      bodyMediaCount: audits.reduce((n, a) => n + a.media.length, 0),
      gifCount: audits.reduce(
        (n, a) => n + a.media.filter((m) => m.frames > 1).length,
        0,
      ),
      coverCount: registry.length,
      articles: audits,
    },
    null,
    2,
  ),
);
console.log(
  registry
    .map((a) => `${a.id} | ${a.title} | ${a.sourceDate} | ${a.sourceUrl}`)
    .join("\n"),
);
console.log("导入完成：逐字内容一致；媒体映射已写入 content-audit.json");
