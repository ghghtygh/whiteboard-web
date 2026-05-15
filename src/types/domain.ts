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
