import { useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EditOutlined, DeleteOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Input, Spin, message } from 'antd';
import type { PlaceholderDef } from '../../../types';
import { aiService } from '../../../services/ai.service';

interface Props {
  content: string;
  placeholders: PlaceholderDef[];
  onSelectionMark: (selectedText: string, rect: DOMRect) => void;
  onRemovePlaceholder: (key: string) => void;
  onEditPlaceholder: (key: string) => void;
  focusKey?: string | null;
  // A5: callback when a block is improved
  onBlockImproved?: (original: string, improved: string) => void;
}

// ---- Color palette (Notion-style soft tones) ----
const PALETTE = [
  { bg: 'rgba(35,131,226,0.13)',  text: '#1a6fb5', border: 'rgba(35,131,226,0.35)' },
  { bg: 'rgba(68,195,135,0.13)',  text: '#1f8f5e', border: 'rgba(68,195,135,0.35)' },
  { bg: 'rgba(170,100,220,0.13)', text: '#8040b8', border: 'rgba(170,100,220,0.35)' },
  { bg: 'rgba(242,164,53,0.13)',  text: '#b06800', border: 'rgba(242,164,53,0.35)' },
  { bg: 'rgba(220,80,80,0.13)',   text: '#b03030', border: 'rgba(220,80,80,0.35)' },
  { bg: 'rgba(40,180,200,0.13)',  text: '#1580a0', border: 'rgba(40,180,200,0.35)' },
];

const KEY_COLOR_MAP: Record<string, number> = {};
let colorIdx = 0;
function getColor(key: string) {
  if (KEY_COLOR_MAP[key] === undefined) {
    KEY_COLOR_MAP[key] = colorIdx % PALETTE.length;
    colorIdx++;
  }
  return PALETTE[KEY_COLOR_MAP[key]];
}

// ---- Segment & Block types ----
type Segment = { type: 'text'; value: string } | { type: 'ph'; value: string };
type Block =
  | { type: 'paragraph'; segments: Segment[] }
  | { type: 'pagebreak'; pageNum: number };

// ---- Parse template string into blocks (paragraphs + page breaks) ----
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const pages = content.split(/\f|\u000C/);

  pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) {
      blocks.push({ type: 'pagebreak', pageNum: pageIdx + 1 });
    }

    const paras = page.split(/\n{2,}/);
    paras.forEach((para) => {
      if (para.replace(/\n/g, '').trim() === '') return;
      const segs: Segment[] = para.split(/({{[^}]+}})/g).map((p) => {
        const m = p.match(/^{{(.+)}}$/);
        return m
          ? { type: 'ph' as const, value: m[1] }
          : { type: 'text' as const, value: p };
      });
      blocks.push({ type: 'paragraph', segments: segs });
    });
  });

  return blocks;
}

