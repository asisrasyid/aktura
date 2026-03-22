import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Popconfirm, message,
  Badge, Tag, Drawer, Form, DatePicker, Descriptions, Divider,
  Modal, Timeline, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOpenOutlined, SwapOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  arsipService,
  type ArsipItem, type ArsipDetail, type ArsipStatus,
  type PeminjamanItem,
} from '../../services/arsip.service';
import { JENIS_PRODUK } from '../../constants/jenisProduk';

// ── Constants ─────────────────────────────────────────────────

const STATUS_COLOR: Record<ArsipStatus, 'success' | 'processing' | 'error'> = {
  Aktif:       'success',
  Diarsipkan:  'processing',
  Dipinjam:    'error',
};

const currentYear = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: currentYear - i,
  label: String(currentYear - i),
}));

// ── Helper ─────────────────────────────────────────────────────

function activePeminjaman(p: PeminjamanItem[]) {
  return p.find(x => !x.isKembali);
}

// ── Sub-components ─────────────────────────────────────────────

function PeminjamanTimeline({ items }: { items: PeminjamanItem[] }) {
  if (items.length === 0)
    return <p style={{ color: '#bfbfbf', fontSize: 13 }}>Belum ada riwayat peminjaman.</p>;

  return (
    <Timeline
      items={items.map(p => ({
        color: p.isKembali ? 'green' : 'red',
        children: (
          <div style={{ fontSize: 13 }}>
            <b>{p.namaPeminjam}</b>
            <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
              {dayjs(p.tanggalPinjam).format('D MMM YYYY')}
              {p.isKembali && p.tanggalKembali
                ? ` → ${dayjs(p.tanggalKembali).format('D MMM YYYY')}`
                : ' (belum kembali)'}
            </span>
            {p.keterangan && <div style={{ color: '#595959' }}>{p.keterangan}</div>}
          </div>
        ),
      }))}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function Arsip() {
  const [data, setData]         = useState<ArsipItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterTahun, setFilterTahun]   = useState<number | undefined>();
  const [loading, setLoading]   = useState(false);

  // Detail drawer
  const [detail, setDetail]       = useState<ArsipDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Manual create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // Pinjam modal
  const [pinjamOpen, setPinjamOpen]   = useState(false);
  const [pinjamForm] = Form.useForm();
  const [pinjaming, setPinjaming]     = useState(false);

  // Kembali modal
  const [kembaliOpen, setKembaliOpen] = useState(false);
  const [kembaliForm] = Form.useForm();
  const [kembaliling, setKembaliling] = useState(false);

  // ── Fetch list ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await arsipService.getAll({
        search: search || undefined,
        status: filterStatus,
        tahun:  filterTahun,
        page, pageSize,
      });
      setData(res.items);
      setTotal(res.totalCount);
    } catch {
      message.error('Gagal memuat data arsip');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterTahun, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Open detail ─────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setDrawerOpen(true);
    setLoadingDetail(true);
    try {
      const d = await arsipService.getById(id);
      setDetail(d);
      editForm.setFieldsValue({
        tanggalArsip: d.tanggalArsip ? dayjs(d.tanggalArsip) : null,
        lokasi:       d.lokasi ?? '',
        status:       d.status,
        keterangan:   d.keterangan ?? '',
      });
    } catch {
      message.error('Gagal memuat detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setDetail(null);
    editForm.resetFields();
  };

  // ── Save edit ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const v = editForm.getFieldsValue();
      await arsipService.update(detail.id, {
        tanggalArsip: v.tanggalArsip ? (v.tanggalArsip as Dayjs).format('YYYY-MM-DD') : undefined,
        lokasi:       v.lokasi || undefined,
        status:       v.status,
        keterangan:   v.keterangan || undefined,
      });
      message.success('Tersimpan');
      fetchData();
      const updated = await arsipService.getById(detail.id);
      setDetail(updated);
    } catch {
      message.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      await arsipService.delete(id);
      message.success('Arsip dihapus');
      fetchData();
    } catch {
      message.error('Gagal menghapus');
    }
  };

  // ── Manual create ───────────────────────────────────────────

  const handleCreate = async (values: {
    nomorAkta: string; judulAkta: string; jenisAkta: string;
    tanggalAkta: Dayjs; tanggalArsip?: Dayjs; lokasi?: string; keterangan?: string;
  }) => {
    setCreating(true);
    try {
      await arsipService.create({
        nomorAkta:    values.nomorAkta,
        judulAkta:    values.judulAkta,
        jenisAkta:    values.jenisAkta,
        tanggalAkta:  values.tanggalAkta.format('YYYY-MM-DD'),
        tanggalArsip: values.tanggalArsip?.format('YYYY-MM-DD'),
        lokasi:       values.lokasi,
        keterangan:   values.keterangan,
      });
      message.success('Arsip ditambahkan');
      createForm.resetFields();
      setCreateOpen(false);
      fetchData();
    } catch {
      message.error('Gagal menambah arsip');
    } finally {
      setCreating(false);
    }
  };

  // ── Pinjam ──────────────────────────────────────────────────

  const handlePinjam = async (values: {
    namaPeminjam: string; tanggalPinjam: Dayjs; keterangan?: string;
  }) => {
    if (!detail) return;
    setPinjaming(true);
    try {
      await arsipService.pinjam(detail.id, {
        namaPeminjam:  values.namaPeminjam,
        tanggalPinjam: values.tanggalPinjam.format('YYYY-MM-DD'),
        keterangan:    values.keterangan,
      });
      message.success('Peminjaman dicatat');
      pinjamForm.resetFields();
      setPinjamOpen(false);
      fetchData();
      const updated = await arsipService.getById(detail.id);
      setDetail(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal mencatat peminjaman';
      message.error(msg);
    } finally {
      setPinjaming(false);
    }
  };

  // ── Kembali ─────────────────────────────────────────────────

  const handleKembali = async (values: { tanggalKembali?: Dayjs }) => {
    if (!detail) return;
    setKembaliling(true);
    try {
      await arsipService.kembali(detail.id, {
        tanggalKembali: values.tanggalKembali?.format('YYYY-MM-DD'),
      });
      message.success('Arsip ditandai kembali');
      kembaliForm.resetFields();
      setKembaliOpen(false);
      fetchData();
      const updated = await arsipService.getById(detail.id);
      setDetail(updated);
    } catch {
      message.error('Gagal menandai kembali');
    } finally {
      setKembaliling(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────

  const columns: ColumnsType<ArsipItem> = [
    {
      title: 'Nomor Akta',
      dataIndex: 'nomorAkta',
      key: 'nomorAkta',
      width: 160,
      render: (val, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => openDetail(row.id)}>
          {val}
        </Button>
      ),
    },
    {
      title: 'Judul',
      dataIndex: 'judulAkta',
      key: 'judulAkta',
      render: (val, row) => (
        <span style={{ cursor: 'pointer' }} onClick={() => openDetail(row.id)}>
          <FolderOpenOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
          {val}
        </span>
      ),
    },
    {
      title: 'Jenis',
      dataIndex: 'jenisAkta',
      key: 'jenisAkta',
      width: 160,
      render: val => <Tag>{val || '—'}</Tag>,
    },
    {
      title: 'Tgl Akta',
      dataIndex: 'tanggalAkta',
      key: 'tanggalAkta',
      width: 110,
      render: val => dayjs(val).format('D MMM YYYY'),
    },
    {
      title: 'Lokasi',
      dataIndex: 'lokasi',
      key: 'lokasi',
      width: 200,
      render: val => val
        ? <span style={{ fontSize: 12, color: '#595959' }}>{val}</span>
        : <span style={{ color: '#d9d9d9', fontSize: 12 }}>Belum diisi</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (val: ArsipStatus) => <Badge status={STATUS_COLOR[val]} text={val} />,
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Tooltip title="Buka Detail">
            <Button size="small" icon={<EditOutlined />} onClick={() => openDetail(row.id)} />
          </Tooltip>
          <Popconfirm title="Hapus arsip ini?" onConfirm={() => handleDelete(row.id)} okText="Ya" cancelText="Tidak">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────

  const activePin = detail ? activePeminjaman(detail.peminjaman) : undefined;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Arsip Dokumen</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Tambah Manual
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Cari nomor atau judul..."
          allowClear
          onSearch={v => { setSearch(v); setPage(1); }}
          style={{ width: 280 }}
        />
        <Select
          placeholder="Semua Status"
          allowClear
          style={{ width: 150 }}
          onChange={v => { setFilterStatus(v); setPage(1); }}
          options={[
            { value: 'Aktif',      label: 'Aktif' },
            { value: 'Diarsipkan', label: 'Diarsipkan' },
            { value: 'Dipinjam',   label: 'Dipinjam' },
          ]}
        />
        <Select
          placeholder="Semua Tahun"
          allowClear
          style={{ width: 110 }}
          onChange={v => { setFilterTahun(v); setPage(1); }}
          options={YEAR_OPTIONS}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: t => `Total ${t} arsip`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* ── Detail Drawer ── */}
      <Drawer
        title={detail ? `Arsip: ${detail.nomorAkta}` : 'Detail Arsip'}
        open={drawerOpen}
        onClose={closeDetail}
        width={560}
        loading={loadingDetail}
        extra={
          <Space>
            {detail?.status === 'Dipinjam' ? (
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => { kembaliForm.resetFields(); setKembaliOpen(true); }}
              >
                Tandai Kembali
              </Button>
            ) : (
              <Button
                icon={<SwapOutlined />}
                onClick={() => { pinjamForm.resetFields(); setPinjamOpen(true); }}
                disabled={!detail}
              >
                Pinjam
              </Button>
            )}
            <Button type="primary" onClick={handleSave} loading={saving}>
              Simpan
            </Button>
          </Space>
        }
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Nomor Akta">{detail.nomorAkta}</Descriptions.Item>
              <Descriptions.Item label="Judul">{detail.judulAkta}</Descriptions.Item>
              <Descriptions.Item label="Jenis">{detail.jenisAkta || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tanggal Akta">
                {dayjs(detail.tanggalAkta).format('D MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={STATUS_COLOR[detail.status]} text={detail.status} />
                {activePin && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#ff4d4f' }}>
                    — dipinjam oleh {activePin.namaPeminjam}
                  </span>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Form form={editForm} layout="vertical">
              <Form.Item label="Tanggal Diarsipkan" name="tanggalArsip">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Lokasi Penyimpanan" name="lokasi"
                extra="Contoh: Lemari A, Rak 2, Kotak 5, Map Merah">
                <Input placeholder="Tulis lokasi fisik dokumen..." />
              </Form.Item>
              <Form.Item label="Status" name="status">
                <Select options={[
                  { value: 'Aktif',      label: 'Aktif' },
                  { value: 'Diarsipkan', label: 'Diarsipkan' },
                  { value: 'Dipinjam',   label: 'Dipinjam' },
                ]} />
              </Form.Item>
              <Form.Item label="Keterangan" name="keterangan">
                <Input.TextArea rows={3} placeholder="Catatan tambahan..." />
              </Form.Item>
            </Form>

            <Divider>Riwayat Peminjaman</Divider>
            <PeminjamanTimeline items={detail.peminjaman} />
          </>
        )}
      </Drawer>

      {/* ── Manual Create Modal ── */}
      <Modal
        title="Tambah Arsip Manual"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        okText="Simpan"
        confirmLoading={creating}
        width={520}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 12 }}>
          <Form.Item label="Nomor Akta" name="nomorAkta" rules={[{ required: true }]}>
            <Input placeholder="Contoh: 001/NOT/I/2026" />
          </Form.Item>
          <Form.Item label="Judul / Perihal" name="judulAkta" rules={[{ required: true }]}>
            <Input placeholder="Judul akta atau dokumen" />
          </Form.Item>
          <Form.Item label="Jenis Produk" name="jenisAkta" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Pilih jenis..."
              options={JENIS_PRODUK.map(j => ({ value: j, label: j }))}
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item label="Tanggal Akta" name="tanggalAkta" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Tanggal Diarsipkan" name="tanggalArsip">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Lokasi Penyimpanan" name="lokasi">
            <Input placeholder="Lemari A, Rak 2, Kotak 5..." />
          </Form.Item>
          <Form.Item label="Keterangan" name="keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Pinjam Modal ── */}
      <Modal
        title="Catat Peminjaman"
        open={pinjamOpen}
        onCancel={() => { setPinjamOpen(false); pinjamForm.resetFields(); }}
        onOk={() => pinjamForm.submit()}
        okText="Catat"
        confirmLoading={pinjaming}
        destroyOnClose
      >
        <Form form={pinjamForm} layout="vertical" onFinish={handlePinjam} style={{ marginTop: 12 }}>
          <Form.Item label="Nama Peminjam" name="namaPeminjam" rules={[{ required: true }]}>
            <Input placeholder="Nama lengkap peminjam" />
          </Form.Item>
          <Form.Item label="Tanggal Pinjam" name="tanggalPinjam"
            rules={[{ required: true }]}
            initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Keterangan" name="keterangan">
            <Input placeholder="Tujuan peminjaman (opsional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Kembali Modal ── */}
      <Modal
        title="Tandai Dokumen Kembali"
        open={kembaliOpen}
        onCancel={() => { setKembaliOpen(false); kembaliForm.resetFields(); }}
        onOk={() => kembaliForm.submit()}
        okText="Konfirmasi"
        confirmLoading={kembaliling}
        destroyOnClose
      >
        <Form form={kembaliForm} layout="vertical" onFinish={handleKembali} style={{ marginTop: 12 }}>
          <Form.Item label="Tanggal Kembali" name="tanggalKembali" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
