#!/usr/bin/env node
/**
 * ScholarPulse 同步脚本
 * 单向流: Obsidian Vault (事实源) -> 博客仓库 (生成物) -> push 后 Vercel 自动发布
 * - 每次全量扫 vault 日报, 用 sha256 做增量: 新文件生成详情页、内容变化重新生成
 * - 总索引从日报生成，仅内容改变时写入(纯生成物, 无手工内容)
 * - 有变更才 git commit + push
 * 用法: node scripts/sync-pulse.mjs [--no-push]
 * 环境变量: SCHOLAR_PULSE_DIR 覆盖 vault 日报目录(默认 /home/y/文档/Obsidian Vault/科研/ScholarPulse)
 */
import fs from "node:fs/promises";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT_DIR = process.env.SCHOLAR_PULSE_DIR || "/home/y/文档/Obsidian Vault/科研/ScholarPulse";
const PULSE_OUT = join(ROOT, "src/content/pulse");
const MANIFEST = join(ROOT, ".pulse-manifest.json");
const NO_PUSH = process.argv.includes("--no-push");
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

// ---------- 转换 ----------
/** Obsidian callout `> [!x]- 标题` + 后续 `> ` 行 -> <details> 块; [[wikilink]] 兜底 */
function convertObsidian(md) {
  const out = [];
  let inCallout = false;
  for (const line of md.split("\n")) {
    const m = line.match(/^>\s*\[!([^\]\s]+)\](-?)\s*(.*)$/);
    if (m) {
      if (inCallout) out.push("", "</details>");
      inCallout = true;
      out.push("<details>", `<summary>${m[3] || "折叠块"}</summary>`);
      continue;
    }
    if (inCallout) {
      if (line.startsWith(">")) { out.push(line.replace(/^>\s?/, "")); continue; }
      out.push("", "</details>");
      inCallout = false;
    }
    out.push(line);
  }
  if (inCallout) out.push("", "</details>");
  return out.join("\n")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function splitFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

/** 解析当日每篇论文: 标题 / 来源链接 / 一句话结论(原文) */
function papersOf(body) {
  const out = [];
  for (const b of body.split(/^### \d+\. /m).slice(1)) {
    const title = b.split("\n", 1)[0].trim();
    const urlM = b.match(/\*\*来源\*\*[:：]\s*\[[^\]]*\]\(([^)\s]+)\)/);
    const conclM = b.match(/#### 一句话结论\s*\n+(\S[^\n]*)/);
    out.push({
      title,
      url: (urlM?.[1] || "").trim(),
      concl: (conclM?.[1] || "").trim(),
    });
  }
  return out;
}

// ---------- Git 同步 ----------
const g = args => execFileSync("git", args, { cwd: ROOT, stdio: "pipe" }).toString().trim();
const inRebase = () => ["rebase-merge", "rebase-apply"]
  .some(name => existsSync(resolve(ROOT, g(["rev-parse", "--git-path", name]))));

function pullLatest(autostash = false) {
  if (inRebase() || existsSync(resolve(ROOT, g(["rev-parse", "--git-path", "MERGE_HEAD"])))) {
    throw new Error("仓库已有未完成的 rebase/merge，请先处理；本次未改动日报");
  }
  try {
    g(["pull", "--rebase", ...(autostash ? ["--autostash"] : []), "origin", "main"]);
    if (g(["diff", "--name-only", "--diff-filter=U"])) {
      throw new Error("拉取后有未解决的文件冲突，本次停止生成，保留现场供核对");
    }
  } catch (error) {
    // 仅撤销本次拉取启动的 rebase，保留原提交，避免定时任务留下中间态。
    if (inRebase()) {
      g(["rebase", "--abort"]);
      console.error("[sync-pulse] 拉取发生冲突，已撤销本次 rebase；原提交保留");
    }
    throw error;
  }
}

function pushChanges() {
  try {
    g(["push", "origin", "main"]);
  } catch (error) {
    const output = error.message + (error.stderr?.toString() ?? "");
    if (!/\[rejected\]|non-fast-forward|fetch first/.test(output)) throw error;
    console.log("[sync-pulse] 推送时远端已更新，重新拉取后重试一次");
    pullLatest();
    g(["push", "origin", "main"]);
  }
  console.log("[sync-pulse] 已推送，Vercel 接管构建");
}

