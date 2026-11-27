# IROKE

화학 시술(펌·염색·탈색)을 반복하는 20대 미용실 이용자를 위한 모바일 우선 웹.
셀카와 시술 이력으로 모발 상태를 확인하고, "내 머리로 실제 구현 가능한" AI 헤어 시안과 미용사 전달 카드를 만든다.

## 실행

API는 별도 저장소 **IROKE_backend**에 있다 (시안 만들기 + 디자이너 구하기). 터미널 두 개로 띄운다.

```bash
# 1) 백엔드 (IROKE_backend 폴더). AI 모드·Gemini 키·DB 설정은 IROKE_backend/.env
PORT=8788 npm run dev                # http://localhost:8788/api

# 2) 프론트 (이 폴더)
npm install
npm run dev                          # http://localhost:5173 (개발 모드는 localhost:8788/api를 기본으로 부른다)
npm test
npm run typecheck
```

- 다른 주소의 백엔드를 쓰려면 `client/.env`에 `VITE_API_V2_URL`(끝에 `/api`)을 넣는다. 배포(Vercel)에서는 꼭 넣는다.
- 카카오 키(`VITE_KAKAO_REST_API_KEY`)가 없으면 개발 모드에서 백엔드 시드 계정으로 로그인한다 (`client/.env.example` 참고).

## 구조

| 워크스페이스 | 내용 |
|---|---|
| `shared/` | IROKE_backend `src/shared` 복사본 (모발 프로필 타입·라벨, 프롬프트, API 계약 `api.ts`·`api-v2.ts`). 계약이 바뀌면 다시 복사한다 |
| `client/` | 랜딩(`/`), 시안 만들기 6단계(`/start` → `/flow/…`), 디자이너 구하기(`/designer-request`, `/requests`, `/my`), 디자이너(`/pro…`), 알림(`/notifications`) |

예전 `server/` 워크스페이스는 IROKE_backend로 옮겨져 지웠다 (2026-11-28).

## 정책 (2026-10-08 결정)

- **저장소**: 시안 만들기는 DB 없음 (이벤트는 백엔드 JSONL 로그, 사진 제외). 디자이너 구하기는 IROKE_backend의 Postgres + 비공개 버킷 (얼굴을 가린 사본만).
- **사용자 구분**: 시안 만들기는 로그인 없이 브라우저별 임의 ID(`x-iroke-client-id`). 디자이너 구하기는 카카오 로그인.
- **셀카 보관**: 서버에 저장하지 않는다. 사진과 결과는 브라우저 탭(sessionStorage)에만 남고 탭을 닫으면 사라진다. 확정 프로필(사진 제외)만 localStorage에 저장.
- **비용**: 5단계 요약 화면이 생성 전 확인 단계. 같은 입력은 24시간 동안 탭 안에서 재사용. 하루 생성 제한은 **미정** (`GENERATION_DAILY_LIMIT`을 비우면 제한 없음).
- **카드 공유**: PNG 저장, 지원 기기에서 공유 시트. 링크 공유는 서버 저장소가 정해진 뒤.

## 보류 (기술 검증 결과 대기)

- 톤 슬라이더(⑦): `getSafeToneRange`·`splitToneSteps`와 톤 프롬프트만 이식, UI·Canvas 보정·MediaPipe는 보류.
- 마스킹·얼굴 재합성(⑧): 이식 보류.
- 동의 문구: 법률 검토 전 초안 (`client/src/flow/steps/SelfieStep.tsx`의 TODO).
