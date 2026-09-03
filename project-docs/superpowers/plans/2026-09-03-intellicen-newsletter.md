# intelliCEN 뉴스레터 관리 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Markdown 으로 작성한 뉴스레터를 GitHub 에 커밋하면 빌드가 이메일용 HTML + 브라우징용 정적 사이트를 생성하고, GitHub Pages 로 영구 호스팅하여 사용자가 직접 발송할 수 있게 한다.

**Architecture:** SVN 인 PMS 와 별개인 신규 git 저장소. `issues/<slug>/index.md`(Markdown+frontmatter)를 경량 Node 스크립트(`build.mjs`)가 순회하여 ①이메일 HTML(`juice` 인라인화) ②개별 호 브라우징+발송 페이지 ③전체 목록을 `docs/`(=Pages 루트)에 생성한다. 이미지·페이지는 GitHub Pages 공개 절대 URL 로 참조되어 수신자·미래 열람 모두 항상 로드된다.

**Tech Stack:** Node.js(LTS), `markdown-it`(본문 변환), `gray-matter`(frontmatter 파싱), `juice`(CSS 인라인화), `node:test`(내장 테스트), GitHub Actions + GitHub Pages.

**Spec:** `project-docs/superpowers/specs/2026-09-03-intellicen-newsletter-design.md`

## Global Constraints

