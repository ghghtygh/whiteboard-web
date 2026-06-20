# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

| 목적 | 명령 |
|---|---|
| 개발 서버 | `npm run dev` (Vite, 포트 5173) |
| 타입 + 빌드 | `npm run build` (`tsc -b && vite build`) |
| 타입 체크만 | `npm run typecheck` |
| 린트 | `npm run lint` |
| 빌드 미리보기 | `npm run preview` |

테스트 러너는 아직 설정돼 있지 않다. 변경 후엔 최소한 `npm run typecheck && npm run lint` 를 돌리고, UI 가 바뀌었으면 `npm run dev` 로 실제 동작도 확인한다.

경로 별칭: `@/` → `src/` (`vite.config.ts`, `tsconfig.app.json` 양쪽에서 정의). 새 import 는 `@/...` 형태로 작성.

## 두 가지 직교한 모드 플래그

이 프로젝트의 가장 큰 함정은 **"로컬/원격 모드"와 "실시간 동기화 on/off"가 서로 독립**이라는 점이다 (`src/local/mode.ts`).

- `IS_LOCAL_MODE` — `VITE_REMOTE_MODE !== 'true'` 일 때 참. **REST API / 인증 / 보드 메타데이터**를 localStorage 로 처리할지, 백엔드(`whiteboard-server`)로 보낼지 결정. 기본 = 로컬.
- `SYNC_ENABLED` — `VITE_SYNC_WS_URL` 이 설정돼 있을 때 참. **Yjs 문서의 실시간 동기화 (y-websocket)** 사용 여부. 로컬 모드에서도 동기화 ON, 원격 모드에서도 OFF 가능.

조합 예:
- 로컬 모드 + sync OFF → 완전 오프라인 단독 편집 (IDB 만)
- 로컬 모드 + sync ON (`wss://demos.yjs.dev/ws` 등) → 백엔드 없이도 같은 boardId 가진 사용자끼리 실시간 협업
- 원격 모드 → 인증/보드 CRUD/카탈로그가 `/api/v1/*` 로 프록시됨 (`vite.config.ts`)

**새 API 함수를 추가할 땐 반드시 `if (IS_LOCAL_MODE) { ... }` 분기로 로컬 fallback 을 같이 구현한다** (`src/api/boards.ts`, `src/api/catalog.ts` 패턴).

## 데이터 모델 (Yjs)

보드 문서는 `Y.Doc` 안의 세 개 `Y.Map` 으로 표현 (`src/collab/doc.ts`):

```
nodes:  Y.Map<nodeId,  Y.Map<{id,type,label,x,y,groupId,catalogVersion}>>
edges:  Y.Map<edgeId,  Y.Map<{id,from,to,fromAnchor,toAnchor,label,style,direction}>>
groups: Y.Map<groupId, Y.Map<{id,label,x,y,width,height,color}>>
```

**모든 mutation 은 `src/canvas/ops.ts` 의 함수를 거쳐야 한다**. 컴포넌트가 `Y.Map` 을 직접 `set()` 하면 안 된다. 이유:

1. `ops.ts` 의 함수는 모두 `doc.ydoc.transact(() => {...}, origin)` 으로 감싸 한 트랜잭션 = 한 Undo 스텝을 보장한다.
2. 노드 삭제 → 끊긴 엣지 정리, 그룹 이동 → 자식 노드 동반 이동, 노드 이동 → 그룹 자동 편입 같은 cross-cutting 일관성 규칙이 이 안에 있다.
3. UndoManager (`useUndoManager` in `src/canvas/hooks.ts`) 는 세 Y.Map 을 모두 관찰하며 `captureTimeout: 350ms` 로 묶음 처리한다. 트랜잭션 밖 변경은 Undo 스택에 안 잡힌다.

새 mutation 을 추가할 땐 `ops.ts` 안에서 `transact` 로 감싸고, 호출자가 묶음 처리에서 빠지고 싶을 땐 `origin` 인자로 식별 가능한 값을 넘긴다.