// ---------- 同步 ----------
async function main() {
  if (!NO_PUSH) {
    if (g(["diff", "--cached", "--name-only"])) {
      throw new Error("暂存区已有其他修改，请先处理；本次不生成或提交日报");
    }
    pullLatest(true);
  }
  const dir = VAULT_DIR;
  let entries;
  try { entries = await fs.readdir(dir); }
  catch { throw new Error("VAULT_DIR 不存在: " + dir); }
  const days = entries
    .map(f => f.match(DAY_RE))
    .filter(m => m)
    .map(m => ({ file: `${m[1]}-${m[2]}-${m[3]}.md`, date: `${m[1]}-${m[2]}-${m[3]}` }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) throw new Error("vault 里没有找到日期命名的日报: " + dir);
  const latestDate = days[days.length - 1].date;
  const postsDir = join(ROOT, "src/content/posts");
  const currentName = `${latestDate.slice(2).replace(/-/g, "")}_ScholarPulseLog.md`;
  const INDEX_POST = join(postsDir, currentName);

  let prev = {};
  try { prev = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch {}
  const next = {};
  const changed = [];
  mkdirSync(PULSE_OUT, { recursive: true });

  for (const d of days) {
    const src = join(dir, d.file);
    const content = readFileSync(src, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const output = join(PULSE_OUT, d.file);
    const unchanged = prev[d.date]?.hash === hash && existsSync(output);
    next[d.date] = unchanged ? prev[d.date] : { hash, syncedAt: new Date().toISOString() };
    if (unchanged) continue;
    changed.push(d.date);
    // 哈希基于原始字节；只在解析时统一外部 Vault 的 CRLF 换行。
    const { body } = splitFrontmatter(content.replace(/\r\n/g, "\n"));
    const papers = papersOf(body);
    const title = `ScholarPulse 日报 ${d.date}`;
    const description = papers[0]
      ? `${d.date} 学术简报：${papers.length} 篇。${papers[0].concl}`
      : `${d.date} 学术简报。`;
    const frontmatter = [
      "---",
      `title: '${title.replace(/'/g, "’")}'`,
      `pubDatetime: ${d.date}T00:00:00+08:00`,
      `description: '${description.replace(/'/g, "’")}'`,
      "tags: [ScholarPulse, 学术监测, AI-Agent]",
      "---",
      "",
    ].join("\n");
    writeFileSync(join(PULSE_OUT, d.file), frontmatter + convertObsidian(body));
  }

  // 删除 vault 里已不存在的页面(防御, 正常不该发生)
  for (const name of await fs.readdir(PULSE_OUT)) {
    if (!name.endsWith(".md")) continue;
    if (!days.some(d => d.file === name)) {
      const stale = join(PULSE_OUT, name);
      await fs.rm(stale);
      changed.push("删:" + name);
    }
  }

  // 清理旧入口；文件名和发布日期以最新日报为准，与脚本运行日期无关。
  for (const name of await fs.readdir(postsDir)) {
    if (name.endsWith("_ScholarPulseLog.md") && name !== currentName) {
      await fs.rm(join(postsDir, name));
      changed.push("重命名旧入口文章:" + name);
    }
  }

  // ---------- 总表(直接来自日报原文: 日期 | 总结摘要 | 标题) ----------
  const months = {};
  for (const d of days) (months[d.date.slice(0, 7)] ||= []).push(d);
  const esc = s => s.replace(/&/g, "&amp;").replace(/\|/g, "\\|");
  const rows = [];
  for (const m of Object.keys(months).sort().reverse()) {
    rows.push(`### ${m}`);
    rows.push("");
    rows.push("| 日期 | 总结摘要 | 标题 |");
    rows.push("| --- | --- | --- |");
    for (const d of months[m].sort((a, b) => b.date.localeCompare(a.date))) {
      const content = readFileSync(join(dir, d.file), "utf8");
      const { body } = splitFrontmatter(content.replace(/\r\n/g, "\n"));
      const papers = papersOf(body);
      for (const p of papers) {
        const tl = p.url ? `[${esc(p.title)}](${p.url})` : esc(p.title);
        rows.push(`| [${d.date}](/pulse/${d.date}/) | ${esc(p.concl)} | ${tl} |`);
      }
    }
    rows.push("");
  }
  const table = rows.join("\n");

  // ---------- 列表唯一入口文章: 一句导语 + 总表(一次跳转) ----------
  const postBody = [
    "每天自动生成的论文研判，全部在这里。原理与构建过程见《[ScholarPulse](/posts/260615_scholarpulse/)》。",
    "",
    table,
    "",
  ].join("\n");
  const post = [
    "---",
    "title: 'ScholarPulse 运行实录'",
    `pubDatetime: ${latestDate}T00:00:00+08:00`,
    "description: '学术监测的完整产出索引：每日论文速览、深度研判与原始摘要。'",
    "tags: [ScholarPulse, 学术监测, AI-Agent, 索引]",
    "---",
    "",
    postBody,
    "",
  ].join("\n");
  if (!existsSync(INDEX_POST) || readFileSync(INDEX_POST, "utf8") !== post) {
    writeFileSync(INDEX_POST, post);
    changed.push("列表入口");
  }

  const manifest = JSON.stringify(next, null, 2);
  if (!existsSync(MANIFEST) || readFileSync(MANIFEST, "utf8") !== manifest) {
    writeFileSync(MANIFEST, manifest);
    changed.push("同步清单");
  }

  // ---------- 提交 ----------
  if (changed.length === 0) {
    console.log("[sync-pulse] 无变更，跳过提交");
    // 上次推送失败时，本次即便没有新日报，也继续发布已生成的提交。
    if (!NO_PUSH && g(["rev-list", "--count", "origin/main..HEAD"]) !== "0") pushChanges();
    return;
  }
  console.log(`[sync-pulse] 变更 ${changed.length} 项: ${changed.slice(0, 12).join(", ")}${changed.length > 12 ? `…(+${changed.length - 12})` : ""}`);
  console.log("[sync-pulse] 新/改页面:", changed.filter(c => c.startsWith("20")).join(", ") || "(无)");
  if (NO_PUSH) return;
  g(["add", "--", "src/content/pulse", ":(glob)src/content/posts/*_ScholarPulseLog.md", ".pulse-manifest.json"]);
  try {
    g(["commit", "-m", `pulse: 同步 ScholarPulse 日报 ${latestDate}（${changed.filter(c => c.startsWith("20")).length} 新/改）`]);
  } catch (e) {
    if (!/nothing to commit|No local changes/.test(e.message + (e.stdout?.toString() ?? ""))) throw e;
    console.log("[sync-pulse] git 无实质变更");
    return;
  }
  pushChanges();
}

main().catch(e => {
  console.error("[sync-pulse] 失败:", e.message);
  process.exit(1);
});
