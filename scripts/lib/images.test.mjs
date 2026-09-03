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
