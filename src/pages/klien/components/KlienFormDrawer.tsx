import { useEffect } from 'react';
import {
  Drawer, Form, Input, Select, DatePicker,
  Button, Space, message, Row, Col,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { Klien, KlienPayload } from '../../../types';
import { klienService } from '../../../services/klien.service';

type KlienFormValues = Omit<KlienPayload, 'tanggalLahir'> & {
  tanggalLahir: Dayjs | null;
};

interface Props {
  open: boolean;
  initialData: Klien | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'BelumKawin', label: 'Belum Kawin' },
  { value: 'Kawin',      label: 'Kawin' },
  { value: 'Cerai',      label: 'Cerai' },
];

export default function KlienFormDrawer({ open, initialData, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const isEdit = !!initialData;

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        tanggalLahir: initialData.tanggalLahir ? dayjs(initialData.tanggalLahir) : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ kewarganegaraan: 'WNI', statusPerkawinan: 'BelumKawin' });
    }
  }, [open, initialData, form]);

  const handleFinish = async (values: KlienFormValues) => {
    const payload: KlienPayload = {
      ...values,
      tanggalLahir: values.tanggalLahir ? values.tanggalLahir.format('YYYY-MM-DD') : '',
    };
    try {
      if (isEdit) {
        await klienService.update(initialData!.id, payload);
        message.success('Data klien berhasil diperbarui');
      } else {
        await klienService.create(payload);
        message.success('Klien berhasil ditambahkan');
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Terjadi kesalahan, coba lagi';
      message.error(msg);
    }
  };

  return (
    <Drawer
      title={isEdit ? 'Edit Klien' : 'Tambah Klien'}
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" onClick={() => form.submit()}>Simpan</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Nama Lengkap" name="nama" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
              <Input placeholder="Nama sesuai KTP" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="NIK"
              name="nik"
              rules={[
                { required: true, message: 'NIK wajib diisi' },
                { len: 16, message: 'NIK harus 16 digit' },
                { pattern: /^\d+$/, message: 'NIK hanya boleh angka' },
              ]}
            >
              <Input placeholder="16 digit NIK KTP" maxLength={16} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Jenis Kelamin" name="jenisKelamin" rules={[{ required: true, message: 'Pilih jenis kelamin' }]}>
              <Select placeholder="Pilih">
                <Select.Option value="L">Laki-laki</Select.Option>
                <Select.Option value="P">Perempuan</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Tempat Lahir" name="tempatLahir" rules={[{ required: true, message: 'Tempat lahir wajib diisi' }]}>
              <Input placeholder="Kota tempat lahir" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Tanggal Lahir" name="tanggalLahir" rules={[{ required: true, message: 'Tanggal lahir wajib diisi' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tanggal" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="Alamat" name="alamat" rules={[{ required: true, message: 'Alamat wajib diisi' }]}>
              <Input.TextArea rows={2} placeholder="Alamat lengkap sesuai KTP" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Kelurahan/Desa" name="kelurahan">
              <Input placeholder="Kelurahan/Desa" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Kecamatan" name="kecamatan">
              <Input placeholder="Kecamatan" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Kota/Kabupaten" name="kota">
              <Input placeholder="Kota/Kabupaten" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Provinsi" name="provinsi">
              <Input placeholder="Provinsi" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="No. Telepon" name="noTelp">
              <Input placeholder="08xx-xxxx-xxxx" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: 'email', message: 'Format email tidak valid' }]}
            >
              <Input placeholder="email@domain.com" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Pekerjaan" name="pekerjaan">
              <Input placeholder="Pekerjaan" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Status Perkawinan" name="statusPerkawinan" rules={[{ required: true }]}>
              <Select options={STATUS_OPTIONS} placeholder="Pilih" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Kewarganegaraan" name="kewarganegaraan" rules={[{ required: true }]}>
              <Input placeholder="WNI / WNA" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="Catatan" name="catatan">
              <Input.TextArea rows={3} placeholder="Catatan tambahan (opsional)" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
