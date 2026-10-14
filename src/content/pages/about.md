---
title: "关于我"
description: "我是杨哲，光学工程硕士在读。这里记录我的天文研究、科研工具、AI 应用与开发实践。"
---

<section class="about-hero" aria-labelledby="about-name">
  <div class="about-intro">
    <p class="about-eyebrow">ABOUT ME</p>
    <h1 id="about-name">杨哲 <span>Jones Ray</span></h1>
    <p class="about-lead">研究天文数据，<br />也把想法写成工具。</p>
    <p class="about-bio">我在上海工程技术大学读光学工程硕士，与中国科学院上海天文台联合培养。平时处理星表和天然卫星观测数据，也写后端、做检索，把重复的科研工作做成工具。</p>
    <div class="about-links">
      <a class="about-button" href="https://me.zheoi.com/" target="_blank" rel="noopener noreferrer">查看简历 <span aria-hidden="true">↗</span></a>
      <a href="https://github.com/yangzhe0" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      <a href="mailto:zhejones@gmail.com">联系我 <span aria-hidden="true">↗</span></a>
    </div>
  </div>
  <div class="about-portrait">
    <img class="about-avatar-light" src="/avatar.png" alt="杨哲的个人头像" width="190" height="220" fetchpriority="high" decoding="async" />
    <img class="about-avatar-dark" src="/avatar-dark.png" alt="杨哲的个人头像" width="190" height="220" decoding="async" />
    <p>天文研究 / 软件开发</p>
  </div>
</section>

<div class="about-notebook">
  <span class="about-note-label">关于这个博客</span>
  <p>这里放研究笔记、开发记录，以及工具从想法到能用的过程。比起只展示一个结果，我也想把数据怎么处理、问题怎么定位、方案为什么这样选写下来。</p>
</div>

<nav class="about-index" aria-label="本页目录">
  <a href="#research">01 研究与论文</a>
  <a href="#projects">02 代表项目</a>
  <a href="#experience">03 实践经历</a>
  <a href="#background">04 背景与技能</a>
</nav>

<section id="research" class="about-section" aria-labelledby="research-title">
  <div class="about-section-heading"><span aria-hidden="true">01</span><h2 id="research-title">研究与论文</h2></div>
  <p class="about-section-intro">我的研究围绕天然卫星天体测量：让来自不同时代、不同参考星表的历史观测，能够在统一的参考系下重新使用。</p>
  <article class="about-paper">
    <p class="about-eyebrow">第一作者论文 · 已发表</p>
    <h3 lang="en">Correction of Star Catalog Positional and Proper-motion Systematic Errors for Natural Satellite Astrometry</h3>
    <p class="about-paper-meta">The Astrophysical Journal Supplement Series · 286:10 · 2026</p>
    <p>以 <strong>Gaia DR3</strong> 为基准，为 <strong>17 套历史星表</strong>构建位置与自行系统误差改正框架。工作包括星表交叉匹配、历元归算、HEALPix 分区、偏差场分析，以及改正表和查询工具的整理。</p>
    <p>改正数据按 Nside 64 / 256 提供，相关产品通过 GitHub 和国家天文科学数据中心开放，供历史观测重处理使用。</p>
    <div class="about-resource-links">
      <a href="https://doi.org/10.3847/1538-4365/ae8d01" target="_blank" rel="noopener noreferrer">阅读论文 <span aria-hidden="true">↗</span></a>
      <a href="https://github.com/yangzhe0/star_catalog_bias" target="_blank" rel="noopener noreferrer">数据与查询工具 <span aria-hidden="true">↗</span></a>
    </div>
    <p class="about-doi">DOI: 10.3847/1538-4365/ae8d01</p>
  </article>
</section>

<section id="projects" class="about-section" aria-labelledby="projects-title">
  <div class="about-section-heading"><span aria-hidden="true">02</span><h2 id="projects-title">代表项目</h2></div>
  <p class="about-section-intro">这两个项目都来自日常科研中的具体需求：论文越来越多，怎样及时发现，又怎样在需要时找回有依据的答案。</p>
  <div class="about-project-grid">
    <article class="about-project">
      <p class="about-eyebrow">论文知识库 / RAG</p>
      <h3>PaperAgent</h3>
      <p class="about-project-subtitle">让答案回到论文原文</p>
      <p>面向天体测量与学术论文库的深度研读与问答系统。已接入 61 篇核心文献，串联 MinerU 深度解析、1600 字符层次感知切片与混合检索，回答严格附带文件来源与可追溯切片。</p>
      <p>结构化问题走倒排索引与确定性过滤，复杂论述进入学术长上下文与长思维链推理内核；Streamlit 经移动端自适应重构，支持连续深度追问与多档模型切换。</p>
      <div class="about-flow" aria-label="项目流程"><span>深度解析</span><span aria-hidden="true">→</span><span>混合检索</span><span aria-hidden="true">→</span><span>思维链推演</span></div>
      <p class="about-stack">Python · MinerU · BGE-M3 · FAISS / BM25 · 响应式 Streamlit</p>
      <div class="about-resource-links"><a href="/posts/260626_paperagent/">开发记录 <span aria-hidden="true">→</span></a><a href="https://github.com/yangzhe0/project_paperagent" target="_blank" rel="noopener noreferrer">代码 <span aria-hidden="true">↗</span></a></div>
    </article>
    <article class="about-project">
      <p class="about-eyebrow">文献监测 / 自动化</p>
      <h3>ScholarPulse</h3>
      <p class="about-project-subtitle">把找论文变成日常流程</p>
      <p>从 arXiv 增量发现论文，完成跨版本去重、结构化中文研判和 Obsidian 归档，以配置区分不同研究方向。</p>
      <p>处理重复执行、原子写入和模型失败降级；另将按需调研封装为 Literature Brief Skill，检索多类来源并输出开放 PDF 链接与 BibTeX。</p>
      <div class="about-flow" aria-label="项目流程"><span>定向发现</span><span aria-hidden="true">→</span><span>筛选研判</span><span aria-hidden="true">→</span><span>知识归档</span></div>
      <p class="about-stack">Python CLI · Ollama · Obsidian · systemd · Skills</p>
      <div class="about-resource-links"><a href="/posts/260615_scholarpulse/">开发记录 <span aria-hidden="true">→</span></a><a href="https://github.com/yangzhe0/project_scholarpulse" target="_blank" rel="noopener noreferrer">代码 <span aria-hidden="true">↗</span></a></div>
    </article>
  </div>
