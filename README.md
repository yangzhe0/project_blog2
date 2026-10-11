# Jones Ray · 个人博客

正式入口：https://zheoi.com。简历独立维护于 https://me.zheoi.com，两个仓库分别构建和部署。

## 维护入口

| 修改内容 | 文件或目录 |
| --- | --- |
| 域名、站点信息、导航功能、社交链接 | `astro-paper.config.ts` |
| About Me 正文、布局和样式 | `src/content/pages/about.md`、`src/pages/about.astro`、`src/styles/about.css` |
| 明暗头像、favicon、默认分享图 | `public/` |
| 文章与配图 | `src/content/posts/`、同目录 `image/` |
| ScholarPulse 日报与同步 | `src/content/pulse/`、`scripts/sync-pulse.mjs` |
| 写文章、配图的协作技能 | `.agents/skills/project-blog/` |

`src/components/`、`src/layouts/`、`src/styles/`、`src/utils/` 是站点共用代码；`src/pages/` 按 Astro 文件路由组织。无需为每篇文章或功能再建一套目录。

`astro.config.ts` 负责构建及 Markdown 集成；`src/config.ts` 只补齐站点配置默认值，`src/types/config.ts` 提供类型。这些文件分工不同，修改个人信息从 `astro-paper.config.ts` 开始。

## 构建和预览

使用 Node.js 22.x、pnpm 10.17.1。首次安装或依赖变化后执行 `pnpm install --frozen-lockfile`，平时直接构建：

```bash
pnpm run build
pnpm run preview --host 127.0.0.1 --port 4322
```

构建包括 Astro 检查、静态页面生成和 Pagefind 搜索索引。输出位于 `dist/`；预览 `/about/`，同时检查文章、搜索、标签、归档、日报，以及手机布局和明暗头像。

分享预览使用 `public/default-og.png`，也支持文章通过 `ogImage` 指定图片。没有动态生成封面功能，不配置不存在的 `/og.png` 或文章 `index.png` 入口。

## 文章和日报

文章文件名沿用 `YYMMDD_Title.md`，图片使用 `YYMMDD_01.ext` 等名称并在正文引用。支持 Markdown / MDX、公式、折叠块和代码高亮；不要仅因某篇文章暂未使用就删除这些构建能力。版权说明保留在 `LICENSE`。

现有日报是已发布的正文，不是缓存；`.pulse-manifest.json` 记录原始日报哈希，供增量同步使用。清理时保留日报、索引文章、同步脚本和清单的对应关系，不手工改发布日期。

在有 Obsidian 原始日报目录的环境中，可以设置 `SCHOLAR_PULSE_DIR` 后运行：

```bash
pnpm run sync:pulse -- --no-push
```

`--no-push` 仍会生成本地内容，但不拉取、提交或推送。入口文件名与发布日期取最新原始日报的日期；重复同步不修改正文、清单或同步时间。清单哈希保留原始内容计算方式，CRLF 仅在解析时转成 LF。

正常同步先拉取远端，再读取清单并生成；只提交日报、生成入口和清单。推送若因远端再次更新被拒绝，重新拉取并重试一次。临时网络失败后，下次同步会继续推送已有提交，即使没有新日报。真正的内容冲突会撤销本次启动的 rebase 并保留原提交，仍需人工核对冲突内容；不会自动覆盖双方数据，也不会擅自撤销此前未完成的 Git 操作。已有其他暂存修改时，脚本会在生成前停止。

服务器原有 `node scripts/sync-pulse.mjs` 和定时任务可继续使用。日常看网页不需要运行同步。Linux / WSL 可运行 `node --test scripts/sync-pulse.test.mjs` 验证同步、CRLF、Git 更新竞争和失败恢复；测试只使用项目 `.cache/` 下的临时 Vault 与本地 Git 仓库，并在结束时删除。

## Git 和本地文件

`.gitattributes` 统一文本入库为 LF，`.editorconfig` 让编辑器按 LF 保存；Windows / WSL 共用仓库时不用反复排除换行差异，也不依赖个人全局设置。

- `node_modules/`：本地构建依赖，保留，不入 Git。
- `dist/`：正式构建产物，不直接编辑，不入 Git。
- `.astro/`：Astro 自动生成的内容缓存和类型，不入 Git。
- `.cache/`：一次性脚本、日志、截图及下载缓存，结束后清理，不入 Git。
- `.git/`：仓库历史，保留；删源码文件不会同时抹除旧提交。

不要提交 `.env`、凭据、日志、依赖或生成产物。只跟踪 `.agents/skills/project-blog/` 这套正式维护技能；其他本地安装的技能目录通过白名单规则排除，技能的本地 `.env` 也不入 Git。

推送前先 pull 同步远端日报，再核对暂存区和构建结果。push 后由原有 Vercel 项目自动部署；本地修改、Git 提交、push 和实际上线是四个不同状态。
