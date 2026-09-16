#!/usr/bin/env node
/**
 * ScholarPulse 同步脚本
 * 单向流: Obsidian Vault (事实源) -> 博客仓库 (生成物) -> push 后 Vercel 自动发布
 * - 每次全量扫 vault 日报, 用 sha256 做增量: 新文件生成详情页、内容变化重新生成
 * - 每月索引 + 百日总索引文章每次全量重建(纯生成物, 无手工内容)
 * - 有变更才 git commit + push
 * 用法: node scripts/sync-pulse.mjs [--no-push]
 * 环境变量: SCHOLAR_PULSE_DIR 覆盖 vault 日报目录(默认 /home/y/文档/Obsidian Vault/科研/ScholarPulse)
 */
import fs from "node:fs/promises";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT_DIR = process.env.SCHOLAR_PULSE_DIR || "/home/y/文档/Obsidian Vault/科研/ScholarPulse";
const PULSE_OUT = join(ROOT, "src/content/pulse");
const PULSE_IDX = join(PULSE_OUT, "index.md");      // 总索引详情页
const INDEX_POST = join(ROOT, "src/content/posts/260616_ScholarPulseLog.md");
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

/** 内容摘要: 论文数 / 高推荐数 / 前两条标题 */
function digest(body) {
  const papers = (body.match(/^### \d+\./gm) || []).length;
  const highs = (body.match(/^\|\s*\d+\s*\|.*\|\s*高\s*\|/gm) || []).length;
  const tops = (body.match(/^### \d+\. (.+)$/gm) || []).slice(0, 2)
    .map(l => l.replace(/^### \d+\. /, "").trim());
  return { papers, highs, tops };
}

// ---------- 同步 ----------
async function main() {
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

  let prev = {};
  try { prev = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch {}
  const next = {};
  const changed = [];
  mkdirSync(PULSE_OUT, { recursive: true });

  for (const d of days) {
    const src = join(dir, d.file);
    const content = readFileSync(src, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    next[d.date] = { hash, syncedAt: new Date().toISOString() };
    if (prev[d.date]?.hash === hash) continue;
    changed.push(d.date);
    const { body } = splitFrontmatter(content);
    const { papers, highs, tops } = digest(body);
    const title = `ScholarPulse 日报 ${d.date}`;
    const description = `${d.date} 学术简报：${papers} 篇论文入选，${highs} 篇高推荐。` +
      (tops[0] ? `头条：${tops[0].slice(0, 60)}…` : "");
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

  // 删除 vault 里已不存在的页面(防御, 正常不该发生); index.md 保留
  for (const name of await fs.readdir(PULSE_OUT)) {
    if (name === "index.md") continue;
    if (name.endsWith(".md") && name !== "index.md" && !days.some(d => d.file === name)) {
      const stale = join(PULSE_OUT, name);
      await fs.rm(stale);
      changed.push("删:" + name);
    }
  }

  // ---------- 索引页 ----------
  const today = new Date().toISOString().slice(0, 10);
  const months = {};
  for (const d of days) (months[d.date.slice(0, 7)] ||= []).push(d);
  const monthRows = Object.keys(months).sort().reverse().map(m => {
    const items = months[m].sort((a, b) => b.date.localeCompare(a.date));
    const lines = items.map(d => {
      let desc = "";
      try {
        const { body } = splitFrontmatter(readFileSync(join(dir, d.file), "utf8"));
        const { papers, highs, tops } = digest(body);
        desc = `${papers} 篇 / ${highs} 高推荐` + (tops[0] ? ` — ${tops[0].slice(0, 46)}…` : "");
      } catch {}
      return `| [${d.date}](/pulse/${d.date}/) | ${desc} |`;
    });
    return `### ${m}\n\n| 日期 | 速览 |\n| --- | --- |\n${lines.join("\n")}`;
  });
  const totalPapers = days.reduce((s, d) => {
    try {
      const { body } = splitFrontmatter(readFileSync(join(dir, d.file), "utf8"));
      return s + digest(body).papers;
    } catch { return s; }
  }, 0);
  const idxFrontmatter = [
    "---",
    `title: 'ScholarPulse 运行实录 · 总索引'`,
    `pubDatetime: ${today}T00:00:00+08:00`,
    `description: '100 天学术简报索引：每日论文速览与深度研判，按月份归档。'`,
    "tags: [ScholarPulse, 学术监测, 索引]",
    "---",
    "",
  ].join("\n");
  const idxBody = [
    `**ScholarPulse** 从 2026-06-09 开始每日运行：监控 arXiv 上 AI Agent / MCP 方向的论文，Ollama 生成结构化中文研判。这是全部 ${days.length} 天运行结果的索引，共收录 **${totalPapers} 篇**论文。`,
    "",
    `> 原理与构建过程见博客文章《[ScholarPulse](/posts/260615_scholarpulse/)》。这里只看产出。`,
    "",
    monthRows.join("\n\n"),
    "",
    "*本索引由同步脚本自动重建，数据源为 Obsidian Vault，页面内容以 vault 最新版为准。*",
    "",
  ].join("\n");
  writeFileSync(PULSE_IDX, idxFrontmatter + idxBody);
  changed.push("index.md");

  // ---------- 列表唯一入口文章 ----------
  const postBody = [
    "那篇讲原理的文章（《ScholarPulse》）发布后，它一直在后台跑。到今天，**${days.length} 天、${totalPapers} 篇**论文研判全部落盘。",
    "",
    `运行实录在这里：[**ScholarPulse 运行实录 · 总索引**](/pulse/index/)`,
    "",
    "点进去按月份翻，每天一个入口，每篇论文有结论、内容、价值判断和原始摘要。内容每天自动同步——你在 vault 里改过的版本，当晚就会发上线。",
    "",
    `> 生成于 ${today}，${days.length} 个日报页面全部校验通过。`,
    "",
  ].join("\n");
  const post = [
    "---",
    "title: 'ScholarPulse 运行实录'",
    `pubDatetime: ${today}T00:00:00+08:00`,
    `description: '100 天学术监测的完整产出索引：每日论文速览、深度研判与原始摘要。'`,
    "tags: [ScholarPulse, 学术监测, AI-Agent, 索引]",
    "---",
    "",
    postBody,
    "",
  ].join("\n");
  writeFileSync(INDEX_POST, post);
  changed.push("列表入口");

  // ---------- 提交 ----------
  writeFileSync(MANIFEST, JSON.stringify(next, null, 2));
  const g = c => execSync(c, { cwd: ROOT, stdio: "pipe" }).toString().trim();
  if (changed.length === 0) {
    console.log("[sync-pulse] 无变更，跳过提交");
    return;
  }
  console.log(`[sync-pulse] 变更 ${changed.length} 项: ${changed.slice(0, 12).join(", ")}${changed.length > 12 ? `…(+${changed.length - 12})` : ""}`);
  console.log("[sync-pulse] 新/改页面:", changed.filter(c => c.startsWith("20")).join(", ") || "(无)");
  if (NO_PUSH) return;
  g("git add src/content/pulse src/content/posts/260616_ScholarPulseLog.md .pulse-manifest.json");
  try {
    g("git commit -m 'pulse: 同步 ScholarPulse 日报 " + today + "（" + changed.filter(c => c.startsWith("20")).length + " 新/改）'");
  } catch (e) {
    if (!/nothing to commit|No local changes/.test(e.message + (e.stdout?.toString() ?? ""))) throw e;
    console.log("[sync-pulse] git 无实质变更");
    return;
  }
  g("git push origin main");
  console.log("[sync-pulse] 已推送，Vercel 接管构建");
}

main().catch(e => {
  console.error("[sync-pulse] 失败:", e.message);
  process.exit(1);
});
