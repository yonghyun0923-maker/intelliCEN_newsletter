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
