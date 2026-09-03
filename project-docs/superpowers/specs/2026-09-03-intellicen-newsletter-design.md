# intelliCEN PMS 뉴스레터 관리 시스템 — 설계 문서

- **작성일**: 2026-09-03
- **작성자**: 김용현(adminpms03) + Claude Code(claude-opus-4-8)
- **저장소(로컬)**: `C:\IntelliJ\svn\intellicen-newsletter`
- **저장소(원격)**: https://github.com/yonghyun0923-maker/intelliCEN_newsletter
- **owner / repo**: `yonghyun0923-maker` / `intelliCEN_newsletter`
- **GitHub Pages 루트 URL**: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter/`

> 이 프로젝트는 SVN 으로 관리되는 PMS(`pms_v2.4`)와 **완전히 별개인 신규 git 저장소**다.
> PMS 코드는 건드리지 않는다.

---

## 1. 목적과 배경

intelliCEN PMS 뉴스레터를 **GitHub 를 영구 저장소 겸 호스팅**으로 삼아 관리한다.

- 뉴스레터 본문과 이미지를 GitHub 에 커밋하여 **언제든 다시 볼 수 있게** 보존한다.
- 추가 안내는 GitHub Pages 의 **고정 URL 링크**로 연결한다.
- 발송은 자동화하지 않는다 — 빌드가 만든 **이메일용 HTML 을 사용자가 직접** 메일 클라이언트로 옮겨 보낸다.
- 이미지는 GitHub 의 **공개 절대 URL**로 참조되어, 수신자와 미래 열람자 모두 항상 로드된다.

### 비목표 (YAGNI — 이번 범위에서 제외)

- 메일 자동 발송/예약 발송 (SMTP·발송 API 연동 없음)
- 구독자 관리·수신거부·오픈율 추적
- 로그인/인증·관리자 화면 (PMS 안에 화면을 두지 않음 — 정적 사이트 방식으로 확정)
- WYSIWYG 편집기 (작성은 Markdown 파일 편집)

---

## 2. 핵심 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 관리 위치 | **GitHub 저장소 + GitHub Pages 정적 사이트** (PMS 밖) |
| 작성 형식 | **Markdown → 빌드가 이메일용 HTML 로 변환** |
| 저장소 공개 | **github.com 공개(public)** — 이미지·페이지 URL 이 모두 공개 접근 |
| 이미지 URL | **GitHub Pages 절대 URL** (사이트·이메일 동일 출처) |
| 발송 방식 | 발송용 페이지에서 **①렌더링 전체선택·복사 ②HTML 소스 복사** 둘 다 제공 |
| 빌드 도구 | **경량 Node 스크립트** (`markdown-it` + `juice`) + GitHub Actions |

---

## 3. 저장소 구조

```
intellicen-newsletter/
├── issues/                          ← 뉴스레터 원본(작성 대상)
│   └── <slug>/                      ← 예: 2026-09-vol01
│       ├── index.md                 ← frontmatter + 본문(Markdown)
│       └── images/                  ← 이 호(號)의 이미지 원본
│           └── *.png|*.jpg|...
├── template/
│   ├── email.html                   ← 이메일용 래퍼(600px 테이블, 인라인화 대상 <style>)
│   └── site.css                     ← 브라우징 사이트 전용 스타일(이메일과 무관)
├── scripts/
│   └── build.mjs                    ← Markdown → 이메일HTML + 사이트 생성 진입점
├── docs/                            ← ★ 빌드 산출물 = GitHub Pages 루트
│   ├── index.html                   ← 전체 뉴스레터 목록(최신순)
│   ├── assets/site.css              ← 복사된 사이트 스타일
│   └── issues/<slug>/
│       ├── index.html               ← 브라우징 + 발송 도구 페이지
│       ├── email.html               ← 순수 이메일 HTML(복사·미리보기 원본)
│       └── images/*                 ← 복사된 이미지(Pages 가 서빙)
├── .github/workflows/build.yml      ← push 시 빌드 자동 실행 + Pages 배포
├── package.json
├── .gitignore
└── README.md                        ← 작성·발송 사용법
```

> **Pages 소스 설정**: GitHub 저장소 Settings → Pages → Source = `main` 브랜치의 `/docs` 폴더.
> (Actions 배포 방식이 아니라 `docs/` 폴더 서빙 방식을 기본으로 한다 — 산출물을 커밋으로 검토 가능.)

---

## 4. 작성 모델 (Authoring)

호(issue) 하나 = `issues/<slug>/index.md` 하나 + `images/` 폴더.

### 4.1 frontmatter 스키마

```markdown
---
title: intelliCEN PMS 9월 뉴스레터        # 필수 — 목록/이메일 제목
date: 2026-09-15                          # 필수 — YYYY-MM-DD, 목록 정렬 기준
summary: 이번 달 신규 기능과 업데이트 소식   # 필수 — 목록 카드 요약
links:                                    # 선택 — "추가 안내" 링크 목록
  - label: 자세히 보기
    url: https://github.com/yonghyun0923-maker/intelliCEN_newsletter
---

## 이번 달 소식

본문을 마크다운으로 작성합니다.

![대시보드 스크린샷](images/dashboard.png)
```

| 필드 | 필수 | 용도 | 검증 규칙 |
|------|:---:|------|-----------|
| `title` | ✔ | 목록·이메일 제목, `<title>` | 비어있으면 빌드 실패 |
| `date` | ✔ | 목록 정렬(최신순), 이메일 표기 | `YYYY-MM-DD` 형식 아니면 빌드 실패 |
| `summary` | ✔ | 목록 카드 요약 | 비어있으면 빌드 실패 |
| `links` | — | 이메일·페이지 하단 "추가 안내" 링크 | 각 항목 `label`+`url` 필요 |

### 4.2 이미지 참조 규칙

- 이미지는 반드시 해당 호의 `images/` 에 넣고 `![alt](images/파일명)` 로 참조한다(상대 경로).
- 빌드가 `images/…` → **절대 Pages URL** 로 치환하고 파일을 `docs/…/images/` 로 복사한다.
- `alt` 텍스트를 반드시 넣는다(접근성).

### 4.3 slug 규칙

- 폴더명이 곧 slug 이며 URL 에 그대로 쓰인다.
- 권장: `YYYY-MM-volNN` (예: `2026-09-vol01`). 영문 소문자·숫자·하이픈만.

---

## 5. 빌드 파이프라인 (`scripts/build.mjs`)

`npm run build` 또는 GitHub Actions 가 실행. `issues/*` 를 순회하며 호마다 아래를 수행한다.

1. **원본 로드·파싱** — `index.md` 를 읽어 frontmatter(YAML)와 본문을 분리, frontmatter 필수 필드 검증.
2. **Markdown → HTML 본문** — `markdown-it` 로 변환.
3. **이미지 절대화** — 본문 및 frontmatter 내 `images/<파일>` → `https://<pages>/issues/<slug>/images/<파일>` 치환, 원본 이미지를 `docs/issues/<slug>/images/` 로 복사.
4. **이메일 HTML 생성** — `template/email.html`(600px 중앙 테이블, `<style>` 블록 포함)에 제목·날짜·본문·links·"웹에서 보기" 링크를 주입 → **`juice` 로 CSS 인라인화** → `docs/issues/<slug>/email.html`.
   - 인라인화 이유: Gmail·Outlook 등은 `<head><style>` 을 신뢰하지 않으므로 각 요소에 `style=` 속성으로 박아야 안전하다.
5. **브라우징 페이지 생성** — `docs/issues/<slug>/index.html`. 이메일 렌더 결과를 보여주고 **발송 도구 2종**(§7)을 얹는다. 사이트 스타일(`site.css`)은 이 페이지에만 적용.
6. **목록 페이지 재생성** — 모든 호를 `date` 기준 최신순으로 정렬하여 `docs/index.html` 생성(제목·날짜·요약·개별 페이지 링크).

### 5.1 테스트 가능한 순수 함수 (분리 설계)

`build.mjs` 는 다음 순수 함수를 export 하여 단위 테스트한다(파일 I/O 와 분리):

| 함수 | 입력 → 출력 | 검증 포인트 |
|------|-------------|-------------|
| `parseFrontmatter(raw)` | md 문자열 → `{meta, body}` | 필수 필드 누락 시 명확한 에러 |
| `rewriteImageUrls(html, baseUrl)` | 본문 HTML → 절대 URL 치환된 HTML | `images/x.png` → Pages 절대 URL |
| `sortIssues(list)` | 호 배열 → 최신순 정렬 배열 | `date` 내림차순, 동일 날짜 안정 정렬 |
| `renderEmail(meta, bodyHtml)` | 메타+본문 → 인라인화 전 HTML | 제목·links·웹보기 링크 포함 |

---

## 6. 이미지·링크 URL 전략

- **모든 이미지·페이지는 GitHub Pages 절대 URL**을 사용한다.
  - 이미지: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/<slug>/images/<파일>`
  - 개별 호 페이지: `https://yonghyun0923-maker.github.io/intelliCEN_newsletter/issues/<slug>/`
- 각 이메일 **상단에 "웹에서 보기(고정 URL)"** 링크를 넣어, 이메일이 전달·보관되어도 원본을 항상 볼 수 있게 한다(= 요구사항 "추가 안내 링크 GitHub 연결"·"언제든 열람" 충족).
- frontmatter `links` 는 이메일·페이지 하단 "추가 안내"로 렌더한다.

> **영구성 근거**: 저장소가 public 이고 파일 경로가 안정적이므로 Pages URL 은 저장소가 존재하는 한 유지된다.

---

## 7. 발송 워크플로 (개별 호 페이지의 발송 도구)

개별 호 `index.html` 상단에 두 가지 발송 도구를 제공한다. 둘 다 자바스크립트 클립보드 API 사용.

1. **[전체선택·복사]** — 페이지에 렌더된 이메일 영역(iframe 또는 컨테이너)을 선택 복사해 **Outlook/Gmail 새 메일에 붙여넣기**. 서식·이미지가 그대로 유지된다. (가장 현실적인 기본 경로.)
2. **[HTML 소스 복사]** — `email.html` 의 **원본 HTML 소스 문자열**을 클립보드로 복사. 메일 도구의 "HTML 편집/소스 붙여넣기" 모드용.

두 방법 모두 이미지가 절대 Pages URL 이므로 발송 후에도 수신자에게 정상 표시된다.

### 발송 절차(README 에 기재)

1. `issues/<slug>/index.md` 작성 + 이미지 커밋 → GitHub push
2. Actions 빌드 완료 후 Pages 의 해당 호 페이지 접속
3. [전체선택·복사] 또는 [HTML 소스 복사]로 메일 클라이언트에 붙여넣고 직접 발송

---

## 8. 배포 (GitHub Actions)

`.github/workflows/build.yml`:

- **트리거**: `main` 브랜치 push (경로 `issues/**`, `template/**`, `scripts/**`, `package.json`).
- **작업**: Node 설치 → `npm ci` → `npm run build` → 변경된 `docs/` 를 커밋(봇) 하거나, Pages 배포 액션 사용.
- **기본안**: 빌드 산출물 `docs/` 를 커밋하여 저장소에 남기고, Pages 는 `main /docs` 폴더를 서빙. (산출물이 저장소에 보여 검토·롤백이 쉽다.)

> 로컬에서도 `npm run build` 로 동일 산출물을 만들 수 있어 Actions 없이도 수동 운영 가능.

---

## 9. 기술 스택·의존성

| 항목 | 선택 | 비고 |
|------|------|------|
| 런타임 | Node.js (LTS) | 빌드 스크립트 실행 |
| Markdown | `markdown-it` | 본문 변환 |
| CSS 인라인화 | `juice` | 이메일 HTML `<style>` → 인라인 `style=` |
| frontmatter | `gray-matter` | YAML frontmatter 파싱 |
| 테스트 | `node:test` (내장) | 순수 함수 단위 테스트 |

> 의존성 최소화 원칙. SSG·번들러 도입하지 않음.

---

## 10. 테스트 전략

- **단위 테스트**: §5.1 순수 함수 4종 — frontmatter 검증, 이미지 URL 치환, 정렬, 이메일 렌더.
- **통합(스모크)**: 샘플 호 1개(`issues/2026-09-vol01`)로 `npm run build` 실행 →
  - `docs/issues/2026-09-vol01/email.html` 에 **절대 Pages URL** 과 **인라인 `style=`** 이 들어갔는지 확인
  - `docs/index.html` 에 해당 호가 목록에 나오는지 확인
- **육안 확인**: 브라우저로 `docs/index.html`·개별 호 페이지를 열어 렌더·발송 버튼 동작 확인.

---

## 11. 보안·운영 유의사항

- **GitHub 인증정보(비밀번호)를 코드·문서·커밋에 절대 포함하지 않는다.** push 인증은 사용자가 직접 수행하며, 비밀번호 대신 **Personal Access Token** 사용을 권장한다. (채팅으로 공유된 비밀번호는 변경 권장.)
- 저장소가 public 이므로 **대외비·개인정보가 담긴 내용을 뉴스레터·이미지에 넣지 않는다.**
- 이메일 본문은 Markdown 변환 결과이며 신뢰된 작성자만 커밋하므로 별도 sanitize 는 불필요하나, 외부 기여를 받게 되면 재검토한다.

---

## 12. 열린 질문 / 후속

- 브랜딩(로고·색상) 템플릿 반영 여부 — 1차는 기본 스타일, 이후 `template/email.html` 조정.
- 다국어(한/영) 뉴스레터 필요 시 slug 규칙 확장.
- Actions 배포를 "docs 커밋" 대신 "Pages 배포 액션"으로 전환할지 — 1차는 docs 커밋 방식.

---

## 13. 완료 정의 (Definition of Done)

- [ ] 저장소 스캐폴딩(폴더·`package.json`·`.gitignore`·`README.md`) 생성
- [ ] `build.mjs` + 순수 함수 4종 구현 및 단위 테스트 통과
- [ ] `template/email.html`·`site.css` 작성(600px 테이블, 인라인화 대상 스타일)
- [ ] 샘플 호 1개로 빌드 → 산출물 검증(절대 URL·인라인 스타일·목록 반영)
- [ ] 개별 호 페이지 발송 도구 2종 동작 확인
- [ ] `.github/workflows/build.yml` 작성
- [ ] README 에 작성·발송·Pages 설정 절차 기재
```
