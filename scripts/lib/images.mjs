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
