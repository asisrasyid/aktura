import { useState, useEffect, useCallback } from 'react';
import {
  Button, Upload, Select, Modal, Space, Popconfirm,
  message, Spin, Tag, Tooltip, Typography, Empty,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, EyeOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined,
  FileExcelOutlined, FileOutlined, PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { aktaDokumenService, type AktaDokumenItem } from '../../../services/aktaDokumen.service';

const { Text } = Typography;

// ── Jenis dokumen umum notaris / PPAT ──────────────────────────────────────
const JENIS_OPTIONS = [
  'KTP', 'NPWP', 'KK (Kartu Keluarga)', 'Surat Nikah', 'Akta Lahir',
  'Akta Kematian', 'Sertifikat Tanah / SHM', 'Sertifikat HGB', 'SKGR / Girik',
  'SPPT PBB', 'IMB / PBG', 'SKT (Surat Keterangan Tanah)',
  'AJB Sebelumnya', 'BPHTB', 'PPh', 'Akta Pendirian',
  'SK Kemenkumham', 'NIB', 'Buku Tabungan', 'Paspor', 'Lainnya',
];

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx';

// ── Icon berdasarkan content type ──────────────────────────────────────────
function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith('image/'))           return <FileImageOutlined style={{ color: '#52c41a' }} />;
  if (contentType === 'application/pdf')           return <FilePdfOutlined  style={{ color: '#ff4d4f' }} />;
  if (contentType.includes('word'))                return <FileWordOutlined  style={{ color: '#1677ff' }} />;
  if (contentType.includes('excel') || contentType.includes('spreadsheet'))
    return <FileExcelOutlined style={{ color: '#52c41a' }} />;
  return <FileOutlined style={{ color: '#8c8c8c' }} />;
}

function formatSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ── Preview Modal ──────────────────────────────────────────────────────────
function PreviewModal({ doc, onClose }: { doc: AktaDokumenItem | null; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) { setBlobUrl(null); return; }
    setLoading(true);
    aktaDokumenService.getFileBlob(doc.id)
      .then(blob => setBlobUrl(URL.createObjectURL(blob)))
      .catch(() => message.error('Gagal memuat file.'))
      .finally(() => setLoading(false));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const isImage = doc?.contentType.startsWith('image/');
  const isPdf   = doc?.contentType === 'application/pdf';

  return (
    <Modal
      open={!!doc}
      title={doc ? `${doc.jenisDokumen} — ${doc.namaAsli}` : ''}
      onCancel={onClose}
      footer={
        blobUrl && (
          <Button href={blobUrl} download={doc?.namaAsli} type="primary">
            Download
          </Button>
        )
      }
      width={isPdf ? 900 : 600}
      styles={{ body: { padding: isPdf ? 0 : 24, minHeight: 200 } }}
      destroyOnClose
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      )}
      {!loading && blobUrl && isImage && (
        <img src={blobUrl} alt={doc?.namaAsli} style={{ width: '100%', borderRadius: 4 }} />
      )}
      {!loading && blobUrl && isPdf && (
        <iframe
          src={blobUrl}
          title={doc?.namaAsli}
          style={{ width: '100%', height: '75vh', border: 'none' }}
        />
      )}
      {!loading && blobUrl && !isImage && !isPdf && (
        <div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>
          <FileOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
          <p>Preview tidak tersedia untuk tipe file ini.</p>
          <Button href={blobUrl} download={doc?.namaAsli} type="primary">
            Download File
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────
function UploadModal({
  open, aktaId, onClose, onSuccess,
}: {
  open: boolean; aktaId: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [jenis, setJenis]     = useState<string | undefined>();
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => { setJenis(undefined); setFile(null); };

  const handleOk = async () => {
    if (!jenis)  { message.warning('Pilih jenis dokumen terlebih dahulu.'); return; }
    if (!file)   { message.warning('Pilih file terlebih dahulu.'); return; }
    setLoading(true);
    try {
      await aktaDokumenService.upload(aktaId, file, jenis);
      message.success('Dokumen berhasil diupload.');
      reset();
      onSuccess();
    } catch {
      message.error('Gagal mengupload dokumen.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => { reset(); onClose(); };

  return (
    <Modal
      open={open}
      title="Upload Dokumen Warkah"
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Upload"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Jenis Dokumen <span style={{ color: '#ff4d4f' }}>*</span>
          </Text>
          <Select
            showSearch
            allowClear
            style={{ width: '100%' }}
            placeholder="Pilih atau ketik jenis dokumen..."
            value={jenis}
            onChange={setJenis}
            options={JENIS_OPTIONS.map(j => ({ value: j, label: j }))}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            File <span style={{ color: '#ff4d4f' }}>*</span>
          </Text>
          <Upload
            accept={ACCEPTED_EXTENSIONS}
            maxCount={1}
            beforeUpload={f => { setFile(f); return false; }}  // manual upload
            onRemove={() => setFile(null)}
            fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
          >
            <Button icon={<UploadOutlined />}>Pilih File</Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
            Maks. 20 MB · JPG, PNG, PDF, Word, Excel
          </Text>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DokumenWarkahSection({ aktaId }: { aktaId: string }) {
  const [docs, setDocs]           = useState<AktaDokumenItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AktaDokumenItem | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aktaDokumenService.getByAkta(aktaId);
      setDocs(data);
    } catch {
      message.error('Gagal memuat dokumen.');
    } finally {
      setLoading(false);
    }
  }, [aktaId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (id: string) => {
    try {
      await aktaDokumenService.delete(id);
      message.success('Dokumen dihapus.');
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      message.error('Gagal menghapus dokumen.');
    }
  };

  // Kelompokkan per jenis dokumen
  const grouped = docs.reduce<Record<string, AktaDokumenItem[]>>((acc, d) => {
    (acc[d.jenisDokumen] ??= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setUploadOpen(true)}
        >
          Upload Dokumen
        </Button>
      </div>

      {loading && <Spin style={{ display: 'block', textAlign: 'center' }} />}

      {!loading && docs.length === 0 && (
        <Empty description="Belum ada dokumen diupload" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {!loading && Object.entries(grouped).map(([jenis, items]) => (
        <div key={jenis} style={{ marginBottom: 16 }}>
          {/* Jenis header */}
          <div style={{ marginBottom: 6 }}>
            <Tag color="blue" style={{ fontWeight: 600 }}>{jenis}</Tag>
          </div>

          {/* File rows */}
          {items.map(doc => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', marginBottom: 4,
                background: '#fafafa', borderRadius: 6,
                border: '1px solid #f0f0f0',
              }}
            >
              <FileIcon contentType={doc.contentType} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  ellipsis
                  style={{ display: 'block', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setPreviewDoc(doc)}
                >
                  {doc.namaAsli}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatSize(doc.fileSize)} · {doc.uploadedByName} · {dayjs(doc.uploadedAt).format('DD MMM YYYY HH:mm')}
                </Text>
              </div>
              <Space size={4}>
                <Tooltip title="Preview">
                  <Button
                    size="small"
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewDoc(doc)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Hapus dokumen ini?"
                  onConfirm={() => handleDelete(doc.id)}
                  okText="Hapus"
                  cancelText="Batal"
                >
                  <Tooltip title="Hapus">
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      ))}

      <UploadModal
        open={uploadOpen}
        aktaId={aktaId}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => { setUploadOpen(false); fetchDocs(); }}
      />

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </>
  );
}
