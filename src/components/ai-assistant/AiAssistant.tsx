import { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from 'antd';
import {
  MessageOutlined, CloseOutlined, SendOutlined, StopOutlined,
  CopyOutlined, CheckOutlined,
} from '@ant-design/icons';
import DOMPurify from 'dompurify';
import {
  aiAssistantService,
  type ChatHistoryItem,
} from '../../services/ai-assistant.service';
import { NAVY, GOLD, IVORY, BORDER, INK, MUTED } from '../../theme/tokens';

// ── Types ─────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  isError?: boolean;
}

// ── Suggested starter questions ───────────────────────────────
const SUGGESTED = [
  { icon: '📋', text: 'Apa itu akta notaris?' },
  { icon: '🏡', text: 'Proses jual beli tanah?' },
  { icon: '🏢', text: 'Syarat pendirian PT?' },
  { icon: '✍️', text: 'Cara membuat surat kuasa?' },
];

// ── Simple markdown renderer ──────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.07);padding:1px 5px;border-radius:3px;font-size:11.5px;font-family:monospace">$1</code>')
    .replace(/^• (.+)$/gm, '<li style="margin-left:12px">$1</li>')
    .replace(/\n/g, '<br>');
}

function sanitizeMarkdown(raw: string): string {
  return DOMPurify.sanitize(renderMarkdown(raw), {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'ul', 'li', 'br', 'span'],
    ALLOWED_ATTR: ['style'],
  });
}

// ── Haptic helper ──────────────────────────────────────────────
function vibrate(pattern: number | number[]): void {
  navigator.vibrate?.(pattern);
}

