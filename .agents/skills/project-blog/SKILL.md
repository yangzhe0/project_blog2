---
name: project-blog
description: Create, adapt, edit, illustrate, review, commit, and publish Chinese posts in this AstroPaper blog repository. Preserve its Astro content schema, flat post layout, YYMMDD filenames, local numbered image assets, Markdown/MDX conventions, and Git workflow. Use for blog content work; do not use for theme development or deployment configuration unless explicitly requested.
metadata:
  short-description: 按本仓库规范撰写、配图并发布文章
---

# Project Blog

Use this repository-local skill for the user's Chinese AstroPaper blog. It handles article content and inline illustrations. It does not create cover images: never generate an image merely to fill `ogImage`, and do not add `ogImage` to a new post unless the user explicitly supplies or requests social-preview metadata.

## Locate and protect the repository

1. Resolve the checkout with `git rev-parse --show-toplevel`; do not hard-code an absolute path.
2. Confirm `git remote get-url origin` identifies `yangzhe0/project_blog2` in SSH or HTTPS form (ignore an optional `.git` suffix).
3. Confirm the checkout contains `src/content.config.ts`, `src/content/posts/`, and `src/content/posts/image/`.
4. Inspect `git status --short` and the current branch before editing. Preserve unrelated work. If a dirty change overlaps the requested article or asset, stop and report the conflict.

Never use reset, clean, checkout, broad deletion, or bulk overwrite. Do not change the theme, components, dependencies, deployment files, or historical posts unless the user separately requests that work.

## Repository content contract

Posts are flat Markdown or MDX files under `src/content/posts/`. Images are flat files under `src/content/posts/image/`.

For a new Markdown post, use this minimal frontmatter in this order:

```yaml
---
title: '文章标题'
pubDatetime: YYYY-MM-DD
description: '用于文章列表和 SEO 的简短中文摘要'
tags: [Tag1, Tag2]
draft: false
---
```

Rules:

- Verify the live schema in `src/content.config.ts` before writing. `title`, `pubDatetime`, and `description` are required; `tags` and `draft` follow the established repository style.
- Use filename form `YYMMDD_Title.md`, matching `pubDatetime`. Inspect neighboring posts before choosing the English or romanized title segment.
- Quote YAML strings when punctuation, colons, apostrophes, or other syntax could be ambiguous.
- Reuse established tags when suitable; add a concise new tag only when it improves classification.
- Do not carry over obsolete Fuwari fields such as `published`, `image`, or `category`.
- Do not add `ogImage` by default. Existing posts may keep it for social previews, but the field is not part of the new-post workflow and does not replace a body image.
- Use `modDatetime` only when the user wants a meaningful revision date. Other optional schema fields require a concrete need.
- Preserve Markdown math syntax. Use `$...$` for inline math and `$$...$$` for display math; do not replace LaTeX with images.

## Adapt source material

When the user supplies a URL, document, notes, or another article:

1. Read the supplied material and disclose if it is unavailable, incomplete, or paywalled.
2. Separate source facts from the user's own experience and opinions.
3. Produce either the requested summary or an independently structured Chinese article. Ask only if that choice would materially change the result.
4. Write in a direct, practical Chinese style. Do not translate line by line, imitate distinctive wording, or present someone else's experience as the user's.
5. Do not invent tests, screenshots, commands, results, dates, or personal claims. Qualify uncertain or source-reported claims.
6. Paraphrase by default, attribute material sources, and use only short necessary quotations.
7. Verify technical or time-sensitive claims against authoritative sources when browsing is available.

Escape a literal pipe inside Markdown table cells as `\|` so it does not split the table.

## Inline images and drawings

Images are optional and must serve the article body. Do not create a cover-only asset.

Every local image uses `YYMMDD_01.ext`, `YYMMDD_02.ext`, and so on, where the prefix matches the post date and the suffix is the next unused number for that article. Never overwrite an existing asset unless the user explicitly authorizes replacement.

Insert a local asset with a descriptive alt text:

```markdown
![图中表达的内容](./image/YYMMDD_01.ext)
```

Keep attribution immediately below an externally sourced photo when its license or provider requires it.

### Draw an explanatory SVG

For concepts, comparisons, processes, or architecture, prefer a purpose-built diagram over a decorative image. The included generator creates an accessible inline flow diagram, not a cover:

```bash
python <SKILL_ROOT>/scripts/generate_svg_diagram.py \
  --output src/content/posts/image/YYMMDD_01.svg \
  --title "图示标题" \
  --node "步骤一|一句解释" \
  --node "步骤二|一句解释" \
  --node "步骤三|一句解释"
```

Use 2–5 short nodes. After generation, parse the SVG as XML and render it when a browser or SVG renderer is available. Check text wrapping, connector order, contrast, and mobile readability. Insert it in the relevant body section; never set it as `ogImage` just because it exists.

For a bespoke chart, architecture diagram, or illustration, adapt the SVG to the article rather than forcing the generic flow layout. Keep labels in Chinese, include `<title>` and `<desc>`, avoid embedded external resources, and retain a useful `viewBox`.

### Search and download a photo

For a concrete subject or scene, search Unsplash with specific English keywords and download the selected result locally:

```bash
python <SKILL_ROOT>/tools/image_search.py \
  --object "university student studying library" \
  --output src/content/posts/image/YYMMDD_01.jpg
```

The tool prints the Markdown image line and attribution after downloading. Review the result for relevance and quality before inserting both lines. Do not leave a remote hotlink in the article.

The tool reads `UNSPLASH_ACCESS_KEY` from `<SKILL_ROOT>/.env`. Copy `.env.example` to `.env`, add the key, and never commit that file.

## Create or edit a post

1. Inspect `src/content.config.ts`, the target post if editing, and one or two nearby posts.
2. Choose a non-conflicting post filename and image suffixes. Preserve an existing filename unless a rename is explicitly requested.
3. Draft or edit only the requested article. Add only images actually used in its body.
4. Check headings, links, code fences, tables, LaTeX delimiters, image paths, and attribution.
5. Review `git diff` and `git status`. Check frontmatter validity, date/filename consistency, missing assets, unsupported fields, secrets, scratch files, and unrelated changes.
6. Run a site build only when the change affects MDX/rendering or the user requests it. For ordinary Markdown content, a focused diff and path check are sufficient.

## Commit and publish

Commit only when authorized. Stage exact article, asset, or skill paths; never use `git add .`. Use a short message matching the change, normally `feat：简短说明` for a new post and `fix：简短说明` for a correction.

Treat `git push` as publication. Push only when the user explicitly asks, then report the branch, commit, and remote. Do not claim that the deployed website is live merely because GitHub accepted the push.

## Stop conditions

Ask before proceeding only when the repository identity is ambiguous, an overlapping dirty change exists, requested metadata conflicts with the live schema, the source cannot support a factual claim, or a destructive rename/removal is requested. Otherwise make the smallest content-scoped change that satisfies the request.
