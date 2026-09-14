# SHUOHAN BLOG 项目架构与维护

## 运行链路

```text
source/_posts/*.md + source/img/*
                 │
                 ▼
scripts/content.mjs
  解析 frontmatter、Markdown、KaTeX、图片路径、SHA-256 清单
                 │
                 ├── .generated/content.json（构建中间数据）
                 ├── public/originals/（可下载原稿）
                 └── public/data/posts.json
                 │
                 ▼
vite.config.mjs + scripts/pages.mjs
  生成首页、文章页、归档、分类、标签、关于、RSS、sitemap、404
                 │
                 ├── src/main.js + src/style.css（交互与动效）
                 ├── src/scene.js（3D 生命周期）
                 └── src/rhine/（RhineLabUI 原始 Three.js 场景模块）
                 │
                 ▼
dist/ → GitHub Actions → GitHub Pages
```

## 目录职责

| 路径 | 用途 |
| --- | --- |
| `source/_posts/` | 文章原稿。文件名是稳定 slug，尽量不要改名。 |
| `source/img/` | 文章图片、头像及视频。文章里可继续使用 `/img/...` 或 `../img/...`。 |
| `source/about/` | 关于页原稿。 |
| `scripts/content.mjs` | 内容迁移、渲染、媒体复制、公式检查和哈希报告。 |
| `scripts/pages.mjs` | 静态页面模板与导航结构。 |
| `src/main.js` | 页面交互：搜索、筛选、主题、阅读器、图片查看、首页选择。 |
| `src/style.css` | 全站视觉、响应式布局、页面专属动画、跨页面 View Transition。 |
| `src/scene.js` | 3D 场景按需加载、暂停、销毁和选档。低性能设备可以关闭。 |
| `src/rhine/` | 从 RhineLabUI 提取的 22 个原始场景模块。只通过 `src/rhine/data.ts` 接入文章数据。 |
| `vendor/rhine/` | 3D 模型、MiSans 字体分片及许可。 |
| `vite.config.mjs` | 把中间数据写成独立静态页面，并生成旧地址跳转。 |
| `.github/workflows/deploy.yml` | 构建、迁移校验、浏览器测试和 Pages 发布。 |
| `verification/` | 本地测试截图与迁移结果，不参与发布。 |

## 日常维护

1. 在 `source/_posts/` 新建 Markdown，写好 `title`、`date`、`categories`、`tags`；需要目录或公式时加 `toc: true`、`math: true`。
2. 图片放到 `source/img/`，文章使用相对路径或 `/img/` 路径。构建会检查每个引用是否存在。
3. 本地运行 `npm ci` 后执行 `npm run dev`；每次保存文章后刷新即可看到生成结果。
4. 发布前执行 `npm run build`、`npm run verify:migration` 和 `npm run test:content`。有硬件 WebGL 的机器再执行 `npm run test:graphics`。
5. 提交 `source/`、`src/`、`scripts/`、`vendor/`、配置和工作流；不要提交 `node_modules/`、`dist/`、`public/`、`.generated/`、`.local/`。
6. 推送 `main` 后 Actions 自动发布。线上地址是 <https://fangshuohan.github.io/>，部署状态在仓库 Actions 页面查看。

## 改视觉和动效

- 全站颜色、字级、断点和动效关键帧在 `src/style.css`。
- 文章读取动画在 `src/reader-motion.css`：标题横向展开、金色光带扫描、阅读信息与正文前六个内容块分层淡入，约 1.4 秒完成。`src/reader-motion.js` 等待字体、页面可见和跨页过渡结束，再播放并按动画实际结束时间清理；章节直达、历史返回、减少动态效果和打印模式跳过动画。正文不使用滚动隐藏，也不加载首页 3D 场景。
- 归档、分类、标签页的装饰仪器在 `scripts/motion-markup.mjs`，对应样式使用 `.instrument-archive`、`.instrument-category`、`.instrument-tag`。
- 关于页的扫描圆环是 `profileFrame()`，开场描线、扫描、读数和欢迎文案在 `src/main.js` 的 `boot()`。
- 页面切换使用 CSS `@view-transition`；不支持该 API 的浏览器仍会正常跳转。`prefers-reduced-motion: reduce` 会关闭开场、页面过渡、扫描和连续旋转。
- 不要直接修改 `src/rhine/` 的场景算法。需要重新从原参考目录提取时运行 `node scripts/vendor-rhine.mjs`，然后重新执行完整构建和测试。

## 内容边界

原稿和媒体以 SHA-256 记录在 `.generated/migration-report.json`。`npm run verify:migration` 会验证原文件、生成的可下载原稿、媒体、文章页和本地链接。原站未提供评论数据库或访问统计，新增内容应接入独立服务，不要写回原稿。
