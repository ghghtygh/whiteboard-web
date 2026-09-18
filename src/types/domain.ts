// 스펙 §3 데이터 모델

export type Anchor = 'top' | 'right' | 'bottom' | 'left'
export type EdgeStyle = 'solid' | 'dashed' | 'dotted'
export type EdgeDirection = 'forward' | 'backward' | 'both' | 'none'
export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface ComponentType {
  type: string
  displayName: string
  category: string
  iconUrl: string
  defaultWidth: number
  defaultHeight: number
  anchors: Anchor[]
  version: number
  deprecated: boolean
  createdAt: string
  updatedAt: string
}

export interface Board {
  id: string
  title: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface BoardMember {
  boardId: string
  userId: string
  role: MemberRole
}

export interface Node {
  id: string
  type: string
  label: string
  x: number
  y: number
  groupId: string | null
  catalogVersion: number
}

export interface Edge {
  id: string
  from: string
  to: string
  fromAnchor: Anchor | null
  toAnchor: Anchor | null
  label: string | null
  style: EdgeStyle
  direction: EdgeDirection
}

export interface Group {
  id: string
  label: string | null
  x: number
  y: number
  width: number
  height: number
  color: string | null
}

export interface User {
  id: string
  email: string
  name: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface ApiError {
  code: string
  message: string
}

/** 개인용 API 토큰(PAT) — MCP 서버 등 외부 클라이언트 인증용. 목록 조회 시 원본 값은 없다. */
export interface PersonalAccessToken {
  id: string
  name: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string | null
}

/** 발급 직후 응답에만 존재 — token 값은 이 순간에만 노출되고 다시 조회할 수 없다. */
export interface IssuedPersonalAccessToken extends PersonalAccessToken {
  token: string
}
