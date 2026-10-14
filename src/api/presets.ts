import { apiClient, unwrap } from './client'
import { isBackendActive, useAuthStore } from '@/store/auth'
import { localPresets, type StackPreset } from '@/local/presets'

// 커스텀 기술 스택 프리셋 저장소.
// - 로그인 회원(원격 모드 + 게스트 아님): whiteboard-server `/api/v1/me/presets` — 기기 간 동기화
// - 로컬 모드 / 비회원(게스트): 브라우저 localStorage (사용자 id 별 키)
// 내장 회사 프리셋은 정적 파일(`src/catalog/presets.json`)이라 여기서 다루지 않는다.

// 서버 검증 규칙과 맞춘 한도 (whiteboard-server StackPresetService / StackPreset)
export const PRESET_LIMITS = { maxPresets: 50, maxName: 50, maxStacks: 100 } as const

interface StackPresetDto {
  id: string
  name: string
  stacks: string[]
  createdAt: string
  updatedAt: string
}

function fromDto(dto: StackPresetDto): StackPreset {
  return { id: dto.id, name: dto.name, stacks: dto.stacks, custom: true }
}

async function createRemote(name: string, stacks: string[]): Promise<StackPreset> {
  const res = await apiClient.post<{ data: StackPresetDto }>('/me/presets', { name, stacks })
  return fromDto(unwrap(res.data))
}

// 이 브라우저에 남은 프리셋을 로그인한 회원 계정(서버)으로 옮긴다.
// - 그 회원 id 키에 남은 것 (백엔드 연동 전에 저장한 것)
// - 비회원(게스트)으로 저장한 것 — 게스트 id 는 로그인하면 바뀌므로 저장할 때 기록해 둔 목록에서 찾는다
// 하나씩 올리고 성공한 것만 로컬에서 지우므로, 중간에 실패해도(한도 초과 등) 다음 조회 때 남은 것부터 다시 시도한다.
// 옮긴 프리셋이 선택돼 있었다면 회원 쪽 선택으로 이어 준다.
// 같은 사용자에 대한 동시 호출(StrictMode 이중 마운트, 패널 재마운트 등)은 진행 중인 이관 하나를 공유해
// 같은 프리셋이 두 번 올라가지 않게 한다.
const migrating = new Map<string, Promise<void>>()

async function migrateFrom(ownerId: string, userId: string): Promise<void> {
  const selected = localPresets.getSelected(ownerId)
  for (const p of localPresets.listCustom(ownerId)) {
    const created = await createRemote(p.name, p.stacks)
    localPresets.removeCustom(ownerId, p.id)
    if (p.id === selected) localPresets.setSelected(userId, created.id)
  }
}

function migrateLocal(userId: string): Promise<void> {
  const running = migrating.get(userId)
  if (running) return running
  const task = (async () => {
    await migrateFrom(userId, userId)
    for (const guestId of localPresets.listGuestOwners()) {
      if (guestId === userId) continue
      await migrateFrom(guestId, userId)
      localPresets.setSelected(guestId, null)
      localPresets.removeGuestOwner(guestId)
    }
  })().finally(() => migrating.delete(userId))
  migrating.set(userId, task)
  return task
}

export async function listPresets(userId: string): Promise<StackPreset[]> {
  if (!isBackendActive()) return localPresets.listCustom(userId)
  try {
    await migrateLocal(userId)
  } catch {
    // 이관 실패(한도 초과 등)는 목록 조회를 막지 않는다 — 로컬에 남겨 두고 다음에 다시 시도
  }
  const res = await apiClient.get<{ data: StackPresetDto[] }>('/me/presets')
  return unwrap(res.data).map(fromDto)
}

export async function createPreset(userId: string, name: string, stacks: string[]): Promise<StackPreset> {
  if (!isBackendActive()) {
    // 비회원 프리셋은 로그인 후 계정으로 옮길 수 있게 소유 게스트 id 를 기록해 둔다
    if (useAuthStore.getState().isGuest) localPresets.markGuestOwner(userId)
    return localPresets.saveCustom(userId, name, stacks)
  }
  return createRemote(name, stacks)
}

export async function deletePreset(userId: string, id: string): Promise<void> {
  if (!isBackendActive()) {
    localPresets.removeCustom(userId, id)
    return
  }
  await apiClient.delete(`/me/presets/${encodeURIComponent(id)}`)
}
