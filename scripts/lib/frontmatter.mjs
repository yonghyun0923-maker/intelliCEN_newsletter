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
  const dateStr = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : String(data.date ?? '');
  if (!DATE_RE.test(dateStr)) {
    throw new Error('frontmatter: date 는 YYYY-MM-DD 형식이어야 합니다');
  }
  const roundTrip = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(roundTrip.getTime()) || roundTrip.toISOString().slice(0, 10) !== dateStr) {
    throw new Error('frontmatter: date 는 유효한 날짜여야 합니다');
  }
  const links = Array.isArray(data.links)
    ? data.links.map((l) => ({ label: l.label, url: l.url }))
    : [];
  return {
    meta: { title: data.title, date: dateStr, summary: data.summary, links },
    body: content,
  };
}
