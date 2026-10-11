import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "scripts/sync-pulse.mjs"));
mkdirSync(join(root, ".cache"), { recursive: true });
const temp = mkdtempSync(join(root, ".cache/sync-pulse-test-"));
after(() => rmSync(temp, { recursive: true, force: true }));
const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
const env = { ...process.env, GIT_AUTHOR_NAME: "Sync test", GIT_AUTHOR_EMAIL: "sync-test@example.invalid", GIT_COMMITTER_NAME: "Sync test", GIT_COMMITTER_EMAIL: "sync-test@example.invalid", GIT_TERMINAL_PROMPT: "0" };
const git = (cwd, ...args) => execFileSync(realGit, args, { cwd, env, encoding: "utf8", stdio: "pipe" }).trim();
const daily = date => `---\ntitle: '源日报'\n---\n\n### 1. 论文 ${date}\n\n**来源**： [原文](https://arxiv.org/abs/1234.56789)\n\n#### 一句话结论\n真实结论 ${date}\n\n> [!abstract]- 原始摘要\n> 摘要内容\n`;
let serial = 0;
function fixture() {
  const dir = join(temp, String(++serial));
  const repo = join(dir, "repo"), vault = join(dir, "vault");
  for (const p of ["scripts", "src/content/posts", "src/content/pulse"]) mkdirSync(join(repo, p), { recursive: true });
  mkdirSync(vault);
  writeFileSync(join(repo, "scripts/sync-pulse.mjs"), source);
  writeFileSync(join(vault, "2005-01-01.md"), daily("2005-01-01"));
  return { dir, repo, vault };
}
function sync(f, push = false, extra = {}) {
  return spawnSync(process.execPath, [join(f.repo, "scripts/sync-pulse.mjs"), ...(push ? [] : ["--no-push"])], { cwd: f.repo, env: { ...env, SCHOLAR_PULSE_DIR: f.vault, ...extra }, encoding: "utf8" });
}
function ok(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const index = f => readdirSync(join(f.repo, "src/content/posts")).filter(n => n.endsWith("_ScholarPulseLog.md"));
const manifest = f => JSON.parse(readFileSync(join(f.repo, ".pulse-manifest.json"), "utf8"));
function snapshot(f) {
  const paths = [".pulse-manifest.json", ...readdirSync(join(f.repo, "src/content/pulse")).map(n => "src/content/pulse/" + n), ...index(f).map(n => "src/content/posts/" + n)];
  return paths.map(p => [p, readFileSync(join(f.repo, p), "utf8"), String(statSync(join(f.repo, p), { bigint: true }).mtimeNs)]);
}
function remoteFixture() {
  const f = fixture();
  ok(sync(f));
  git(f.repo, "init", "--initial-branch=main");
  git(f.repo, "add", "."); git(f.repo, "commit", "-m", "baseline");
  f.remote = join(f.dir, "remote.git"); f.writer = join(f.dir, "writer");
  git(f.dir, "init", "--bare", "--initial-branch=main", f.remote);
  git(f.repo, "remote", "add", "origin", f.remote); git(f.repo, "push", "-u", "origin", "main");
  git(f.dir, "clone", f.remote, f.writer);
  return f;
}
function race(f, mode) {
  const bin = join(f.dir, "bin"), marker = join(f.dir, "push-attempted");
  mkdirSync(bin);
  const program = `#!/usr/bin/env node
import fs from 'node:fs'; import cp from 'node:child_process';
const args = process.argv.slice(2), marker = ${JSON.stringify(marker)}, writer = ${JSON.stringify(f.writer)}, git = ${JSON.stringify(realGit)};
const run = a => cp.execFileSync(git, a, {cwd:writer,stdio:'pipe'});
if (args[0] === 'push' && !fs.existsSync(marker)) {
 fs.writeFileSync(marker, 'attempted');
 if (${JSON.stringify(mode)} === 'network') { console.error('fatal: simulated temporary network failure'); process.exit(128); }
 const path = ${JSON.stringify(mode)} === 'conflict' ? 'src/content/posts/050101_ScholarPulseLog.md' : 'remote-note.txt';
 if (${JSON.stringify(mode)} === 'conflict') {
  fs.writeFileSync(writer + '/' + path, fs.readFileSync(writer + '/' + path, 'utf8').replace('pubDatetime: 2005-01-01', 'pubDatetime: 2005-01-03'));
 } else { fs.appendFileSync(writer + '/' + path, '\\nremote update\\n'); }
 run(['add', '--', path]); run(['commit', '-m', 'remote update']); run(['push', 'origin', 'main']);
}
const p = cp.spawnSync(git, args, {stdio:'inherit'}); process.exit(p.status ?? 1);
`;
  writeFileSync(join(bin, "git"), program); chmodSync(join(bin, "git"), 0o755);
  return { PATH: bin + ":" + process.env.PATH };
}
const noRebase = f => {
  assert.ok(!existsSync(join(f.repo, ".git/rebase-merge")) && !existsSync(join(f.repo, ".git/rebase-apply")));
  assert.equal(git(f.repo, "status", "--porcelain"), "");
};

test("最新日报决定入口日期；重复同步连 mtime 和 manifest 都不改变", () => {
  const f = fixture();
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  writeFileSync(join(f.repo, "src/content/posts/991231_ScholarPulseLog.md"), "旧入口");
  ok(sync(f));
  assert.deepEqual(index(f), ["050102_ScholarPulseLog.md"]);
  const post = readFileSync(join(f.repo, "src/content/posts/050102_ScholarPulseLog.md"), "utf8");
  assert.ok(post.includes("pubDatetime: 2005-01-02T00:00:00+08:00"));
  assert.ok(!post.includes("100 天"));
  const before = snapshot(f);
  assert.match(ok(sync(f)), /无变更，跳过提交/);
  assert.deepEqual(snapshot(f), before);
});

test("CRLF 只在解析时规范化；输出不重复 frontmatter，哈希仍对应原文", () => {
  const f = fixture(), raw = daily("2005-01-01").replace(/\n/g, "\r\n");
  writeFileSync(join(f.vault, "2005-01-01.md"), raw);
  ok(sync(f));
  assert.equal(manifest(f)["2005-01-01"].hash, createHash("sha256").update(raw).digest("hex"));
  const output = readFileSync(join(f.repo, "src/content/pulse/2005-01-01.md"), "utf8");
  assert.equal((output.match(/^---$/gm) || []).length, 2);
  assert.ok(!output.includes("源日报") && !output.includes("\r"));
  assert.ok(output.includes("<details>") && output.includes("真实结论"));
  assert.ok(readFileSync(join(f.repo, "src/content/posts/050101_ScholarPulseLog.md"), "utf8").includes("真实结论 2005-01-01"));
});

test("源哈希未变时补回缺失日报，旧入口清理也能实际生效", () => {
  const f = fixture(); ok(sync(f));
  rmSync(join(f.repo, "src/content/pulse/2005-01-01.md"));
  writeFileSync(join(f.repo, "src/content/posts/991231_ScholarPulseLog.md"), "旧入口");
  ok(sync(f));
  assert.ok(existsSync(join(f.repo, "src/content/pulse/2005-01-01.md")));
  assert.deepEqual(index(f), ["050101_ScholarPulseLog.md"]);
  assert.match(ok(sync(f)), /无变更，跳过提交/);
});

test("先拉取远端 manifest 和改名入口，再生成；不会制造冲突提交", () => {
  const f = remoteFixture();
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  ok(sync({ ...f, repo: f.writer }));
  git(f.writer, "add", "."); git(f.writer, "commit", "-m", "remote daily"); git(f.writer, "push", "origin", "main");
  const remoteHead = git(f.writer, "rev-parse", "HEAD");
  assert.match(ok(sync(f, true)), /无变更，跳过提交/);
  assert.equal(git(f.repo, "rev-parse", "HEAD"), remoteHead);
  noRebase(f);
});

test("生成提交后远端再次更新，可重新拉取并推送，保留双方历史", () => {
  const f = remoteFixture(), extra = race(f, "unrelated");
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  assert.match(ok(sync(f, true, extra)), /重新拉取后重试一次/);
  assert.ok(existsSync(join(f.repo, "remote-note.txt")));
  assert.equal(git(f.repo, "rev-parse", "HEAD"), git(f.remote, "rev-parse", "main"));
  assert.equal(git(f.repo, "rev-list", "--count", "HEAD"), "3");
  noRebase(f);
});

test("真实生成内容冲突时撤销本次 rebase，原本地提交保留", () => {
  const f = remoteFixture(), extra = race(f, "conflict");
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  const result = sync(f, true, extra);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /已撤销本次 rebase/);
  assert.equal(git(f.repo, "rev-list", "--count", "HEAD"), "2");
  noRebase(f);
});

test("推送暂时失败后，下次无新日报也会继续推送已有提交", () => {
  const f = remoteFixture(), extra = race(f, "network");
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  assert.notEqual(sync(f, true, extra).status, 0);
  const head = git(f.repo, "rev-parse", "HEAD");
  const result = ok(sync(f, true, extra));
  assert.match(result, /无变更，跳过提交/);
  assert.match(result, /已推送/);
  assert.equal(git(f.repo, "rev-parse", "HEAD"), head);
  assert.equal(git(f.remote, "rev-parse", "main"), head);
  noRebase(f);
});


test("已有其他暂存修改时，在生成前停止，保留用户修改", () => {
  const f = remoteFixture();
  writeFileSync(join(f.repo, "user-note.md"), "尚未准备发布的内容");
  git(f.repo, "add", "user-note.md");
  writeFileSync(join(f.vault, "2005-01-02.md"), daily("2005-01-02"));
  const before = snapshot(f), staged = git(f.repo, "diff", "--cached");
  const result = sync(f, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /暂存区已有其他修改/);
  assert.deepEqual(snapshot(f), before);
  assert.equal(git(f.repo, "diff", "--cached"), staged);
});