// ── Component ─────────────────────────────────────────────────
export default function AiAssistant() {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [thinking, setThinking]       = useState(false);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [copiedId, setCopiedId]       = useState<number | null>(null);

  const bottomRef          = useRef<HTMLDivElement>(null);
  const abortRef           = useRef<AbortController | null>(null);
  const textareaRef        = useRef<HTMLTextAreaElement>(null);
  const typewriterQueueRef = useRef<string>('');
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load broadcast badge on mount
  useEffect(() => {
    aiAssistantService.getBroadcasts()
      .then(l => setBroadcastCount(l.length))
      .catch(() => {});
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 160);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard shortcuts: Ctrl+K toggle, Escape close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
        setBroadcastCount(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleOpen = () => {
    vibrate(5);
    setOpen(true);
    setBroadcastCount(0);
  };

  // ── Copy handler ─────────────────────────────────────────────
  const handleCopy = useCallback(async (id: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // ── Typewriter flush helper ───────────────────────────────────
  const stopTypewriter = useCallback((finalContent?: string) => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    if (finalContent !== undefined) {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { role: 'assistant', content: finalContent, streaming: false };
        }
        return copy;
      });
      typewriterQueueRef.current = '';
    }
  }, []);

  // ── Core send logic ──────────────────────────────────────────
  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const history: ChatHistoryItem[] = messages.map(m => ({
      role: m.role, content: m.content,
    }));

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setThinking(true);
    vibrate(8);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    typewriterQueueRef.current = '';
    let accumulated  = '';
    let displayed    = '';
    let firstChunk   = true;

    try {
      for await (const chunk of aiAssistantService.streamChat(
        text, history, abortRef.current.signal,
      )) {
        if (firstChunk) {
          setThinking(false);
          firstChunk = false;
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: '', streaming: true },
          ]);
          // Start typewriter timer
          typewriterTimerRef.current = setInterval(() => {
            if (typewriterQueueRef.current.length > 0) {
              const batch = typewriterQueueRef.current.substring(0, 3);
              typewriterQueueRef.current = typewriterQueueRef.current.substring(3);
              displayed += batch;
              const snap = displayed;
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant' && last.streaming) {
                  copy[copy.length - 1] = { role: 'assistant', content: snap, streaming: true };
                }
                return copy;
              });
            }
          }, 16);
        }
        accumulated += chunk;
        typewriterQueueRef.current += chunk;
      }
    } catch (e: unknown) {
      setThinking(false);
      if ((e as Error)?.name !== 'AbortError') {
        if (accumulated === '') {
          stopTypewriter();
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.', isError: true },
          ]);
        }
      }
    } finally {
      setLoading(false);
      setThinking(false);
      // Flush remaining typewriter queue
      const remaining = typewriterQueueRef.current;
      stopTypewriter(displayed + remaining || accumulated || '...');
      vibrate(12);
    }
  }, [loading, messages, stopTypewriter]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    doSend(text);
  }, [input, doSend]);

  const handleSuggested = useCallback((text: string) => {
    doSend(text);
  }, [doSend]);

  const handleStop = () => {
    vibrate([20, 10, 20]);
    abortRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating trigger button ──────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        display: open ? 'none' : 'block',
      }}>
        <Badge count={broadcastCount} size="small" offset={[-4, 4]}
          style={{ background: GOLD }}>
          <button
            className="aktura-ai-fab"
            onClick={handleOpen}
            title="Tanya Legalnya! (Ctrl+K)"
            aria-label="Buka asisten AI"
          >
            <MessageOutlined style={{ fontSize: 21 }} />
            <span className="aktura-ai-fab-ring" />
          </button>
        </Badge>
      </div>

      {/* ── Chat panel ──────────────────────────────────────── */}
      <div
        className={`aktura-ai-panel${open ? ' aktura-ai-panel--open' : ''}`}
        role="dialog"
        aria-label="Tanya Legalnya — Asisten Notaris"
      >
        {/* Header */}
        <div className="aktura-ai-header">
          <div className="aktura-ai-header-left">
            <div className="aktura-ai-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
                  fill={GOLD} />
              </svg>
            </div>
            <div>
              <div className="aktura-ai-title">Tanya Legalnya!</div>
              <div className="aktura-ai-subtitle">
                <span className="aktura-ai-online-dot" />
                Asisten Notaris Digital
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="aktura-ai-kbd-hint">Ctrl+K</span>
            <button
              className="aktura-ai-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              <CloseOutlined style={{ fontSize: 13 }} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="aktura-ai-messages">
          {isEmpty && (
            <div className="aktura-ai-welcome">
              {/* Hero greeting */}
              <div className="aktura-ai-welcome-hero">
                <div className="aktura-ai-welcome-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
                      fill={GOLD} />
                  </svg>
                </div>
                <div className="aktura-ai-welcome-text">
                  <div className="aktura-ai-welcome-title">Halo! Saya siap membantu.</div>
                  <div className="aktura-ai-welcome-desc">
                    Tanya apa saja seputar hukum notaris, penggunaan AKTURA, atau proses legal.
                  </div>
                </div>
              </div>
              {/* Suggested questions */}
              <div className="aktura-ai-suggestions">
                <div className="aktura-ai-suggestions-label">Pertanyaan umum</div>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    className="aktura-ai-suggestion-btn"
                    onClick={() => handleSuggested(s.text)}
                    disabled={loading}
                  >
                    <span className="aktura-ai-suggestion-icon">{s.icon}</span>
                    <span>{s.text}</span>
                    <span className="aktura-ai-suggestion-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`aktura-ai-msg aktura-ai-msg--${msg.role}`}
            >
              {msg.role === 'assistant' && (
                <div className="aktura-ai-msg-avatar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
                      fill={GOLD} />
                  </svg>
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div
                  className={`aktura-ai-bubble aktura-ai-bubble--assistant aktura-ai-bubble-assistant${msg.isError ? ' aktura-ai-bubble--error' : ''}`}
                  style={{ position: 'relative' }}
                  dangerouslySetInnerHTML={
                    msg.content ? { __html: sanitizeMarkdown(msg.content) } : undefined
                  }
                >
                  {msg.streaming && msg.content && (
                    <span className="aktura-ai-cursor" />
                  )}
                  {!msg.streaming && msg.content && (
                    <button
                      className={`aktura-ai-copy-btn${copiedId === i ? ' copied' : ''}`}
                      onClick={() => handleCopy(i, msg.content)}
                      title={copiedId === i ? 'Tersalin!' : 'Salin teks'}
                    >
                      {copiedId === i
                        ? <CheckOutlined style={{ fontSize: 11 }} />
                        : <CopyOutlined style={{ fontSize: 11 }} />
                      }
                    </button>
                  )}
                </div>
              ) : (
                <div className="aktura-ai-bubble aktura-ai-bubble--user">
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Thinking dots — shown before first token */}
          {thinking && (
            <div className="aktura-ai-msg aktura-ai-msg--assistant">
              <div className="aktura-ai-msg-avatar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
                    fill={GOLD} />
                </svg>
              </div>
              <div className="aktura-ai-bubble aktura-ai-bubble--assistant aktura-ai-thinking">
                <span className="aktura-dot" style={{ animationDelay: '0ms' }} />
                <span className="aktura-dot" style={{ animationDelay: '180ms' }} />
                <span className="aktura-dot" style={{ animationDelay: '360ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} style={{ height: 4 }} />
        </div>

        {/* Input area */}
        <div className="aktura-ai-input-area">
          {/* Stop button when loading */}
          {loading && (
            <button className="aktura-ai-stop-btn" onClick={handleStop}>
              <StopOutlined style={{ fontSize: 12 }} /> Hentikan
            </button>
          )}

          <div className="aktura-ai-input-row">
            <textarea
              ref={textareaRef}
              className="aktura-ai-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pertanyaan... (Enter kirim)"
              disabled={loading}
              rows={1}
            />
            <button
              className={`aktura-ai-send-btn${input.trim() && !loading ? ' aktura-ai-send-btn--active' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Kirim"
            >
              <SendOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
          <div className="aktura-ai-input-hint">
            Enter kirim &nbsp;·&nbsp; Shift+Enter baris baru
          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────
const STYLES = `
/* ── FAB button ── */
.aktura-ai-fab {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${NAVY};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 20px rgba(27,54,93,0.38);
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.2s ease;
}
.aktura-ai-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(27,54,93,0.5);
}
.aktura-ai-fab:active {
  transform: scale(0.95);
}
.aktura-ai-fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(198,167,94,0.4);
  animation: aktura-ai-ring-pulse 2.4s ease-in-out infinite;
}
@keyframes aktura-ai-ring-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 0;   transform: scale(1.25); }
}

/* ── Panel ── */
.aktura-ai-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: min(400px, calc(100vw - 32px));
  max-height: min(580px, calc(100vh - 100px));
  background: #fff;
  border-radius: 18px;
  border: 1px solid ${BORDER};
  box-shadow:
    0 20px 60px rgba(27,54,93,0.18),
    0 6px 20px rgba(0,0,0,0.08),
    0 0 0 1px rgba(255,255,255,0.8) inset;
  display: flex;
  flex-direction: column;
  z-index: 1001;
  overflow: hidden;
  /* Default: hidden */
  opacity: 0;
  transform: scale(0.88) translateY(12px);
  pointer-events: none;
  transform-origin: bottom right;
  transition: opacity 0.22s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.aktura-ai-panel--open {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: all;
}

/* ── Header ── */
.aktura-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: ${NAVY};
  flex-shrink: 0;
}
.aktura-ai-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.aktura-ai-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(198,167,94,0.15);
  border: 1px solid rgba(198,167,94,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.aktura-ai-title {
  color: #fff;
  font-weight: 700;
  font-size: 13.5px;
  line-height: 1;
}
.aktura-ai-subtitle {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.aktura-ai-online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(74,222,128,0.3);
  animation: aktura-ai-online-pulse 2s ease-in-out infinite;
}
@keyframes aktura-ai-online-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.aktura-ai-kbd-hint {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  font-family: monospace;
  padding: 2px 5px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
}
.aktura-ai-close-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.aktura-ai-close-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

/* ── Messages ── */
.aktura-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-behavior: smooth;
}

/* ── Welcome screen ── */
.aktura-ai-welcome {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: aktura-ai-fadein 0.4s ease;
}
@keyframes aktura-ai-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.aktura-ai-welcome-hero {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  background: ${IVORY};
  border-radius: 12px;
  border: 1px solid ${BORDER};
}
.aktura-ai-welcome-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: ${NAVY};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(27,54,93,0.2);
}
.aktura-ai-welcome-text { flex: 1; }
.aktura-ai-welcome-title {
  font-size: 14px;
  font-weight: 700;
  color: ${INK};
  margin-bottom: 4px;
}
.aktura-ai-welcome-desc {
  font-size: 12.5px;
  color: ${MUTED};
  line-height: 1.6;
}
.aktura-ai-suggestions-label {
  font-size: 10.5px;
  font-weight: 700;
  color: ${MUTED};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 2px;
  padding: 0 2px;
}
.aktura-ai-suggestions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aktura-ai-suggestion-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  color: ${INK};
  transition: all 0.15s ease;
  width: 100%;
}
.aktura-ai-suggestion-btn:hover:not(:disabled) {
  background: ${IVORY};
  border-color: ${GOLD};
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(198,167,94,0.15);
}
.aktura-ai-suggestion-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
  pointer-events: none;
}
.aktura-ai-suggestion-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.aktura-ai-suggestion-arrow {
  margin-left: auto;
  color: ${MUTED};
  font-size: 14px;
  opacity: 0.5;
  transition: opacity 0.15s, transform 0.15s;
}
.aktura-ai-suggestion-btn:hover .aktura-ai-suggestion-arrow {
  opacity: 1;
  transform: translateX(3px);
}

