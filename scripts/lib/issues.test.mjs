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
