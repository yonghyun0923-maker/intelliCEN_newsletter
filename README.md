# IntelliCEN PMS 뉴스레터

Markdown 으로 작성 → 빌드가 이메일용 HTML + 정적 사이트 생성 → GitHub Pages 호스팅 → 직접 발송.

이 저장소는 **발송·영구 호스팅 전용**이다. 콘텐츠 작성(초안·스크린샷)은 `pms_v2.4/docs/newsletter/`에서 한다 — 배경과 규격은 그 프로젝트의 `docs/199_뉴스레터_제작관리_체계.md` 참고.

## 새 뉴스레터 인계 받기

1. `pms_v2.4/docs/newsletter/drafts/<slug>/`에서 초안 작성 완료
2. `pms_v2.4`에서 `node docs/newsletter/scripts/publish-to-github.cjs <slug>` 실행 → 이 저장소의 `issues/<slug>/`로 복사됨
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