/* ── Message rows ── */
.aktura-ai-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  animation: aktura-ai-fadein 0.2s ease;
}
.aktura-ai-msg--user {
  flex-direction: row-reverse;
}
.aktura-ai-msg-avatar {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(27,54,93,0.06);
  border: 1px solid rgba(198,167,94,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── Chat bubbles ── */
.aktura-ai-bubble {
  max-width: 80%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
}
.aktura-ai-bubble--user {
  background: ${NAVY};
  color: #fff;
  border-radius: 14px 14px 4px 14px;
  white-space: pre-wrap;
}
.aktura-ai-bubble--assistant {
  background: ${IVORY};
  color: ${INK};
  border: 1px solid ${BORDER};
  border-radius: 4px 14px 14px 14px;
}
.aktura-ai-bubble--error {
  background: #fff5f5;
  border-color: #ffcdd2;
  color: #c62828;
}

/* ── Copy button ── */
.aktura-ai-copy-btn {
  position: absolute;
  bottom: 6px; right: 6px;
  opacity: 0;
  transition: opacity 0.15s;
  background: white;
  border: 1px solid ${BORDER};
  border-radius: 4px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 12px;
  color: ${MUTED};
  display: flex; align-items: center; gap: 3px;
  line-height: 1;
}
.aktura-ai-bubble-assistant:hover .aktura-ai-copy-btn {
  opacity: 1;
}
.aktura-ai-copy-btn.copied {
  color: #52c41a;
  border-color: #b7eb8f;
  opacity: 1;
}
@media (hover: none) {
  .aktura-ai-copy-btn { opacity: 1; }
}

/* ── Streaming cursor ── */
.aktura-ai-cursor {
  display: inline-block;
  width: 2px;
  height: 0.85em;
  background: ${GOLD};
  margin-left: 2px;
  vertical-align: middle;
  border-radius: 1px;
  animation: aktura-ai-blink 0.9s step-end infinite;
}
@keyframes aktura-ai-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Thinking dots ── */
.aktura-ai-thinking {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}
.aktura-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${GOLD};
  display: inline-block;
  animation: aktura-dot-bounce 1.1s ease-in-out infinite;
  opacity: 0.7;
}
@keyframes aktura-dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%           { transform: translateY(-6px); opacity: 1; }
}

