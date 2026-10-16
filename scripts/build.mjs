import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const basePath = (
  process.argv.includes("--pages")
    ? "/xinghan-website"
    : process.env.NEXT_PUBLIC_BASE_PATH || ""
).replace(/\/+$/, "");
if (basePath && !/^\/[a-zA-Z0-9/_-]+$/.test(basePath))
  throw new Error("Invalid NEXT_PUBLIC_BASE_PATH");
const code = await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build", "--webpack"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_BASE_PATH: basePath,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  child.on("error", reject);
  child.on("exit", resolve);
});
if (code !== 0) process.exit(code || 1);
// Source artwork remains local; the export contains the exact runtime variants.
for (const file of [
  "branding/paper-art-original.png",
  "hero/background-original.png",
  "hero/foreground-leaves.png",
  "hero/foliage-cleanplate.png",
  "hero/wall-cleanplate.png",
  "hero/cloud-volume.svg",
  "hero/wall-plane-mask.svg",
])
  await fs.rm("out/" + file, { force: true });
await fs.writeFile("out/.nojekyll", "");
await fs.writeFile(
  "out/deployment.json",
  JSON.stringify({ basePath }, null, 2),
);
console.log(`Static export ready: out/ (basePath=${basePath || "/"})`);
