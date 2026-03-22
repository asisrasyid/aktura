import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Modal, Form, DatePicker, InputNumber,
  Row, Select, Space, Spin, Table, Tag, Typography, message, Input, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, EyeOutlined, SendOutlined, StopOutlined,
  CheckOutlined, CloseOutlined, DollarOutlined, CopyOutlined,
} from '@ant-design/icons';
import { pdf } from '@react-pdf/renderer';
import { invoiceService } from '../../services/invoice.service';
import type { InvoiceDetail as IInvoiceDetail, InvoicePaymentDto } from '../../types';
import InvoicePdfDocument from './InvoicePdfDocument';

const { Text } = Typography;

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  DRAFT:               { color: 'default', label: 'Draft' },
  TERKIRIM:            { color: 'blue',    label: 'Terkirim' },
  MENUNGGU_VERIFIKASI: { color: 'gold',    label: 'Menunggu Verifikasi' },
  LUNAS:               { color: 'green',   label: 'Lunas' },
  DIBATALKAN:          { color: 'red',     label: 'Dibatalkan' },
};

const ITEM_TYPE_LABEL: Record<string, string> = {
  JASA_NOTARIS: 'Jasa Notaris',
  BIAYA_NEGARA: 'Biaya Negara',
  LAINNYA:      'Lainnya',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inv,     setInv]     = useState<IInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm] = Form.useForm();

  const load = async () => {
    if (!id) return;
    try {
      setInv(await invoiceService.getById(id));
    } catch {
      message.error('Gagal memuat invoice.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const act = async (fn: () => Promise<IInvoiceDetail>, successMsg: string) => {
    setActLoading(true);
    try {
      setInv(await fn());
      message.success(successMsg);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      message.error(msg || 'Terjadi kesalahan.');
    } finally {
      setActLoading(false);
    }
  };

  const handleSend = () => act(() => invoiceService.send(id!), 'Invoice berhasil dikirim.');
  const handleCancel = () => act(() => invoiceService.cancel(id!), 'Invoice dibatalkan.');

  const handleVerify = (paymentId: string, approved: boolean) =>
    act(() => invoiceService.verifyPayment(id!, { paymentId, approved }), approved ? 'Pembayaran diverifikasi.' : 'Pembayaran ditolak.');

  const handleRecordPayment = async () => {
    const vals = await payForm.validateFields();
    setActLoading(true);
    try {
      setInv(await invoiceService.recordPayment(id!, {
        paymentDate:   vals.paymentDate.format('YYYY-MM-DD'),
        amount:        vals.amount,
        paymentMethod: vals.paymentMethod,
        notes:         vals.notes,
      }));
      message.success('Pembayaran dicatat.');
      setPayModal(false);
      payForm.resetFields();
    } catch {
      message.error('Gagal mencatat pembayaran.');
    } finally {
      setActLoading(false);
    }
  };

  const buildPdfBlob = async (): Promise<Blob> => {
    if (!inv) throw new Error('No invoice');
    return await pdf(<InvoicePdfDocument inv={inv} />).toBlob();
  };

  const handleDownloadPdf = async () => {
    setActLoading(true);
    try {
      const blob = await buildPdfBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Invoice-${inv!.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Gagal generate PDF.');
    } finally {
      setActLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    setActLoading(true);
    try {
      const blob = await buildPdfBlob();
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.error('Gagal generate PDF.');
    } finally {
      setActLoading(false);
    }
  };

  const copyLink = () => {
    if (!inv?.publicToken) return;
    const url = `${window.location.origin}/invoice/${inv.publicToken}`;
    navigator.clipboard.writeText(url);
    message.success('Link invoice disalin!');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin /></div>;
  if (!inv) return <div style={{ padding: 40 }}><Text type="secondary">Invoice tidak ditemukan.</Text></div>;

  const status = inv.status;
  const cfg    = STATUS_TAG[status] ?? { color: 'default', label: status };
  const isLunas = status === 'LUNAS';

  const itemColumns = [
    { title: '#', key: 'no', width: 40, render: (_: unknown, __: unknown, idx: number) => idx + 1 },
    { title: 'Deskripsi', dataIndex: 'description', key: 'description' },
    { title: 'Jenis', dataIndex: 'itemType', key: 'itemType',
      render: (t: string) => ITEM_TYPE_LABEL[t] ?? t },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
    { title: 'Harga Satuan', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right' as const,
      render: (v: number) => fmt(v) },
    { title: 'Jumlah', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: number) => <Text strong>{fmt(v)}</Text> },
  ];

  return (
    <>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Action Bar */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} className="no-print">
          <Col>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/akuntansi')} />
          </Col>
          <Col>
            <Space>
              {status === 'DRAFT' && (
                <>
                  <Button onClick={() => navigate(`/akuntansi/${id}/edit`)}>Edit</Button>
                  <Button type="primary" icon={<SendOutlined />} loading={actLoading} onClick={handleSend}
                    style={{ background: '#1B365D' }}>
                    Kirim Invoice
                  </Button>
                  <Popconfirm title="Batalkan invoice ini?" onConfirm={handleCancel}>
                    <Button danger icon={<StopOutlined />}>Batalkan</Button>
                  </Popconfirm>
                </>
              )}
              {status === 'TERKIRIM' && (
                <>
                  <Button icon={<CopyOutlined />} onClick={copyLink}>Salin Link</Button>
                  <Button type="primary" icon={<DollarOutlined />} onClick={() => setPayModal(true)}
                    style={{ background: '#1B365D' }}>
                    Catat Pembayaran
                  </Button>
                  <Popconfirm title="Batalkan invoice ini?" onConfirm={handleCancel}>
                    <Button danger icon={<StopOutlined />}>Batalkan</Button>
                  </Popconfirm>
                </>
              )}
              {status !== 'DIBATALKAN' && (
                <>
                  <Button
                    icon={<EyeOutlined />}
                    loading={actLoading}
                    onClick={handlePreviewPdf}
                  >
                    Preview PDF
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    loading={actLoading}
                    onClick={handleDownloadPdf}
                    style={isLunas ? { borderColor: '#C6A75E', color: '#C6A75E' } : undefined}
                  >
                    {isLunas ? 'Download Kwitansi' : 'Download PDF'}
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>

        {/* Invoice Paper */}
        <Card style={{ borderRadius: 8 }}>
          {/* Header */}
          <div style={{
            background: '#1B365D', margin: '-24px -24px 24px',
            padding: '28px 32px', borderRadius: '8px 8px 0 0',
          }}>
            <Row justify="space-between" align="top">
              <Col>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#C6A75E', fontSize: 28, fontWeight: 700 }}>
                  AKTURA
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Sistem Manajemen Notaris</Text>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 600 }}>INVOICE</div>
                <div style={{ color: '#C6A75E', fontSize: 14 }}>{inv.invoiceNumber}</div>
                <Tag color={cfg.color} style={{ marginTop: 4 }}>{cfg.label}</Tag>
              </Col>
            </Row>
            <div style={{ borderTop: '1px solid rgba(198,167,94,0.3)', margin: '16px 0' }} />
            <Row gutter={32}>
              <Col>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TAGIHAN KEPADA</Text>
                <div style={{ color: '#fff', fontWeight: 600 }}>{inv.klienNama}</div>
                {inv.klienAlamat && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{inv.klienAlamat}</div>}
                {inv.klienNoTelp && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{inv.klienNoTelp}</div>}
              </Col>
              <Col>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TANGGAL TERBIT</Text>
                <div style={{ color: '#fff' }}>{inv.issueDate}</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8, display: 'block' }}>JATUH TEMPO</Text>
                <div style={{ color: '#C6A75E', fontWeight: 600 }}>{inv.dueDate}</div>
              </Col>
              {inv.aktaNomor && (
                <Col>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>AKTA</Text>
                  <div style={{ color: '#fff' }}>{inv.aktaNomor}</div>
                </Col>
              )}
            </Row>
          </div>

          {/* Items */}
          <Table
            columns={itemColumns}
            dataSource={inv.items}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ marginBottom: 16 }}
          />

          {/* Totals */}
          <Row justify="end">
            <Col style={{ minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>Subtotal</Text>
                <Text>{fmt(inv.subtotal)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>Pajak / Biaya Lain</Text>
                <Text>{fmt(inv.taxAmount)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 16, color: '#1B365D' }}>TOTAL</Text>
                <Text strong style={{ fontSize: 16, color: '#1B365D' }}>{fmt(inv.totalAmount)}</Text>
              </div>
            </Col>
          </Row>

          {inv.notes && (
            <div style={{ marginTop: 24, padding: '12px 16px', background: '#F7F6F3', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Keterangan:</Text>
              <div style={{ marginTop: 4 }}>{inv.notes}</div>
            </div>
          )}

          {/* Payment History */}
          {inv.payments.length > 0 && (
            <>
              <Divider style={{ margin: '24px 0 12px' }}>Riwayat Pembayaran</Divider>
              {inv.payments.map((p: InvoicePaymentDto) => (
                <Card key={p.id} size="small" style={{ marginBottom: 8, borderRadius: 6 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong>{fmt(p.amount)}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>· {p.paymentMethod} · {p.paymentDate}</Text>
                      {p.notes && <div style={{ fontSize: 12, color: '#666' }}>{p.notes}</div>}
                    </Col>
                    <Col>
                      <Space>
                        <Tag color={p.status === 'VERIFIED' ? 'green' : p.status === 'REJECTED' ? 'red' : 'gold'}>
                          {p.status === 'VERIFIED' ? 'Terverifikasi' : p.status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                        </Tag>
                        {p.status === 'PENDING' && (
                          <Space size={4} className="no-print">
                            <Button size="small" type="primary" icon={<CheckOutlined />}
                              style={{ background: '#52c41a', borderColor: '#52c41a' }}
                              onClick={() => handleVerify(p.id, true)}>
                              Verifikasi
                            </Button>
                            <Button size="small" danger icon={<CloseOutlined />}
                              onClick={() => handleVerify(p.id, false)}>
                              Tolak
                            </Button>
                          </Space>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>
              ))}
            </>
          )}
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal
        title="Catat Pembayaran"
        open={payModal}
        onCancel={() => { setPayModal(false); payForm.resetFields(); }}
        onOk={handleRecordPayment}
        confirmLoading={actLoading}
        okText="Catat"
        okButtonProps={{ style: { background: '#1B365D' } }}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item name="paymentDate" label="Tanggal Pembayaran" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="amount" label="Jumlah Dibayar" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number((v ?? '').replace(/Rp\s?|(\.*)/g, '')) as never}
              min={1}
            />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Metode" initialValue="TRANSFER" rules={[{ required: true }]}>
            <Select options={[
              { value: 'TRANSFER', label: 'Transfer Bank' },
              { value: 'TUNAI',    label: 'Tunai' },
              { value: 'LAINNYA', label: 'Lainnya' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Catatan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
