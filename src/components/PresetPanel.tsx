import { useMemo, useState } from 'react'
import type { ComponentType } from '@/types/domain'
import { BUILTIN_PRESETS, localPresets, type StackPreset } from '@/local/presets'
import { useAuthStore } from '@/store/auth'
import { useT } from '@/i18n'
import { categoryLabel, groupByCategory } from '@/catalog/categories'

const SAVE_OPTION = '__save__'

interface PresetPanelProps {
  items: ComponentType[]
  renderRow: (item: ComponentType) => React.ReactNode
  // 현재 보드에 놓인 노드 type 목록 (중복 제거, 배치 순서)
  getBoardTypes: () => string[]
  onAddAll: (types: string[]) => void
}

// 사이드바 상단의 기술 스택 프리셋. 프리셋을 고르면 그 스택을 카테고리별로 묶은 섹션이 맨 위에 고정되고,
// 나머지 카탈로그는 아래에 그대로 남는다 (숨기는 필터가 아님).
// 커스텀 프리셋·선택 상태는 사용자별로 저장되므로, 사용자가 바뀌면 key 로 다시 마운트해 새로 읽는다.
export function PresetPanel(props: PresetPanelProps) {
  const userId = useAuthStore((s) => s.user?.id ?? 'anonymous')
  return <UserPresetPanel key={userId} userId={userId} {...props} />
}

function UserPresetPanel({
  userId,
  items,
  renderRow,
  getBoardTypes,
  onAddAll,
}: PresetPanelProps & { userId: string }) {
  const t = useT()
  const [custom, setCustom] = useState<StackPreset[]>(() => localPresets.listCustom(userId))
  const [selectedId, setSelectedId] = useState<string | null>(() => localPresets.getSelected(userId))
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  // 언어 전환에 강하도록 번역 문자열 대신 키를 담아 둔다
  const [saveError, setSaveError] = useState<'presets.nameRequired' | 'presets.boardEmpty' | null>(null)

  const all = useMemo(() => [...BUILTIN_PRESETS, ...custom], [custom])
  const selected = all.find((p) => p.id === selectedId) ?? null

  // 카탈로그에 없는 type(원격 카탈로그와 불일치 등)은 조용히 건너뛴다
  const presetItems = useMemo(() => {
    if (!selected) return []
    const byType = new Map(items.map((c) => [c.type, c]))
    return selected.stacks.map((type) => byType.get(type)).filter((c): c is ComponentType => !!c)
  }, [selected, items])

  // 카테고리 안의 순서는 프리셋에 적힌 순서를 유지
  const grouped = useMemo(() => groupByCategory(presetItems), [presetItems])

  function select(id: string | null) {
    setSelectedId(id)
    localPresets.setSelected(userId, id)
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
      setSaveError('presets.nameRequired')
      return
    }
    const types = getBoardTypes()
    if (types.length === 0) {
      setSaveError('presets.boardEmpty')
      return
    }
    const preset = localPresets.saveCustom(userId, trimmed, types)
    setCustom(localPresets.listCustom(userId))
    select(preset.id)
    setSaving(false)
  }

  function onDelete() {
    if (!selected?.custom) return
    if (!window.confirm(t('presets.confirmDelete', { name: selected.name }))) return
    localPresets.removeCustom(userId, selected.id)
    setCustom(localPresets.listCustom(userId))
    select(null)
  }

  return (
    <div className="preset-panel">
      {saving ? (
        <form className="preset-save" onSubmit={onSave}>
          <input
            autoFocus
            placeholder={t('presets.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSaving(false)
            }}
            aria-label={t('presets.nameLabel')}
          />
          <button type="submit" className="preset-btn primary">{t('presets.save')}</button>
          <button type="button" className="preset-btn" onClick={() => setSaving(false)}>
            {t('presets.cancel')}
          </button>
          {saveError && <p className="preset-error">{t(saveError)}</p>}
        </form>
      ) : (
        <label className="preset-select">
          <span>{t('presets.label')}</span>
          <select
            value={selected?.id ?? ''}
            onChange={(e) => onSelectChange(e.target.value)}
            aria-label={t('presets.select')}
          >
            <option value="">{t('presets.none')}</option>
            <optgroup label={t('presets.companies')}>
              {BUILTIN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            {custom.length > 0 && (
              <optgroup label={t('presets.mine')}>
                {custom.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            <option value={SAVE_OPTION}>{t('presets.saveOption')}</option>
          </select>
        </label>
      )}

      {selected && (
        <section className="preset-section">
          <h3>
            {t('presets.sectionTitle', { name: selected.name })}
            <span className="count">{presetItems.length}</span>
          </h3>
          {selected.custom ? (
            <p className="preset-note">{t('presets.customNote')}</p>
          ) : (
            <p className="preset-note">
              {t('presets.builtinNote')}{' '}
              {selected.source && (
                <a href={selected.source} target="_blank" rel="noopener noreferrer">
                  {t('presets.source')}
                </a>
              )}
            </p>
          )}
          {grouped.map(([category, list]) => (
            <div key={category} className="preset-group">
              <h4>{categoryLabel(t, category)}</h4>
              <ul>{list.map(renderRow)}</ul>
            </div>
          ))}
          <div className="preset-actions">
            <button
              type="button"
              className="preset-btn"
              disabled={presetItems.length === 0}
              onClick={() => onAddAll(presetItems.map((c) => c.type))}
            >
              {t('presets.addAll')}
            </button>
            {selected.custom && (
              <button type="button" className="preset-btn danger" onClick={onDelete}>
                {t('presets.delete')}
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
        .preset-group h4 { margin: 8px 0 2px 9px; font: 500 var(--text-2xs)/1.2 var(--font-sans);
                           color: var(--text-faint); letter-spacing: var(--tracking-caps); }
        .preset-actions { display: flex; gap: 6px; margin-top: 6px; }
        .preset-section { padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); }
      `}</style>
    </div>
  )
}
