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
