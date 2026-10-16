import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option("--dir", "out"));
let metadata = { basePath: "" };
try {
  metadata = JSON.parse(
    await fs.readFile(path.join(root, "deployment.json"), "utf8"),
  );
} catch {}
const base = (option("--base", metadata.basePath) || "").replace(/\/+$/, "");
const port = Number(option("--port", 3000));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webm": "video/webm",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (base && pathname === base) {
      res.writeHead(301, { Location: base + "/" + url.search });
      res.end();
      return;
    }
    if (base && !pathname.startsWith(base + "/")) {
      res.writeHead(404);
      res.end("Outside project path");
      return;
    }
    pathname = pathname.slice(base.length);
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    let stat = await fs.stat(file);
    if (stat.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(301, { Location: url.pathname + "/" + url.search });
        res.end();
        return;
      }
      file = path.join(file, "index.html");
      stat = await fs.stat(file);
    }
    if (!stat.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : await fs.readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    try {
      res.end(await fs.readFile(path.join(root, "404.html")));
    } catch {
      res.end("Not found");
    }
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Static preview: http://127.0.0.1:${port}${base}/`),
);