- **⚠️ `docs/` 는 GitHub Pages 빌드 산출물 전용 디렉터리다 (Task 6, 실제 사고로 확인됨)**: `scripts/build.mjs` 가 매 빌드마다 `docs/` 를 통째로 `rm` 후 재생성한다(GitHub Pages "Deploy from branch" 가 폴더로 `/` 또는 `/docs` 만 지원하므로 Pages 루트는 반드시 `docs/` 여야 한다). 이 스펙·계획 문서를 포함한 **손으로 쓴 문서는 `docs/` 에 두지 않는다** — `project-docs/` 사용(Task 6 에서 `docs/superpowers/{specs,plans}/` 가 실제로 빌드에 삭제되어 `project-docs/` 로 이관한 이력 있음). `.superpowers/`(SDD 작업공간)도 `.gitignore` 에 추가되어 있다.
- **저장소**: `C:\IntelliJ\svn\intellicen-newsletter` — SVN 인 `pms_v2.4` 와 **완전 별개인 git 저장소**. PMS 코드는 절대 건드리지 않는다.
- **owner / repo**: `yonghyun0923-maker` / `intelliCEN_newsletter`.
- **Pages 루트 URL (상수, 하드코딩 금지 — `PAGES_BASE` 상수 1곳)**: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter`
- **인증정보 금지**: GitHub 비밀번호·토큰을 코드·문서·커밋에 **절대 포함하지 않는다**. push·인증은 사용자가 직접 수행한다. 이 계획의 어떤 단계도 `git push` 를 실행하지 않는다.
- **의존성 최소화**: SSG·번들러 도입 금지. 위 4개 라이브러리 외 추가는 스펙 재검토 필요.
- **frontmatter 필수 필드**: `title`, `date`(YYYY-MM-DD), `summary`. 누락·형식오류 시 빌드 실패시킨다.
- **이미지 참조**: 본문은 `![alt](images/파일)` 상대경로. 빌드가 `PAGES_BASE/issues/<slug>/images/파일` 절대 URL 로 치환.
- **이메일 HTML**: `<style>` 블록을 반드시 `juice` 로 인라인 `style=` 속성화(Gmail/Outlook 호환).
- **파일 헤더 주석**: 각 소스 파일 상단에 파일명·기능·작성자 주석(작성자 `김용현(adminpms03) + Claude Code(claude-opus-4-8)`).
- **커밋**: 각 태스크 종료 시 소단위 커밋. 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

| 파일 | 책임 | 태스크 |
|------|------|--------|
| `package.json` | 의존성·`build`/`test` 스크립트 정의 | T1 |
| `.gitignore` | `node_modules/` 등 제외 | T1 |
| `scripts/lib/frontmatter.mjs` | `parseFrontmatter(raw)` — frontmatter 파싱+필수검증 | T2 |
| `scripts/lib/images.mjs` | `rewriteImageUrls(html, baseUrl)` — 상대이미지→절대URL | T3 |
| `scripts/lib/issues.mjs` | `sortIssues(list)` — 최신순 정렬 | T4 |
| `scripts/lib/render.mjs` | `renderEmail`, `renderSitePage`, `renderIndex` — HTML 조립 | T5 |
| `template/email.html` | 이메일 래퍼(600px 테이블 + 인라인화 대상 `<style>`) | T5 |
| `template/site.css` | 브라우징 사이트 전용 스타일 | T6 |
| `scripts/build.mjs` | 빌드 진입점 — 위 lib 조합 + 파일 I/O + `juice` | T6 |
| `issues/2026-09-vol01/index.md` (+images) | 샘플 호(스모크 테스트용) | T6 |
| `.github/workflows/build.yml` | push 시 빌드 자동화 | T7 |
| `README.md` | 작성·발송·Pages 설정 절차 | T8 |
| `scripts/lib/*.test.mjs` | 순수 함수 단위 테스트 | T2~T5 |

**설계 원칙:** 순수 함수(파싱·치환·정렬·렌더)를 `scripts/lib/` 에 파일 I/O 없이 분리하여 `node:test` 로 단위 테스트한다. `build.mjs` 는 이들을 조합하고 디스크 읽기/쓰기와 `juice` 인라인화만 담당한다.

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: (없음)
- Produces: `npm run build` → `node scripts/build.mjs`, `npm test` → `node --test`. 의존성 `markdown-it`, `gray-matter`, `juice`.

- [ ] **Step 1: `.gitignore` 작성**

```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 2: `package.json` 작성**

```json
{
  "name": "intellicen-newsletter",
  "version": "1.0.0",
  "description": "intelliCEN PMS 뉴스레터 관리 시스템",
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "node --test"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "juice": "^11.0.0",
    "markdown-it": "^14.1.0"
  }
}
```

- [ ] **Step 3: 의존성 설치 및 확인**

Run: `cd "C:/IntelliJ/svn/intellicen-newsletter" && npm install`
Expected: `node_modules/` 생성, 에러 없이 완료. `npm ls markdown-it gray-matter juice` 로 3개 설치 확인.

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore package-lock.json
git commit -m "chore: 프로젝트 스캐폴딩(package.json, gitignore)"
```

---

### Task 2: frontmatter 파싱 (`parseFrontmatter`)

**Files:**
- Create: `scripts/lib/frontmatter.mjs`
- Test: `scripts/lib/frontmatter.test.mjs`

**Interfaces:**
- Consumes: `gray-matter`
- Produces: `parseFrontmatter(raw: string) => { meta: { title, date, summary, links }, body: string }`. `links` 는 `[{label,url}]` 또는 `[]`. 필수 필드(`title`,`summary`) 누락 또는 `date` 가 `YYYY-MM-DD` 형식이 아니면 `Error` throw.

- [ ] **Step 1: Write the failing test**

```javascript
// scripts/lib/frontmatter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './frontmatter.mjs';

const valid = `---
title: 9월 뉴스레터
date: 2026-09-15
summary: 요약입니다
links:
  - label: 자세히
    url: https://example.com
---
# 본문
내용`;

test('유효한 frontmatter 를 파싱한다', () => {
  const { meta, body } = parseFrontmatter(valid);
  assert.equal(meta.title, '9월 뉴스레터');
  assert.equal(meta.date, '2026-09-15');
  assert.equal(meta.summary, '요약입니다');
  assert.deepEqual(meta.links, [{ label: '자세히', url: 'https://example.com' }]);
  assert.match(body, /# 본문/);
});

test('links 가 없으면 빈 배열이다', () => {
  const raw = `---\ntitle: t\ndate: 2026-01-01\nsummary: s\n---\n본문`;
  const { meta } = parseFrontmatter(raw);
  assert.deepEqual(meta.links, []);
});

test('title 누락 시 에러', () => {
  const raw = `---\ndate: 2026-01-01\nsummary: s\n---\n본문`;
  assert.throws(() => parseFrontmatter(raw), /title/);
});

test('date 형식 오류 시 에러', () => {
  const raw = `---\ntitle: t\ndate: 2026/01/01\nsummary: s\n---\n본문`;
  assert.throws(() => parseFrontmatter(raw), /date/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/frontmatter.test.mjs`
Expected: FAIL — `parseFrontmatter` is not a function / 모듈 없음.

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/lib/frontmatter.mjs
/*
 * ============================================================
 * 파일명    : frontmatter.mjs
 * 기능      : 뉴스레터 index.md 의 frontmatter 파싱 + 필수필드 검증
 * 작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
 * 작성일    : 2026-09-03
 * ============================================================
 */
