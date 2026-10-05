import { useMemo, useState } from 'react'
import type { ComponentType } from '@/types/domain'
import { BUILTIN_PRESETS, localPresets, type StackPreset } from '@/local/presets'

const SAVE_OPTION = '__save__'

interface PresetPanelProps {
  items: ComponentType[]
  renderRow: (item: ComponentType) => React.ReactNode
  // 현재 보드에 놓인 노드 type 목록 (중복 제거, 배치 순서)
  getBoardTypes: () => string[]
  onAddAll: (types: string[]) => void
}

// 사이드바 상단의 기술 스택 프리셋. 프리셋을 고르면 그 스택만 모은 섹션이 맨 위에 고정되고,
// 나머지 카탈로그는 아래에 그대로 남는다 (숨기는 필터가 아님).
export function PresetPanel({ items, renderRow, getBoardTypes, onAddAll }: PresetPanelProps) {
  const [custom, setCustom] = useState<StackPreset[]>(() => localPresets.listCustom())
  const [selectedId, setSelectedId] = useState<string | null>(() => localPresets.getSelected())
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const all = useMemo(() => [...BUILTIN_PRESETS, ...custom], [custom])
  const selected = all.find((p) => p.id === selectedId) ?? null

  // 카탈로그에 없는 type(원격 카탈로그와 불일치 등)은 조용히 건너뛴다
  const presetItems = useMemo(() => {
    if (!selected) return []
    const byType = new Map(items.map((c) => [c.type, c]))
    return selected.stacks.map((t) => byType.get(t)).filter((c): c is ComponentType => !!c)
  }, [selected, items])

  function select(id: string | null) {
    setSelectedId(id)
    localPresets.setSelected(id)
  }

  function onSelectChange(value: string) {
    if (value === SAVE_OPTION) {
      setSaving(true)
      setSaveError(null)
      setName('')
      return
    }
    select(value || null)
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveError('Enter a preset name')
      return
    }
    const types = getBoardTypes()
    if (types.length === 0) {
      setSaveError('The board has no components yet')
      return
    }
    const preset = localPresets.saveCustom(trimmed, types)
    setCustom(localPresets.listCustom())
    select(preset.id)
    setSaving(false)
  }

  function onDelete() {
    if (!selected?.custom) return
    if (!window.confirm(`Delete preset "${selected.name}"?`)) return
    localPresets.removeCustom(selected.id)
    setCustom(localPresets.listCustom())
    select(null)
  }

  return (
    <div className="preset-panel">
      {saving ? (
        <form className="preset-save" onSubmit={onSave}>
          <input
            autoFocus
            placeholder="Preset name (e.g. My team)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSaving(false)
            }}
            aria-label="Preset name"
          />
          <button type="submit" className="preset-btn primary">Save</button>
          <button type="button" className="preset-btn" onClick={() => setSaving(false)}>
            Cancel
          </button>
          {saveError && <p className="preset-error">{saveError}</p>}
        </form>
      ) : (
        <label className="preset-select">
          <span>Preset</span>
          <select
            value={selected?.id ?? ''}
            onChange={(e) => onSelectChange(e.target.value)}
            aria-label="Tech stack preset"
          >
            <option value="">None</option>
            <optgroup label="Companies">
              {BUILTIN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            {custom.length > 0 && (
              <optgroup label="My presets">
                {custom.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            <option value={SAVE_OPTION}>+ Save board as preset…</option>
          </select>
        </label>
      )}

      {selected && (
        <section className="preset-section">
          <h3>
            {selected.name} stack
            <span className="count">{presetItems.length}</span>
          </h3>
          {selected.custom ? (
            <p className="preset-note">Saved from a board.</p>
          ) : (
            <p className="preset-note">
              Based on public tech blogs — actual stacks vary by team.{' '}
              {selected.source && (
                <a href={selected.source} target="_blank" rel="noopener noreferrer">
                  Source ↗
                </a>
              )}
            </p>
          )}
          <ul>{presetItems.map(renderRow)}</ul>
          <div className="preset-actions">
            <button
              type="button"
              className="preset-btn"
              disabled={presetItems.length === 0}
              onClick={() => onAddAll(presetItems.map((c) => c.type))}
            >
              Add all to board
            </button>
            {selected.custom && (
              <button type="button" className="preset-btn danger" onClick={onDelete}>
                Delete preset
              </button>
            )}
          </div>
        </section>
      )}

      <style>{`
        .preset-panel { padding-top: 10px; }
        .preset-select { display: flex; align-items: center; gap: 8px;
                         font-size: var(--text-xs); color: var(--text-muted); }
        .preset-select select { flex: 1; min-width: 0; font-size: var(--text-sm); }
        .preset-save { display: flex; flex-wrap: wrap; gap: 6px; }
        .preset-save input { flex: 1 1 100%; min-width: 0; }
        .preset-btn { padding: 5px 10px; border-radius: var(--radius-md);
                      border: 1px solid var(--border-subtle); background: var(--surface-panel);
                      font-size: var(--text-xs); color: var(--text-body); cursor: pointer; }
        .preset-btn:hover:not(:disabled) { background: var(--surface-hover); }
        .preset-btn:disabled { opacity: 0.5; cursor: default; }
        .preset-btn.primary { background: #5d5bef; border-color: #5d5bef; color: white; }
        .preset-btn.primary:hover { background: #4b49d6; }
        .preset-btn.danger { color: var(--danger); }
        .preset-error { flex-basis: 100%; margin: 0; color: var(--danger); font-size: var(--text-xs); }
        .preset-note { margin: 0 0 6px; font-size: var(--text-xs); color: var(--text-faint); line-height: 1.4; }
        .preset-note a { color: var(--text-link); }
        .preset-actions { display: flex; gap: 6px; margin-top: 6px; }
        .preset-section { padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); }
      `}</style>
    </div>
  )
}
