#!/usr/bin/env node
// src/catalog/stacks.json 을 기준으로 기술 스택 아이콘을 수집하고 카탈로그 데이터를 생성한다.
//
//   npm run catalog:sync
//
// - "devicon:<name>[/<version>]" → node_modules/devicon 의 SVG 를 그대로 복사.
//   version 생략 시 original → plain → original-wordmark → plain-wordmark → line 순으로 고른다.
// - "si:<slug>" → simple-icons 단색 SVG 에 브랜드 hex 를 fill 로 주입해 복사.
// - null → 아이콘 없음 (캔버스/사이드바에서 컬러 배지로 폴백).
//
// 결과물 (모두 커밋 대상):
//   src/assets/stack-icons/<type>.svg   아이콘
//   src/assets/stack-icons/LICENSE-*    출처 라이선스 고지
//   src/catalog/catalog.generated.json  런타임 카탈로그 (색상 확정본)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as simpleIcons from 'simple-icons'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src/catalog/stacks.json')
const OUT_JSON = path.join(ROOT, 'src/catalog/catalog.generated.json')
const ICON_DIR = path.join(ROOT, 'src/assets/stack-icons')
const DEVICON_DIR = path.join(ROOT, 'node_modules/devicon')
const SI_DIR = path.join(ROOT, 'node_modules/simple-icons')
const FALLBACK_COLOR = '#6b7280'
const DEVICON_VERSION_ORDER = ['original', 'plain', 'original-wordmark', 'plain-wordmark', 'line']

const { categories, stacks } = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const devicons = new Map(
  JSON.parse(fs.readFileSync(path.join(DEVICON_DIR, 'devicon.json'), 'utf8')).map((d) => [d.name, d]),
)
const siBySlug = new Map(
  Object.values(simpleIcons)
    .filter((v) => v && typeof v === 'object' && 'slug' in v)
    .map((v) => [v.slug, v]),
)

const errors = []
const categoryIds = new Set(categories.map((c) => c.id))
const seen = new Set()

function normalizeHex(hex) {
  if (!hex) return null
  let h = hex.replace('#', '').toLowerCase()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null
}

function resolveDevicon(spec) {
  const [name, version] = spec.split('/')
  const entry = devicons.get(name)
  if (!entry) throw new Error(`devicon 에 '${name}' 없음`)
  const versions = entry.versions.svg
  const picked = version ?? DEVICON_VERSION_ORDER.find((v) => versions.includes(v))
  if (!picked || !versions.includes(picked)) {
    throw new Error(`devicon '${name}' 에 '${version}' 버전 없음 (있는 버전: ${versions.join(', ')})`)
  }
  const svg = fs.readFileSync(path.join(DEVICON_DIR, 'icons', name, `${name}-${picked}.svg`), 'utf8')
  return { svg, color: normalizeHex(entry.color) }
}

function resolveSimpleIcon(slug) {
  const icon = siBySlug.get(slug)
  if (!icon) throw new Error(`simple-icons 에 '${slug}' 없음`)
  const svg = icon.svg.replace(/<svg([^>]+)>/, `<svg$1 fill="#${icon.hex}">`)
  return { svg, color: normalizeHex(icon.hex) }
}

fs.mkdirSync(ICON_DIR, { recursive: true })
const written = new Set()
const catalog = []

for (const s of stacks) {
  if (seen.has(s.type)) errors.push(`중복 type: ${s.type}`)
  seen.add(s.type)
  if (!categoryIds.has(s.category)) errors.push(`${s.type}: 알 수 없는 category '${s.category}'`)

  let resolved = null
  try {
    if (s.icon?.startsWith('devicon:')) resolved = resolveDevicon(s.icon.slice('devicon:'.length))
    else if (s.icon?.startsWith('si:')) resolved = resolveSimpleIcon(s.icon.slice('si:'.length))
    else if (s.icon != null) throw new Error(`알 수 없는 icon 형식 '${s.icon}'`)
  } catch (e) {
    errors.push(`${s.type}: ${e.message}`)
    continue
  }

  if (resolved) {
    const file = `${s.type}.svg`
    fs.writeFileSync(path.join(ICON_DIR, file), resolved.svg.trim() + '\n')
    written.add(file)
  }

  catalog.push({
    type: s.type,
    displayName: s.name,
    category: s.category,
    color: normalizeHex(s.color) ?? resolved?.color ?? FALLBACK_COLOR,
    aliases: s.aliases ?? [],
    icon: !!resolved,
  })
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join('\n'))
  process.exit(1)
}

// stacks.json 에서 빠진 항목의 아이콘 정리
for (const f of fs.readdirSync(ICON_DIR)) {
  if (f.endsWith('.svg') && !written.has(f)) fs.rmSync(path.join(ICON_DIR, f))
}

fs.copyFileSync(path.join(DEVICON_DIR, 'LICENSE'), path.join(ICON_DIR, 'LICENSE-devicon'))
fs.copyFileSync(path.join(SI_DIR, 'LICENSE.md'), path.join(ICON_DIR, 'LICENSE-simple-icons.md'))

fs.writeFileSync(OUT_JSON, JSON.stringify({ categories, items: catalog }, null, 2) + '\n')

const withIcon = catalog.filter((c) => c.icon).length
console.log(`✓ ${catalog.length}개 스택 (아이콘 ${withIcon}개, 배지 폴백 ${catalog.length - withIcon}개)`)
