import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Klien } from '../../types';
import { klienService } from '../../services/klien.service';
import KlienFormDrawer from './components/KlienFormDrawer';

const JENIS_KELAMIN_LABEL: Record<string, string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
};

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="aktura-skeleton-row">
          <div className="aktura-skeleton-cell" style={{ width: '20%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '18%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '10%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '20%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '12%' }} />
        </div>
      ))}
    </div>
  );
}

export default function KlienList() {
  const [data, setData]         = useState<Klien[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [selected, setSelected]       = useState<Klien | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await klienService.getAll(page, pageSize, search || undefined);
      setData(res.items);
      setTotal(res.totalCount);
    } catch {
      message.error('Gagal memuat data klien');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await klienService.delete(id);
      message.success('Klien berhasil dihapus');
      fetchData();
    } catch {
      message.error('Gagal menghapus klien');
    }
  };

  const openCreate = () => { setSelected(null); setDrawerOpen(true); };
  const openEdit   = (k: Klien) => { setSelected(k); setDrawerOpen(true); };
  const handleSaved = () => { setDrawerOpen(false); fetchData(); };

  const columns: ColumnsType<Klien> = [
    {
      title: 'Nama',
      dataIndex: 'nama',
      key: 'nama',
      width: 200,
    },
    {
      title: 'NIK',
      dataIndex: 'nik',
      key: 'nik',
      width: 170,
    },
    {
      title: 'Jenis Kelamin',
      dataIndex: 'jenisKelamin',
      key: 'jenisKelamin',
      width: 120,
      render: (v: string | null | undefined) => v ? (JENIS_KELAMIN_LABEL[v] ?? v) : '-',
    },
    {
      title: 'Tempat / Tgl Lahir',
      key: 'lahir',
      width: 200,
      render: (_, row) =>
        `${row.tempatLahir}, ${dayjs(row.tanggalLahir).format('DD MMM YYYY')}`,
    },
    {
      title: 'No. Telp',
      dataIndex: 'noTelp',
      key: 'noTelp',
      width: 130,
      render: (v?: string) => v ?? '-',
    },
    {
      title: 'Status Kawin',
      dataIndex: 'statusPerkawinan',
      key: 'statusPerkawinan',
      width: 120,
      render: (v: string) => {
        const map: Record<string, string> = {
          BelumKawin: 'Belum Kawin',
          Kawin: 'Kawin',
          Cerai: 'Cerai',
        };
        return <Tag>{map[v] ?? v}</Tag>;
      },
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Hapus klien ini?"
            onConfirm={() => handleDelete(row.id)}
            okText="Ya"
            cancelText="Tidak"
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Data Klien</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tambah Klien
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Cari nama, NIK, atau no. telp..."
          allowClear
          onSearch={(val) => { setSearch(val); setPage(1); }}
          style={{ width: 320 }}
        />
      </div>

      {loading && data.length === 0 ? (
        <TableSkeleton rows={pageSize} />
      ) : (
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading && data.length > 0}
        scroll={{ x: 1000 }}
        locale={{
          emptyText: (
            <div className="aktura-table-empty">
              <div className="aktura-table-empty-icon">
                <TeamOutlined style={{ fontSize: 22, color: '#C6A75E' }} />
              </div>
              <div className="aktura-table-empty-title">Belum ada data klien</div>
              <div className="aktura-table-empty-desc">
                Tambahkan klien pertama Anda untuk mulai mencatat akta dan dokumen legal.
              </div>
              <Button type="primary" size="small" icon={<PlusOutlined />}
                onClick={openCreate}
                style={{ background: '#1B365D', borderColor: '#1B365D', marginTop: 8 }}>
                Tambah Klien
              </Button>
            </div>
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Total ${t} klien`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
      )}

      <KlienFormDrawer
        open={drawerOpen}
        initialData={selected}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
