# 方朔寒的博客

地址：**https://fangshuohan.github.io/**

目标仓库：`FangShuohan/FangShuohan.github.io`

由原博客 `source/` 生成的静态网站。首页直接移植 RhineLabUI 的玻璃档案模型、阵列波浪、拖拽惯性、档案抽取与主题渐变；文章以静态 HTML 发布，可直接访问、刷新、被搜索引擎收录，并支持无 JavaScript 阅读。

## 本地运行

需要 Node.js 24。

```sh
npm ci
npm run dev
```

开发地址以终端输出为准，默认 `http://127.0.0.1:5173`。开发服务器启动时生成文章；编辑文章后重新运行 `npm run dev`。

```sh
npm run build
npm run verify:migration
npm run preview
```

构建目录为 `dist/`，预览默认 `http://127.0.0.1:4173`。`public/` 与 `.generated/` 是自动生成目录，无需编辑或提交。

## 写文章

继续在 `source/_posts/` 下写 Markdown，图片放入 `source/img/`。文件名决定文章地址，已发布的文件名尽量保持不变。

```markdown
---
title: 一篇新文章
date: 2026-09-14 20:00:00
categories: [笔记]
tags: [Note]
math: true
toc: true
---

## 开始记录

这里是正文。
```

支持表格、代码高亮、任务清单、删除线、原文 HTML，以及 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 数学公式。原稿中的 `/img/` 和 `../img/` 引用都会解析为部署地址；找不到本地图片或出现公式解析错误时会停止构建。

个人资料编辑 `source/about/index.md`，站名、作者和域名编辑 `site.config.mjs`。页面目录、RSS、站点地图和搜索索引自动生成。主题与动效开关保存在当前浏览器。

## GitHub Pages

`.github/workflows/deploy.yml` 在推送到 `main` 后自动构建、验证迁移、执行浏览器测试并发布。仓库的 **Settings → Pages → Source** 使用 **GitHub Actions**。

```sh
git add .
git commit -m "Update blog"
git push origin main
```

无需提交 `dist/`。部署配置遵循 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 迁移与验证

- 共 8 篇文章，包括 1 篇正文为空的测试文章；58 个媒体文件、35 张正文引用图片。
- 原稿保持不变，完整元数据和正文保留在生成数据中；每篇文章提供字节一致的原稿下载。
- 旧资料中的操作系统 `Zone.Identifier` 附属文件保留在本地，排除网页发布；其他原资料均有 SHA-256 校验与原件导出。
- `hello-world.md` 未记载发布日期，保持为空。两篇文章的单数字秒数仅在 RSS/结构化日期输出中补齐，原稿不变。
- 原文 `4$V$` 与 `7$V$` 通过渲染器兼容，不会把两者之间的中文误识别成公式；`[TOC]` 替换为页面目录。原稿中 `\($...$\)` 的嵌套公式分隔符仅在显示时兼容处理。
- 生成 `/posts/文件名/` 独立页面；为已知日期生成 Hexo 常见 `/年/月/日/文件名/` 旧地址跳转，以及分类、标签别名。旧博客完整配置没有提供，因此无法推断所有自定义永久链接。
- 旧站评论数据库和访问计数不包含在 `source/` 中，未提供这些数据的迁移。原文中提及评论功能的文字保留。

校验结果在 `verification/migration-results.json`；详细清单在 `.generated/migration-report.json` 和站点 `/data/migration-report.json`。

```sh
# 首次在 Linux/macOS 上安装浏览器；Windows 默认使用本机 Chrome
npx playwright install chromium
npm test
```

测试包含逐篇直链/刷新、图片、数学与表格、原稿哈希、搜索筛选、主题、移动端目录/图片查看、无 JavaScript 阅读，以及 3D 选择、抽取与资源释放。截图保存在 `verification/`。

## 视觉来源

RhineLabUI 原始场景的 22 个本地模块被保留在 `src/rhine/`，MIT 许可见同目录 `LICENSE`。`data.ts` 连接博客文章，模型标签替换为 SHUOHAN LAB，循环重定位改为实际分类数量。`scripts/vendor-rhine.mjs` 可从原参考源码重现提取步骤。

MiSans 使用参考工程中已有的本地 Regular 字体分片与原始许可，不需要外部字体 CDN。文章、数学字体、模型与媒体同源部署。低性能设备可关闭首页动效，文章阅读不加载 3D 场景。

`RhineLabUI/` 原参考文件完整保留在本地。发布所需模型、常规字体与许可保存在 `vendor/rhine/`，网站不依赖原参考目录构建。版本控制未收录原参考目录的 Blender 工程、壁纸构建和验证截图。重新执行一次性提取脚本需要本地仍有原参考目录。
