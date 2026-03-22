import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, Select, message, Spin, Upload, Modal, Switch,
  Typography, Space, Tag, Tabs, Tooltip, Checkbox, Alert,
} from 'antd';
import {
  SaveOutlined, ArrowLeftOutlined, UploadOutlined, EditOutlined,
  CheckOutlined, TagOutlined, FileWordOutlined, RobotOutlined,
  StopOutlined, BulbOutlined, DownloadOutlined, LoadingOutlined, EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { AktaViewer } from '../../components/akta-viewer';
import type { TtdLayout } from '../../components/akta-viewer';
import { DEFAULT_TTD_LAYOUT } from '../../components/akta-viewer';
import type { PlaceholderDef, PlaceholderType, TemplateAkta } from '../../types';
import { templateAktaService, triggerDownload } from '../../services/templateAkta.service';
import { aiService } from '../../services/ai.service';
import DocumentEditor from './components/DocumentEditor';
import PlaceholderPanel from './components/PlaceholderPanel';
import CustomBlockEditor, { blocksToText } from './components/CustomBlockEditor';

const { Text } = Typography;

// ── C3: Placeholder validation ────────────────────────────────────────────────
type PlaceholderValidation = {
  orphans:    string[];  // di panel tapi tidak ada {{key}} di dokumen
  missing:    string[];  // {{key}} ada di dokumen tapi tidak ada di panel
  duplicates: string[];  // key muncul lebih dari sekali di panel
};

function validatePlaceholders(defs: PlaceholderDef[], docText: string): PlaceholderValidation {
  const inDoc = new Set<string>();
  const regex = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(docText)) !== null) inDoc.add(m[1]);
  const keys = defs.map(p => p.key);
  return {
    orphans:    keys.filter(k => !inDoc.has(k)),
    missing:    [...inDoc].filter(k => !keys.includes(k)),
    duplicates: keys.filter((k, i) => keys.indexOf(k) !== i),
  };
}

// ── A4: Auto-generate placeholder key dari teks ───────────────────────────────
function generateKeyFromText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accent
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 32);
}

// ── Konversi blocksPlainText + placeholders → kontenTemplate dengan {{key}} ──
function deriveKontenTemplate(text: string, phs: PlaceholderDef[]): string {
  let result = text;
  for (const ph of phs) {
    if (ph.originalText) {
      result = result.replaceAll(ph.originalText, `{{${ph.key}}}`);
    }
  }
  return result;
}

/** Deteksi semua {{key}} dari teks template (case-insensitive key) */
const detectPlaceholders = (text: string): PlaceholderDef[] => {
  const regex = /\{\{([A-Za-z0-9_]+)\}\}/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) seen.add(m[1]);
  return Array.from(seen).map((key) => ({ key, label: key, type: 'text' as PlaceholderType }));
};

/** Merge placeholder keys menjadi state — tidak duplikasi */
const mergePlaceholderKeys = (keys: string[], prev: PlaceholderDef[]): PlaceholderDef[] => {
  const existingKeys = new Set(prev.map((p) => p.key));
  const newOnes = keys
    .filter((k) => !existingKeys.has(k))
    .map((k) => ({ key: k, label: k, type: 'text' as PlaceholderType }));
  return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
};

const JENIS_OPTIONS = [
  'Jaminan Fidusia', 'Jual Beli', 'Sewa Menyewa', 'Perjanjian Kredit',
  'Hibah', 'Wasiat', 'Kuasa', 'Pendirian PT', 'Perubahan AD/ART', 'Lainnya',
].map((v) => ({ label: v, value: v }));

const TYPE_OPTIONS: { label: string; value: PlaceholderType }[] = [
  { label: 'Teks',           value: 'text'     },
  { label: 'Teks Panjang',   value: 'textarea' },
  { label: 'Angka',          value: 'number'   },
  { label: 'Mata Uang (Rp)', value: 'currency' },
  { label: 'Tanggal',        value: 'date'     },
];

type MarkPopoverState = {
  open: boolean;
  isEditMode: boolean;
  editingKey?: string;
  selectedText: string;
  rect: DOMRect | null;
  newKey: string;
  newLabel: string;
  newType: PlaceholderType;
  replaceAll: boolean;
};

const MARK_DEFAULT: MarkPopoverState = {
  open: false, isEditMode: false, editingKey: undefined,
  selectedText: '', rect: null,
  newKey: '', newLabel: '', newType: 'text', replaceAll: true,
};