</section>

<section id="experience" class="about-section" aria-labelledby="experience-title">
  <div class="about-section-heading"><span aria-hidden="true">03</span><h2 id="experience-title">实践经历</h2></div>
  <article class="about-experience">
    <div class="about-entry-heading"><h3>达观数据 <span>DataGrand</span></h3><p>2026.07 — 2026.11</p></div>
    <p class="about-role">开发工程师实习生</p>
    <p>在真实业务里做搜索、审计和数据看板，也处理那些不太显眼、却会直接影响系统行为的配置与数据问题。</p>
    <dl class="about-work-list">
      <div><dt>邮储银行智能搜索</dt><dd>梳理召回策略从 MySQL、Redis 到 Elasticsearch 的执行链路，修复排除和范围筛选问题，核对数据库 JSON 表单定义与配置差异。</dd></div>
      <div><dt>中信建投监管报送</dt><dd>参与操作审计与变更追溯开发，处理事件记录、业务快照、事务一致性、操作人绑定和敏感字段脱敏。</dd></div>
      <div><dt>兴业银行智能搜索</dt><dd>迁移搜索运营看板并接入宿主应用，联调真实统计接口，处理分页、聚合与指标口径；物料点击链路仍在联调。</dd></div>
    </dl>
    <p class="about-small-note">另外参与盘古 API 平台公共参数配置，处理请求参数复用、JSON 文件持久化与缓存恢复。</p>
  </article>
  <article class="about-experience">
    <div class="about-entry-heading"><h3>上海科技馆（天文馆）</h3><p>2026.07 — 2026.09</p></div>
    <p class="about-role">天文研究中心 · 实习</p>
    <p>围绕 Euclid / CSST 巡天特展，整理官方资料、开放论文与样例数据，建立可追溯的来源索引。用 Python 校验和分析代表性数据，完成研究报告、交接说明与内部 HTML 展览原型，把科学内容整理成可讨论的展示方案。</p>
  </article>
</section>

<section id="background" class="about-section" aria-labelledby="background-title">
  <div class="about-section-heading"><span aria-hidden="true">04</span><h2 id="background-title">背景与技能</h2></div>
  <div class="about-background-grid">
    <div>
      <h3 class="about-small-heading">教育背景</h3>
      <div class="about-education"><h4>上海工程技术大学</h4><p>光学工程 · 硕士在读</p><p>中国科学院上海天文台联合培养</p><span>2024.09 — 2027.06</span></div>
      <div class="about-education"><h4>郑州财经学院</h4><p>数据科学与大数据技术 · 本科</p><span>2020.09 — 2024.06</span></div>
      <a class="about-certificate" href="https://me.zheoi.com/cert" target="_blank" rel="noopener noreferrer">计算机程序设计员 · 三级 / 高级工 <span aria-hidden="true">↗</span></a>
    </div>
    <div>
      <h3 class="about-small-heading">常用技术与方法</h3>
      <dl class="about-skills">
        <div><dt>科研与数据</dt><dd>Python、NumPy / Pandas、Astropy、HEALPix、Matplotlib；星表匹配、历元归算与偏差分析。</dd></div>
        <div><dt>应用与检索</dt><dd>FastAPI / Flask、SQLAlchemy、React / TypeScript、Elasticsearch、RAG 与本地模型应用。</dd></div>
        <div><dt>工程与工作流</dt><dd>Git、Linux、Docker、CLI 与 Skills；让流程可重复执行，让数据和错误有迹可查。</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="about-closing" aria-labelledby="contact-title">
  <div><p class="about-eyebrow">保持交流</p><h2 id="contact-title">关于研究、代码，或一个新想法。</h2><p>如果你也在做天文数据处理、科研工具或 AI 应用，欢迎交流。</p></div>
  <a href="mailto:zhejones@gmail.com">zhejones@gmail.com <span aria-hidden="true">↗</span></a>
  <p class="about-resume-links">完整经历：<a href="https://me.zheoi.com/" target="_blank" rel="noopener noreferrer">开发</a><span aria-hidden="true"> / </span><a href="https://me.zheoi.com/ai" target="_blank" rel="noopener noreferrer">AI 应用</a><span aria-hidden="true"> / </span><a href="https://me.zheoi.com/astro" target="_blank" rel="noopener noreferrer">天文科研</a></p>
</section>
