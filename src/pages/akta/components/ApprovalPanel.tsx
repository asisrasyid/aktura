import { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Input, Timeline, message, Spin } from 'antd';
import {
  CheckOutlined, CloseOutlined, ReloadOutlined,
  SendOutlined, ClockCircleOutlined, CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { approvalService, type ApprovalHistoryItem } from '../../../services/approval.service';
import { useAuthStore } from '../../../store/auth.store';
import type { AktaStatus } from '../../../types';

dayjs.locale('id');

const { TextArea } = Input;

// ── Pallete ──────────────────────────────────────────────────
const C = {
  pending:  { bg: '#fff8e6', border: '#f0c020', text: '#7a5800', icon: '#f0a800' },
  rejected: { bg: '#fff1f0', border: '#ffa39e', text: '#a8071a', icon: '#ff4d4f' },
  approved: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804', icon: '#52c41a' },
  muted:    '#9b9a97',
  border:   '#e9e9e7',
};

interface Props {
  aktaId:    string;
  aktaStatus: AktaStatus;
  onRefresh: () => void;
}

export default function ApprovalPanel({ aktaId, aktaStatus, onRefresh }: Props) {
  const user      = useAuthStore(s => s.user);
  const isNotaris = user?.role === 'Notaris';

  const [history, setHistory]     = useState<ApprovalHistoryItem[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Review modal (Notaris)
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    action: 'Disetujui' | 'Ditolak' | null;
  }>({ open: false, action: null });
  const [catatan, setCatatan]   = useState('');
  const [processing, setProcessing] = useState(false);

  // Submit/resubmit modal (Staff)
  const [submitModal, setSubmitModal] = useState<{
    open: boolean;
    mode: 'submit' | 'resubmit' | null;
  }>({ open: false, mode: null });
  const [submitNote, setSubmitNote] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const data = await approvalService.getByAkta(aktaId);
      setHistory(data);
    } catch { /* silent */ }
    finally { setLoadingHist(false); }
  }, [aktaId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── latest pending approval (untuk Notaris review) ───────
  const pendingApproval = history.find(h => h.status === 'Menunggu');

  // ── last rejection catatan ────────────────────────────────
  const lastRejection = history.find(h => h.status === 'Ditolak');

  // ── Handlers ─────────────────────────────────────────────
  const handleReview = async () => {
    if (!pendingApproval || !reviewModal.action) return;
    if (reviewModal.action === 'Ditolak' && !catatan.trim()) {
      message.warning('Catatan wajib diisi saat menolak');
      return;
    }
    setProcessing(true);
    try {
      await approvalService.review(pendingApproval.approvalId, reviewModal.action, catatan || undefined);
      message.success(reviewModal.action === 'Disetujui' ? 'Akta berhasil disetujui' : 'Akta ditolak');
      setReviewModal({ open: false, action: null });
      setCatatan('');
    } catch {
      message.error('Gagal memproses persetujuan');
      return;
    } finally {
      setProcessing(false);
    }
    // Refresh history setelah API berhasil — pisah dari try-catch agar error refresh
    // tidak menimpa success message
    fetchHistory().catch(() => {});
    onRefresh();
  };

  const handleSubmit = async () => {
    setProcessing(true);
    try {
      if (submitModal.mode === 'resubmit') {
        await approvalService.resubmit(aktaId, submitNote || undefined);
        message.success('Akta berhasil diajukan ulang');
      } else {
        await approvalService.submit(aktaId, submitNote || undefined);
        message.success('Akta berhasil diajukan untuk persetujuan');
      }
      setSubmitModal({ open: false, mode: null });
      setSubmitNote('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal mengajukan';
      message.error(msg);
      return;
    } finally {
      setProcessing(false);
    }
    // Refresh setelah API berhasil — pisah dari try-catch
    fetchHistory().catch(() => {});
    onRefresh();
  };

  // ── Show nothing if no relevant status and no history ────
  // Catatan: Draft ditampilkan agar tombol "Ajukan Persetujuan" selalu muncul untuk non-Notaris
  const isRelevantStatus = ['Draft', 'MenungguPersetujuan', 'Ditolak'].includes(aktaStatus);
  if (!isRelevantStatus && history.length === 0 && !loadingHist) return null;

  // ── Timeline items ────────────────────────────────────────
  const timelineItems = history.map(h => {
    const isDone = h.status === 'Disetujui';
    const isRej  = h.status === 'Ditolak';
    return {
      dot: isDone
        ? <CheckCircleOutlined style={{ color: C.approved.icon }} />
        : isRej
          ? <StopOutlined style={{ color: C.rejected.icon }} />
          : <ClockCircleOutlined style={{ color: C.pending.icon }} />,
      children: (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              padding: '1px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600,
              background: isDone ? C.approved.bg : isRej ? C.rejected.bg : C.pending.bg,
              color:      isDone ? C.approved.text : isRej ? C.rejected.text : C.pending.text,
            }}>
              {h.status}
            </span>
            <span style={{ color: C.muted }}>
              {dayjs(h.createdAt).format('D MMM YYYY, HH:mm')}
            </span>
          </div>
          <div style={{ color: '#555' }}>
            Dimohon oleh <strong>{h.requestedByName}</strong>
          </div>
          {h.reviewedByName && (
            <div style={{ color: '#555' }}>
              Diproses oleh <strong>{h.reviewedByName}</strong>
              {h.reviewedAt && (
                <span style={{ color: C.muted }}>
                  {' '}· {dayjs(h.reviewedAt).format('D MMM YYYY, HH:mm')}
                </span>
              )}
            </div>
          )}
          {h.catatan && (
            <div style={{
              marginTop: 4, padding: '4px 8px',
              background: isRej ? '#fff1f0' : '#f6ffed',
              borderLeft: `3px solid ${isRej ? '#ff4d4f' : '#52c41a'}`,
              borderRadius: '0 4px 4px 0',
              color: isRej ? '#a8071a' : '#237804',
              fontStyle: 'italic',
              fontSize: 11.5,
            }}>
              "{h.catatan}"
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      marginBottom: 24,
      overflow: 'hidden',
    }}>

      {/* ── Status Banner ── */}
      {aktaStatus === 'MenungguPersetujuan' && (
        <div style={{
          padding: '12px 16px',
          background: C.pending.bg,
          borderBottom: `1px solid ${C.pending.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: C.pending.icon, fontSize: 15 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.pending.text }}>
                Menunggu Persetujuan Notaris
              </div>
              <div style={{ fontSize: 11.5, color: '#a07820', marginTop: 1 }}>
                Akta ini sedang dalam antrian review Notaris
              </div>
            </div>
          </div>
          {isNotaris && pendingApproval && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button
                size="small"
                icon={<CheckOutlined />}
                style={{ background: '#389e0d', borderColor: '#389e0d', color: '#fff' }}
                onClick={() => { setCatatan(''); setReviewModal({ open: true, action: 'Disetujui' }); }}
              >
                Setujui
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => { setCatatan(''); setReviewModal({ open: true, action: 'Ditolak' }); }}
              >
                Tolak
              </Button>
            </div>
          )}
        </div>
      )}

      {aktaStatus === 'Ditolak' && (
        <div style={{
          padding: '12px 16px',
          background: C.rejected.bg,
          borderBottom: `1px solid ${C.rejected.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <StopOutlined style={{ color: C.rejected.icon, fontSize: 15, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.rejected.text }}>
                Pengajuan Ditolak
              </div>
              {lastRejection?.catatan && (
                <div style={{
                  fontSize: 12, color: C.rejected.text, marginTop: 3,
                  fontStyle: 'italic', maxWidth: 500,
                }}>
                  "{lastRejection.catatan}"
                </div>
              )}
              {lastRejection?.reviewedByName && (
                <div style={{ fontSize: 11, color: '#c0392b', marginTop: 2 }}>
                  oleh {lastRejection.reviewedByName}
                  {lastRejection.reviewedAt && ` · ${dayjs(lastRejection.reviewedAt).format('D MMM YYYY')}`}
                </div>
              )}
            </div>
          </div>
          {!isNotaris && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
              onClick={() => { setSubmitNote(''); setSubmitModal({ open: true, mode: 'resubmit' }); }}
            >
              Ajukan Ulang
            </Button>
          )}
        </div>
      )}

      {/* ── Submit button for Draft (non-Notaris) ── */}
      {aktaStatus === 'Draft' && !isNotaris && (
        <div style={{
          padding: '12px 16px',
          background: '#f0f4ff',
          borderBottom: `1px solid #d0d8f0`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize: 13, color: '#2c3e8a' }}>
            Akta masih berstatus <strong>Draft</strong>. Ajukan ke Notaris untuk diproses.
          </div>
          <Button
            size="small"
            icon={<SendOutlined />}
            type="primary"
            onClick={() => { setSubmitNote(''); setSubmitModal({ open: true, mode: 'submit' }); }}
          >
            Ajukan Persetujuan
          </Button>
        </div>
      )}

      {/* ── Approval History ── */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
          Riwayat Pengajuan
        </div>
        {loadingHist ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Spin size="small" />
          </div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            Belum ada riwayat pengajuan persetujuan
          </div>
        ) : (
          <Timeline items={timelineItems} style={{ marginTop: 4 }} />
        )}
      </div>

      {/* ── Review Modal (Notaris) ── */}
      <Modal
        open={reviewModal.open}
        title={
          <span style={{ color: reviewModal.action === 'Disetujui' ? '#389e0d' : '#ff4d4f', fontWeight: 700 }}>
            {reviewModal.action === 'Disetujui' ? '✓ Setujui Akta' : '✕ Tolak Akta'}
          </span>
        }
        onCancel={() => setReviewModal({ open: false, action: null })}
        onOk={handleReview}
        okText={reviewModal.action === 'Disetujui' ? 'Setujui' : 'Tolak'}
        okButtonProps={{
          danger: reviewModal.action === 'Ditolak',
          style: reviewModal.action === 'Disetujui' ? { background: '#389e0d', borderColor: '#389e0d' } : {},
        }}
        confirmLoading={processing}
        destroyOnClose
        width={460}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 8 }}>
          CATATAN {reviewModal.action === 'Ditolak' ? '(WAJIB)' : '(OPSIONAL)'}
        </div>
        <TextArea
          rows={3}
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
          placeholder={
            reviewModal.action === 'Ditolak'
              ? 'Jelaskan alasan penolakan...'
              : 'Catatan tambahan (opsional)...'
          }
          style={{ resize: 'none' }}
        />
      </Modal>

      {/* ── Submit / Resubmit Modal ── */}
      <Modal
        open={submitModal.open}
        title={submitModal.mode === 'resubmit' ? 'Ajukan Ulang Akta' : 'Ajukan Persetujuan'}
        onCancel={() => setSubmitModal({ open: false, mode: null })}
        onOk={handleSubmit}
        okText={submitModal.mode === 'resubmit' ? 'Ajukan Ulang' : 'Ajukan'}
        confirmLoading={processing}
        destroyOnClose
        width={460}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 8 }}>
          CATATAN PENGAJUAN (OPSIONAL)
        </div>
        <TextArea
          rows={3}
          value={submitNote}
          onChange={e => setSubmitNote(e.target.value)}
          placeholder={
            submitModal.mode === 'resubmit'
              ? 'Jelaskan perubahan yang telah dilakukan...'
              : 'Catatan untuk Notaris (opsional)...'
          }
          style={{ resize: 'none' }}
        />
      </Modal>
    </div>
  );
}
