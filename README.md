# deck-optimizer

React/Vite 프론트엔드 + Node.js/Express 백엔드로 구성된 덱 최적화 도구입니다.  
이후 Google Vision OCR 기능 추가를 고려한 구조로 설계되어 있습니다.

---

## 프로젝트 구조

```
deck-optimizer/
├─ client/                  # React + Vite 프론트엔드
│  ├─ src/
│  │  ├─ components/        # 재사용 가능한 UI 컴포넌트
│  │  ├─ services/          # API 호출 등 비즈니스 로직
│  │  ├─ types/             # TypeScript 타입 정의
│  │  └─ assets/            # 이미지, 아이콘 등 정적 자산
│  ├─ public/               # 공개 정적 파일
│  ├─ package.json
│  └─ vite.config.ts        # Vite 설정 (API 프록시 포함)
│
├─ server/                  # Node.js + Express 백엔드
│  ├─ src/
│  │  ├─ index.js           # 서버 진입점
│  │  ├─ routes/
│  │  │  ├─ health.js       # GET /api/health
│  │  │  └─ ocr.js          # POST /api/ocr/upload (OCR 처리)
│  │  ├─ services/
│  │  │  └─ ocrService.js   # Google Vision API 연동 (추후 구현)
│  │  └─ middleware/
│  │     └─ errorHandler.js # 전역 에러 핸들러
│  ├─ uploads/              # 업로드된 이미지 임시 저장
│  ├─ package.json
│  └─ .env                  # 환경 변수 (git에 포함되지 않음)
│
├─ .gitignore
└─ README.md
```

---

## 실행 방법

### 1. 의존성 설치

```bash
# 클라이언트 의존성
cd client
npm install

# 서버 의존성
cd ../server
npm install
```

### 2. 개발 서버 실행

**터미널 1 — 백엔드 서버 (포트 3001)**

```bash
cd server
npm run dev
```

**터미널 2 — 프론트엔드 개발 서버 (포트 5173)**

```bash
cd client
npm run dev
```

브라우저에서 http://localhost:5173 으로 접속합니다.  
클라이언트의 `/api/*` 요청은 Vite 프록시를 통해 서버(3001)로 자동 전달됩니다.

---

## API 엔드포인트

| 메서드 | 경로               | 설명                         |
|--------|--------------------|------------------------------|
| GET    | /api/health        | 서버 상태 확인               |
| POST   | /api/ocr/upload    | 이미지 업로드 및 OCR 요청    |

---

## Google Vision OCR 연동 방법

1. `server` 디렉토리에서 Vision API 패키지 설치:
   ```bash
   npm install @google-cloud/vision
   ```

2. Google Cloud Console에서 서비스 계정 키(JSON)를 발급받아 `server/` 폴더에 저장합니다.  
   예: `server/google-vision-key.json`

3. `server/.env` 파일에 키 경로를 설정합니다:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json
   ```

4. `server/src/services/ocrService.js`의 TODO 주석을 참고하여 실제 Vision API 호출 코드를 완성합니다.

> **주의**: 서비스 계정 키 파일은 `.gitignore`에 의해 Git 추적에서 제외됩니다. 절대로 커밋하지 마세요.
