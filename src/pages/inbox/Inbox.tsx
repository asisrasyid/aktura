import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Modal, Input, message,
  Tooltip, Tabs,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, InboxOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { approvalService, type ApprovalItem } from '../../services/approval.service';

dayjs.locale('id');

const { TextArea } = Input;

const T = {
  text:   '#2F2F2F',
  muted:  '#6B7280',
  faint:  '#9CA3AF',
  border: '#E2DDD6',
  hover:  '#F7F6F3',
  active: '#EDE9E3',
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  Menunggu:  { label: 'Menunggu',  bg: '#fdecc8', color: '#b37a2c' },
  Disetujui: { label: 'Disetujui', bg: '#dbeddb', color: '#448844' },
  Ditolak:   { label: 'Ditolak',   bg: '#ffd6d6', color: '#c44444' },
};

const GLOBAL_STYLE = `
  .inbox-table .ant-table-thead .ant-table-cell {
    background: #EDE9E3 !important;
    font-size: 12px !important;
    color: #1B365D !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px !important;
    border-bottom: 1px solid #E2DDD6 !important;
  }
  .inbox-table .ant-table-tbody .ant-table-row:hover .ant-table-cell {
    background: #F7F6F3 !important;
  }
  .inbox-table .ant-table-tbody .ant-table-cell {
    border-bottom: 1px solid #EDE9E3 !important;
  }
  .inbox-table .ant-table-wrapper {
    border-top: 1px solid #E2DDD6;
  }
`;

