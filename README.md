# intelliCEN PMS 뉴스레터

Markdown 으로 작성 → 빌드가 이메일용 HTML + 정적 사이트 생성 → GitHub Pages 호스팅 → 직접 발송.

## 새 뉴스레터 작성

1. `issues/YYYY-MM-volNN/index.md` 생성 (frontmatter: title/date/summary/links)
2. 이미지는 같은 폴더 `images/` 에 넣고 `![alt](images/파일)` 로 참조
3. 로컬 확인: `npm install` (최초 1회) → `npm run build` → `docs/index.html` 을 브라우저로 더블클릭해서 열기 (상대경로라 `file://` 로도 정상 동작)
4. commit & push → GitHub Actions 가 자동 빌드·배포

## 발송

1. Pages 의 해당 호 페이지 접속: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/<slug>/`
2. [전체선택·복사] → Outlook/Gmail 새 메일에 붙여넣기, 또는 [HTML 소스 복사] → 메일 도구 HTML 편집모드에 붙여넣기
3. 직접 발송

## GitHub Pages 최초 설정 (1회)

저장소 Settings → Pages → Source = `master` 브랜치 `/docs` 폴더 → Save

## 주의

- 저장소는 public 이므로 대외비·개인정보를 넣지 않는다.
- push 인증은 Personal Access Token 사용 권장(비밀번호 커밋 금지).
- `docs/` 는 매 빌드마다 전체 삭제 후 재생성되는 빌드 산출물 전용 폴더입니다 — 직접 편집하거나 여기에 문서를 두지 마세요.

## 시스템 문서 · 정정 이력

동작 원리, 저장소 구조, 배포 현황과 구축 중 발견·수정한 문제들의 정정 이력: [뉴스레터 시스템 운영기](https://claude.ai/code/artifact/61a2959c-a191-44e0-8119-591c7b8d8801)
