import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input, Tooltip, Segmented, message, Alert } from 'antd';
import {
  SendOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  RobotOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  UndoOutlined,
  RedoOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  aiDocGeneratorService,
  type DocChatItem,
} from '../../services/aiDocGenerator.service';
import { AktaViewer } from '../../components/akta-viewer';
import { templateAktaService, triggerDownload } from '../../services/templateAkta.service';
import { NAVY, GOLD, IVORY, BORDER, INK, MUTED } from '../../theme/tokens';

const { TextArea } = Input;

function vibrate(pattern: number | number[]): void {
  navigator.vibrate?.(pattern);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AktaContextPayload {
  jenisAkta:      string;
  nomorAkta:      string;
  judul:          string;
  tanggalAkta:    string;
  paraPihak:      { nama: string; nik: string; peran: string }[];
  nilaiTransaksi?: number;
  lokasiObjek?:   string;
  dynamicFields:  { label: string; value: string }[];
}

type RetryPayload =
  | { type: 'chat';     input: string; history: ChatMessage[] }
  | { type: 'generate'; history: ChatMessage[] }
  | { type: 'modify';   selectedText: string; instruction: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags from AI output (fallback if AI returns HTML) */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fmtDate(iso: string): string {
  if (!iso) return '(belum diisi)';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function buildContextMessage(ctx: AktaContextPayload): string {
  const lines: string[] = [
    `Saya ingin menyusun dokumen dari akta berikut yang sudah ada datanya di sistem:`,
    ``,
    `Jenis: ${ctx.jenisAkta}`,
    `Nomor Akta: ${ctx.nomorAkta || '(belum diisi)'}`,
    `Judul: ${ctx.judul}`,
    `Tanggal: ${fmtDate(ctx.tanggalAkta)}`,
  ];

  if (ctx.paraPihak.length > 0) {
    lines.push(``, `Para Pihak:`);
    ctx.paraPihak.forEach(p =>
      lines.push(`- ${p.nama} (NIK: ${p.nik}) — sebagai ${p.peran}`)
    );
  }

  if (ctx.nilaiTransaksi) {
    lines.push(``, `Nilai Transaksi: Rp${ctx.nilaiTransaksi.toLocaleString('id-ID')}`);
  }

  if (ctx.lokasiObjek) lines.push(`Lokasi/Objek: ${ctx.lokasiObjek}`);

  if (ctx.dynamicFields.length > 0) {
    lines.push(``, `Data Tambahan:`);
    ctx.dynamicFields.forEach(f => lines.push(`- ${f.label}: ${f.value}`));
  }

  lines.push(
    ``,
    `Mohon identifikasi data apa yang masih perlu dilengkapi untuk menyusun dokumen ini.`,
  );

  return lines.join('\n');
}

// ── Prompt examples (D1) ─────────────────────────────────────────────────────

const PROMPT_EXAMPLES = [
  {
    icon: '📝', label: 'Akta Jual Beli',
    prompt: 'Buatkan Akta Jual Beli tanah seluas 500 m persegi di Jakarta. Penjual: Budi Santoso, Pembeli: PT Maju Bersama. Harga Rp 2.500.000.000.',
  },
  {
    icon: '🏢', label: 'Akta Pendirian PT',
    prompt: 'Buatkan Akta Pendirian PT dengan nama PT Nusantara Digital. Pendiri: Ahmad (60 persen) dan Rina (40 persen). Modal dasar Rp 500.000.000.',
  },
  {
    icon: '📋', label: 'Surat Kuasa',
    prompt: 'Buatkan Surat Kuasa dari Bapak Hendra kepada Ibu Sari untuk mengurus balik nama sertifikat tanah di BPN.',
  },
  {
    icon: '💼', label: 'Perjanjian Sewa',
    prompt: 'Buatkan Perjanjian Sewa Menyewa ruko di Surabaya. Pemilik: CV Properti Jaya, Penyewa: Toko Elektronik Abadi. Masa sewa 2 tahun, Rp 48.000.000 per tahun.',
  },
] as const;

// ── B1: useUndoRedo hook ──────────────────────────────────────────────────────

function useUndoRedo<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex]     = useState(0);
  const current  = history[index];
  const push = (val: T) => {
    setHistory(h => {
      const base = h.slice(0, index + 1);
      return [...base, val].slice(-50);
    });
    setIndex(i => {
      const base = history.slice(0, i + 1);
      return Math.min(base.length, 49); // max 50 entries → max index 49
    });
  };
  // setLive: update current slot without pushing to history (for real-time streaming)
  const setLive = (val: T) => {
    setHistory(h => {
      const c = [...h];
      c[index] = val;
      return c;
    });
  };
  const undo    = () => { if (index > 0)               setIndex(i => i - 1); };
  const redo    = () => { if (index < history.length - 1) setIndex(i => i + 1); };
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;
  return { current, push, setLive, undo, redo, canUndo, canRedo };
}

// ── Styles ───────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export default function KonsepDokumen() {
  const location    = useLocation();
  const aktaContext = (location.state as { aktaContext?: AktaContextPayload } | null)?.aktaContext;

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    aktaContext ? [] : [{
      id: 'welcome',
      role: 'assistant',
      content:
        'Selamat datang. Saya siap membantu Anda menyusun dokumen kenotariatan.\n\n' +
        'Silakan ceritakan dokumen apa yang ingin Anda buat, misalnya:\n' +
        '• "Buatkan Akta Pendirian PT"\n' +
        '• "Saya perlu Akta Jual Beli Tanah"\n' +
        '• "Tolong buat Surat Kuasa"',
    }]
  );

  const [input, setInput]               = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [isStreaming, setIsStreaming]   = useState(false);

  // ── B1: Document state with undo/redo ──────────────────────────────────────
  const {
    current: docText,
    push: pushDocText,
    setLive: setDocLive,
    undo: undoDoc,
    redo: redoDoc,
    canUndo,
    canRedo,
  } = useUndoRedo('');

  const [docTitle, setDocTitle]         = useState(aktaContext?.jenisAkta ?? 'Dokumen Baru');
  const [docHasContent, setDocHasContent] = useState(false);

  // ── View mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode]         = useState<'preview' | 'edit'>('preview');

  // ── AI modify (edit mode) ──────────────────────────────────────────────────
  const [aiModifyMode, setAiModifyMode]     = useState(false);
  const [aiModifyInput, setAiModifyInput]   = useState('');
  const [aiModifyLoading, setAiModifyLoading] = useState(false);
  const [selectedText, setSelectedText]     = useState('');
  // A3: track whether textarea has a selection
  const [hasSelection, setHasSelection]     = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const selRangeRef  = useRef<{ start: number; end: number } | null>(null);

  // ── Download ───────────────────────────────────────────────────────────────
  const [downloadFormat, setDownloadFormat] = useState<'docx' | 'pdf'>('docx');
  const [downloading, setDownloading]       = useState(false);

  // ── A7: Streaming elapsed timer ───────────────────────────────────────────
  const [streamElapsed, setStreamElapsed]   = useState(0);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── B2: Retry mechanism ───────────────────────────────────────────────────
  const [retryPayload, setRetryPayload] = useState<RetryPayload | null>(null);

  // ── D2: Context banner ────────────────────────────────────────────────────
  const [ctxBannerDismissed, setCtxBannerDismissed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const autoSentRef    = useRef(false);
  const genChatAddedRef = useRef(false);

  // ── A7: Auto-abort after 60s ──────────────────────────────────────────────
  useEffect(() => {
    if (streamElapsed >= 60) {
      abortRef.current?.abort();
      message.warning('Waktu habis (60 detik). Silakan coba lagi.');
    }
  }, [streamElapsed]);

  // ── B1: Keyboard Ctrl+Z / Ctrl+Y ─────────────────────────────────────────
  useEffect(() => {
    const onKeyDoc = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoDoc();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoDoc();
      }
    };
    window.addEventListener('keydown', onKeyDoc);
    return () => window.removeEventListener('keydown', onKeyDoc);
  }, [undoDoc, redoDoc]);

  // ── Streaming ────────────────────────────────────────────────────────────

  const streamChat = useCallback(async (
    msg: string,
    history: ChatMessage[],
    isGen: boolean,
  ) => {
    if (isGen) {
      setIsStreaming(true);
      setDocLive('');
      setViewMode('preview');
      genChatAddedRef.current = false;
      // A7: start timer
      setStreamElapsed(0);
      streamTimerRef.current = setInterval(() => setStreamElapsed(s => s + 1), 1000);
    } else {
      setChatLoading(true);
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!isGen) {
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: msg };
      setMessages(prev => [...prev, userMsg, { id: `a-${Date.now()}`, role: 'assistant' as const, content: '' }]);
    }

    const apiHistory: DocChatItem[] = history.map(m => ({ role: m.role, content: m.content }));
    let chatAccum = '';
    let docAccum  = '';

    try {
      const stream = aiDocGeneratorService.streamChat(
        {
          message:         msg,
          history:         apiHistory,
          currentDocument: docText,
          documentType:    docTitle !== 'Dokumen Baru' ? docTitle : '',
          isGenerating:    isGen,
        },
        abortRef.current.signal,
      );

      for await (const chunk of stream) {
        if (chunk.type === 'document') {
          docAccum += chunk.text;
          setDocLive(stripHtml(docAccum));
        } else {
          chatAccum += chunk.text;
          if (isGen) {
            setMessages(prev => {
              if (!genChatAddedRef.current) {
                genChatAddedRef.current = true;
                return [...prev, { id: `a-${Date.now()}`, role: 'assistant' as const, content: chatAccum }];
              }
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], role: 'assistant', content: chatAccum };
              return updated;
            });
          } else {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], role: 'assistant', content: chatAccum };
              return updated;
            });
          }
        }
      }

      if (isGen && docAccum) {
        // B1: commit full generated doc to history
        pushDocText(stripHtml(docAccum));
        setDocHasContent(true);
        vibrate([10, 50, 10]);
        const firstLine = stripHtml(docAccum).split('\n').find(l => l.trim());
        if (firstLine && firstLine === firstLine.toUpperCase() && firstLine.trim().length > 3) {
          setDocTitle(firstLine.trim());
        }
      }

      setRetryPayload(null);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        const errMsg = isGen
          ? '[Gagal generate dokumen. Silakan coba lagi.]'
          : '[Gagal menghubungi AI. Periksa koneksi.]';
        if (isGen) {
          setDocLive(errMsg);
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], role: 'assistant', content: errMsg };
            return updated;
          });
        }
        // B2: set retry payload
        if (isGen) {
          setRetryPayload({ type: 'generate', history });
        } else {
          setRetryPayload({ type: 'chat', input: msg, history });
        }
      }
    } finally {
      setChatLoading(false);
      setIsStreaming(false);
      // A7: stop timer
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      setStreamElapsed(0);
    }
  }, [docTitle, docText, pushDocText, setDocLive]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-send context message on first mount (if coming from AktaDetail)
  useEffect(() => {
    if (aktaContext && !autoSentRef.current) {
      autoSentRef.current = true;
      streamChat(buildContextMessage(aktaContext), [], false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send / Generate ───────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || chatLoading || isStreaming) return;
    setInput('');
    streamChat(msg, messages, false);
  }, [input, chatLoading, isStreaming, messages, streamChat]);

  // A2: Generate handles 0 messages
  const handleGenerate = useCallback(async () => {
    if (chatLoading || isStreaming) return;
    vibrate(8);

    if (messages.length === 0 && !input.trim()) {
      message.info('Tuliskan instruksi singkat terlebih dahulu, lalu klik Generate.');
      return;
    }

    if (messages.length === 0 && input.trim()) {
      // auto-send input first, then generate
      const msg = input.trim();
      setInput('');
      await streamChat(msg, [], false);
      // generate will be called automatically after above resolves? No - user needs to click again.
      // Just send the chat, and show a hint
      message.info('Instruksi dikirim. Klik Generate lagi untuk menyusun dokumen.');
      return;
    }

    const msg = input.trim() || 'Generate dokumen berdasarkan data yang telah dikumpulkan dalam percakapan ini.';
    setInput('');
    streamChat(msg, messages, true);
  }, [input, chatLoading, isStreaming, messages, streamChat]);

  // ── B2: Retry handler ────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    if (!retryPayload) return;
    const p = retryPayload;
    setRetryPayload(null);
    if (p.type === 'chat')     await streamChat(p.input, p.history, false);
    if (p.type === 'generate') await streamChat('Generate dokumen berdasarkan data yang telah dikumpulkan dalam percakapan ini.', p.history, true);
    if (p.type === 'modify')   await doModify(p.selectedText, p.instruction);
  }, [retryPayload, streamChat]);

  // ── AI Modify (plain text selection in textarea) ──────────────────────────
  const handleTextareaSelect = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    if (start === end) {
      setHasSelection(false);
      return;
    }
    const sel = ta.value.slice(start, end).trim();
    if (!sel) {
      setHasSelection(false);
      return;
    }
    setSelectedText(sel);
    setHasSelection(true);
    selRangeRef.current = { start, end };
  };

  const handleAskAI = () => {
    if (!selectedText) {
      message.info('Sorot teks terlebih dahulu di editor.');
      return;
    }
    setAiModifyMode(true);
    setAiModifyInput('');
  };

  // Core modify logic extracted for retry support
  const doModify = useCallback(async (selText: string, instruction: string) => {
    setAiModifyLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let replacement = '';

    // A6: push user audit message before stream
    setMessages(prev => [
      ...prev,
      {
        id: `audit-u-${Date.now()}`,
        role: 'user' as const,
        content: `[Modifikasi Teks]\n\nTeks dipilih:\n"${selText.substring(0, 200)}${selText.length > 200 ? '...' : ''}"\n\nInstruksi: ${instruction}`,
      },
    ]);

    try {
      const stream = aiDocGeneratorService.streamModifySelection(
        { selectedText: selText, instruction: instruction.trim(), fullDocument: docText },
        abortRef.current.signal,
      );
      for await (const chunk of stream) replacement += chunk.text;

      if (selRangeRef.current && replacement) {
        const { start, end } = selRangeRef.current;
        const plain = stripHtml(replacement);
        // B1: push to history
        pushDocText(docText.slice(0, start) + plain + docText.slice(end));

        // A6: push assistant audit message after stream
        const displayResult = plain.substring(0, 200) + (plain.length > 200 ? '...' : '');
        setMessages(prev => [
          ...prev,
          {
            id: `audit-a-${Date.now()}`,
            role: 'assistant' as const,
            content: `[Hasil Modifikasi]\n\n"${displayResult}"`,
          },
        ]);
      }

      vibrate(12);
      setRetryPayload(null);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        // B2: set retry payload
        setRetryPayload({ type: 'modify', selectedText: selText, instruction });
      }
    } finally {
      setAiModifyLoading(false);
      setAiModifyMode(false);
      setAiModifyInput('');
      selRangeRef.current = null;
    }
  }, [aiModifyLoading, docText, pushDocText]);

  const handleModifySubmit = useCallback(async () => {
    if (!aiModifyInput.trim() || aiModifyLoading) return;
    await doModify(selectedText, aiModifyInput.trim());
  }, [aiModifyInput, aiModifyLoading, selectedText, doModify]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!docText.trim()) { message.warning('Dokumen masih kosong.'); return; }
    setDownloading(true);
    try {
      const blob = await templateAktaService.generateFromText(docText, downloadFormat);
      const ext  = downloadFormat === 'pdf' ? 'pdf' : 'docx';
      triggerDownload(blob, `${docTitle}.${ext}`);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(anyErr?.response?.data?.message ?? anyErr?.message ?? 'Gagal download dokumen.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Derived: show prompt examples ─────────────────────────────────────────
  // D1: show when only welcome message or no messages, and no doc yet
  const showPromptExamples = !docHasContent && !isStreaming && (
    (messages.length === 0) ||
    (messages.length === 1 && messages[0].role === 'assistant' && messages[0].id === 'welcome')
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="aktura-konsep-layout" style={{ display: 'flex', height: 'calc(100vh - 64px)', margin: -24, overflow: 'hidden', background: IVORY }}>

      {/* ── LEFT PANEL: Chat ─────────────────────────────────────────────── */}
      <div className="aktura-konsep-chat-panel" style={{
        width: '38%', minWidth: 300,
        display: 'flex', flexDirection: 'column',
        background: '#fff', borderRight: `1px solid ${BORDER}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '0 16px', height: 48,
          borderBottom: `1px solid ${BORDER}`,
          background: NAVY,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <RobotOutlined style={{ color: GOLD, fontSize: 16 }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Penyusunan Dokumen</span>
          {aktaContext && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 500,
              background: 'rgba(198,167,94,0.18)', color: GOLD,
              padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
            }}>
              Konteks: {aktaContext.jenisAkta}
            </span>
          )}
        </div>

        {/* D2: Context banner */}
        {aktaContext && !ctxBannerDismissed && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <span>
                <strong>Konteks aktif:</strong>{' '}
                {aktaContext.jenisAkta} — {aktaContext.nomorAkta}
                {aktaContext.paraPihak?.length > 0 && ` · ${aktaContext.paraPihak.length} pihak`}
              </span>
            }
            description="AI sudah mengetahui data akta ini. Tidak perlu mengulang informasi dasar."
            closable
            onClose={() => setCtxBannerDismissed(true)}
            style={{ margin: '8px 12px 0', fontSize: 12 }}
          />
        )}

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((m, i) => (
            <div key={m.id ?? i} style={
              m.role === 'user'
                ? {
                    alignSelf: 'flex-end', background: NAVY, color: '#fff',
                    borderRadius: '12px 12px 2px 12px', padding: '10px 14px',
                    maxWidth: '82%', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  }
                : {
                    alignSelf: 'flex-start', background: IVORY,
                    borderLeft: `3px solid ${GOLD}`,
                    borderRadius: '0 12px 12px 12px', padding: '10px 14px',
                    maxWidth: '90%', fontSize: 13, lineHeight: 1.6, color: '#2F2F2F',
                    whiteSpace: 'pre-wrap',
                  }
            }>
              {m.content || (
                <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{
                      width: 5, height: 5, borderRadius: '50%', background: GOLD,
                      display: 'inline-block',
                      animation: 'aktura-pulse 1.2s ease-in-out infinite',
                      animationDelay: `${d * 0.2}s`,
                    }} />
                  ))}
                </span>
              )}
            </div>
          ))}

          {/* D1: Prompt examples */}
          {showPromptExamples && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, marginTop: 8, padding: '0 4px',
            }}>
              {PROMPT_EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setInput(ex.prompt)}
                  style={{
                    background: IVORY, border: `1px solid ${BORDER}`, borderRadius: 8,
                    padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
                >
                  <div style={{ fontSize: 15, marginBottom: 4 }}>{ex.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 2 }}>{ex.label}</div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
                    {ex.prompt.substring(0, 55)}...
                  </div>
                </button>
              ))}
            </div>
          )}

          {isStreaming && (
            <div style={{ fontSize: 12, color: GOLD, fontStyle: 'italic' }}>
              Menyusun dokumen...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Modify panel (edit mode) */}
        {aiModifyMode && (
          <div style={{
            margin: '0 12px 8px', padding: '10px 12px',
            background: IVORY, borderLeft: `3px solid ${GOLD}`,
            borderRadius: 4, fontSize: 12,
          }}>
            <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Teks dipilih:</div>
            <div style={{
              fontStyle: 'italic', color: '#555', lineHeight: 1.5, marginBottom: 8,
            }}>
              "{selectedText.slice(0, 120)}{selectedText.length > 120 ? '...' : ''}"
            </div>
            <Input
              size="small"
              placeholder="Instruksi untuk AI..."
              value={aiModifyInput}
              onChange={e => setAiModifyInput(e.target.value)}
              onPressEnter={handleModifySubmit}
              autoFocus
              style={{ marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="small" type="primary" loading={aiModifyLoading}
                onClick={handleModifySubmit} disabled={!aiModifyInput.trim()}
                style={{ background: NAVY, borderColor: NAVY, fontSize: 11 }}>
                Kirim ke AI
              </Button>
              <Button size="small"
                onClick={() => { setAiModifyMode(false); setAiModifyInput(''); }}
                style={{ fontSize: 11 }}>
                Batal
              </Button>
            </div>
          </div>
        )}

        {/* B2: Retry alert */}
        {retryPayload && (
          <Alert
            type="error"
            showIcon
            message="Permintaan ke AI gagal"
            description="Terjadi kesalahan saat menghubungi AI. Periksa koneksi lalu coba lagi."
            action={
              <Button size="small" type="primary" danger onClick={handleRetry}>
                Coba Lagi
              </Button>
            }
            closable
            onClose={() => setRetryPayload(null)}
            style={{ margin: '0 12px 8px' }}
          />
        )}

        {/* Input */}
        <div style={{
          padding: '12px 14px', borderTop: `1px solid ${BORDER}`,
          background: IVORY, flexShrink: 0,
        }}>
          <TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ketik pesan... (Enter kirim, Shift+Enter baris baru)"
            autoSize={{ minRows: 2, maxRows: 5 }}
            disabled={chatLoading || isStreaming}
            style={{
              borderRadius: 6, border: `1px solid ${BORDER}`,
              background: '#fff', fontSize: 13, resize: 'none', marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
              loading={chatLoading} disabled={!input.trim() || isStreaming}
              style={{ flex: 1, background: NAVY, borderColor: NAVY, fontSize: 12, fontWeight: 600 }}>
              Kirim
            </Button>
            {/* A2: Generate with Tooltip, no messages.length < 2 restriction */}
            <Tooltip title="Susun dokumen berdasarkan percakapan. Tulis instruksi lalu klik Generate.">
              <Button icon={<ThunderboltOutlined />} onClick={handleGenerate}
                loading={isStreaming} disabled={chatLoading || isStreaming}
                style={{ flex: 1, borderColor: GOLD, color: GOLD, fontSize: 12, fontWeight: 600 }}>
                {isStreaming ? 'Generating...' : 'Generate'}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Document ─────────────────────────────────────────── */}
      <div className="aktura-konsep-doc-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          borderBottom: `1px solid ${BORDER}`,
          background: '#fff', flexShrink: 0,
        }}>
          {/* Status bar — always visible, shows current AI state */}
          <div style={{
            padding: '6px 16px',
            background: isStreaming ? `${NAVY}08` : docHasContent ? `${GOLD}0a` : IVORY,
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background 0.3s',
          }}>
            {isStreaming ? (
              <>
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {[0,1,2].map(d => (
                    <span key={d} style={{
                      width: 5, height: 5, borderRadius: '50%', background: GOLD,
                      display: 'inline-block',
                      animation: 'kd-pulse 1.1s ease-in-out infinite',
                      animationDelay: `${d * 180}ms`,
                    }} />
                  ))}
                </span>
                <span style={{ fontSize: 11.5, color: NAVY, fontWeight: 600 }}>
                  AI sedang menyusun dokumen...
                </span>
                {/* A7: elapsed timer */}
                {streamElapsed > 0 && (
                  <span style={{ fontSize: 11, color: MUTED, marginLeft: 12 }}>
                    {streamElapsed < 30
                      ? `${streamElapsed}d`
                      : `${streamElapsed}d — memerlukan lebih lama dari biasanya...`}
                  </span>
                )}
              </>
            ) : docHasContent ? (
              <>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#4ade80', display: 'inline-block',
                  boxShadow: '0 0 0 2px rgba(74,222,128,0.25)',
                }} />
                <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                  Draft selesai — siap diedit atau diunduh
                </span>
              </>
            ) : (
              <span style={{ fontSize: 11.5, color: MUTED }}>
                Mulai percakapan di panel kiri, kemudian klik <strong style={{ color: NAVY }}>Generate</strong> untuk menyusun dokumen.
              </span>
            )}
          </div>

          {/* Toolbar row */}
          <div style={{
            padding: '7px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {/* B1: Undo/Redo buttons */}
            {docHasContent && !isStreaming && (
              <>
                <Tooltip title="Undo (Ctrl+Z)">
                  <Button size="small" icon={<UndoOutlined />} onClick={undoDoc} disabled={!canUndo} />
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Y)">
                  <Button size="small" icon={<RedoOutlined />} onClick={redoDoc} disabled={!canRedo} />
                </Tooltip>
              </>
            )}

            {/* View toggle */}
            {docHasContent && !isStreaming && (
              <Segmented
                size="small"
                value={viewMode}
                onChange={v => setViewMode(v as 'preview' | 'edit')}
                options={[
                  { label: 'Preview', value: 'preview', icon: <EyeOutlined /> },
                  { label: 'Edit',    value: 'edit',    icon: <EditOutlined /> },
                ]}
              />
            )}

            {/* A3: AI modify button (edit mode only) — disabled when no selection */}
            {viewMode === 'edit' && docHasContent && !isStreaming && (
              <Tooltip title={
                hasSelection
                  ? 'Kirim instruksi untuk memodifikasi teks yang dipilih'
                  : 'Sorot teks di editor terlebih dahulu'
              }>
                <Button size="small" icon={<RobotOutlined />}
                  onClick={handleAskAI}
                  disabled={!hasSelection || isStreaming || chatLoading}
                  style={{ borderColor: hasSelection ? GOLD : undefined, color: hasSelection ? GOLD : undefined, fontSize: 12 }}>
                  Edit via AI
                </Button>
              </Tooltip>
            )}

            <span style={{ flex: 1, fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {docTitle !== 'Dokumen Baru' ? docTitle : ''}
            </span>

            {/* Download */}
            {docHasContent && !isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Segmented
                  size="small"
                  value={downloadFormat}
                  onChange={v => setDownloadFormat(v as 'docx' | 'pdf')}
                  options={[
                    { label: 'Word', value: 'docx', icon: <FileWordOutlined /> },
                    { label: 'PDF',  value: 'pdf',  icon: <FilePdfOutlined />  },
                  ]}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={handleDownload}
                  style={{ background: NAVY, borderColor: NAVY, fontWeight: 600 }}
                >
                  Unduh
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Streaming: AktaViewer real-time */}
          {isStreaming && (
            <AktaViewer text={docText} readOnly />
          )}

          {/* Preview mode: AktaViewer */}
          {!isStreaming && viewMode === 'preview' && docHasContent && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Hint: switch to edit to use AI modify */}
              <div style={{
                padding: '7px 20px',
                background: `${NAVY}06`,
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 8,
                flexShrink: 0,
              }}>
                <EditOutlined style={{ fontSize: 11, color: GOLD }} />
                <span style={{ fontSize: 11.5, color: MUTED }}>
                  Beralih ke mode <strong style={{ color: NAVY }}>Edit</strong> untuk menyeleksi teks dan meminta AI memodifikasi bagian tertentu.
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <AktaViewer text={docText} readOnly />
              </div>
            </div>
          )}

          {/* Edit mode: textarea */}
          {!isStreaming && viewMode === 'edit' && docHasContent && (
            <div style={{ padding: '20px 24px', minHeight: '100%', background: '#d8d8d8' }}>
              <div style={{
                width: '100%', maxWidth: '215mm', margin: '0 auto',
                background: '#fff',
                padding: '30mm 30mm 30mm 40mm',
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                boxSizing: 'border-box',
              }}>
                <textarea
                  ref={textareaRef}
                  value={docText}
                  onChange={e => setDocLive(e.target.value)}
                  onBlur={() => {
                    // B1: commit typing to history on blur
                    if (docText !== '') pushDocText(docText);
                    // A3: clear selection on blur
                    setHasSelection(false);
                  }}
                  onMouseUp={handleTextareaSelect}
                  onKeyUp={handleTextareaSelect}
                  style={{
                    width: '100%',
                    minHeight: '200mm',
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: '12pt',
                    lineHeight: 1.5,
                    color: '#000',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>
          )}

          {/* Empty state — premium editorial */}
          {!isStreaming && !docHasContent && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', padding: '40px 32px',
              gap: 0,
            }}>
              {/* Document illustration */}
              <div style={{
                width: 80, height: 96, borderRadius: 8,
                background: '#fff', border: `2px dashed ${BORDER}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, marginBottom: 24, position: 'relative',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                {/* Fold corner */}
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 20, height: 20,
                  background: `linear-gradient(225deg, ${IVORY} 50%, #fff 50%)`,
                  borderLeft: `1px dashed ${BORDER}`, borderBottom: `1px dashed ${BORDER}`,
                  borderRadius: '0 8px 0 0',
                }} />
                {[0.9, 0.65, 0.45].map((w, i) => (
                  <div key={i} style={{
                    height: 6, borderRadius: 3,
                    background: `${BORDER}`,
                    width: `${w * 52}px`,
                    opacity: 0.7,
                  }} />
                ))}
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `${GOLD}18`, border: `1px solid ${GOLD}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 4,
                }}>
                  <ThunderboltOutlined style={{ fontSize: 11, color: GOLD }} />
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 8 }}>
                Dokumen belum dibuat
              </div>
              <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
                Ceritakan dokumen yang Anda butuhkan di panel kiri, lalu klik tombol{' '}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: `${GOLD}15`, color: '#92640a',
                  border: `1px solid ${GOLD}35`,
                  borderRadius: 5, padding: '1px 7px', fontSize: 12, fontWeight: 600,
                }}>
                  <ThunderboltOutlined style={{ fontSize: 10 }} /> Generate
                </span>{' '}
                untuk menyusun draft otomatis.
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes aktura-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes kd-pulse {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes kd-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