// ---- Get plain text of a paragraph block (preserve {{key}}) ----
function getBlockText(segs: Segment[]): string {
  return segs.map(s => s.type === 'text' ? s.value : `{{${s.value}}}`).join('');
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  padding: '5px 10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

// ---- A5: ImprovePopover state ----
type ImprovePopoverState = {
  blockIdx: number;
  blockText: string;
  instruction: string;
  loading: boolean;
  x: number;
  y: number;
} | null;

export default function DocumentEditor({
  content, placeholders, onSelectionMark, onRemovePlaceholder, onEditPlaceholder, focusKey,
  onBlockImproved,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [toolbar, setToolbar] = useState<{ key: string; x: number; y: number } | null>(null);

  // A5: hover and improve popover state
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [improvePopover, setImprovePopover] = useState<ImprovePopoverState>(null);

  // Close toolbar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const toolbarEl = document.getElementById('ph-floating-toolbar');
      if (toolbarEl && !toolbarEl.contains(e.target as Node)) setToolbar(null);
      const improveEl = document.getElementById('ph-improve-popover');
      if (improveEl && !improveEl.contains(e.target as Node)) {
        if (improvePopover && !improvePopover.loading) setImprovePopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [improvePopover]);

  // Scroll to focused placeholder from sidebar
  useEffect(() => {
    if (!focusKey) return;
    const el = phRefs.current.get(focusKey);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusKey]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !containerRef.current) return;
    const rect = sel!.getRangeAt(0).getBoundingClientRect();
    onSelectionMark(text, rect);
  }, [onSelectionMark]);

  const handlePhClick = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setToolbar({ key, x: rect.left, y: rect.bottom + 6 });
  };

  // A5: run improve block
  const handleImproveRun = async () => {
    if (!improvePopover || !improvePopover.instruction.trim()) {
      message.warning('Isi instruksi perbaikan.');
      return;
    }
    setImprovePopover(p => p ? { ...p, loading: true } : null);
    try {
      const improved = await aiService.improveBlock(
        improvePopover.blockText,
        improvePopover.instruction,
      );
      if (onBlockImproved) onBlockImproved(improvePopover.blockText, improved);
      message.success('Paragraf berhasil diperbaiki.');
      setImprovePopover(null);
    } catch {
      message.error('Gagal memperbaiki. Coba lagi.');
      setImprovePopover(p => p ? { ...p, loading: false } : null);
    }
  };

  const blocks = parseBlocks(content);
  let currentPage = 1;

  return (
    <>
      {/* Document paper */}
      <div style={{ background: '#f7f7f5', minHeight: '100%', padding: '24px 0 48px' }}>
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          onClick={() => setToolbar(null)}
          style={{
            fontFamily: '"Times New Roman", Georgia, serif',
            fontSize: 14,
            lineHeight: 1.9,
            padding: '80px 96px',
            background: '#fff',
            maxWidth: 860,
            margin: '0 auto',
            minHeight: 720,
            cursor: 'text',
            userSelect: 'text',
            borderRadius: 4,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 6px 28px rgba(0,0,0,0.07)',
          }}
        >
          {content === '' ? (
            <span style={{ color: '#c0bfbe', fontStyle: 'italic' }}>
              Upload dokumen atau tempel teks, lalu sorot teks untuk menandai sebagai placeholder...
            </span>
          ) : blocks.length === 0 ? null : (
            blocks.map((block, blockIdx) => {
              // ---- Page break block ----
              if (block.type === 'pagebreak') {
                currentPage = block.pageNum;
                return (
                  <div
                    key={blockIdx}
                    style={{
                      margin: '36px -96px',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ height: 1, background: '#d0d0d0' }} />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 96px',
                        background: '#f0f0ee',
                      }}
                    >
                      <FileTextOutlined style={{ fontSize: 12, color: '#999' }} />
                      <span style={{
                        fontSize: 11,
                        color: '#999',
                        fontFamily: 'system-ui, sans-serif',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        Halaman {currentPage}
                      </span>
                      <div style={{ flex: 1, height: 1, background: '#d8d8d6' }} />
                    </div>
                    <div style={{ height: 1, background: '#d0d0d0' }} />
                  </div>
                );
              }

              // ---- Paragraph block ----
              const prevBlock = blockIdx > 0 ? blocks[blockIdx - 1] : null;
              const showParaSeparator = prevBlock?.type === 'paragraph';
              const blockText = getBlockText(block.segments);

              return (
                <div
                  key={blockIdx}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredBlock(blockIdx)}
                  onMouseLeave={() => setHoveredBlock(null)}
                >
                  {/* Separator antar paragraf */}
                  {showParaSeparator && (
                    <div
                      style={{
                        margin: '0 0',
                        display: 'flex',
                        alignItems: 'center',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 1,
                          background: 'linear-gradient(to right, transparent, #e0dedd 15%, #e0dedd 85%, transparent)',
                        }}
                      />
                    </div>
                  )}

                  {/* Isi paragraf */}
                  <p
                    style={{
                      margin: '10px 0',
                      padding: 0,
                      textAlign: 'justify',
                      textAlignLast: 'left',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      hyphens: 'auto',
                    }}
                  >
                    {block.segments.map((seg, i) => {
                      if (seg.type === 'text') return <span key={i}>{seg.value}</span>;

                      const ph = placeholders.find((p) => p.key === seg.value);
                      const label = ph?.label ?? seg.value;
                      const colors = getColor(seg.value);
                      const isActive = toolbar?.key === seg.value || focusKey === seg.value;

                      return (
                        <span
                          key={i}
                          ref={(el) => { if (el) phRefs.current.set(seg.value, el); }}
                          onClick={(e) => handlePhClick(seg.value, e)}
                          style={{
                            background: isActive
                              ? colors.bg.replace('0.13)', '0.26)')
                              : colors.bg,
                            color: colors.text,
                            border: `1.5px solid ${isActive ? colors.border : 'transparent'}`,
                            borderRadius: 4,
                            padding: '0 5px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 500,
                            userSelect: 'none',
                            display: 'inline',
                            transition: 'all 0.12s',
                          }}
                          title={`{{${seg.value}}} — klik untuk edit/hapus`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </p>

                  {/* A5: Perbaiki button (hover only, shown if onBlockImproved provided) */}
                  {onBlockImproved && hoveredBlock === blockIdx && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setImprovePopover({
                          blockIdx,
                          blockText,
                          instruction: '',
                          loading: false,
                          x: rect.left,
                          y: rect.bottom + 4,
                        });
                      }}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #E2DDD6',
                        borderRadius: 4,
                        padding: '2px 7px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11,
                        color: '#6B7280',
                        opacity: 0.9,
                        transition: 'opacity 0.15s',
                        userSelect: 'none',
                        pointerEvents: 'auto',
                      }}
                      title="Perbaiki paragraf via AI"
                    >
                      <ThunderboltOutlined style={{ fontSize: 10 }} />
                      Perbaiki
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating toolbar — renders in body via portal */}
      {toolbar && createPortal(
        <div
          id="ph-floating-toolbar"
          style={{
            position: 'fixed',
            top: toolbar.y,
            left: toolbar.x,
            zIndex: 9999,
            background: '#2f3237',
            borderRadius: 10,
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            userSelect: 'none',
          }}
        >
          <button
            style={btnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { onEditPlaceholder(toolbar.key); setToolbar(null); }}
          >
            <EditOutlined style={{ fontSize: 13, color: '#e0e0e0' }} />
            <span style={{ color: '#e0e0e0', fontSize: 12 }}>Edit</span>
          </button>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

          <button
            style={btnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,100,100,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { onRemovePlaceholder(toolbar.key); setToolbar(null); }}
          >
            <DeleteOutlined style={{ fontSize: 13, color: '#ff7875' }} />
            <span style={{ color: '#ff7875', fontSize: 12 }}>Hapus</span>
          </button>
        </div>,
        document.body,
      )}

      {/* A5: Improve popover — renders in body via portal */}
      {improvePopover && createPortal(
        <div
          id="ph-improve-popover"
          style={{
            position: 'fixed',
            top: improvePopover.y,
            left: improvePopover.x,
            zIndex: 9998,
            background: '#fff',
            border: '1px solid #E2DDD6',
            borderRadius: 8,
            padding: '10px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            width: 320,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#1B365D' }}>
            Perbaiki paragraf via AI
          </div>
          <Input.TextArea
            rows={2}
            autoFocus
            value={improvePopover.instruction}
            onChange={e => setImprovePopover(p => p ? { ...p, instruction: e.target.value } : null)}
            placeholder="Instruksi: Perbaiki EYD, Buat lebih formal, Ringkas jadi 2 kalimat..."
            style={{ fontSize: 12, marginBottom: 8 }}
            onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleImproveRun(); } }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => setImprovePopover(null)}
              disabled={improvePopover.loading}
            >
              Batal
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={handleImproveRun}
              loading={improvePopover.loading}
              style={{ background: '#1B365D', borderColor: '#1B365D' }}
            >
              {improvePopover.loading ? <Spin size="small" /> : 'Jalankan'}
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
