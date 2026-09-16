# 교직원 희망도서 신청

대학/학교 도서관용 **교직원 희망도서** 신청 웹 앱입니다.
Next.js(App Router) + TypeScript + Tailwind CSS + SQLite 계열 DB로 구성되어 있습니다.

- **로컬 데모**: `sql.js` (파일 `data/requests.db`)
- **클라우드(Vercel)**: Turso (`@libsql/client`) — 서버리스에 적합, 무료 티어 사용 가능

## 기능

### 신청 페이지 (`/`)
- 신청자 성명, 소속/부서, 이메일, 도서명, 저자, 출판사(선택), ISBN(선택), 출판연도(선택), 신청 사유, 우선순위(보통/긴급)
- 필수 항목 검증 후 제출
- 성공 시 신청번호 확인 화면

### 관리자 (`/admin`)
- `ADMIN_PASSWORD` 환경 변수로 비밀번호 보호
- 신청 목록 조회 (최신순)
- 상태·도서명/신청자 검색 필터
- 상태 워크플로: **접수 → 검토중 → 구매확정 → 입수완료 | 반려**
- 상태·관리자 메모 수정
- CSV 내보내기

## 설치 및 로컬 실행

```bash
cd /workspace/faculty-book-requests
npm install
cp .env.example .env.local   # 필요 시 수정
npm run dev
```

브라우저에서 접속:

| 페이지 | URL |
|--------|-----|
| 희망도서 신청 | http://localhost:3000/ |
| 관리자 | http://localhost:3000/admin |

`TURSO_*` 환경 변수가 없으면 자동으로 `sql.js` 파일 DB를 사용합니다.

프로덕션 빌드(로컬 확인):

```bash
npm run build
npm start
```

## 환경 변수

| 변수 | 필수(프로덕션) | 설명 |
|------|----------------|------|
| `ADMIN_PASSWORD` | ✅ | 관리자 비밀번호. **프로덕션에서 미설정·약한 기본값(`admin123` 등) 거부** |
| `ADMIN_SECRET` | ✅ | 세션 서명 비밀키. `ADMIN_SESSION_SECRET`도 동일하게 인식 |
| `TURSO_DATABASE_URL` | ✅ (Vercel) | Turso DB URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | ✅ (Vercel) | Turso 인증 토큰 |

로컬 데모만 할 때는 `ADMIN_PASSWORD=admin123` 로 충분하며, Turso 변수는 생략해도 됩니다.

## 데이터 (로컬)

- SQLite DB 파일: `data/requests.db` (`sql.js` WASM 기반)
- 최초 실행 시 샘플 신청 3건이 자동 시드됩니다.
- DB를 초기화하려면 `data/requests.db`를 삭제하고 서버를 다시 실행하세요.

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- `@libsql/client` (Turso) / `sql.js` (로컬 폴백)

---

## Vercel 배포 가이드 (Turso)

약 50명 동시 사용 규모의 교내 데모/운영에 맞게, **Vercel(호스팅) + Turso(DB)** 무료 티어 조합을 권장합니다.
Vercel 서버리스에서는 로컬 파일 DB(`sql.js`)를 쓸 수 없으므로 Turso가 필요합니다.

### 1) Turso DB 만들기 (무료)

1. [Turso](https://turso.tech/)에 가입합니다.
2. CLI 설치 후 로그인:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

3. DB 생성 및 URL·토큰 확인:

```bash
turso db create faculty-book-requests
turso db show faculty-book-requests --url
turso db tokens create faculty-book-requests
```

- URL 예: `libsql://faculty-book-requests-xxxx.turso.io`
- 토큰은 한 번만 보이므로 안전한 곳에 보관하세요.

> 테이블 스키마와 샘플 데이터는 앱이 처음 연결될 때 자동으로 생성·시드됩니다. 별도 마이그레이션은 필요 없습니다.

### 2) Vercel 프로젝트 연결

1. GitHub 등에 이 저장소를 푸시합니다.
2. [Vercel](https://vercel.com/)에서 **Add New Project** → 해당 저장소 Import.
3. Framework Preset: **Next.js** (자동 감지)
4. Build Command: `npm run build` / Output: 기본값

### 3) Vercel 환경 변수 설정

Project → **Settings → Environment Variables** 에 아래를 추가합니다 (Production / Preview 모두 권장).

```env
ADMIN_PASSWORD=강한-고유-비밀번호
ADMIN_SECRET=충분히-긴-랜덤-문자열
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

- `ADMIN_PASSWORD`를 `admin123` 같은 약한 값으로 두면 **프로덕션에서 로그인/세션이 거부**됩니다.
- `ADMIN_SECRET` 대신 `ADMIN_SESSION_SECRET` 이름을 써도 됩니다.

### 4) 배포

- Vercel에서 **Deploy** 실행 (또는 `git push`로 자동 배포).
- 배포 URL로 `/` (신청) · `/admin` (관리자) 접속을 확인합니다.

CLI로 배포하는 경우:

```bash
npx vercel
# 프로덕션
npx vercel --prod
```

환경 변수는 `vercel env add` 또는 대시보드에서 설정할 수 있습니다.

### 5) 배포 후 점검

- [ ] 신청 폼 제출 → 신청번호 표시
- [ ] `/admin` 로그인 (설정한 `ADMIN_PASSWORD`)
- [ ] 목록·상태 변경·CSV 내보내기
- [ ] Turso 대시보드/CLI에서 행이 쌓이는지 확인

```bash
turso db shell faculty-book-requests
# SELECT COUNT(*) FROM requests;
```

---

## 제한사항

- 메일 알림·감사 로그·역할 기반 권한은 포함하지 않습니다.
- CSV 내보내기: `/api/requests/export` (관리자 로그인 필요)
- 로컬 `sql.js` 모드는 고부하 동시 쓰기에 적합하지 않습니다. 운영은 Turso를 사용하세요.
