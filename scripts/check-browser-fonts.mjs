import { chromium } from "@playwright/test";
import fs from "node:fs";
const b = await chromium.launch({
  executablePath:
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  headless: true,
});
const p = await b.newPage();
const client = await p.context().newCDPSession(p);
await client.send("DOM.enable");
await client.send("CSS.enable");
const result = {};
for (const route of ["/", "/archive", "/articles/01"]) {
  await p.goto("http://127.0.0.1:3000" + route);
  await p.evaluate(() => document.fonts.ready);
  const { root } = await client.send("DOM.getDocument");
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "h1",
  });
  result[route] = await client.send("CSS.getPlatformFontsForNode", { nodeId });
}
fs.writeFileSync("reports/browser-fonts.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await b.close();