## 영속화 계층

`useBoardCollab(boardId)` (`src/collab/useBoardCollab.ts`) 가 보드 진입의 단일 출발점이다:

1. `IndexeddbPersistence('whiteboard.board.${boardId}', ydoc)` — **항상** 켜진다. `synced` 이벤트 후 `ready=true`.
2. `WebsocketProvider` — `SYNC_ENABLED` 일 때만. `connectBoard(boardId, doc)` 가 `wss://.../{boardId}` 룸에 접속.
3. boardId 변경 / 언마운트 시 `provider.destroy() → idb.destroy() → ydoc.destroy()` 순서로 정리.

보드 메타데이터(제목/소유자/타임스탬프)는 별도의 localStorage 키 (`whiteboard.boards.v1`, `localBoards` in `src/local/boardsStore.ts`). 보드 문서(노드/엣지/그룹)와 분리돼 있다는 점에 주의.

## 캔버스 렌더링 경로

`react-konva` 기반. 데이터 흐름:

```
Y.Map (CRDT)
  └─ observeDeep
     └─ useNodesSnapshot/useEdgesSnapshot/useGroupsSnapshot (src/canvas/hooks.ts)
        └─ Canvas.tsx → NodeShape/EdgeShape/GroupShape
```

`observeDeep` 콜백이 매 변경마다 `readNodes(doc)` 등으로 plain 배열을 다시 만들어 setState 한다. 큰 보드에서 비용이 커지면 여기가 첫 최적화 지점.

핵심 좌표 유틸은 `src/canvas/geometry.ts`:
- `GRID = 8` (기본 스냅) / `COARSE_GRID = 40` (격자 정렬 모드)
- `NODE_W = NODE_H = 80` — 노드 박스 가로는 고정, 라벨 길이에 따라 **세로만** 가변 (최근 커밋 04d39f5 의 결정)
- `getNodeBox(node)` 는 라벨 줄 수 계산까지 포함하므로 엣지 시작점·앵커 좌표를 손볼 땐 반드시 이걸 거친다.

`Alt` 키는 스냅 모드를 **일시 반전** (snapEnabled XOR altDown). 새 단축키 추가 시 충돌 주의.

## 컨텍스트 / 상태 분리

- Y.Doc / UndoManager / Awareness 는 `CanvasContextProvider` 로 트리 하단에 주입 (`src/canvas/CanvasContext.tsx`, `useCanvasContext`). zustand 가 아닌 React Context 인 이유: 보드별로 인스턴스가 갈리며 라이프사이클이 boardId 에 묶여 있어서.
- 그 외 UI 상태는 zustand:
  - `useViewportStore` (scale/x/y), `useSelection`, `useToolStore`, `useGridStore`, `useSnapStore`, `useAuthStore`(persist), `useCatalogStore`.
- 선택 상태는 Yjs 가 아닌 로컬 store. 다른 peer 에 알리려면 `setLocalSelection(awareness, [...])` 로 awareness 에 따로 publish 한다 (`src/collab/awareness.ts`).

## 라우팅 / 진입점 특이사항

- `/` 는 `LandingRedirect` 가 처리 → 로컬 모드에선 `localBoards.lastOpenedOrDefault()` 로 마지막에 열었던 보드(없으면 자동 생성)로 즉시 `Navigate`. Excalidraw 스타일.
- 로컬 모드에선 `main.tsx` 가 부트 시 `useAuthStore.getState().ensureGuest()` 로 게스트 사용자를 자동 시드 — 그래서 `RequireAuth` 가드를 통과한다.
- 백엔드 응답은 `{ data: T }` 래퍼 가정 (`unwrap` in `src/api/client.ts`). 401 응답이면 인터셉터가 `logout()` 호출.

## 코드/문서 언어

UI 카피, 주석, README, 커밋 메시지 모두 한국어가 기본이다. 새 코드를 추가할 때도 같은 톤을 유지한다.