import matter from 'gray-matter';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFrontmatter(raw) {
  const { data, content } = matter(raw);
  if (!data.title) throw new Error('frontmatter: title 은 필수입니다');
  if (!data.summary) throw new Error('frontmatter: summary 는 필수입니다');
  if (!data.date || !DATE_RE.test(String(data.date))) {
    throw new Error('frontmatter: date 는 YYYY-MM-DD 형식이어야 합니다');
  }
  const links = Array.isArray(data.links)
    ? data.links.map((l) => ({ label: l.label, url: l.url }))
    : [];
  return {
    meta: { title: data.title, date: String(data.date), summary: data.summary, links },
    body: content,
  };
}
```

> 주의: `gray-matter` 가 `date:` 를 Date 객체로 변환할 수 있으므로 `String(data.date)` 검증 전에 원본 문자열 확인이 필요하면 `matter(raw, { engines: { yaml: ... } })` 대신 정규식 검증으로 충분. 테스트가 `2026/01/01` 을 거부하는지로 검증한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/frontmatter.test.mjs`
Expected: PASS (4 tests). date 가 Date 로 파싱되어 `2026/01/01` 케이스가 통과하지 못하면 `matter(raw)` 결과의 `data.date` 를 원본에서 정규식으로 재추출하도록 보완.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/frontmatter.mjs scripts/lib/frontmatter.test.mjs
git commit -m "feat: frontmatter 파싱+검증(parseFrontmatter)"
```

---

### Task 3: 이미지 URL 절대화 (`rewriteImageUrls`)

**Files:**
- Create: `scripts/lib/images.mjs`
- Test: `scripts/lib/images.test.mjs`

**Interfaces:**
- Consumes: (없음 — 순수 문자열 처리)
- Produces: `rewriteImageUrls(html: string, baseUrl: string) => string`. `src="images/x.png"` 또는 `src='images/x.png'` 를 `src="<baseUrl>/images/x.png"` 로 치환. 이미 절대 URL(`http`)인 것은 그대로 둔다.

- [ ] **Step 1: Write the failing test**

```javascript
// scripts/lib/images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteImageUrls } from './images.mjs';

const BASE = 'https://yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/2026-09-vol01';

test('상대 이미지 경로를 절대 URL 로 치환한다', () => {
  const html = `<img src="images/shot.png" alt="샷">`;
  const out = rewriteImageUrls(html, BASE);
  assert.equal(out, `<img src="${BASE}/images/shot.png" alt="샷">`);
});

test('홑따옴표 src 도 치환한다', () => {
  const html = `<img src='images/a.jpg'>`;
  const out = rewriteImageUrls(html, BASE);
  assert.match(out, new RegExp(`${BASE.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/images/a\\.jpg`));
});

