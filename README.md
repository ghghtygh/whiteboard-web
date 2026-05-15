# whiteboard-web

협업 화이트보드의 React 프론트엔드. 스펙 문서 v0.1 (2026-05-15) 기반.

> **현재 상태**: 백엔드 없이 동작하는 **로컬 모드**가 기본. 보드 목록은 localStorage,
> 보드 문서는 Yjs + y-indexeddb 로 영속화한다. 백엔드(`whiteboard-server`) 가 준비되면
> `VITE_REMOTE_MODE=true` 로 전환한다.

## 스택

- React 18 + TypeScript + Vite 5
- 라우팅: `react-router-dom`
- 상태관리: `zustand`
- 캔버스: `react-konva` (스펙 §12 미결사항 중 react-konva 채택)
- CRDT: `yjs` + `y-indexeddb` (로컬), `y-websocket` (원격)
- HTTP 클라이언트: `axios`

## 빠른 시작

```bash
cp .env.example .env       # 선택 (로컬 모드는 환경변수 없이 동작)
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/` — 자동으로 게스트 사용자로 로그인되어
보드 목록으로 이동한다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | Vite dev 서버 |
| `npm run build` | TypeScript 타입체크 + 프로덕션 번들 |
| `npm run preview` | 빌드된 결과 미리보기 |
| `npm run typecheck` | 타입체크만 수행 |
| `npm run lint` | ESLint |

## 환경 변수

| 키 | 기본값 | 설명 |
|---|---|---|
| `VITE_REMOTE_MODE` | 미지정 (로컬) | `true` 면 백엔드 모드. 미지정/false 면 로컬 모드 |
| `VITE_API_URL` | `http://localhost:8080` | 원격 모드 REST 베이스 (vite proxy 대상) |
| `VITE_WS_URL` | `ws://localhost:8080` | 원격 모드 WebSocket 베이스 |

dev 서버는 `/api`와 `/ws`를 `VITE_API_URL` / `VITE_WS_URL` 로 프록시한다.

## 사용법 (M2 완료 시점 기준)

- **컴포넌트 배치**: 사이드바의 컴포넌트를 캔버스로 드래그-드롭. 그리드 8px 스냅.
- **선택**: 클릭. Shift+클릭으로 다중 선택. 빈 영역 클릭으로 해제.
- **이동**: 노드/그룹 드래그. 그룹 드래그는 자식 노드도 같이 이동.
- **삭제**: 선택 후 `Delete` 또는 `Backspace`. 끊긴 엣지는 자동 정리.
- **라벨 편집**: 노드/엣지/그룹 더블클릭 → 인라인 입력 → Enter/Blur 저장, Esc 취소.
- **엣지 그리기**: 노드 위에 마우스 올리면 4방향 파란 앵커 → 다른 노드로 드래그하면 엣지 생성.
- **엣지 스타일/방향**: 엣지 선택 후 `1` 실선 / `2` 점선 / `3` 점점선 / `D` 방향 (forward → both → backward → none).
- **그룹 박스**: 툴바 `그룹` 버튼 활성화 후 빈 영역 드래그. 내부 노드의 `groupId` 자동 설정.
- **팬/줌**: 빈 영역 드래그 = 팬. 마우스 휠 = 줌 (25%–400%).
- **Undo/Redo**: `⌘Z` / `⌘⇧Z` 또는 툴바 버튼. `captureTimeout: 350ms` 로 묶음 처리.
- **검색**: 사이드바 검색 (200ms debounce). 카테고리별 접힘/펼침. 최근 사용 5개 상단 고정.

## 디렉토리 구조

```
src/
  api/         REST 클라이언트 (axios). 로컬 모드에선 local/ 모듈로 분기
  collab/      Yjs Doc, IndexeddbPersistence / WebsocketProvider 래퍼, useBoardCollab 훅
  canvas/      Konva 기반 캔버스 — Canvas, NodeShape, EdgeShape, GroupShape,
               ops(Y.Map 트랜잭션), hooks(스냅샷), selection, tool, geometry,
               LabelEditor (HTML 오버레이)
  components/  Sidebar (카탈로그 + 검색 + 최근 사용), Toolbar (줌/그룹/Undo)
  pages/       Login, Signup, BoardList, BoardEdit, NotFound
  store/       zustand — auth (게스트 자동 시드), catalog, viewport
  local/       로컬 모드 전용 — mode 플래그, 카탈로그 시드, 보드 localStorage, 최근 사용
  types/       domain.ts — 스펙 §3 도메인 타입
  styles/      global.css
  App.tsx      RequireAuth 가드
  router.tsx   react-router-dom 라우트 정의
  main.tsx     엔트리 + 게스트 부트스트랩
```

## 데이터 모델 (스펙 §3.6 BoardDoc)

Yjs `Y.Doc` 안에 세 개의 Y.Map:

- `nodes: Y.Map<nodeId, Y.Map>` — 각 child Y.Map = `{ id, type, label, x, y, groupId, catalogVersion }`
- `edges: Y.Map<edgeId, Y.Map>` — `{ id, from, to, fromAnchor, toAnchor, label, style, direction }`
- `groups: Y.Map<groupId, Y.Map>` — `{ id, label, x, y, width, height, color }`

모든 mutating 연산은 `doc.ydoc.transact(() => {...})` 안에서 실행돼서 트랜잭션 단위로 묶이고
UndoManager 가 트랜잭션 단위로 stack 을 쌓는다. 끊긴 엣지는 노드 삭제 시 같은 트랜잭션 안에서 함께 정리.

## 마일스톤

| 단계 | 상태 | 내용 |
|---|---|---|
| M0 | ✅ | 프로젝트 셋업, 디렉토리 구조, 타입체크/린트/빌드 |
| M1 | ⏸ | 백엔드 인증/보드 CRUD/카탈로그 API 연동 — 백엔드 도착 시 진행 |
| M2 | ✅ | 캔버스: 노드·엣지·그룹, 드롭/드래그/선택/삭제, 라벨 편집, Undo/Redo. 로컬 영속화 (y-indexeddb) |
| M3 | ⏸ | `y-websocket` 기반 실시간 협업 + awareness 커서 |
| M4 | ⏸ | 보드 스냅샷 + update 로그 재연결 복구 |
| M5 | ⏸ | JSON Import/Export, viewer 모드, 권한 UI |
| M6 | ⏸ | 폴리싱, 부하 테스트, 베타 배포 |

## 백엔드 연결 가정 (M3 이후)

원격 모드는 다음 베이스를 가정 (스펙 §5, §6):

- REST: `${VITE_API_URL}/api/v1/...`
- WebSocket: `${VITE_WS_URL}/ws/boards/{boardId}?token=...`

`whiteboard-server` 가 위 엔드포인트를 제공하면 `VITE_REMOTE_MODE=true` 로 즉시 전환 가능.
