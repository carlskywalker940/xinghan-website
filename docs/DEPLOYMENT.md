# GitHub Pages 部署约定

仓库：carlskywalker940/xinghan-website；分支：main；发布来源：GitHub Actions；环境：github-pages。

## 构建

本项目使用 Next.js 官方静态导出，九篇动态路由均由 generateStaticParams 列出，dynamicParams 为 false。根路径的本地导出与 Pages 子路径导出共享源码，不需要运行时 API、数据库或服务器。

- `pnpm build`：basePath 为空。
- `pnpm build:pages`：basePath 为 /xinghan-website。
- `pnpm audit:public`：验证 9 篇正文、55 个媒体、5 张 GIF 和 9 个封面的既有校验值。
- `pnpm audit:export`：验证所有静态页面、完整正文、媒体顺序、CSS/JS/图片引用以及子路径。

build.mjs 仅在导出目录移除不用于网站展示的源绘图副本，保留所有文章原图和 GIF。本地 public 原文件不会因此被改动。

## 路径

不要直接给 Next Link/router 手工追加仓库前缀。组件中的原生 img 使用 publicAsset；从 location.pathname 获取路径时用 routePath 还原为应用内部路径。CSS 通过相对素材导入交给 Next 构建器生成 URL。

专题继续使用已有 archive 页面上的 category 查询参数；不添加另一套专题页面。所有文章使用带结尾斜杠的目录 URL，便于 GitHub Pages 直接访问和刷新。

## 工作流

push main → pnpm 冻结锁文件安装 → 校验原文与媒体 → 静态构建 → 核对导出 → upload-pages-artifact → deploy-pages。

Actions 仅持有 contents:read、pages:write 和 id-token:write，使用固定的官方发布版本提交。Node.js 24 与 pnpm 11.25.0 对齐本地环境，不使用付费服务。

## 后续更新

本地检查后执行 git add / commit，再 git push origin main。查看仓库 Actions 中的工作流结果，成功后分享 Pages 链接即可。不要推送 backup 分支；其中保存了不用于公开发布的历史档案和本地验收文件。

如需回退线上版本，使用 git revert 创建新的回退提交并正常推送，不需要强制推送。

## 参考

配置依据 [Next.js 静态导出](https://nextjs.org/docs/app/guides/static-exports)、[basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) 与 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