export default function Inbox() {
  const navigate   = useNavigate();
  const user       = useAuthStore(s => s.user);
  const isNotaris  = user?.role === 'Notaris';

  const [data, setData]           = useState<ApprovalItem[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pageSize]                = useState(20);
  const [activeTab, setActiveTab] = useState<string>('Menunggu');
  const [loading, setLoading]     = useState(false);

  // Modal approve/reject
  const [reviewModal, setReviewModal]     = useState<{ open: boolean; item: ApprovalItem | null; action: 'Disetujui' | 'Ditolak' | null }>({ open: false, item: null, action: null });
  const [catatan, setCatatan]             = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // Resubmit modal
  const [resubmitModal, setResubmitModal] = useState<{ open: boolean; item: ApprovalItem | null }>({ open: false, item: null });
  const [resubmitNote, setResubmitNote]   = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'Semua' ? undefined : activeTab;
      const res = await approvalService.getInbox({ status: statusFilter, page, pageSize });
      setData(res.items);
      setTotal(res.totalCount);
    } catch {
      message.error('Gagal memuat data inbox');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openReview = (item: ApprovalItem, action: 'Disetujui' | 'Ditolak') => {
    setCatatan('');
    setReviewModal({ open: true, item, action });
  };

  const handleReview = async () => {
    if (!reviewModal.item || !reviewModal.action) return;
    if (reviewModal.action === 'Ditolak' && !catatan.trim()) {
      message.warning('Catatan wajib diisi saat menolak');
      return;
    }
    setSubmitting(true);
    try {
      await approvalService.review(reviewModal.item.approvalId, reviewModal.action, catatan || undefined);
      message.success(reviewModal.action === 'Disetujui' ? 'Akta disetujui' : 'Akta ditolak');
      setReviewModal({ open: false, item: null, action: null });
      fetchData();
    } catch {
      message.error('Gagal memproses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!resubmitModal.item) return;
    setSubmitting(true);
    try {
      await approvalService.resubmit(resubmitModal.item.aktaId, resubmitNote || undefined);
      message.success('Akta berhasil diresubmit');
      setResubmitModal({ open: false, item: null });
      setResubmitNote('');
      fetchData();
    } catch {
      message.error('Gagal resubmit');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ApprovalItem> = [
    {
      title: 'Nomor',
      dataIndex: 'nomorAkta',
      width: 130,
      render: (val, row) => (
        <span
          onClick={() => navigate(`/akta/${row.aktaId}`)}
          style={{
            fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
            color: T.text, background: T.active, padding: '2px 7px',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Akta',
      render: (_, row) => (
        <div>
          <div
            onClick={() => navigate(`/akta/${row.aktaId}`)}
            style={{ fontSize: 13, fontWeight: 500, color: T.text, cursor: 'pointer', lineHeight: 1.4 }}
          >
            {row.judul}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {row.jenisAkta} · {dayjs(row.tanggalAkta).format('D MMM YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Pemohon',
      dataIndex: 'requestedByName',
      width: 160,
      render: (val, row) => (
        <div>
          <div style={{ fontSize: 12, color: T.text }}>{val}</div>
          <div style={{ fontSize: 11, color: T.muted }}>
            {dayjs(row.createdAt).format('D MMM YYYY, HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approvalStatus',
      width: 110,
      render: (val: string) => {
        const meta = STATUS_META[val];
        return (
          <span style={{
            padding: '2px 9px', borderRadius: 4,
            background: meta?.bg ?? T.active,
            color: meta?.color ?? T.text,
            fontSize: 11, fontWeight: 500,
          }}>
            {meta?.label ?? val}
          </span>
        );
      },
    },
    ...(activeTab !== 'Menunggu' ? [{
      title: 'Reviewer',
      width: 160,
      render: (_: unknown, row: ApprovalItem) => row.reviewedByName ? (
        <div>
          <div style={{ fontSize: 12, color: T.text }}>{row.reviewedByName}</div>
          {row.reviewedAt && (
            <div style={{ fontSize: 11, color: T.muted }}>
              {dayjs(row.reviewedAt).format('D MMM YYYY, HH:mm')}
            </div>
          )}
          {row.catatan && (
            <div style={{ fontSize: 11, color: '#c44444', marginTop: 2, fontStyle: 'italic' }}>
              "{row.catatan}"
            </div>
          )}
        </div>
      ) : null,
    }] : []),
    {
      title: 'Aksi',
      width: isNotaris ? 110 : 80,
      fixed: 'right' as const,
      render: (_: unknown, row: ApprovalItem) => (
        <Space size={4}>
          {isNotaris && row.approvalStatus === 'Menunggu' && (
            <>
              <Tooltip title="Setujui">
                <Button
                  size="small" type="text"
                  icon={<CheckOutlined style={{ color: '#448844' }} />}
                  onClick={() => openReview(row, 'Disetujui')}
                />
              </Tooltip>
              <Tooltip title="Tolak">
                <Button
                  size="small" type="text"
                  icon={<CloseOutlined style={{ color: '#c44444' }} />}
                  onClick={() => openReview(row, 'Ditolak')}
                />
              </Tooltip>
            </>
          )}
          {!isNotaris && row.approvalStatus === 'Ditolak' && (
            <Tooltip title="Ajukan Ulang">
              <Button
                size="small" type="text"
                icon={<ReloadOutlined style={{ color: '#4a7fa5' }} />}
                onClick={() => { setResubmitNote(''); setResubmitModal({ open: true, item: row }); }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabs = [
    { key: 'Menunggu',  label: 'Menunggu' },
    { key: 'Disetujui', label: 'Disetujui' },
    { key: 'Ditolak',   label: 'Ditolak' },
    { key: 'Semua',     label: 'Semua' },
  ];

  return (
    <div style={{ color: T.text }}>
      <style>{GLOBAL_STYLE}</style>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingBottom: 18, borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <InboxOutlined style={{ fontSize: 15, color: T.muted }} />
            <span style={{ fontSize: 19, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>
              {isNotaris ? 'Inbox Persetujuan' : 'Pengajuan Saya'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: T.muted }}>
            {isNotaris
              ? 'Akta yang memerlukan persetujuan Notaris'
              : 'Status pengajuan akta yang Anda buat'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${T.border}`, marginBottom: 14 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k); setPage(1); }}
          items={tabs.map(t => ({ key: t.key, label: t.label }))}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Table */}
      <div className="inbox-table">
        <Table
          rowKey="approvalId"
          size="small"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 700 }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted }}>
                <InboxOutlined style={{ fontSize: 28, color: T.border, display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 14, fontWeight: 500 }}>Tidak ada item</div>
              </div>
            ),
          }}
          pagination={{
            current: page, pageSize, total,
            onChange: (p) => setPage(p),
            simple: true,
            showTotal: (t) => <span style={{ fontSize: 12, color: T.muted }}>{t} item</span>,
          }}
        />
      </div>

      {/* Review Modal (Approve/Reject) */}
      <Modal
        open={reviewModal.open}
        title={
          <span style={{ color: reviewModal.action === 'Disetujui' ? '#448844' : '#c44444', fontWeight: 600 }}>
            {reviewModal.action === 'Disetujui' ? '✓ Setujui Akta' : '✕ Tolak Akta'}
          </span>
        }
        onCancel={() => setReviewModal({ open: false, item: null, action: null })}
        onOk={handleReview}
        okText={reviewModal.action === 'Disetujui' ? 'Setujui' : 'Tolak'}
        okButtonProps={{
          danger: reviewModal.action === 'Ditolak',
          style: reviewModal.action === 'Disetujui' ? { background: '#448844', borderColor: '#448844' } : {},
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        {reviewModal.item && (
          <div>
            <div style={{
              padding: '10px 14px', background: T.hover, borderRadius: 6,
              border: `1px solid ${T.border}`, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{reviewModal.item.judul}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {reviewModal.item.nomorAkta} · {reviewModal.item.requestedByName}
              </div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, color: T.muted, fontWeight: 600 }}>
              CATATAN {reviewModal.action === 'Ditolak' ? '(WAJIB)' : '(OPSIONAL)'}
            </div>
            <TextArea
              rows={3}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder={reviewModal.action === 'Ditolak' ? 'Jelaskan alasan penolakan...' : 'Catatan tambahan (opsional)...'}
              style={{ resize: 'none' }}
            />
          </div>
        )}
      </Modal>

      {/* Resubmit Modal */}
      <Modal
        open={resubmitModal.open}
        title="Ajukan Ulang Akta"
        onCancel={() => setResubmitModal({ open: false, item: null })}
        onOk={handleResubmit}
        okText="Ajukan Ulang"
        confirmLoading={submitting}
        destroyOnClose
      >
        {resubmitModal.item && (
          <div>
            <div style={{
              padding: '10px 14px', background: T.hover, borderRadius: 6,
              border: `1px solid ${T.border}`, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{resubmitModal.item.judul}</div>
              {resubmitModal.item.catatan && (
                <div style={{ fontSize: 11, color: '#c44444', marginTop: 4 }}>
                  Alasan ditolak: "{resubmitModal.item.catatan}"
                </div>
              )}
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, color: T.muted, fontWeight: 600 }}>
              CATATAN PENGAJUAN ULANG (OPSIONAL)
            </div>
            <TextArea
              rows={3}
              value={resubmitNote}
              onChange={e => setResubmitNote(e.target.value)}
              placeholder="Jelaskan perubahan yang dilakukan..."
              style={{ resize: 'none' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
