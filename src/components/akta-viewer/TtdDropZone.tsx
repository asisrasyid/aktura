import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input, Select } from 'antd'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons'
import type { TtdItem, TtdLayout, TtdItemType } from './types'

// ─── Single TTD cell (sortable) ──────────────────────────────────────────────

function TtdCell({
  item,
  onRemove,
  readOnly,
}: {
  item: TtdItem
  onRemove?: () => void
  readOnly: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: readOnly })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    textAlign: 'center',
    padding: '0 12px',
    flex: 1,
    minWidth: 0,
    position: 'relative',
  }

  const isMeterai  = item.type === 'meterai'
  const isSidikJari = item.type === 'sidikjari'
  const isKosong   = item.type === 'kosong'

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle — only in edit mode */}
      {!readOnly && (
        <div
          {...listeners}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'grab',
            color: '#bbb',
            fontSize: 11,
          }}
        >
          <HolderOutlined />
        </div>
      )}

      {/* Label */}
      <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: 4, marginTop: readOnly ? 0 : 14 }}>
        {item.label}
      </div>

      {isMeterai ? (
        /* Meterai box */
        <div style={{
          width: 80, height: 80, border: '1px solid #999',
          margin: '4px auto', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 9, color: '#999',
        }}>
          METERAI
        </div>
      ) : isSidikJari ? (
        /* Sidik jari box */
        <div style={{
          width: 60, height: 40, border: '1px solid #999',
          margin: '4px auto', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 9, color: '#999',
        }}>
          Sidik Jari
        </div>
      ) : isKosong ? (
        /* Blank signature line */
        <div style={{ borderBottom: '1px solid #000', margin: '48px 16px 0', minWidth: 80 }} />
      ) : (
        /* Standard signature space + line + name */
        <>
          <div style={{ height: 56 }} />
          <div style={{ borderBottom: '1px solid #000', margin: '0 8px' }} />
          {item.namaPlaceholder && (
            <div style={{ marginTop: 4, fontSize: '10pt' }}>
              ({item.namaPlaceholder})
            </div>
          )}
        </>
      )}

      {/* Remove button — only in edit mode, not for notaris */}
      {!readOnly && item.type !== 'notaris' && (
        <button
          onClick={onRemove}
          style={{
            position: 'absolute', top: 0, right: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ff4d4f', fontSize: 12, lineHeight: 1,
          }}
          title="Hapus"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── TtdDropZone ─────────────────────────────────────────────────────────────

interface Props {
  layout: TtdLayout
  onChange?: (layout: TtdLayout) => void
  readOnly?: boolean
}

export default function TtdDropZone({ layout, onChange, readOnly = true }: Props) {
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType]   = useState<TtdItemType>('pihak')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const pihakItems   = layout.items.filter((i) => i.type !== 'notaris')
  const notarisItem  = layout.items.find((i) => i.type === 'notaris')
  const pihakIds     = pihakItems.map((i) => i.id)

  const emit = (items: TtdItem[]) => onChange?.({ items })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = pihakItems.findIndex((i) => i.id === active.id)
    const newIdx = pihakItems.findIndex((i) => i.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return

    const reordered = arrayMove(pihakItems, oldIdx, newIdx)
    emit([...reordered, ...(notarisItem ? [notarisItem] : [])])
  }

  function handleRemove(id: string) {
    emit(layout.items.filter((i) => i.id !== id))
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    const newItem: TtdItem = {
      id: `ttd-${Date.now()}`,
      type: newType,
      label: newLabel.trim(),
    }
    const reordered = [...pihakItems, newItem, ...(notarisItem ? [notarisItem] : [])]
    emit(reordered)
    setNewLabel('')
  }

  // ── Layout calculation ────────────────────────────────────────────────────
  // 1 item → full, 2 → 50/50, 3 → 33/33/33, 4+ → chunk into rows of 2

  function chunkRows(items: TtdItem[]): TtdItem[][] {
    if (items.length <= 3) return [items]
    const rows: TtdItem[][] = []
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
    return rows
  }

  const rows = chunkRows(pihakItems)

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pihakIds} strategy={horizontalListSortingStrategy}>
          {/* Pihak rows */}
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              {row.map((item) => (
                <TtdCell
                  key={item.id}
                  item={item}
                  onRemove={() => handleRemove(item.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Notaris — always full width, centered, last */}
      {notarisItem && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <div style={{ width: '50%' }}>
            <TtdCell item={notarisItem} readOnly={readOnly} />
          </div>
        </div>
      )}

      {/* Edit mode controls */}
      {!readOnly && (
        <div style={{
          marginTop: 16, padding: '10px 12px',
          background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 6,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <Select
            size="small"
            value={newType}
            onChange={setNewType}
            style={{ width: 110 }}
            options={[
              { label: 'Pihak',      value: 'pihak'     },
              { label: 'Meterai',    value: 'meterai'   },
              { label: 'Sidik Jari', value: 'sidikjari' },
              { label: 'Garis',      value: 'kosong'    },
            ]}
          />
          <Input
            size="small"
            placeholder="Label (cth: PEMBERI FIDUSIA)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onPressEnter={handleAdd}
            style={{ flex: 1 }}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={handleAdd}>
            Tambah
          </Button>
        </div>
      )}
    </div>
  )
}