/* ── Input area ── */
.aktura-ai-input-area {
  padding: 10px 12px 12px;
  border-top: 1px solid ${BORDER};
  background: ${IVORY};
  flex-shrink: 0;
}
.aktura-ai-stop-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  color: #e53935;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  justify-content: center;
  margin-bottom: 8px;
  transition: all 0.15s;
}
.aktura-ai-stop-btn:hover {
  background: #ffebee;
}
.aktura-ai-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.aktura-ai-textarea {
  flex: 1;
  resize: none;
  border: 1px solid ${BORDER};
  border-radius: 10px;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${INK};
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  min-height: 40px;
  max-height: 100px;
  overflow-y: auto;
  field-sizing: content;
}
.aktura-ai-textarea:focus {
  border-color: ${NAVY};
  box-shadow: 0 0 0 2px rgba(27,54,93,0.1);
}
.aktura-ai-textarea::placeholder {
  color: #bbb;
}
.aktura-ai-textarea:disabled {
  background: #fafafa;
  color: #aaa;
}
.aktura-ai-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid ${BORDER};
  background: #e9e9e9;
  color: #bbb;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
.aktura-ai-send-btn--active {
  background: ${NAVY};
  border-color: ${NAVY};
  color: #fff;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(27,54,93,0.3);
}
.aktura-ai-send-btn--active:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(27,54,93,0.45);
}
.aktura-ai-send-btn--active:active {
  transform: scale(0.94);
}
.aktura-ai-input-hint {
  font-size: 10.5px;
  color: #c0bdb8;
  margin-top: 5px;
  padding: 0 2px;
  text-align: right;
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .aktura-ai-panel {
    bottom: 0;
    right: 0;
    width: 100vw;
    max-height: 85vh;
    border-radius: 20px 20px 0 0;
    transform-origin: bottom center;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
  .aktura-ai-fab {
    bottom: 16px;
    right: 16px;
  }
  .aktura-ai-kbd-hint {
    display: none;
  }
  .aktura-ai-bubble {
    max-width: 85%;
  }
  .aktura-ai-msg-avatar {
    flex-shrink: 0;
  }
  .aktura-ai-messages {
    padding: 10px 10px 8px;
  }
}
`;
