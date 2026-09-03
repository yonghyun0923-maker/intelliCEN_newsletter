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
