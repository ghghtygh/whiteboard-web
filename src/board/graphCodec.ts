import { deflateRaw, inflateRaw } from 'pako'
import type { Edge, Group, Node } from '@/types/domain'

// PlantUML 식으로 그래프 자체를 URL 에 담는 인코딩. /view/:token (ViewGraphPage) 이 이걸로
// 디코드해서 그린다. ../whiteboard-mcp 의 src/board/graphCodec.ts 가 같은 포맷으로 인코드하는
// 쪽이다 — 두 파일은 반드시 동일하게 유지해야 한다(수동 포크, 공유 패키지 없음).
//
// 포맷: JSON.stringify(graph) → UTF-8 bytes → raw deflate(level 9) → base64url(패딩 없음).
// btoa/atob 는 모든 모던 브라우저에 전역으로 있어 완전히 isomorphic 하다.

export interface GraphSnapshot {
  nodes: Node[]
  edges: Edge[]
  groups: Group[]
}

export function emptyGraph(): GraphSnapshot {
  return { nodes: [], edges: [], groups: [] }
}

export function encodeGraph(graph: GraphSnapshot): string {
  const json = JSON.stringify(graph)
  const deflated = deflateRaw(new TextEncoder().encode(json), { level: 9 })
  return bytesToBase64Url(deflated)
}

export function decodeGraph(token: string): GraphSnapshot {
  let json: string
  try {
    json = new TextDecoder().decode(inflateRaw(base64UrlToBytes(token)))
  } catch {
    throw new Error('This graph link is invalid or corrupted.')
  }
  const parsed: unknown = JSON.parse(json)
  if (!isGraphSnapshot(parsed)) throw new Error('This graph link is invalid or corrupted.')
  return parsed
}

function isGraphSnapshot(v: unknown): v is GraphSnapshot {
  if (typeof v !== 'object' || v === null) return false
  const g = v as Record<string, unknown>
  return Array.isArray(g.nodes) && Array.isArray(g.edges) && Array.isArray(g.groups)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(token: string): Uint8Array {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const binary = atob(b64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
