# 星汉扶犁

中医药实践、草木与日常的个人文集 Demo。九篇完整文章，55 个正文媒体（含 5 张 GIF），9 个原文封面。

公开网址：https://carlskywalker940.github.io/xinghan-website/

## 本地开发

使用 Node.js 24、pnpm 11.25.0，依赖版本由 pnpm-lock.yaml 固定。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

开发地址为 http://127.0.0.1:3000/，不带仓库前缀。

```bash
pnpm lint
pnpm audit:public
pnpm build
pnpm start
```

`pnpm build` 生成根路径静态站点到 out，`pnpm start` 使用严格静态文件服务预览，不依赖 Next.js 运行服务器。

## GitHub Pages 构建与验证

```bash
pnpm build:pages
pnpm audit:export
node scripts/serve-static.mjs --port 4173
```

预览地址为 http://127.0.0.1:4173/xinghan-website/。构建脚本写入 out/deployment.json，预览服务器读取其中的 basePath。没有 SPA 首页回退，文章直达和资源缺失会真实反映出来。

- next.config.ts 使用 output: export、trailingSlash: true、images.unoptimized: true。
- src/lib/paths.ts 为原生图片与浏览器 URL 统一处理前缀；Next Link/router 使用应用路径，由 Next 自动添加前缀。
- CSS 引用本地素材，由构建器生成包含子路径的资源 URL。
- 专题沿用归档分类：`/archive/?category=目系与眼科`。九篇正文生成 `/articles/01/` 至 `/articles/09/` 的独立 HTML。

## 自动更新公网网站

修改当前项目后：

```bash
pnpm lint
pnpm audit:public
pnpm build:pages
pnpm audit:export
git add -A
git commit -m "Update website"
git push origin main
```

main 推送自动触发 `.github/workflows/deploy.yml`，用 GitHub 官方 Pages Actions 构建和部署。Settings → Pages 的发布来源为 GitHub Actions。构建、上传、部署均成功后，访问上述公开网址；访问者不需要 GitHub 账户。

本地原文档案、测试录制、调试日志、环境文件、构建缓存和依赖不进入公开仓库。V1/V2 本地快照保留在 backup 分支，不推送这些备份分支。

## 内容与界面

- src/content/articles：每篇独立的 metadata、正文 blocks 和 layout；原始章节号与图片说明保留。
- public/media/articles：原图与原 GIF，未重新压缩。
- content-audit.json：原文摘要校验、媒体 SHA-256、日期和源顺序；`pnpm audit:public` 可在不上传原始档案的情况下核对全部内容。
- src/components/transition、cover：双向场景转场、云雾、叶片及墙影分层。
- src/components/reader：字号记忆、图注、目录和灯箱。
- docs/DEPLOYMENT.md：部署与资源路径约定。

字号为小/中/大 16/18/21px，桌面悬停展开、触屏点击展开、键盘可操作。首页保留原构图；局部云雾、叶片和墙影为扁平原图上的分层动画，支持暂停与减少动态。

## 浏览器验收

```bash
PLAYWRIGHT_BROWSERS_PATH=node_modules/.cache/ms-playwright pnpm exec playwright install chromium
pnpm test:pages
```

默认检查 http://127.0.0.1:4173/xinghan-website/，先启动上面的静态服务。设置 `PAGES_TEST_URL` 可以检查公网同一套页面。macOS 使用前台可见浏览器避免后台帧回调停滞；其他系统使用无头模式。
