import { useRef, useEffect, useState } from 'react';
import { Select, Input, Typography, Empty, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, TagOutlined, WarningOutlined } from '@ant-design/icons';
import type { PlaceholderDef, PlaceholderType } from '../../../types';

const { Text } = Typography;

const TYPE_OPTIONS: { label: string; value: PlaceholderType }[] = [
  { label: 'Teks',            value: 'text'     },
  { label: 'Teks Panjang',    value: 'textarea' },
  { label: 'Angka',           value: 'number'   },
  { label: 'Mata Uang (Rp)',  value: 'currency' },
  { label: 'Tanggal',         value: 'date'     },
];

const PALETTE_BG = [
  'rgba(35,131,226,0.10)',
  'rgba(68,195,135,0.10)',
  'rgba(170,100,220,0.10)',
  'rgba(242,164,53,0.10)',
  'rgba(220,80,80,0.10)',
  'rgba(40,180,200,0.10)',
];
const PALETTE_TEXT = ['#1a6fb5','#1f8f5e','#8040b8','#b06800','#b03030','#1580a0'];
const KEY_IDX: Record<string, number> = {};
let ci = 0;
function getIdx(key: string) {
  if (KEY_IDX[key] === undefined) { KEY_IDX[key] = ci % PALETTE_BG.length; ci++; }
  return KEY_IDX[key];
}

interface Props {
  placeholders: PlaceholderDef[];
  onChange:     (placeholders: PlaceholderDef[]) => void;
  onRemove:     (key: string) => void;
  onEdit:       (key: string) => void;
  activeKey?:   string | null;
  onFocusKey?:  (key: string) => void;
  /** Teks dokumen saat ini — digunakan untuk deteksi orphan & animasi placeholder baru */
  docText?:     string;
}

export default function PlaceholderPanel({
  placeholders, onChange, onRemove, onEdit, activeKey, onFocusKey, docText,
}: Props) {
  const itemRefs  = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── A2: Track key yang baru ditambahkan (fade-in animation) ──────────────
  const seenKeysRef  = useRef(new Set(placeholders.map((p) => p.key)));
  const timersRef    = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [animKeys, setAnimKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const added = placeholders.filter((p) => !seenKeysRef.current.has(p.key));
    if (added.length === 0) return;

    added.forEach((p) => seenKeysRef.current.add(p.key));
    setAnimKeys((prev) => {
      const next = new Set(prev);
      added.forEach((p) => next.add(p.key));
      return next;
    });

    added.forEach((p) => {
      const existing = timersRef.current.get(p.key);
      if (existing) clearTimeout(existing);
      timersRef.current.set(p.key, setTimeout(() => {
        setAnimKeys((prev) => {
          const next = new Set(prev);
          next.delete(p.key);
          return next;
        });
        timersRef.current.delete(p.key);
      }, 2200));
    });
  }, [placeholders]);

  // Cleanup timers on unmount
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  // ── A4: Orphan detection ─────────────────────────────────────────────────
  const isOrphan = (key: string): boolean => {
    if (!docText) return false;
    return !docText.includes(`{{${key}}}`);
  };

  // ── Scroll active item into view ──────────────────────────────────────────
  useEffect(() => {
    if (!activeKey) return;
    const el = itemRefs.current.get(activeKey);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeKey]);

  const updateField = (key: string, field: keyof PlaceholderDef, value: string) => {
    onChange(placeholders.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  };

  return (
    <>
      {/* A2: fade-in keyframe */}
      <style>{`
        @keyframes ph-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ph-new { animation: ph-fadein 0.35s ease-out; }
      `}</style>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>

        {/* Header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <TagOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
            <Text strong style={{ fontSize: 13 }}>Placeholder</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {placeholders.length === 0 ? 'Belum ada placeholder' : `${placeholders.length} field terdaftar`}
          </Text>
        </div>

        {/* List */}
        {placeholders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sorot teks di dokumen<br />untuk menandai placeholder
              </Text>
            }
            style={{ marginTop: 40 }}
          />
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px 16px' }}>
            {placeholders.map((p) => {
              const idx      = getIdx(p.key);
              const isActive = activeKey === p.key;
              const isNew    = animKeys.has(p.key);
              const orphan   = isOrphan(p.key);

              return (
                <div
                  key={p.key}
                  ref={(el) => { if (el) itemRefs.current.set(p.key, el); }}
                  className={isNew ? 'ph-new' : undefined}
                  onClick={() => onFocusKey?.(p.key)}
                  style={{
                    padding:      '10px 12px',
                    borderRadius: 8,
                    marginBottom: 4,
                    background: isActive
                      ? PALETTE_BG[idx].replace('0.10)', '0.22)')
                      : isNew
                        ? PALETTE_BG[idx].replace('0.10)', '0.18)')
                        : '#fafafa',
                    border: `1.5px solid ${
                      orphan    ? '#faad14aa' :
                      isActive  ? PALETTE_TEXT[idx] + '55' :
                      isNew     ? PALETTE_TEXT[idx] + '44' :
                      'transparent'
                    }`,
                    cursor: 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Key badge + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontFamily:    'monospace',
                        fontSize:      11,
                        background:    PALETTE_BG[idx],
                        color:         PALETTE_TEXT[idx],
                        padding:       '1px 6px',
                        borderRadius:  4,
                        fontWeight:    600,
                        letterSpacing: 0.2,
                      }}>
                        {`{{${p.key}}}`}
                      </span>
                      {/* A4: Orphan indicator */}
                      {orphan && docText !== undefined && docText.length > 0 && (
                        <Tooltip title="Key ini tidak ditemukan di dokumen (orphan)">
                          <WarningOutlined style={{ fontSize: 11, color: '#faad14' }} />
                        </Tooltip>
                      )}
                      {/* A2: New badge */}
                      {isNew && (
                        <span style={{
                          fontSize: 9, color: PALETTE_TEXT[idx],
                          background: PALETTE_BG[idx],
                          padding: '0 4px', borderRadius: 3, fontWeight: 600,
                        }}>
                          baru
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        title="Edit placeholder"
                        onClick={(e) => { e.stopPropagation(); onEdit(p.key); }}
                        style={actionBtn}
                      >
                        <EditOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                      </button>
                      <button
                        title="Hapus placeholder (kembalikan teks asli)"
                        onClick={(e) => { e.stopPropagation(); onRemove(p.key); }}
                        style={actionBtn}
                      >
                        <DeleteOutlined style={{ fontSize: 12, color: '#ff7875' }} />
                      </button>
                    </div>
                  </div>

                  {/* Label input */}
                  <Input
                    size="small"
                    placeholder="Label tampil di form"
                    value={p.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateField(p.key, 'label', e.target.value)}
                    style={{ marginBottom: 6, fontSize: 12 }}
                  />

                  {/* Type select */}
                  <Select
                    size="small"
                    style={{ width: '100%', fontSize: 12 }}
                    value={p.type}
                    options={TYPE_OPTIONS}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(v) => updateField(p.key, 'type', v)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

const actionBtn: React.CSSProperties = {
  background:    'transparent',
  border:        'none',
  borderRadius:  4,
  padding:       '3px 5px',
  cursor:        'pointer',
  display:       'flex',
  alignItems:    'center',
};