test('이미 절대 URL 인 이미지는 그대로 둔다', () => {
  const html = `<img src="https://other.com/x.png">`;
  assert.equal(rewriteImageUrls(html, BASE), html);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/images.test.mjs`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/lib/images.mjs
/*
 * ============================================================
 * 파일명    : images.mjs
 * 기능      : 본문 HTML 의 상대 이미지 경로를 GitHub Pages 절대 URL 로 치환
 * 작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
 * 작성일    : 2026-09-03
 * ============================================================
 */
export function rewriteImageUrls(html, baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  return html.replace(
    /(<img\b[^>]*?\bsrc=)(["'])images\/([^"']+)\2/gi,
    (_m, pre, quote, path) => `${pre}${quote}${base}/images/${path}${quote}`,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/images.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/images.mjs scripts/lib/images.test.mjs
git commit -m "feat: 이미지 상대경로 절대URL 치환(rewriteImageUrls)"
```

---

### Task 4: 호 정렬 (`sortIssues`)

**Files:**
- Create: `scripts/lib/issues.mjs`
- Test: `scripts/lib/issues.test.mjs`

**Interfaces:**
- Consumes: (없음)
- Produces: `sortIssues(list: Array<{slug, meta}>) => Array<...>`. `meta.date` 내림차순(최신 먼저). 동일 날짜는 입력 순서 유지(안정 정렬).

- [ ] **Step 1: Write the failing test**

```javascript
// scripts/lib/issues.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortIssues } from './issues.mjs';

test('date 내림차순으로 정렬한다', () => {
  const input = [
    { slug: 'a', meta: { date: '2026-01-01' } },
    { slug: 'b', meta: { date: '2026-09-15' } },
    { slug: 'c', meta: { date: '2026-05-05' } },
  ];
  const out = sortIssues(input).map((x) => x.slug);
  assert.deepEqual(out, ['b', 'c', 'a']);
});

test('동일 날짜는 입력 순서를 유지한다(안정)', () => {
  const input = [
    { slug: 'x', meta: { date: '2026-01-01' } },
    { slug: 'y', meta: { date: '2026-01-01' } },
  ];
  const out = sortIssues(input).map((x) => x.slug);
  assert.deepEqual(out, ['x', 'y']);
});

test('원본 배열을 변형하지 않는다', () => {
  const input = [{ slug: 'a', meta: { date: '2026-01-01' } }, { slug: 'b', meta: { date: '2026-02-02' } }];
  sortIssues(input);
  assert.equal(input[0].slug, 'a');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/issues.test.mjs`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/lib/issues.mjs
/*
 * ============================================================
 * 파일명    : issues.mjs
 * 기능      : 뉴스레터 호 목록을 발행일 내림차순(안정)으로 정렬
 * 작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
 * 작성일    : 2026-09-03
 * ============================================================
 */
export function sortIssues(list) {
  return [...list].sort((a, b) => (a.meta.date < b.meta.date ? 1 : a.meta.date > b.meta.date ? -1 : 0));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/issues.test.mjs`
Expected: PASS (3 tests). (JS `Array.sort` 는 안정 정렬이므로 동일 날짜는 입력 순서 유지.)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/issues.mjs scripts/lib/issues.test.mjs
git commit -m "feat: 호 목록 최신순 정렬(sortIssues)"
```

---

### Task 5: HTML 렌더링 + 이메일 템플릿 (`render.mjs`, `email.html`)

**Files:**
- Create: `template/email.html`
- Create: `scripts/lib/render.mjs`
- Test: `scripts/lib/render.test.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter`(간접), `rewriteImageUrls`(호출부에서 이미 적용된 본문을 받음), `template/email.html`(문자열 주입).
- Produces:
  - `renderEmail({ meta, bodyHtml, issueUrl, template }) => string` — 인라인화 **전** 이메일 HTML. 반드시 포함: 제목(`meta.title`), 발행일(`meta.date`), 본문(`bodyHtml`), "웹에서 보기" 링크(`issueUrl`), `meta.links` 각 항목. `template` 문자열의 `{{TITLE}}`,`{{DATE}}`,`{{BODY}}`,`{{WEBVIEW_URL}}`,`{{LINKS}}` 플레이스홀더를 치환.
  - `renderSitePage({ emailHtmlInlined, meta, rawEmailSource }) => string` — 브라우징+발송도구 페이지. 발송 도구 2종([전체선택·복사],[HTML 소스 복사]) 포함.
  - `renderIndex(sortedIssues) => string` — 전체 목록 페이지. 각 호의 title·date·summary·링크.

- [ ] **Step 1: `template/email.html` 작성 (인라인화 대상)**

```html
<!--
============================================================
파일명    : email.html
기능      : 뉴스레터 이메일 래퍼(600px 테이블, juice 인라인화 대상 style)
작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
작성일    : 2026-09-03
============================================================
-->
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:0; background:#f4f5f7; }
  .wrap { width:100%; background:#f4f5f7; padding:24px 0; }
  .container { width:600px; max-width:600px; margin:0 auto; background:#ffffff;
    font-family: 'Malgun Gothic','맑은 고딕',Arial,sans-serif; color:#222222; }
  .header { padding:24px 28px 8px; border-bottom:3px solid #0078D7; }
  .brand { font-size:13px; color:#0078D7; font-weight:bold; letter-spacing:.5px; }
  .title { font-size:22px; font-weight:bold; margin:6px 0 4px; }
  .date { font-size:12px; color:#888888; }
  .webview { font-size:12px; color:#0078D7; text-decoration:none; }
  .body { padding:20px 28px; font-size:15px; line-height:1.7; }
  .body img { max-width:100%; height:auto; }
  .body h2 { font-size:18px; border-left:4px solid #0078D7; padding-left:10px; }
  .body a { color:#0078D7; }
  .links { padding:8px 28px 24px; }
  .links a { display:inline-block; margin:4px 8px 4px 0; padding:8px 14px;
    background:#0078D7; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px; }
  .footer { padding:16px 28px; background:#fafafa; color:#999999; font-size:11px;
    border-top:1px solid #eeeeee; }
</style>
</head>
<body>
<div class="wrap">
  <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr><td class="header">
      <div class="brand">intelliCEN PMS</div>
      <div class="title">{{TITLE}}</div>
      <div class="date">{{DATE}} &nbsp;·&nbsp; <a class="webview" href="{{WEBVIEW_URL}}">웹에서 보기</a></div>
    </td></tr>
    <tr><td class="body">{{BODY}}</td></tr>
    <tr><td class="links">{{LINKS}}</td></tr>
    <tr><td class="footer">본 메일은 intelliCEN PMS 뉴스레터입니다. 이미지는 GitHub 에 보관되어 언제든 다시 볼 수 있습니다.</td></tr>
  </table>
</div>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

```javascript
// scripts/lib/render.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderEmail, renderSitePage, renderIndex } from './render.mjs';

const template = readFileSync(new URL('../../template/email.html', import.meta.url), 'utf8');
const meta = { title: '9월호', date: '2026-09-15', summary: '요약',
  links: [{ label: '자세히', url: 'https://example.com' }] };

test('renderEmail 이 제목·날짜·본문·웹보기·링크를 포함한다', () => {
  const html = renderEmail({ meta, bodyHtml: '<p>본문내용</p>',
    issueUrl: 'https://pages/issues/2026-09-vol01/', template });
  assert.match(html, /9월호/);
  assert.match(html, /2026-09-15/);
  assert.match(html, /<p>본문내용<\/p>/);
  assert.match(html, /https:\/\/pages\/issues\/2026-09-vol01\//);
  assert.match(html, /자세히/);
  assert.match(html, /https:\/\/example\.com/);
  assert.ok(!html.includes('{{'), '플레이스홀더가 남으면 안 됨');
});

test('renderSitePage 가 발송 도구 2종을 포함한다', () => {
  const html = renderSitePage({ emailHtmlInlined: '<div>렌더</div>', meta,
    rawEmailSource: '<html>src</html>' });
  assert.match(html, /전체선택/);
  assert.match(html, /HTML 소스 복사/);
});

test('renderIndex 가 각 호를 최신순 항목으로 렌더한다', () => {
  const issues = [
    { slug: '2026-09-vol01', meta, url: 'issues/2026-09-vol01/' },
  ];
  const html = renderIndex(issues);
  assert.match(html, /9월호/);
  assert.match(html, /2026-09-15/);
  assert.match(html, /요약/);
  assert.match(html, /issues\/2026-09-vol01\//);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/lib/render.test.mjs`
Expected: FAIL — `render.mjs` 모듈 없음.

- [ ] **Step 4: Write minimal implementation**

```javascript
// scripts/lib/render.mjs
/*
 * ============================================================
 * 파일명    : render.mjs
 * 기능      : 이메일 HTML / 브라우징 페이지 / 목록 페이지 문자열 조립
 * 작성자    : 김용현(adminpms03) + Claude Code(claude-opus-4-8)
 * 작성일    : 2026-09-03
 * ============================================================
 */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderLinks(links) {
  return links.map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`).join('');
}

export function renderEmail({ meta, bodyHtml, issueUrl, template }) {
  return template
    .replaceAll('{{TITLE}}', () => escapeHtml(meta.title))
    .replaceAll('{{DATE}}', () => escapeHtml(meta.date))
    .replaceAll('{{WEBVIEW_URL}}', () => escapeHtml(issueUrl))
    .replaceAll('{{BODY}}', () => bodyHtml)
    .replaceAll('{{LINKS}}', () => renderLinks(meta.links));
}

export function renderSitePage({ emailHtmlInlined, meta, rawEmailSource }) {
  const srcJson = JSON.stringify(rawEmailSource);
  const tableMatch = emailHtmlInlined.match(/<table\b[\s\S]*?<\/table>/i);
  const emailPreviewHtml = tableMatch ? tableMatch[0] : emailHtmlInlined;
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)} — 발송</title>
<link rel="stylesheet" href="../../assets/site.css">
</head><body>
<div class="toolbar">
  <a class="back" href="../../">← 목록</a>
  <button id="btn-copy-render">전체선택·복사</button>
  <button id="btn-copy-source">HTML 소스 복사</button>
  <span id="copy-msg" role="status" aria-live="polite"></span>
</div>
<div id="email-render" class="email-render">${emailPreviewHtml}</div>
<script>
const RAW = ${srcJson};
const msg = document.getElementById('copy-msg');
function flash(t){ msg.textContent = t; setTimeout(()=>{ msg.textContent=''; }, 2000); }
document.getElementById('btn-copy-source').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(RAW); flash('HTML 소스를 복사했습니다'); }
  catch { flash('복사 실패 — 브라우저 권한 확인'); }
});
document.getElementById('btn-copy-render').addEventListener('click', () => {
  const el = document.getElementById('email-render');
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  try {
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('copy failed');
    flash('렌더 영역을 복사했습니다 — 메일에 붙여넣기');
  } catch {
    flash('복사 실패 — 수동으로 전체선택 후 복사하세요');
  }
});
</script>
</body></html>`;
}

export function renderIndex(issues) {
  const cards = issues.map((it) => `
    <li class="card">
      <a class="card-link" href="${escapeHtml(it.url)}">
        <div class="card-date">${escapeHtml(it.meta.date)}</div>
        <div class="card-title">${escapeHtml(it.meta.title)}</div>
        <div class="card-summary">${escapeHtml(it.meta.summary)}</div>
      </a>
    </li>`).join('');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>intelliCEN PMS 뉴스레터</title>
<link rel="stylesheet" href="assets/site.css">
</head><body>
<header class="site-header"><h1>intelliCEN PMS 뉴스레터</h1></header>
<main><ul class="card-list">${cards}</ul></main>
</body></html>`;
}
```

> 주의: 이메일 본문(`bodyHtml`)은 신뢰된 작성자의 Markdown 변환 결과이므로 `{{BODY}}` 는 escape 하지 않는다. 제목·날짜·링크 등 frontmatter 값은 escape 한다.
>
> **(최종 전체 리뷰 반영, 2026-09-04)**: 위 코드는 실제 구현과 일치하도록 갱신되었다 — ①`PAGES_BASE` 하드코딩 4곳 대신 root-relative 경로(`assets/site.css`, `../../assets/site.css`, `../../`, `it.url` 그대로) 사용(Global Constraint 「PAGES_BASE 상수 1곳」 위반 수정), ②`.replaceAll(placeholder, string)` → 함수 replacer로 교체(`$&` 등 `$`-패턴 치환 오염 방지), ③`document.execCommand('copy')` 의 boolean 반환값 분기 추가(실패해도 성공 메시지가 뜨던 결함 수정), ④`emailHtmlInlined` 에서 `<table>` 서브트리만 추출해 `#email-render` 에 넣음(완전한 html/head/body 문서가 `<div>` 안에 중첩되던 결함 수정 — 복사용 `rawEmailSource` 는 그대로 완전한 문서 유지).

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/lib/render.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add template/email.html scripts/lib/render.mjs scripts/lib/render.test.mjs
git commit -m "feat: 이메일/사이트/목록 렌더링 + 이메일 템플릿"
```

---

### Task 6: 빌드 진입점 + 사이트 스타일 + 샘플 호 (스모크 테스트)

**Files:**
- Create: `scripts/build.mjs`
- Create: `template/site.css`
- Create: `issues/2026-09-vol01/index.md`
- Create: `issues/2026-09-vol01/images/sample.png` (임의의 작은 PNG)

**Interfaces:**
- Consumes: `parseFrontmatter`, `rewriteImageUrls`, `sortIssues`, `renderEmail`, `renderSitePage`, `renderIndex`, `markdown-it`, `juice`.
- Produces: 실행 시 `docs/` 에 `index.html`, `assets/site.css`, `issues/<slug>/{index.html,email.html,images/*}` 생성. `PAGES_BASE` 상수 1곳 정의.

- [ ] **Step 1: `template/site.css` 작성**

```css
/*
 * 파일명 : site.css / 기능 : 브라우징 사이트 전용 스타일
 * 작성자 : 김용현(adminpms03) + Claude Code(claude-opus-4-8) / 작성일 : 2026-09-03
 */
body { margin:0; font-family:'Malgun Gothic','맑은 고딕',Arial,sans-serif; color:#222; background:#f4f5f7; }
.site-header { background:#0078D7; color:#fff; padding:20px 24px; }
.site-header h1 { margin:0; font-size:20px; }
main { max-width:820px; margin:0 auto; padding:20px; }
.card-list { list-style:none; padding:0; margin:0; }
.card { background:#fff; border:1px solid #e6e6e6; border-radius:6px; margin-bottom:12px; }
.card-link { display:block; padding:16px 20px; text-decoration:none; color:inherit; }
.card-link:hover { background:#f0f6ff; }
.card-date { font-size:12px; color:#888; }
.card-title { font-size:17px; font-weight:bold; margin:4px 0; color:#0078D7; }
.card-summary { font-size:14px; color:#555; }
.toolbar { position:sticky; top:0; background:#fff; border-bottom:1px solid #e6e6e6;
  padding:12px 20px; display:flex; gap:8px; align-items:center; }
.toolbar .back { margin-right:auto; color:#0078D7; text-decoration:none; }
.toolbar button { padding:8px 14px; background:#0078D7; color:#fff; border:0; border-radius:4px; cursor:pointer; }
.toolbar button:hover { background:#0063b1; }
.toolbar #copy-msg { color:#0a7d33; font-size:13px; }
.email-render { max-width:640px; margin:20px auto; }
```

- [ ] **Step 2: 샘플 호 작성**

`issues/2026-09-vol01/index.md`:
```markdown
---
title: intelliCEN PMS 9월 뉴스레터
date: 2026-09-15
summary: 뉴스레터 시스템 첫 발행 — 작성/발송 흐름 확인용 샘플
links:
  - label: 저장소 바로가기
    url: https://github.com/yonghyun0923-maker/intelliCEN_newsletter
---

## 이번 달 소식

intelliCEN PMS 뉴스레터 시스템을 시작합니다.

![샘플 이미지](images/sample.png)

- Markdown 으로 작성하면 이메일용 HTML 로 자동 변환됩니다.
- 이미지는 GitHub 에 보관되어 언제든 다시 볼 수 있습니다.
```

`issues/2026-09-vol01/images/sample.png`: 임의의 작은 PNG 파일을 배치(예: 1x1 또는 로고). 없으면 빌드가 "이미지 파일 없음" 경고를 내되 실패하지 않도록 처리.

- [ ] **Step 3: `scripts/build.mjs` 작성**

```javascript
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
```

> `rawEmailSource: emailInlined` — 발송 도구의 "HTML 소스 복사"는 인라인화된 완성 HTML 을 복사해야 메일 도구에서 그대로 쓸 수 있으므로 인라인 결과를 넘긴다.

- [ ] **Step 4: 빌드 실행 (스모크 테스트)**

Run: `cd "C:/IntelliJ/svn/intellicen-newsletter" && npm run build`
Expected: `빌드 완료: 1개 호 → docs/`. 에러 없음.

- [ ] **Step 5: 산출물 검증**

Run 순서대로 확인:
```bash
# 1. 이메일 HTML 에 절대 Pages URL 이 들어갔는가
grep -c "yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/2026-09-vol01/images/sample.png" docs/issues/2026-09-vol01/email.html
# 2. juice 인라인화 확인 — 요소에 style= 속성이 있는가
grep -c 'style=' docs/issues/2026-09-vol01/email.html
# 3. 목록에 호가 나오는가
grep -c "9월 뉴스레터" docs/index.html
# 4. 플레이스홀더가 남지 않았는가 (0 이어야 함)
grep -c "{{" docs/issues/2026-09-vol01/email.html
```
Expected: 1) ≥1, 2) ≥1, 3) ≥1, 4) 0.

- [ ] **Step 6: 브라우저 육안 확인**

`docs/index.html` 과 `docs/issues/2026-09-vol01/index.html` 을 브라우저로 열어 목록·렌더·발송 버튼 동작(복사 시 상태 메시지) 확인.

- [ ] **Step 7: Commit**

```bash
git add scripts/build.mjs template/site.css issues/ docs/
git commit -m "feat: 빌드 진입점+사이트 스타일+샘플 호, 스모크 검증"
```

---

### Task 7: GitHub Actions 빌드 자동화

**Files:**
- Create: `.github/workflows/build.yml`

**Interfaces:**
- Consumes: `package.json`(build 스크립트), `docs/` 출력.
- Produces: `main` push 시 빌드 후 변경된 `docs/` 를 자동 커밋.

- [ ] **Step 1: 워크플로 작성**

```yaml
# .github/workflows/build.yml
name: build-newsletter
on:
  push:
    branches: [main]
    paths: ['issues/**', 'template/**', 'scripts/**', 'package.json', 'package-lock.json']
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Commit built docs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          if git diff --staged --quiet; then
            echo "변경 없음"
          else
            git commit -m "build: docs 재생성 [skip ci]"
            git push
          fi
```

- [ ] **Step 2: 로컬 검증 — YAML 문법**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/build.yml','utf8'); console.log(y.includes('npm run build') ? 'OK' : 'MISSING')"`
Expected: `OK`. (실제 Actions 실행은 push 후 GitHub 에서 확인 — 이 계획은 push 하지 않으므로 사용자 몫.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: push 시 뉴스레터 빌드 자동화 워크플로"
```

---

### Task 8: README (작성·발송·Pages 설정 절차)

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 전체 시스템.
- Produces: 사용자용 운영 문서.

- [ ] **Step 1: README 작성**

아래 내용을 포함한다(실제 값으로 채움):
```markdown
# intelliCEN PMS 뉴스레터

Markdown 으로 작성 → 빌드가 이메일용 HTML + 정적 사이트 생성 → GitHub Pages 호스팅 → 직접 발송.

## 새 뉴스레터 작성
1. `issues/YYYY-MM-volNN/index.md` 생성 (frontmatter: title/date/summary/links)
2. 이미지는 같은 폴더 `images/` 에 넣고 `![alt](images/파일)` 로 참조
3. 로컬 확인: `npm install` (최초 1회) → `npm run build` → `docs/` 를 브라우저로 열기
4. commit & push → GitHub Actions 가 자동 빌드·배포

## 발송
1. Pages 의 해당 호 페이지 접속: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/<slug>/`
2. [전체선택·복사] → Outlook/Gmail 새 메일에 붙여넣기, 또는 [HTML 소스 복사] → 메일 도구 HTML 편집모드에 붙여넣기
3. 직접 발송

## GitHub Pages 최초 설정 (1회)
저장소 Settings → Pages → Source = `main` 브랜치 `/docs` 폴더 → Save

## 주의
- 저장소는 public 이므로 대외비·개인정보를 넣지 않는다.
- push 인증은 Personal Access Token 사용 권장(비밀번호 커밋 금지).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README(작성·발송·Pages 설정 절차)"
```

---

## 전체 검증 (모든 태스크 완료 후)

- [ ] `npm test` 전체 통과 (frontmatter/images/issues/render 단위 테스트)
- [ ] `npm run build` 성공 → `docs/` 산출물 4개 검증 통과(절대URL·인라인style·목록반영·플레이스홀더0)
- [ ] 브라우저에서 목록→개별호→발송버튼 동작 확인
- [ ] `git log --oneline` 로 태스크별 소단위 커밋 확인
- [ ] (사용자 수행) GitHub push + Pages Source 설정 + Actions 빌드 성공 확인

## 실행 시 유의 (executor 용)

- 이 계획의 어떤 단계도 `git push` 를 실행하지 않는다 — push·인증은 사용자가 직접 한다.
- GitHub 비밀번호·토큰을 파일·커밋에 넣지 않는다.
- 빌드는 pinned node 가 아니라 시스템 node 로 실행한다(이 저장소는 PMS 의 `.mvn-node` 와 무관).
- Windows 환경 — 경로는 `node:path` 의 `join` 사용(하드코딩 슬래시 지양). git 이 CRLF 로 정규화해도 새 저장소라 무방.
