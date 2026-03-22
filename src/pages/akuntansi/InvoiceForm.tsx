import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, Button, Table, InputNumber, Row, Col,
  Typography, Card, Space, Divider, message, Spin, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { invoiceService } from '../../services/invoice.service';
import api from '../../services/api';
import type { InvoiceDetail, InvoiceItemForm } from '../../types';

const { Title, Text } = Typography;

interface KlienOption { value: string; label: string; }
interface AktaOption  { value: string; label: string; }

const ITEM_TYPE_OPTIONS = [
  { value: 'JASA_NOTARIS', label: 'Jasa Notaris' },
  { value: 'BIAYA_NEGARA', label: 'Biaya Negara' },
  { value: 'LAINNYA',      label: 'Lainnya' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyItem = (): InvoiceItemForm => ({
  description: '', quantity: 1, unitPrice: 0, itemType: 'JASA_NOTARIS', urutan: 0,
});

export default function InvoiceForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form]      = Form.useForm();
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [kliens,  setKliens]    = useState<KlienOption[]>([]);
  const [aktas,   setAktas]     = useState<AktaOption[]>([]);
  const [items,   setItems]     = useState<InvoiceItemForm[]>([emptyItem()]);
  const [taxAmount, setTaxAmount] = useState(0);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const total    = subtotal + taxAmount;

  useEffect(() => {
    Promise.all([
      api.get('/klien?pageSize=999').then(r => r.data.items ?? r.data),
      api.get('/akta').then(r => r.data.items ?? r.data),
    ]).then(([ks, as]) => {
      setKliens((ks as { id: string; nama: string }[]).map(k => ({ value: k.id, label: k.nama })));
      setAktas((as  as { id: string; nomorAkta: string; judul: string }[]).map(a => ({
        value: a.id, label: `${a.nomorAkta} — ${a.judul}`,
      })));
    }).catch(() => {});

    if (isEdit && id) {
      setLoading(true);
      invoiceService.getById(id).then((inv: InvoiceDetail) => {
        form.setFieldsValue({
          klienId:   inv.klienId,
          aktaId:    inv.aktaId,
          issueDate: dayjs(inv.issueDate),
          dueDate:   dayjs(inv.dueDate),
          notes:     inv.notes,
        });
        setTaxAmount(inv.taxAmount);
        setItems(inv.items.map(ii => ({
          description: ii.description,
          quantity:    ii.quantity,
          unitPrice:   ii.unitPrice,
          itemType:    ii.itemType as InvoiceItemForm['itemType'],
          urutan:      ii.urutan,
        })));
      }).catch(() => message.error('Gagal memuat data invoice.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, form]);

  const updateItem = (idx: number, field: keyof InvoiceItemForm, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem    = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const vals = await form.validateFields();
    const hasInvalidItem = items.some(it => !it.description.trim() || it.unitPrice <= 0);
    if (hasInvalidItem) {
      message.error('Setiap item harus memiliki deskripsi dan harga satuan yang valid.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        klienId:   vals.klienId,
        aktaId:    vals.aktaId ?? undefined,
        issueDate: (vals.issueDate as Dayjs).format('YYYY-MM-DD'),
        dueDate:   (vals.dueDate  as Dayjs).format('YYYY-MM-DD'),
        notes:     vals.notes,
        taxAmount,
        items: items.map((it, idx) => ({ ...it, urutan: idx + 1 })),
      };

      if (isEdit && id) {
        await invoiceService.update(id, payload);
        message.success('Invoice berhasil diperbarui.');
      } else {
        const created = await invoiceService.create(payload);
        message.success('Invoice berhasil dibuat.');
        navigate(`/akuntansi/${created.id}`);
        return;
      }
      navigate(`/akuntansi/${id}`);
    } catch {
      message.error('Gagal menyimpan invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Row align="middle" style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/akuntansi')} style={{ marginRight: 8 }} />
        <Title level={4} style={{ margin: 0, color: '#1B365D', fontFamily: "'Playfair Display', Georgia, serif" }}>
          {isEdit ? 'Edit Invoice' : 'Buat Invoice Baru'}
        </Title>
      </Row>

      <Form form={form} layout="vertical">
        <Card style={{ borderRadius: 8, marginBottom: 16 }}>
          <Title level={5} style={{ color: '#1B365D', marginBottom: 16 }}>Informasi Dasar</Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="klienId" label="Klien" rules={[{ required: true, message: 'Pilih klien' }]}>
                <Select
                  showSearch placeholder="Cari klien..."
                  filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={kliens}
                  disabled={isEdit}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="aktaId" label="Akta Terkait (opsional)">
                <Select
                  showSearch allowClear placeholder="Pilih akta..."
                  filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={aktas}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="issueDate" label="Tanggal Terbit" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="dueDate" label="Jatuh Tempo" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Biaya Tambahan / Pajak">
                <InputNumber
                  style={{ width: '100%' }}
                  value={taxAmount}
                  onChange={v => setTaxAmount(v ?? 0)}
                  formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={v => Number((v ?? '').replace(/Rp\s?|(\.*)/g, ''))}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Keterangan">
                <Input.TextArea rows={2} placeholder="Keterangan tambahan (opsional)" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Line Items */}
        <Card style={{ borderRadius: 8, marginBottom: 16 }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Title level={5} style={{ color: '#1B365D', margin: 0 }}>Item Tagihan</Title>
            <Button size="small" icon={<PlusOutlined />} onClick={addItem}>Tambah Item</Button>
          </Row>

          <Table
            dataSource={items.map((it, idx) => ({ ...it, key: idx }))}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Deskripsi', key: 'description', width: '35%',
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <Input
                    value={_row.description}
                    placeholder="Deskripsi layanan..."
                    onChange={e => updateItem(_row.key, 'description', e.target.value)}
                  />
                ),
              },
              {
                title: 'Jenis', key: 'itemType', width: '18%',
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <Select
                    size="small" style={{ width: '100%' }}
                    value={_row.itemType}
                    options={ITEM_TYPE_OPTIONS}
                    onChange={v => updateItem(_row.key, 'itemType', v)}
                  />
                ),
              },
              {
                title: 'Qty', key: 'quantity', width: '10%',
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <InputNumber
                    min={0.01} value={_row.quantity} style={{ width: '100%' }}
                    onChange={v => updateItem(_row.key, 'quantity', v ?? 1)}
                  />
                ),
              },
              {
                title: 'Harga Satuan', key: 'unitPrice', width: '18%',
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <InputNumber
                    min={0} value={_row.unitPrice} style={{ width: '100%' }}
                    formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    parser={v => Number((v ?? '').replace(/\./g, ''))}
                    onChange={v => updateItem(_row.key, 'unitPrice', v ?? 0)}
                  />
                ),
              },
              {
                title: 'Jumlah', key: 'amount', align: 'right' as const, width: '14%',
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <Text>{fmt(_row.quantity * _row.unitPrice)}</Text>
                ),
              },
              {
                title: '', key: 'del', width: 40,
                render: (_: unknown, _row: InvoiceItemForm & { key: number }) => (
                  <Popconfirm title="Hapus item?" onConfirm={() => removeItem(_row.key)} disabled={items.length <= 1}>
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={items.length <= 1} />
                  </Popconfirm>
                ),
              },
            ]}
          />

          <Divider style={{ margin: '12px 0' }} />
          <Row justify="end">
            <Col>
              <Space direction="vertical" style={{ textAlign: 'right' }} size={4}>
                <Text>Subtotal: <strong>{fmt(subtotal)}</strong></Text>
                <Text>Pajak / Biaya Lain: <strong>{fmt(taxAmount)}</strong></Text>
                <Divider style={{ margin: '4px 0' }} />
                <Text style={{ fontSize: 18, color: '#1B365D' }}>
                  Total: <strong>{fmt(total)}</strong>
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row justify="end">
          <Space>
            <Button onClick={() => navigate('/akuntansi')}>Batal</Button>
            <Button type="primary" loading={saving} onClick={handleSave}
              style={{ background: '#1B365D', borderColor: '#1B365D' }}>
              Simpan sebagai Draft
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
}
