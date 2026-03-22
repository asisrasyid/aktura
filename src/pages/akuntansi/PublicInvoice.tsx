import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Modal, Form, InputNumber, Row,
  Spin, Table, Tag, Typography, message, Input,
} from 'antd';
import { CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { invoiceService } from '../../services/invoice.service';
import type { PublicInvoice as IPublicInvoice } from '../../types';

const { Title, Text } = Typography;

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  DRAFT:               { color: 'default', label: 'Draft' },
  TERKIRIM:            { color: 'blue',    label: 'Menunggu Pembayaran' },
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

export default function PublicInvoice() {
  const { token } = useParams<{ token: string }>();
  const [inv,     setInv]     = useState<IPublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!token) return;
    invoiceService.getPublic(token)
      .then(setInv)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleConfirm = async () => {
    let vals: { amount: number; notes?: string };
    try {
      vals = await form.validateFields();
    } catch {
      return; // antd already shows field-level errors
    }
    setConfirming(true);
    try {
      const updated = await invoiceService.confirmPublicPayment(token!, {
        amount: vals.amount,
        notes:  vals.notes,
      });
      setInv(updated);
      setConfirmed(true);
      setConfirmModal(false);
      message.success('Konfirmasi pembayaran berhasil dikirim. Kami akan memverifikasi dalam 1×24 jam.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      message.error(msg || 'Gagal mengirim konfirmasi.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !inv) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <Title level={3} style={{ color: '#1B365D' }}>Invoice Tidak Ditemukan</Title>
        <Text type="secondary">Link invoice ini tidak valid atau sudah kedaluwarsa.</Text>
      </div>
    );
  }

  const statusCfg = STATUS_TAG[inv.status] ?? { color: 'default', label: inv.status };
  const canConfirm = inv.status === 'TERKIRIM' && !confirmed;

  const itemColumns = [
    { title: 'Deskripsi', dataIndex: 'description', key: 'description' },
    { title: 'Jenis', dataIndex: 'itemType', key: 'itemType', render: (t: string) => ITEM_TYPE_LABEL[t] ?? t },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
    { title: 'Harga Satuan', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right' as const,
      render: (v: number) => fmt(v) },
    { title: 'Jumlah', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: number) => <Text strong>{fmt(v)}</Text> },
  ];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: #F7F6F3; margin: 0; font-family: 'Inter', sans-serif; }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
        {/* Brand bar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }} className="no-print">
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#1B365D', fontSize: 24, fontWeight: 700 }}>
            AKTURA
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>Sistem Manajemen Notaris</Text>
        </div>

        <Card style={{ borderRadius: 12, boxShadow: '0 2px 16px rgba(27,54,93,0.08)' }}>
          {/* Invoice header */}
          <div style={{
            background: '#1B365D', margin: '-24px -24px 24px',
            padding: '24px 28px', borderRadius: '12px 12px 0 0',
          }}>
            <Row justify="space-between" align="middle">
              <Col>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#C6A75E', fontSize: 22, fontWeight: 700 }}>
                  INVOICE
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>
                  {inv.invoiceNumber}
                </div>
              </Col>
              <Col>
                <Tag color={statusCfg.color} style={{ fontSize: 13, padding: '2px 10px' }}>
                  {statusCfg.label}
                </Tag>
              </Col>
            </Row>
            <div style={{ borderTop: '1px solid rgba(198,167,94,0.3)', margin: '16px 0' }} />
            <Row gutter={32}>
              <Col>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TAGIHAN KEPADA</Text>
                <div style={{ color: '#fff', fontWeight: 600 }}>{inv.klienNama}</div>
              </Col>
              <Col>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TANGGAL TERBIT</Text>
                <div style={{ color: '#fff' }}>{inv.issueDate}</div>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8, display: 'block' }}>JATUH TEMPO</Text>
                <div style={{ color: '#C6A75E', fontWeight: 600 }}>{inv.dueDate}</div>
              </Col>
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
                <Text>Subtotal</Text><Text>{fmt(inv.subtotal)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>Pajak / Biaya Lain</Text><Text>{fmt(inv.taxAmount)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 16, color: '#1B365D' }}>TOTAL</Text>
                <Text strong style={{ fontSize: 16, color: '#1B365D' }}>{fmt(inv.totalAmount)}</Text>
              </div>
            </Col>
          </Row>

          {inv.notes && (
            <div style={{ marginTop: 20, padding: '10px 14px', background: '#F7F6F3', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Keterangan:</Text>
              <div style={{ marginTop: 4 }}>{inv.notes}</div>
            </div>
          )}

          {/* Actions */}
          {(canConfirm || inv.status === 'LUNAS') && (
            <div style={{ marginTop: 28, textAlign: 'center' }} className="no-print">
              {canConfirm && (
                <Button
                  size="large"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    form.setFieldsValue({ amount: inv.totalAmount });
                    setConfirmModal(true);
                  }}
                  style={{ background: '#1B365D', borderColor: '#1B365D', minWidth: 220 }}
                >
                  Saya Sudah Melakukan Pembayaran
                </Button>
              )}
              {inv.status === 'MENUNGGU_VERIFIKASI' && !confirmed && (
                <div style={{ padding: '16px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
                  <Text style={{ color: '#ad8b00' }}>
                    Konfirmasi pembayaran Anda sedang diverifikasi oleh notaris. Proses dalam 1×24 jam.
                  </Text>
                </div>
              )}
              {inv.status === 'LUNAS' && (
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                  Cetak Bukti Pembayaran
                </Button>
              )}
            </div>
          )}
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#999', fontSize: 12 }} className="no-print">
          Powered by AKTURA — Sistem Manajemen Notaris
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal
        title="Konfirmasi Pembayaran"
        open={confirmModal}
        onCancel={() => { setConfirmModal(false); form.resetFields(); }}
        onOk={handleConfirm}
        confirmLoading={confirming}
        okText="Kirim Konfirmasi"
        okButtonProps={{ style: { background: '#1B365D' } }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Pastikan Anda telah melakukan transfer sebelum mengkonfirmasi. Notaris akan memverifikasi pembayaran Anda.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="Jumlah yang Dibayar" rules={[{ required: true, message: 'Masukkan jumlah' }]}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={v => Number((v ?? '').replace(/Rp\s?|(\.*)/g, '')) as never}
              min={1}
            />
          </Form.Item>
          <Form.Item name="notes" label="Catatan (opsional)">
            <Input.TextArea rows={2} placeholder="Nama bank, nama rekening asal, dll." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
