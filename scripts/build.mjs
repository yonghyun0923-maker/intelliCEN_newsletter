// scripts/build.mjs
/*
 * ============================================================
 * 파일명    : build.mjs
 * 기능      : issues/* 순회 → 이메일HTML+사이트+목록을 docs/ 에 생성
 * 작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
 * 작성일    : 2026-09-03
 * ============================================================
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import juice from 'juice';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { rewriteImageUrls } from './lib/images.mjs';
import { sortIssues } from './lib/issues.mjs';
import { renderEmail, renderSitePage, renderIndex } from './lib/render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_BASE = 'https://yonghyun0923-maker.github.io/intelliCEN_newsletter';
const ISSUES_DIR = join(ROOT, 'issues');
const DOCS_DIR = join(ROOT, 'docs');
const TEMPLATE = readFileSync(join(ROOT, 'template', 'email.html'), 'utf8');
const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

function build() {
  // docs 초기화
  if (existsSync(DOCS_DIR)) rmSync(DOCS_DIR, { recursive: true, force: true });
  mkdirSync(join(DOCS_DIR, 'assets'), { recursive: true });
  cpSync(join(ROOT, 'template', 'site.css'), join(DOCS_DIR, 'assets', 'site.css'));

  const slugs = readdirSync(ISSUES_DIR).filter((n) => statSync(join(ISSUES_DIR, n)).isDirectory());
  const built = [];

  for (const slug of slugs) {
    const srcDir = join(ISSUES_DIR, slug);
    const raw = readFileSync(join(srcDir, 'index.md'), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const issueUrl = `${PAGES_BASE}/issues/${slug}/`;
    const baseUrl = `${PAGES_BASE}/issues/${slug}`;

    const bodyHtml = rewriteImageUrls(md.render(body), baseUrl);
    const rawEmail = renderEmail({ meta, bodyHtml, issueUrl, template: TEMPLATE });
    const emailInlined = juice(rawEmail);

    const outDir = join(DOCS_DIR, 'issues', slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'email.html'), emailInlined, 'utf8');
    writeFileSync(join(outDir, 'index.html'),
      renderSitePage({ emailHtmlInlined: emailInlined, meta, rawEmailSource: emailInlined }), 'utf8');

    const imgSrc = join(srcDir, 'images');
    if (existsSync(imgSrc)) cpSync(imgSrc, join(outDir, 'images'), { recursive: true });

    built.push({ slug, meta, url: `issues/${slug}/` });
  }

  const sorted = sortIssues(built);
  writeFileSync(join(DOCS_DIR, 'index.html'), renderIndex(sorted), 'utf8');
  console.log(`빌드 완료: ${built.length}개 호 → docs/`);
}

build();
