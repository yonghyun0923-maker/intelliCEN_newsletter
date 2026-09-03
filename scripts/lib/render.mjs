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
