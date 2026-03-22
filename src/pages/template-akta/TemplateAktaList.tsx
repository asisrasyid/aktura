import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Input, Space, Tag, Popconfirm, message, Typography, Badge,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ThunderboltOutlined, FileWordOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { templateAktaService } from '../../services/templateAkta.service';
import type { TemplateAktaListItem } from '../../types';

const { Title } = Typography;

export default function TemplateAktaList() {
  const navigate = useNavigate();
  const [items, setItems]       = useState<TemplateAktaListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize]              = useState(10);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templateAktaService.getAll(page, pageSize, search || undefined);
      setItems(res.data.items);
      setTotal(res.data.totalCount);
    } catch {
      message.error('Gagal memuat data template.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await templateAktaService.delete(id);
      message.success('Template dihapus.');
      load();
    } catch {
      message.error('Gagal menghapus template.');
    }
  };

  const columns: ColumnsType<TemplateAktaListItem> = [
    {
      title: 'Nama Template',
      dataIndex: 'nama',
      render: (v, row) => (
        <Space>
          {row.tipeFile === 'docx'
            ? <FileWordOutlined style={{ color: '#1677ff' }} />
            : <FileTextOutlined style={{ color: '#1677ff' }} />
          }
          <a onClick={() => navigate(`/template-akta/${row.id}`)}>{v}</a>
          {row.tipeFile === 'docx' && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>DOCX</Tag>}
        </Space>
      ),
    },
    { title: 'Jenis Akta', dataIndex: 'jenisAkta', width: 160 },
    {
      title: 'Placeholder',
      dataIndex: 'jumlahPlaceholder',
      width: 120,
      render: (v) => <Tag color="blue">{v} field</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 100,
      render: (v) => <Badge status={v ? 'success' : 'default'} text={v ? 'Aktif' : 'Nonaktif'} />,
    },
    {
      title: 'Dibuat',
      dataIndex: 'createdAt',
      width: 130,
      render: (v) => new Date(v).toLocaleDateString('id-ID'),
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button
            size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/template-akta/${row.id}`)}
          />
          <Button
            size="small"
            onClick={() => navigate(`/template-akta/${row.id}/generate`)}
          >
            Generate
          </Button>
          <Button
            size="small" type="primary" icon={<ThunderboltOutlined />}
            onClick={() => navigate(`/template-akta/${row.id}/bulk-generate`)}
            title="Generate Massal"
          >
            Massal
          </Button>
          <Popconfirm title="Hapus template ini?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Template Akta</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/template-akta/buat')}>
          Buat Template
        </Button>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Cari nama atau jenis akta..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        style={{ maxWidth: 360, marginBottom: 16 }}
        allowClear
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{
          current: page, pageSize, total,
          onChange: setPage,
          showTotal: (t) => `Total ${t} template`,
        }}
      />
    </div>
  );
}