type ImproveState = {
  open: boolean;
  instruction: string;
  originalText: string;
  loading: boolean;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function TemplateAktaEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // ── Common meta ──
  const [nama, setNama]           = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [jenisAkta, setJenisAkta] = useState('');
  const [isActive, setIsActive]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [dirty, setDirty]         = useState(false);

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'ai' | 'upload' | 'classic'>('ai');

  // ── AI + Upload tabs (BlockNote-based) ──
  const [kontenBlocks, setKontenBlocks]       = useState<string | null>(null);
  const [blocksPlainText, setBlocksPlainText] = useState('');
  // Key untuk force-remount CustomBlockEditor saat konten baru dimuat
  const [blockEditorKey, setBlockEditorKey]   = useState(0);

  // ── Streaming state (Tab AI) ──
  type StreamPhase = 'idle' | 'streaming' | 'editing';
  const [streamPhase, setStreamPhase]     = useState<StreamPhase>('idle');
  const [streamedText, setStreamedText]   = useState('');
  const [promptText, setPromptText]       = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const abortRef       = useRef<AbortController | null>(null);
  const accTextRef     = useRef(''); // ref untuk akumulasi text streaming
  const lastScanLenRef = useRef(0);  // posisi text terakhir yang sudah di-scan placeholder

  // ── Upload tab ──
  const [uploadLoading, setUploadLoading]       = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [reformatLoading, setReformatLoading]   = useState(false);

  // ── Classic tab ──
  const [kontenAsli, setKontenAsli]         = useState('');
  const [kontenTemplate, setKontenTemplate] = useState('');
  const [fileBase64, setFileBase64]         = useState<string | undefined>();
  const [tipeFile, setTipeFile]             = useState<string | undefined>();
  const [pasteModal, setPasteModal]         = useState(false);
  const [pasteText, setPasteText]           = useState('');

  // ── Placeholders (shared) ──
  const [placeholders, setPlaceholders] = useState<PlaceholderDef[]>([]);
  const [focusKey, setFocusKey]         = useState<string | null>(null);

  // ── AI Suggest Approve/Reject modal ──
  const [pendingSuggestions, setPendingSuggestions] = useState<PlaceholderDef[] | null>(null);
  const [approvedKeys, setApprovedKeys]             = useState<Set<string>>(new Set());

  // ── C2: Auto-suggest after generate ──
  const [autoSuggestAfterGen, setAutoSuggestAfterGen] = useState(true);
  const [isAutoSuggesting, setIsAutoSuggesting]       = useState(false);

  // ── B2: Retry mechanism ──
  const [lastGenPrompt, setLastGenPrompt] = useState<string | null>(null);

  // ── Mark placeholder modal ──
  const [markPopover, setMarkPopover] = useState<MarkPopoverState>(MARK_DEFAULT);

  // ── Improve block modal ──
  const [improve, setImprove] = useState<ImproveState>({
    open: false, instruction: '', originalText: '', loading: false,
  });

  // ── TTD Layout (shared across tabs) ──
  const [ttdLayout, setTtdLayout] = useState<TtdLayout>(DEFAULT_TTD_LAYOUT);

  // ── Preview mode (AI/Upload editing phase & Classic tab) ──
  const [previewMode, setPreviewMode] = useState(false);

  // ── Improve with AI: selected text stored for block improve ──
  const lastSelectionRef = useRef('');

  // ── Load existing template ──
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    templateAktaService.getById(id!)
      .then((res) => {
        const t: TemplateAkta = res.data;
        setNama(t.nama);
        setDeskripsi(t.deskripsi ?? '');
        setJenisAkta(t.jenisAkta);
        setIsActive(t.isActive);
        setPlaceholders(t.placeholders);
        setTipeFile(t.tipeFile);
        if (t.ttdLayoutJson) {
          try { setTtdLayout(JSON.parse(t.ttdLayoutJson)); } catch { /* pakai default */ }
        }

        if (t.kontenBlocks) {
          setKontenBlocks(t.kontenBlocks);
          // Backward-compat: kontenBlocks bisa berupa JSON (BlockNote lama) atau plain text (baru)
          try {
            const parsed = JSON.parse(t.kontenBlocks);
            setBlocksPlainText(blocksToText(parsed));
          } catch {
            // Bukan JSON — plain text langsung
            setBlocksPlainText(t.kontenBlocks);
          }
          setStreamPhase('editing');
          setBlockEditorKey((k) => k + 1);
          setActiveTab('ai');
        } else {
          // Template lama (Classic)
          setKontenAsli(t.kontenAsli ?? '');
          setKontenTemplate(t.kontenTemplate);
          setActiveTab('classic');
        }
      })
      .catch(() => message.error('Gagal memuat template.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // ── Streaming: generate draft ──
  const handleGenerate = async () => {
    if (!promptText.trim()) { message.warning('Prompt tidak boleh kosong.'); return; }

    abortRef.current     = new AbortController();
    accTextRef.current   = '';
    lastScanLenRef.current = 0;
    setStreamedText('');
    setStreamPhase('streaming');
    setStreamLoading(true);

    try {
      for await (const chunk of aiService.streamGenerateDraft(
        promptText, jenisAkta || 'Umum', abortRef.current.signal,
      )) {
        accTextRef.current += chunk;
        setStreamedText(accTextRef.current);

        // A1: real-time {{KEY}} detection — safe boundary (avoid partial match at chunk edge)
        const full = accTextRef.current;
        const lastOpen = full.lastIndexOf('{{');
        const safeEnd  = lastOpen >= 0 && !full.slice(lastOpen).includes('}}')
          ? lastOpen
          : full.length;
        if (safeEnd > lastScanLenRef.current) {
          const segment = full.slice(lastScanLenRef.current, safeEnd);
          const re = /\{\{([A-Za-z0-9_]+)\}\}/g;
          const found: string[] = [];
          let m: RegExpExecArray | null;
          while ((m = re.exec(segment)) !== null) found.push(m[1]);
          if (found.length > 0) {
            setPlaceholders((prev) => mergePlaceholderKeys(found, prev));
          }
          lastScanLenRef.current = safeEnd;
        }
      }
      finishStreaming(accTextRef.current);
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') {
        if (accTextRef.current) {
          finishStreaming(accTextRef.current);
        } else {
          setStreamPhase('idle');
        }
      } else {
        message.error('Gagal generate dari AI. Periksa koneksi dan API key.');
        setStreamPhase('idle');
        // B2: store last prompt for retry
        setLastGenPrompt(promptText);
      }
    } finally {
      setStreamLoading(false);
    }
  };

  const finishStreaming = (text: string) => {
    setStreamPhase('editing');
    setBlocksPlainText(text);
    setKontenBlocks(null);
    setBlockEditorKey((k) => k + 1);
    setDirty(true);
    // C2: Auto-suggest placeholder setelah AI selesai generate (jika diaktifkan)
    if (autoSuggestAfterGen && text.trim().length > 50) {
      setTimeout(() => autoSuggestPlaceholdersWithStatus(text), 600);
    }
  };

  const autoSuggestPlaceholders = async (text: string) => {
    if (!text.trim()) return;
    try {
      const suggested = await aiService.suggestPlaceholders(text, jenisAkta || 'Umum');
      if (suggested.length === 0) return;
      const existingKeys = new Set(placeholders.map((p) => p.key));
      const newOnes = suggested.filter((p) => !existingKeys.has(p.key));
      if (newOnes.length === 0) return;
      // Show approve/reject modal
      setPendingSuggestions(newOnes);
      setApprovedKeys(new Set(newOnes.map((p) => p.key)));
    } catch {
      // silent fail
    }
  };

  // C2: Auto-suggest with status indicator
  const autoSuggestPlaceholdersWithStatus = async (text: string) => {
    setIsAutoSuggesting(true);
    await autoSuggestPlaceholders(text);
    setIsAutoSuggesting(false);
  };

  const handleStopStream = () => {
    abortRef.current?.abort();
  };

  // ── Upload PDF (Tab Upload) ──
  const handleUploadPdf = async (file: File) => {
    setUploadLoading(true);
    try {
      const res  = await templateAktaService.parsePdf(file);
      const text = res.data.text;
      setBlocksPlainText(text);
      setKontenBlocks(null);
      setBlockEditorKey((k) => k + 1);
      setStreamPhase('editing');
      setTipeFile('pdf');
      setDirty(true);
      message.success('PDF berhasil diproses.');
    } catch {
      message.error('Gagal memproses PDF.');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  // ── Upload DOCX (Tab Upload) ──
  const handleUploadDocx = async (file: File) => {
    setUploadLoading(true);
    try {
      const res = await templateAktaService.parseDocx(file);
      const { text, fileBase64: fb64, tipeFile: tf } = res.data;
      setBlocksPlainText(text);
      setKontenBlocks(null);
      setBlockEditorKey((k) => k + 1);
      setStreamPhase('editing');
      setFileBase64(fb64);
      setTipeFile(tf);
      const detected = detectPlaceholders(text);
      if (detected.length > 0) {
        setPlaceholders(detected);
        setDirty(true);
        message.success(`DOCX dimuat. ${detected.length} placeholder terdeteksi.`);
      } else {
        setDirty(true);
        message.success('DOCX dimuat. AI sedang menyarankan placeholder...');
        // Auto-suggest via AI jika tidak ada placeholder yang terdeteksi secara manual
        autoSuggestPlaceholders(text);
      }
    } catch {
      message.error('Gagal memproses file Word.');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  // ── Upload PDF Classic ──
  const handleUploadPdfClassic = async (file: File) => {
    setUploadLoading(true);
    try {
      const res  = await templateAktaService.parsePdf(file);
      const text = res.data.text;
      setKontenAsli(text);
      setKontenTemplate(text);
      setTipeFile('pdf');
      setFileBase64(undefined);
      setDirty(true);
      message.success('PDF berhasil diproses.');
    } catch {
      message.error('Gagal memproses PDF.');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  // ── Upload DOCX Classic ──
  const handleUploadDocxClassic = async (file: File) => {
    setUploadLoading(true);
    try {
      const res = await templateAktaService.parseDocx(file);
      const { text, fileBase64: fb64, tipeFile: tf } = res.data;
      setKontenAsli(text);
      setKontenTemplate(text);
      setFileBase64(fb64);
      setTipeFile(tf);
      const detected = detectPlaceholders(text);
      if (detected.length > 0) setPlaceholders(detected);
      setDirty(true);
      message.success(
        detected.length > 0
          ? `DOCX dimuat. ${detected.length} placeholder terdeteksi otomatis.`
          : 'DOCX dimuat.',
      );
    } catch {
      message.error('Gagal memproses file Word.');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  // ── AI Suggest Placeholders ──
  const handleAiSuggest = async () => {
    const textContent = activeTab === 'classic' ? kontenTemplate : blocksPlainText;
    if (!textContent.trim()) { message.warning('Muat dokumen terlebih dahulu.'); return; }
    setAiSuggestLoading(true);
    try {
      const suggested = await aiService.suggestPlaceholders(textContent, jenisAkta || 'Umum');
      if (suggested.length === 0) {
        message.info('AI tidak menemukan placeholder yang disarankan.');
        return;
      }
      const existingKeys = new Set(placeholders.map((p) => p.key));
      const newOnes = suggested.filter((p) => !existingKeys.has(p.key));
      if (newOnes.length === 0) {
        message.info('Semua saran AI sudah ada di daftar placeholder.');
        return;
      }
      // Show approve/reject modal
      setPendingSuggestions(newOnes);
      setApprovedKeys(new Set(newOnes.map((p) => p.key)));
    } catch {
      message.error('Gagal mendapatkan saran placeholder dari AI.');
    } finally {
      setAiSuggestLoading(false);
    }
  };

  // ── Approve/Reject AI suggestions ──
  const handleConfirmSuggestions = () => {
    if (!pendingSuggestions) return;
    const approved = pendingSuggestions.filter((p) => approvedKeys.has(p.key));
    if (approved.length > 0) {
      setPlaceholders((prev) => {
        const existingKeys = new Set(prev.map((p) => p.key));
        return [...prev, ...approved.filter((p) => !existingKeys.has(p.key))];
      });
      setDirty(true);
      message.success(`${approved.length} placeholder ditambahkan.`);
    }
    setPendingSuggestions(null);
  };

  const handleToggleApprove = (key: string, checked: boolean) => {
    setApprovedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };

  // ── Improve with AI modal ──
  const handleOpenImprove = (selectedText: string) => {
    lastSelectionRef.current = selectedText;
    setImprove({ open: true, instruction: '', originalText: selectedText, loading: false });
  };

  const handleConfirmImprove = async () => {
    if (!improve.instruction.trim()) { message.warning('Isi instruksi perbaikan.'); return; }
    setImprove((p) => ({ ...p, loading: true }));
    try {
      const improved = await aiService.improveBlock(improve.originalText, improve.instruction);
      // Ganti teks asli dengan improved di blocksPlainText
      setBlocksPlainText((prev) => prev.replaceAll(improve.originalText, improved));
      setBlockEditorKey((k) => k + 1);
      setDirty(true);
      setImprove({ open: false, instruction: '', originalText: '', loading: false });
      message.success('Teks berhasil diperbaiki.');
    } catch {
      message.error('Gagal memperbaiki teks.');
      setImprove((p) => ({ ...p, loading: false }));
    }
  };

  // ── Mark placeholder (select text) ──
  const handleSelectionMark = useCallback((selectedText: string) => {
    // A4: use improved generateKeyFromText with NFD accent stripping
    const autoKey = generateKeyFromText(selectedText);

    setMarkPopover({
      open: true, isEditMode: false, editingKey: undefined,
      selectedText, rect: null,
      newKey: autoKey,
      newLabel: selectedText.slice(0, 60),
      newType: 'text',
      replaceAll: true,
    });
  }, []);

  // ── Edit placeholder (from DocumentEditor / PlaceholderPanel) ──
  const handleEditPlaceholder = useCallback((key: string) => {
    const ph = placeholders.find((p) => p.key === key);
    if (!ph) return;
    setFocusKey(key);
    setMarkPopover({
      open: true, isEditMode: true, editingKey: key,
      selectedText: ph.originalText ?? ph.label,
      rect: null,
      newKey: ph.key,
      newLabel: ph.label,
      newType: ph.type,
      replaceAll: false,
    });
  }, [placeholders]);

  // ── Confirm mark/edit ──
  const confirmMark = () => {
    const { isEditMode, editingKey, selectedText, newKey, newLabel, newType, replaceAll } = markPopover;
    if (!newKey.trim()) { message.warning('Key tidak boleh kosong.'); return; }

    if (isEditMode && editingKey) {
      setPlaceholders((prev) =>
        prev.map((p) => p.key === editingKey ? { ...p, label: newLabel, type: newType } : p),
      );
    } else {
      if (!placeholders.find((p) => p.key === newKey)) {
        setPlaceholders((prev) => [
          ...prev,
          { key: newKey, label: newLabel, type: newType, originalText: selectedText },
        ]);
      }
      // Update classic kontenTemplate jika tab classic aktif
      if (activeTab === 'classic') {
        setKontenTemplate((prev) => {
          const marker = `{{${newKey}}}`;
          return replaceAll ? prev.replaceAll(selectedText, marker) : prev.replace(selectedText, marker);
        });
      }
    }

    setDirty(true);
    setMarkPopover(MARK_DEFAULT);
    window.getSelection()?.removeAllRanges();
  };

  // ── Remove placeholder ──
  const handleRemovePlaceholder = useCallback((key: string) => {
    const ph = placeholders.find((p) => p.key === key);
    if (ph && activeTab === 'classic') {
      const restoreText = ph.originalText ?? ph.label ?? key;
      setKontenTemplate((prev) => prev.replaceAll(`{{${key}}}`, restoreText));
    }
    setPlaceholders((prev) => prev.filter((p) => p.key !== key));
    setFocusKey(null);
    setDirty(true);
  }, [placeholders, activeTab]);

  // ── AI Reformat ke standar akta (Tab Upload) ──
  const handleAiReformat = async () => {
    if (!blocksPlainText.trim()) { message.warning('Muat dokumen terlebih dahulu.'); return; }
    setReformatLoading(true);
    try {
      const reformatted = await aiService.improveBlock(
        blocksPlainText,
        'Reformatkan teks ini sesuai format standar akta notaris Indonesia: ' +
        'judul akta dengan spasi antar huruf kapital, pembukaan dengan identitas penghadap, ' +
        'isi pasal-pasal menggunakan pemisah --- Pasal N ---, dan penutup DEMIKIANLAH AKTA INI. ' +
        'Pertahankan semua {{placeholder}} yang ada. Hasilkan HANYA teks akta, tanpa penjelasan.',
      );
      setBlocksPlainText(reformatted);
      setKontenBlocks(null);
      setBlockEditorKey((k) => k + 1);
      setDirty(true);
      message.success('Teks berhasil diformat ke standar akta notaris.');
    } catch {
      message.error('Gagal memformat teks. Periksa koneksi dan API key.');
    } finally {
      setReformatLoading(false);
    }
  };

  // ── Classic paste text ──
  const applyPasteText = () => {
    setKontenAsli(pasteText);
    setKontenTemplate(pasteText);
    setDirty(true);
    setPasteModal(false);
    setPasteText('');
  };

  // ── Save ──
  const performSave = async () => {
    setSaving(true);
    let payload;

    const ttdLayoutJson = JSON.stringify(ttdLayout);
    if (activeTab === 'classic') {
      payload = {
        nama, deskripsi, jenisAkta, isActive,
        kontenAsli, kontenTemplate,
        placeholders, fileBase64, tipeFile, ttdLayoutJson,
      };
    } else {
      const derivedKontenTemplate = deriveKontenTemplate(blocksPlainText, placeholders);
      payload = {
        nama, deskripsi, jenisAkta, isActive,
        kontenAsli: blocksPlainText,
        kontenTemplate: derivedKontenTemplate,
        kontenBlocks,
        placeholders,
        fileBase64, tipeFile, ttdLayoutJson,
      };
    }

    try {
      if (isEdit) {
        await templateAktaService.update(id!, payload);
        message.success('Template berhasil diperbarui.');
      } else {
        const res = await templateAktaService.create(payload);
        message.success('Template berhasil dibuat.');
        navigate(`/template-akta/${res.data.id}`, { replace: true });
      }
      setDirty(false);
    } catch {
      message.error('Gagal menyimpan template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!nama.trim())  { message.warning('Nama template wajib diisi.'); return; }
    if (!jenisAkta)    { message.warning('Jenis akta wajib dipilih.');  return; }

    // C3: Placeholder validation
    const docForValidation = activeTab === 'classic' ? kontenTemplate : blocksPlainText;
    if (docForValidation.trim()) {
      const v = validatePlaceholders(placeholders, docForValidation);
      const hasIssues = v.orphans.length > 0 || v.missing.length > 0 || v.duplicates.length > 0;
      if (hasIssues) {
        Modal.confirm({
          title: 'Ditemukan Masalah Placeholder',
          icon: <ExclamationCircleOutlined />,
          width: 520,
          content: (
            <div>
              {v.orphans.length > 0 && (
                <Alert type="warning" showIcon style={{ marginBottom: 8 }}
                  message={`${v.orphans.length} placeholder di panel tidak ditemukan di dokumen: ${v.orphans.join(', ')}`} />
              )}
              {v.missing.length > 0 && (
                <Alert type="error" showIcon style={{ marginBottom: 8 }}
                  message={`${v.missing.length} placeholder di dokumen belum didefinisikan di panel: ${v.missing.join(', ')}`} />
              )}
              {v.duplicates.length > 0 && (
                <Alert type="error" showIcon
                  message={`Key duplikat: ${v.duplicates.join(', ')}`} />
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>
                Lanjutkan simpan? Template yang tidak konsisten bisa menyebabkan error saat Generate Akta.
              </div>
            </div>
          ),
          okText: 'Tetap Simpan', cancelText: 'Perbaiki Dulu',
          okButtonProps: { danger: true },
          onOk: () => performSave(),
        });
        return;
      }
    }

    // Validasi format standar untuk tab klasik
    if (activeTab === 'classic' && kontenTemplate.trim()) {
      const lower = kontenTemplate.toLowerCase();
      const isStandar =
        lower.includes('pasal') ||
        lower.includes('demikianlah') ||
        lower.includes('penghadap') ||
        lower.includes('notaris');

      if (!isStandar) {
        Modal.confirm({
          title: 'Format Tidak Terdeteksi sebagai Akta Standar',
          content:
            'Teks tidak mengandung elemen format akta notaris yang umum ' +
            '(pasal, penghadap, notaris, penutup). ' +
            'Pertimbangkan menggunakan tombol "AI Sarankan Placeholder" atau perbaiki format secara manual. ' +
            'Tetap simpan?',
          okText: 'Tetap Simpan',
          cancelText: 'Batalkan',
          onOk: performSave,
        });
        return;
      }
    }

    await performSave();
  };

  // ── Download Word ──
  const handleDownloadWord = async () => {
    if (!id) { message.warning('Simpan template terlebih dahulu.'); return; }
    // Build empty values for all placeholders (untuk preview Word struktur)
    const values: Record<string, string> = {};
    placeholders.forEach((p) => { values[p.key] = `[${p.label}]`; });
    try {
      const blob = await templateAktaService.generateWord(id, values);
      triggerDownload(blob, `${nama || 'template'}.docx`);
    } catch (e: unknown) {
      message.error((e as Error)?.message ?? 'Gagal download Word.');
    }
  };

  // ── CustomBlockEditor onChange ──
  const handleBlocksChange = useCallback((blocksJson: string, plainText: string) => {
    setKontenBlocks(blocksJson);
    setBlocksPlainText(plainText);
    setDirty(true);

    // A3: bidirectional sync — scan edited text for new {{KEY}} patterns
    const re = /\{\{([A-Za-z0-9_]+)\}\}/g;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(plainText)) !== null) found.push(m[1]);
    if (found.length > 0) {
      setPlaceholders((prev) => mergePlaceholderKeys(found, prev));
    }
  }, []);

  // ── BlockNote initial blocks (computed once per key change) ──
  const initialBlocksText = blockEditorKey > 0 ? blocksPlainText : undefined;

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;

  // ── Shared sidebar ──
  const sidebar = (
    <div style={{
      width: 268, flexShrink: 0, borderLeft: '1px solid #ebebeb',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <PlaceholderPanel
        placeholders={placeholders}
        onChange={(p) => { setPlaceholders(p); setDirty(true); }}
        onRemove={handleRemovePlaceholder}
        onEdit={handleEditPlaceholder}
        activeKey={focusKey}
        onFocusKey={setFocusKey}
        docText={activeTab === 'classic' ? kontenTemplate : blocksPlainText}
      />
      {/* AI Suggest Placeholders */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0' }}>
        <Button
          size="small"
          icon={aiSuggestLoading ? <LoadingOutlined /> : <BulbOutlined />}
          loading={aiSuggestLoading}
          onClick={handleAiSuggest}
          block
          style={{ fontSize: 12 }}
        >
          AI Sarankan Placeholder
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f7f7f5' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        background: '#fff', borderBottom: '1px solid #ebebeb', flexShrink: 0, height: 52,
      }}>
        <Button
          icon={<ArrowLeftOutlined />} type="text" size="small"
          onClick={() => navigate('/template-akta')}
          style={{ color: '#8c8c8c' }}
        />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <Input
            variant="borderless"
            placeholder="Nama Template..."
            value={nama}
            onChange={(e) => { setNama(e.target.value); setDirty(true); }}
            style={{ fontSize: 16, fontWeight: 600, maxWidth: 380, padding: '0 4px', color: '#1a1a1a' }}
          />
          <Select
            placeholder="Jenis Akta"
            variant="borderless"
            value={jenisAkta || undefined}
            options={JENIS_OPTIONS}
            onChange={(v) => { setJenisAkta(v); setDirty(true); }}
            style={{ width: 190, color: '#595959' }}
          />
          {tipeFile === 'docx' && <Tag color="blue"  icon={<FileWordOutlined />} style={{ fontSize: 11 }}>DOCX</Tag>}
          {tipeFile === 'pdf'  && <Tag color="orange" style={{ fontSize: 11 }}>PDF</Tag>}
          <Switch
            size="small"
            checked={isActive}
            onChange={(v) => { setIsActive(v); setDirty(true); }}
            checkedChildren="Aktif"
            unCheckedChildren="Nonaktif"
          />
        </div>

        <Space size={8}>
          {isEdit && (
            <Tooltip title="Download Word (preview dengan label placeholder)">
              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadWord}>
                Word
              </Button>
            </Tooltip>
          )}
          {dirty ? (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="small">
              Simpan
            </Button>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <CheckOutlined style={{ marginRight: 4 }} />Tersimpan
            </Text>
          )}
        </Space>
      </div>

      {/* ── Tabs + Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'ai' | 'upload' | 'classic')}
          size="small"
          style={{ paddingLeft: 16, background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}
          items={[
            {
              key: 'ai',
              label: <Space size={4}><RobotOutlined />AI Generate</Space>,
            },
            {
              key: 'upload',
              label: <Space size={4}><UploadOutlined />Upload + AI</Space>,
            },
            {
              key: 'classic',
              label: <Space size={4}><EditOutlined />Klasik</Space>,
            },
          ]}
        />

        {/* ── Tab AI: AI Generate ── */}
        {activeTab === 'ai' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Prompt bar */}
              {streamPhase !== 'streaming' && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px',
                  background: '#fafafa', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
                }}>
                  {/* B2: Retry alert */}
                  {lastGenPrompt && (
                    <Alert
                      type="error"
                      showIcon
                      message="Generate gagal"
                      action={
                        <Button size="small" onClick={() => {
                          setLastGenPrompt(null);
                          setPromptText(lastGenPrompt);
                          handleGenerate();
                        }}>
                          Coba Lagi
                        </Button>
                      }
                      closable
                      onClose={() => setLastGenPrompt(null)}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input.TextArea
                      rows={2}
                      placeholder={`Describe akta yang ingin dibuat... (contoh: "Akta jual beli tanah seluas 500m2 di Jakarta, penjual PT Maju Jaya, pembeli Budi Santoso")`}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                      style={{ resize: 'none', fontSize: 13 }}
                    />
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      loading={streamLoading}
                      onClick={handleGenerate}
                      disabled={!promptText.trim()}
                      style={{ height: 'auto', alignSelf: 'stretch' }}
                    >
                      Generate
                    </Button>
                  </div>
                  {/* C2: Auto-suggest checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox
                      checked={autoSuggestAfterGen}
                      onChange={e => setAutoSuggestAfterGen(e.target.checked)}
                      style={{ fontSize: 12, color: '#6B7280' }}
                    >
                      Otomatis sarankan placeholder setelah generate
                    </Checkbox>
                    {isAutoSuggesting && (
                      <span style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>
                        Menganalisis placeholder...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflow: 'auto' }}>

                {/* Streaming phase: show AktaViewer */}
                {streamPhase === 'streaming' && (
                  <div style={{ background: '#f7f7f5', minHeight: '100%' }}>
                    <div style={{
                      position: 'sticky', top: 0, zIndex: 10,
                      background: 'rgba(247,247,245,0.95)', backdropFilter: 'blur(4px)',
                      padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: '1px solid #e8e8e8',
                    }}>
                      <RobotOutlined style={{ color: '#1677ff', fontSize: 14 }} />
                      <Text style={{ fontSize: 12, color: '#595959' }}>AI sedang mengetik...</Text>
                      <Button
                        size="small" danger icon={<StopOutlined />}
                        onClick={handleStopStream}
                        style={{ marginLeft: 'auto' }}
                      >
                        Stop & Edit
                      </Button>
                    </div>
                    <AktaViewer text={streamedText} readOnly />
                  </div>
                )}

                {/* Idle: show prompt hint */}
                {streamPhase === 'idle' && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', gap: 12, padding: 40,
                    color: '#bfbfbe',
                  }}>
                    <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Deskripsikan akta yang ingin dibuat, lalu klik Generate.
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tekan Enter untuk generate, Shift+Enter untuk baris baru.
                    </Text>
                  </div>
                )}

                {/* Editing phase: BlockNote editor or AktaViewer preview */}
                {streamPhase === 'editing' && (
                  <div style={{ position: 'relative' }}>
                    {/* Toolbar */}
                    <div style={{
                      padding: '4px 16px', fontSize: 11, color: '#8c8c8c',
                      background: '#fafafa', borderBottom: '1px solid #f0f0f0',
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                      {!previewMode && (
                        <>
                          <span>Sorot teks → tandai placeholder</span>
                          <Button
                            size="small" type="link" icon={<BulbOutlined />}
                            style={{ fontSize: 11, padding: 0, height: 'auto' }}
                            onClick={() => {
                              const sel = window.getSelection()?.toString().trim();
                              if (sel) handleOpenImprove(sel);
                              else message.info('Sorot teks terlebih dahulu untuk diperbaiki.');
                            }}
                          >
                            Perbaiki dengan AI
                          </Button>
                          <Button
                            size="small" type="link" icon={<RobotOutlined />}
                            style={{ fontSize: 11, padding: 0, height: 'auto' }}
                            onClick={() => setStreamPhase('idle')}
                          >
                            Generate ulang
                          </Button>
                        </>
                      )}
                      <Button
                        size="small"
                        type={previewMode ? 'primary' : 'default'}
                        icon={<EyeOutlined />}
                        style={{ fontSize: 11, marginLeft: 'auto' }}
                        onClick={() => setPreviewMode((p) => !p)}
                      >
                        {previewMode ? 'Mode Edit' : 'Preview Akta'}
                      </Button>
                    </div>
                    {previewMode ? (
                      <AktaViewer
                        text={blocksPlainText}
                        ttdLayout={ttdLayout}
                        onTtdChange={setTtdLayout}
                        readOnly={false}
                      />
                    ) : (
                      <CustomBlockEditor
                        key={blockEditorKey}
                        initialText={initialBlocksText}
                        onChange={handleBlocksChange}
                        onSelectionMark={handleSelectionMark}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {sidebar}
          </div>
        )}

        {/* ── Tab Upload + AI ── */}
        {activeTab === 'upload' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Upload bar */}
              <div style={{
                display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'wrap',
                alignItems: 'center', background: '#fafafa',
                borderBottom: '1px solid #f0f0f0', flexShrink: 0,
              }}>
                <Upload accept=".pdf" showUploadList={false} beforeUpload={handleUploadPdf}>
                  <Button size="small" icon={<UploadOutlined />} loading={uploadLoading}>Upload PDF</Button>
                </Upload>
                <Upload accept=".docx,.doc" showUploadList={false} beforeUpload={handleUploadDocx}>
                  <Button size="small" icon={<FileWordOutlined />} loading={uploadLoading}>Upload Word</Button>
                </Upload>
                {streamPhase === 'editing' && (
                  <Tooltip title="AI mereformat teks ke struktur standar akta notaris Indonesia">
                    <Button
                      size="small"
                      icon={<RobotOutlined />}
                      loading={reformatLoading}
                      onClick={handleAiReformat}
                    >
                      Format Standar Akta
                    </Button>
                  </Tooltip>
                )}
                {tipeFile === 'docx' && <Tag color="blue"  icon={<FileWordOutlined />} style={{ fontSize: 11 }}>DOCX dimuat</Tag>}
                {tipeFile === 'pdf'  && <Tag color="orange" style={{ fontSize: 11 }}>PDF dimuat</Tag>}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  — Upload dokumen, lalu sorot teks untuk menandai placeholder atau gunakan AI Suggest
                </Text>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {streamPhase !== 'editing' ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', gap: 12, padding: 40,
                  }}>
                    <UploadOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                    <Text type="secondary">Upload PDF atau Word untuk mulai.</Text>
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: '4px 16px', fontSize: 11, color: '#8c8c8c',
                      background: '#fafafa', borderBottom: '1px solid #f0f0f0',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      {!previewMode && <span>Sorot teks untuk menandai placeholder</span>}
                      <Button
                        size="small"
                        type={previewMode ? 'primary' : 'default'}
                        icon={<EyeOutlined />}
                        style={{ fontSize: 11, marginLeft: 'auto' }}
                        onClick={() => setPreviewMode((p) => !p)}
                      >
                        {previewMode ? 'Mode Edit' : 'Preview Akta'}
                      </Button>
                    </div>
                    {previewMode ? (
                      <AktaViewer
                        text={blocksPlainText}
                        ttdLayout={ttdLayout}
                        onTtdChange={setTtdLayout}
                        readOnly={false}
                      />
                    ) : (
                      <CustomBlockEditor
                        key={blockEditorKey}
                        initialText={initialBlocksText}
                        onChange={handleBlocksChange}
                        onSelectionMark={handleSelectionMark}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {sidebar}
          </div>
        )}

        {/* ── Tab Klasik ── */}
        {activeTab === 'classic' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>

              {/* Toolbar atas (jika ada konten) */}
              {kontenTemplate && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  padding: '6px 16px', background: '#fafafa',
                  borderBottom: '1px solid #f0f0f0', flexShrink: 0,
                }}>
                  {!previewMode && (
                    <>
                      <Upload accept=".pdf" showUploadList={false} beforeUpload={handleUploadPdfClassic}>
                        <Button size="small" icon={<UploadOutlined />} loading={uploadLoading}>Ganti PDF</Button>
                      </Upload>
                      <Upload accept=".docx,.doc" showUploadList={false} beforeUpload={handleUploadDocxClassic}>
                        <Button size="small" icon={<FileWordOutlined />} loading={uploadLoading}>Ganti DOCX</Button>
                      </Upload>
                      <Button size="small" icon={<EditOutlined />} onClick={() => setPasteModal(true)}>
                        Tempel Teks
                      </Button>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        — sorot teks untuk menandai placeholder · klik placeholder untuk edit/hapus
                      </Text>
                    </>
                  )}
                  <Button
                    size="small"
                    type={previewMode ? 'primary' : 'default'}
                    icon={<EyeOutlined />}
                    style={{ fontSize: 11, marginLeft: 'auto' }}
                    onClick={() => setPreviewMode((p) => !p)}
                  >
                    {previewMode ? 'Mode Edit' : 'Preview Akta'}
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!kontenTemplate && (
                <div style={{
                  display: 'flex', gap: 12, margin: 24, padding: '16px 20px',
                  background: '#fff', borderRadius: 10,
                  border: '1.5px dashed #d9d9d9', flexWrap: 'wrap', alignItems: 'center',
                }}>
                  <Upload accept=".pdf" showUploadList={false} beforeUpload={handleUploadPdfClassic}>
                    <Button icon={<UploadOutlined />} loading={uploadLoading}>Upload PDF</Button>
                  </Upload>
                  <Upload accept=".docx,.doc" showUploadList={false} beforeUpload={handleUploadDocxClassic}>
                    <Button icon={<FileWordOutlined />} loading={uploadLoading}>Upload Word (.docx)</Button>
                  </Upload>
                  <Button icon={<EditOutlined />} onClick={() => setPasteModal(true)}>Tempel Teks</Button>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Word: tambahkan <code>{'{{key}}'}</code> di dokumen untuk placeholder otomatis
                  </Text>
                </div>
              )}

              {previewMode ? (
                <AktaViewer
                  text={kontenTemplate}
                  ttdLayout={ttdLayout}
                  onTtdChange={setTtdLayout}
                  readOnly={false}
                />
              ) : (
                <DocumentEditor
                  content={kontenTemplate}
                  placeholders={placeholders}
                  onSelectionMark={(text) => handleSelectionMark(text)}
                  onRemovePlaceholder={handleRemovePlaceholder}
                  onEditPlaceholder={handleEditPlaceholder}
                  focusKey={focusKey}
                  onBlockImproved={(original, improved) => {
                    setKontenTemplate((prev) => prev.replaceAll(original, improved));
                    setDirty(true);
                  }}
                />
              )}
            </div>

            {/* Sidebar klasik */}
            <div style={{
              width: 268, flexShrink: 0, borderLeft: '1px solid #ebebeb',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <PlaceholderPanel
                placeholders={placeholders}
                onChange={(p) => { setPlaceholders(p); setDirty(true); }}
                onRemove={handleRemovePlaceholder}
                onEdit={handleEditPlaceholder}
                activeKey={focusKey}
                onFocusKey={setFocusKey}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Mark / Edit Placeholder Modal ── */}
      <Modal
        open={markPopover.open}
        title={
          <Space>
            <TagOutlined />
            <span>{markPopover.isEditMode ? 'Edit Placeholder' : 'Tandai sebagai Placeholder'}</span>
          </Space>
        }
        onOk={confirmMark}
        onCancel={() => setMarkPopover(MARK_DEFAULT)}
        okText={markPopover.isEditMode ? 'Simpan' : 'Tandai'}
        width={440}
        destroyOnClose
      >
        {!markPopover.isEditMode && (
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Teks yang dipilih:</Text>
            <div style={{
              marginTop: 4, padding: '6px 10px', background: '#fffbe6',
              border: '1px solid #ffe58f', borderRadius: 6,
              fontFamily: 'monospace', fontSize: 13,
              maxHeight: 80, overflow: 'auto',
            }}>
              {markPopover.selectedText}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Key <span style={{ color: '#bfbfbf' }}>(huruf kecil & underscore)</span>
            </Text>
            <Input
              value={markPopover.newKey}
              disabled={markPopover.isEditMode}
              onChange={(e) => setMarkPopover((p) => ({
                ...p, newKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
              }))}
              placeholder="contoh: nomor_akta"
              prefix={<span style={{ color: '#bfbfbf', fontFamily: 'monospace' }}>{'{'}</span>}
              suffix={<span style={{ color: '#bfbfbf', fontFamily: 'monospace' }}>{'}'}</span>}
              style={{ fontFamily: 'monospace' }}
            />
            {/* A4: hint auto-generated key */}
            {!markPopover.isEditMode && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                Key di-generate otomatis dari teks yang dipilih. Bisa diedit.
              </div>
            )}
          </div>

          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Label tampil di form generate</Text>
            <Input
              value={markPopover.newLabel}
              onChange={(e) => setMarkPopover((p) => ({ ...p, newLabel: e.target.value }))}
              placeholder="contoh: Nomor Akta"
            />
          </div>

          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tipe Input</Text>
            <Select
              style={{ width: '100%' }}
              value={markPopover.newType}
              options={TYPE_OPTIONS}
              onChange={(v) => setMarkPopover((p) => ({ ...p, newType: v }))}
            />
          </div>

          {!markPopover.isEditMode && activeTab === 'classic' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                size="small"
                checked={markPopover.replaceAll}
                onChange={(v) => setMarkPopover((p) => ({ ...p, replaceAll: v }))}
              />
              <Text style={{ fontSize: 12 }}>Ganti semua kemunculan teks yang sama</Text>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Improve Block Modal ── */}
      <Modal
        open={improve.open}
        title={<Space><RobotOutlined />Perbaiki Teks dengan AI</Space>}
        onOk={handleConfirmImprove}
        onCancel={() => setImprove({ open: false, instruction: '', originalText: '', loading: false })}
        okText="Perbaiki"
        confirmLoading={improve.loading}
        width={520}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Teks yang dipilih:</Text>
          <div style={{
            marginTop: 4, padding: '6px 10px', background: '#f5f5f5',
            borderRadius: 6, fontSize: 13, maxHeight: 100, overflow: 'auto',
          }}>
            {improve.originalText}
          </div>
        </div>
        <div>
          <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Instruksi perbaikan
          </Text>
          <Input.TextArea
            rows={3}
            value={improve.instruction}
            onChange={(e) => setImprove((p) => ({ ...p, instruction: e.target.value }))}
            placeholder='contoh: "Buat lebih formal dan sesuai bahasa hukum notaris"'
          />
        </div>
      </Modal>

      {/* ── AI Suggest Approve/Reject Modal (C1) ── */}
      <Modal
        open={!!pendingSuggestions}
        title={`Saran Placeholder dari AI (${pendingSuggestions?.length ?? 0} item)`}
        onCancel={() => setPendingSuggestions(null)}
        width={640}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setPendingSuggestions(null)}>
            Batal
          </Button>,
          <Button
            key="accept-selected"
            type="primary"
            disabled={approvedKeys.size === 0}
            onClick={handleConfirmSuggestions}
          >
            Terima Dipilih ({approvedKeys.size})
          </Button>,
          <Button
            key="accept-all"
            type="primary"
            onClick={() => {
              if (!pendingSuggestions) return;
              setApprovedKeys(new Set(pendingSuggestions.map((p) => p.key)));
              // merge all immediately
              setPlaceholders((prev) => {
                const existingKeys = new Set(prev.map((p) => p.key));
                return [...prev, ...pendingSuggestions.filter((p) => !existingKeys.has(p.key))];
              });
              setDirty(true);
              message.success(`${pendingSuggestions.length} placeholder ditambahkan.`);
              setPendingSuggestions(null);
            }}
          >
            Terima Semua
          </Button>,
        ]}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          AI menganalisis dokumen dan menemukan bagian dinamis berikut. Centang yang ingin dijadikan placeholder.
        </Text>
        <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingSuggestions?.map((p) => (
            <div key={p.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6,
              background: approvedKeys.has(p.key) ? '#f0f7ff' : '#fafafa',
              border: `1px solid ${approvedKeys.has(p.key) ? '#91caff' : '#f0f0f0'}`,
              transition: 'all 0.2s',
            }}>
              <Checkbox
                checked={approvedKeys.has(p.key)}
                onChange={(e) => handleToggleApprove(p.key, e.target.checked)}
              />
              <div style={{ flex: 1 }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 12,
                  background: '#e6f4ff', color: '#0958d9',
                  padding: '1px 6px', borderRadius: 3,
                }}>
                  {`{{${p.key}}}`}
                </span>
                <span style={{ marginLeft: 8, fontSize: 13, color: '#333' }}>{p.label}</span>
              </div>
              <Tag style={{ fontSize: 11 }}>{p.type}</Tag>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
          {approvedKeys.size} dipilih dari {pendingSuggestions?.length ?? 0}
        </div>
      </Modal>

      {/* ── Paste Text Modal (Classic) ── */}
      <Modal
        open={pasteModal}
        title="Tempel Teks Akta"
        onOk={applyPasteText}
        onCancel={() => setPasteModal(false)}
        okText="Muat ke Editor"
        width={700}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          Tempel teks dari dokumen Word atau sumber lain.
        </Text>
        <Input.TextArea
          rows={16}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Tempel teks di sini..."
          style={{ fontFamily: '"Times New Roman", serif', fontSize: 13, lineHeight: 1.8 }}
        />
      </Modal>
    </div>
  );
}
