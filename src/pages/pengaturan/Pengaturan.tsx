import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tabs, Form, Input, Button, Table, Select, Switch, Space,
  Tag, Popconfirm, message, Badge, Modal, Alert, Tooltip, Divider,
  InputNumber,
} from 'antd';
import {
  UserOutlined, ShopOutlined, ApartmentOutlined, TeamOutlined,
  DeleteOutlined, KeyOutlined, ArrowRightOutlined, PlusOutlined,
  LockOutlined, GlobalOutlined, UploadOutlined, LinkOutlined,
  HolderOutlined, FileTextOutlined, EnvironmentOutlined,
  TrophyOutlined, StarOutlined, NotificationOutlined, CloseOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  settingsService,
  type KantorSettings, type ApprovalFlowSettings, type UserAdminItem,
} from '../../services/settings.service';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import { NAVY, GOLD, MUTED } from '../../theme/tokens';

// ── Data Pribadi Tab ─────────────────────────────────────────

function TabPribadi() {
  const user = useAuthStore(s => s.user);
  const [profileForm] = Form.useForm<{ fullName: string }>();
  const [pwForm]      = Form.useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile]   = useState(false);
  const [savingPw,      setSavingPw]        = useState(false);

  useEffect(() => {
    settingsService.getProfile()
      .then(p => profileForm.setFieldsValue({ fullName: p.fullName }))
      .catch(() => message.error('Gagal memuat profil'))
      .finally(() => setLoadingProfile(false));
  }, [profileForm]);

  const handleSaveProfile = async (values: { fullName: string }) => {
    setSavingProfile(true);
    try {
      await settingsService.updateProfile(values.fullName);
      message.success('Nama berhasil diperbarui');
    } catch {
      message.error('Gagal memperbarui nama');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setSavingPw(true);
    try {
      await settingsService.changePassword(values.currentPassword, values.newPassword);
      message.success('Password berhasil diubah');
      pwForm.resetFields();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal mengubah password';
      message.error(msg);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Informasi Akun */}
      <div style={{
        background: '#f7f7f5', borderRadius: 10, padding: '16px 20px',
        marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#1677ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0,
        }}>
          {user?.fullName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.fullName}</div>
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>{user?.email}</div>
          <Tag color={user?.role === 'Admin' ? 'red' : user?.role === 'Notaris' ? 'purple' : 'blue'} style={{ marginTop: 4 }}>
            {user?.role}
          </Tag>
        </div>
      </div>

      {/* Ubah Nama */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Ubah Nama</div>
        <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
          <Form.Item label="Nama Lengkap" name="fullName" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
            <Input prefix={<UserOutlined />} placeholder="Nama lengkap" />
          </Form.Item>
          <Form.Item label="Email" extra="Email digunakan sebagai identitas login dan tidak dapat diubah.">
            <Input value={user?.email} disabled prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingProfile || loadingProfile}>
              Simpan Nama
            </Button>
          </Form.Item>
        </Form>
      </div>

      <Divider />

      {/* Ubah Password */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Ubah Password</div>
        <Form form={pwForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            label="Password Saat Ini"
            name="currentPassword"
            rules={[{ required: true, message: 'Wajib diisi' }]}
          >
            <Input.Password placeholder="Password lama" />
          </Form.Item>
          <Form.Item
            label="Password Baru"
            name="newPassword"
            rules={[
              { required: true, message: 'Wajib diisi' },
              { min: 6, message: 'Minimal 6 karakter' },
            ]}
          >
            <Input.Password placeholder="Minimal 6 karakter" />
          </Form.Item>
          <Form.Item
            label="Konfirmasi Password Baru"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Wajib diisi' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Password tidak cocok'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Ulangi password baru" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingPw}>
              Ubah Password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

// ── Profil Kantor Tab ────────────────────────────────────────

function TabKantor() {
  const [form] = Form.useForm<KantorSettings>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    settingsService.getKantor()
      .then(d => form.setFieldsValue(d))
      .catch(() => message.error('Gagal memuat pengaturan kantor'))
      .finally(() => setLoading(false));
  }, [form]);

  const handleSave = async (values: KantorSettings) => {
    setSaving(true);
    try {
      await settingsService.saveBulk([
        { key: 'kantor.nama',         value: values.nama         || null },
        { key: 'kantor.namaNotaris',  value: values.namaNotaris  || null },
        { key: 'kantor.alamat',       value: values.alamat       || null },
        { key: 'kantor.telepon',      value: values.telepon      || null },
        { key: 'kantor.nomorSK',      value: values.nomorSK      || null },
        { key: 'kantor.wilayahKerja', value: values.wilayahKerja || null },
      ]);
      message.success('Pengaturan kantor disimpan');
    } catch {
      message.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item label="Nama Kantor" name="nama">
          <Input placeholder="Kantor Notaris ..." />
        </Form.Item>
        <Form.Item label="Nama Notaris" name="namaNotaris">
          <Input placeholder="Dr. ..." />
        </Form.Item>
        <Form.Item label="Nomor SK Pengangkatan" name="nomorSK">
          <Input placeholder="No. SK ..." />
        </Form.Item>
        <Form.Item label="Wilayah Kerja" name="wilayahKerja">
          <Input placeholder="Kota / Kabupaten ..." />
        </Form.Item>
        <Form.Item label="Alamat" name="alamat">
          <Input.TextArea rows={3} placeholder="Jl. ..." />
        </Form.Item>
        <Form.Item label="Telepon / WhatsApp" name="telepon">
          <Input placeholder="+62 ..." />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving || loading}>
            Simpan
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ── Alur Approval Tab ────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'Admin',   label: 'Admin' },
  { value: 'Notaris', label: 'Notaris' },
  { value: 'Staff',   label: 'Staff' },
];

function TabApprovalFlow() {
  const [settings, setSettings] = useState<ApprovalFlowSettings>({
    approverRole: 'Notaris',
    submitterRoles: ['Staff', 'Admin'],
    autoArsip: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    settingsService.getApprovalFlow()
      .then(setSettings)
      .catch(() => message.error('Gagal memuat alur approval'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.saveBulk([
        { key: 'approval.approverRole',   value: settings.approverRole },
        { key: 'approval.submitterRoles', value: JSON.stringify(settings.submitterRoles) },
        { key: 'approval.autoArsip',      value: String(settings.autoArsip) },
      ]);
      message.success('Alur approval disimpan');
    } catch {
      message.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Alert
        type="info"
        showIcon
        message="Konfigurasi ini menentukan siapa yang bisa mengajukan dan siapa yang menyetujui akta."
        style={{ marginBottom: 24 }}
      />

      {/* Visual flow diagram */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 24px', background: '#f7f7f5', borderRadius: 10,
        marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Pengaju
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {settings.submitterRoles.map(r => (
              <Tag key={r} color="blue">{r}</Tag>
            ))}
          </div>
        </div>

        <ArrowRightOutlined style={{ fontSize: 18, color: '#8c8c8c', margin: '0 4px' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Menyetujui
          </div>
          <Tag color="purple" style={{ fontSize: 13, padding: '2px 12px' }}>
            {settings.approverRole}
          </Tag>
        </div>

        <ArrowRightOutlined style={{ fontSize: 18, color: '#8c8c8c', margin: '0 4px' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Selesai
          </div>
          <Tag color="green">Disetujui</Tag>
        </div>
      </div>

      <Form layout="vertical">
        <Form.Item
          label="Role yang dapat mengajukan persetujuan"
          extra="User dengan role ini bisa submit akta untuk approval"
        >
          <Select
            mode="multiple"
            value={settings.submitterRoles}
            onChange={v => setSettings(s => ({ ...s, submitterRoles: v }))}
            options={ROLE_OPTIONS}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="Role yang menyetujui (approver)"
          extra="User dengan role ini yang akan muncul di Inbox dan bisa approve/tolak"
        >
          <Select
            value={settings.approverRole}
            onChange={v => setSettings(s => ({ ...s, approverRole: v }))}
            options={ROLE_OPTIONS}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider />

        <Form.Item label="Otomatis buat arsip saat akta disetujui">
          <Switch
            checked={settings.autoArsip}
            onChange={v => setSettings(s => ({ ...s, autoArsip: v }))}
            checkedChildren="Aktif"
            unCheckedChildren="Nonaktif"
          />
          <span style={{ marginLeft: 12, fontSize: 13, color: '#8c8c8c' }}>
            Jika aktif, entri arsip dibuat otomatis setelah akta mendapat persetujuan
          </span>
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSave} loading={saving || loading}>
            Simpan
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ── Manajemen Akun Tab ───────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  Admin:   'red',
  Notaris: 'purple',
  Staff:   'blue',
};

function TabUsers() {
  const currentEmail = useAuthStore(s => s.user?.email);
  const [data, setData]       = useState<UserAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<UserAdminItem | null>(null);
  const [resetForm] = Form.useForm();
  const [resetting, setResetting]     = useState(false);

  // Buat akun modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm] = Form.useForm<{ fullName: string; email: string; password: string; role: string }>();
  const [creating, setCreating]     = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingsService.getUsers({ search: search || undefined, role: filterRole });
      setData(res);
    } catch {
      message.error('Gagal memuat daftar user');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await settingsService.updateRole(id, role);
      message.success('Role diperbarui');
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal';
      message.error(msg);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await settingsService.setActive(id, isActive);
      message.success(isActive ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
      fetchUsers();
    } catch {
      message.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await settingsService.deleteUser(id);
      message.success('Akun dihapus');
      fetchUsers();
    } catch {
      message.error('Gagal menghapus akun');
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await settingsService.resetPassword(resetTarget.id, values.newPassword);
      message.success(`Password ${resetTarget.fullName} berhasil direset`);
      setResetTarget(null);
      resetForm.resetFields();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal';
      message.error(msg);
    } finally {
      setResetting(false);
    }
  };

  const handleCreateUser = async (values: { fullName: string; email: string; password: string; role: string }) => {
    setCreating(true);
    try {
      await settingsService.createUser(values);
      message.success(`Akun ${values.fullName} berhasil dibuat`);
      setShowCreate(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal membuat akun';
      message.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const columns: ColumnsType<UserAdminItem> = [
    {
      title: 'Nama',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (val, row) => (
        <Space>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <span style={{ fontWeight: 500 }}>{val}</span>
          {row.email === currentEmail && (
            <Tag style={{ fontSize: 10 }}>Anda</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: val => <span style={{ color: '#595959', fontSize: 13 }}>{val}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (val, row) => (
        row.email === currentEmail
          ? <Tag color={ROLE_COLOR[val]}>{val}</Tag>
          : (
            <Select
              value={val}
              size="small"
              style={{ width: 120 }}
              onChange={v => handleRoleChange(row.id, v)}
              options={[
                { value: 'Admin',   label: <Tag color="red">Admin</Tag> },
                { value: 'Notaris', label: <Tag color="purple">Notaris</Tag> },
                { value: 'Staff',   label: <Tag color="blue">Staff</Tag> },
              ]}
            />
          )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (val, row) => (
        row.email === currentEmail
          ? <Badge status="success" text="Aktif" />
          : (
            <Switch
              checked={val}
              size="small"
              checkedChildren="Aktif"
              unCheckedChildren="Nonaktif"
              onChange={v => handleToggleActive(row.id, v)}
            />
          )
      ),
    },
    {
      title: 'Login Terakhir',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 140,
      render: val => val ? dayjs(val).format('D MMM YYYY HH:mm') : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, row) => (
        row.email === currentEmail ? null : (
          <Space>
            <Tooltip title="Reset Password">
              <Button
                size="small"
                icon={<KeyOutlined />}
                onClick={() => { setResetTarget(row); resetForm.resetFields(); }}
              />
            </Tooltip>
            <Popconfirm
              title={`Hapus akun ${row.fullName}?`}
              description="Aksi ini tidak dapat dibatalkan."
              onConfirm={() => handleDelete(row.id)}
              okText="Hapus"
              okButtonProps={{ danger: true }}
              cancelText="Batal"
            >
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        )
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Cari nama atau email..."
            allowClear
            onSearch={v => setSearch(v)}
            style={{ width: 260 }}
          />
          <Select
            placeholder="Semua Role"
            allowClear
            style={{ width: 140 }}
            onChange={v => setFilterRole(v)}
            options={ROLE_OPTIONS}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setShowCreate(true); createForm.resetFields(); }}
        >
          Buat Akun
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 800 }}
        pagination={false}
        rowClassName={row => !row.isActive ? 'ant-table-row-disabled' : ''}
      />

      {/* Reset password modal */}
      <Modal
        title={`Reset Password — ${resetTarget?.fullName}`}
        open={!!resetTarget}
        onCancel={() => { setResetTarget(null); resetForm.resetFields(); }}
        onOk={() => resetForm.submit()}
        okText="Reset"
        confirmLoading={resetting}
        destroyOnClose
      >
        <Alert
          type="warning"
          message="Password baru akan langsung aktif. Sampaikan ke user yang bersangkutan."
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            label="Password Baru"
            name="newPassword"
            rules={[
              { required: true, message: 'Wajib diisi' },
              { min: 6, message: 'Minimal 6 karakter' },
            ]}
          >
            <Input.Password placeholder="Minimal 6 karakter" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Buat Akun modal */}
      <Modal
        title="Buat Akun Baru"
        open={showCreate}
        onCancel={() => { setShowCreate(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        okText="Buat Akun"
        confirmLoading={creating}
        destroyOnClose
      >
        <Alert
          type="info"
          message="Akun baru akan langsung aktif dan dapat digunakan untuk login."
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form form={createForm} layout="vertical" onFinish={handleCreateUser} initialValues={{ role: 'Staff' }}>
          <Form.Item
            label="Nama Lengkap"
            name="fullName"
            rules={[{ required: true, message: 'Wajib diisi' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nama lengkap" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Wajib diisi' },
              { type: 'email', message: 'Format email tidak valid' },
            ]}
          >
            <Input placeholder="email@domain.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Wajib diisi' },
              { min: 6, message: 'Minimal 6 karakter' },
            ]}
          >
            <Input.Password placeholder="Minimal 6 karakter" />
          </Form.Item>
          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Pilih role' }]}
          >
            <Select options={[
              { value: 'Staff',   label: <Tag color="blue">Staff</Tag> },
              { value: 'Notaris', label: <Tag color="purple">Notaris</Tag> },
              { value: 'Admin',   label: <Tag color="red">Admin</Tag> },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Tab Profil Publik Notaris ─────────────────────────────────

// ── Page Builder types ────────────────────────────────────────

type SectionType = 'about' | 'services' | 'contact' | 'trust' | 'testimonials' | 'cta';

interface PageSection {
  id:      string;
  type:    SectionType;
  visible: boolean;
}

interface PageConfig {
  version:  2;
  sections: PageSection[];
}

const DEFAULT_PAGE_CONFIG: PageConfig = {
  version: 2,
  sections: [
    { id: 's-about',    type: 'about',    visible: true },
    { id: 's-services', type: 'services', visible: true },
    { id: 's-contact',  type: 'contact',  visible: true },
  ],
};

const SECTION_CATALOG: Record<SectionType, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  about:        { label: 'Tentang Saya',      desc: 'Bio, pengalaman, dan kredensial',           icon: <UserOutlined />,         color: '#1B365D' },
  services:     { label: 'Layanan',            desc: 'Grid spesialisasi dan bidang keahlian',     icon: <FileTextOutlined />,     color: '#0369a1' },
  contact:      { label: 'Kontak & Lokasi',    desc: 'Telepon, email, alamat, jam operasional',   icon: <EnvironmentOutlined />,  color: '#0f766e' },
  trust:        { label: 'Kredensial & Stats', desc: 'Tahun pengalaman dan pencapaian',           icon: <TrophyOutlined />,       color: '#b45309' },
  testimonials: { label: 'Testimoni Klien',    desc: 'Ulasan kepercayaan dari klien',             icon: <StarOutlined />,         color: '#7c3aed' },
  cta:          { label: 'Ajakan Bertindak',   desc: 'Banner CTA dengan tombol WhatsApp',         icon: <NotificationOutlined />, color: '#be185d' },
};

/** Migrate SectionConfig v1 → PageConfig v2 */
function migrateToPageConfig(raw: unknown): PageConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_PAGE_CONFIG;
  const obj = raw as Record<string, unknown>;
  if (obj.version === 2 && Array.isArray(obj.sections)) return obj as unknown as PageConfig;
  // v1: { showAbout, showLayanan, showKontak, order }
  const V1_MAP: Record<string, SectionType> = { about: 'about', layanan: 'services', kontak: 'contact' };
  const V1_SHOW: Record<string, string>     = { about: 'showAbout', layanan: 'showLayanan', kontak: 'showKontak' };
  const order = Array.isArray(obj.order) ? (obj.order as string[]) : ['about', 'layanan', 'kontak'];
  return {
    version: 2,
    sections: order.map((k, i) => ({
      id:      `s-${i}-${k}`,
      type:    V1_MAP[k] ?? 'about',
      visible: typeof obj[V1_SHOW[k]] === 'boolean' ? (obj[V1_SHOW[k]] as boolean) : true,
    })),
  };
}

interface NotarisProfileForm {
  tagline:           string;
  bioPanjang:        string;
  tahunMulaiPraktik: number | undefined;
  wilayah:           string;
  spesialisasi:      string[];
  nomorSK:           string;
  deskripsi:         string;
  telepon:           string;
  emailPublik:       string;
  alamatKantor:      string;
  jamOperasional:    string;
  isPublic:          boolean;
}

function TabProfilPublik() {
  const user = useAuthStore(s => s.user);
  const [form]        = Form.useForm<NotarisProfileForm>();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [slug, setSlug]         = useState<string | null>(null);
  const [foto, setFoto]         = useState<string | null>(null);
  const [cover, setCover]       = useState<string | null>(null);
  const [spesialisasiInput, setSpesialisasiInput] = useState('');
  const [spesialisasiList, setSpesialisasiList]   = useState<string[]>([]);
  const fotoRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG);

  useEffect(() => {
    api.get('/notaris-profile/me')
      .then(r => {
        const d = r.data;
        setSlug(d.slug);
        setFoto(d.foto ?? null);
        setCover(d.cover ?? null);
        setSpesialisasiList(d.spesialisasi ?? []);
        if (d.sectionConfig) {
          try { setPageConfig(migrateToPageConfig(JSON.parse(d.sectionConfig))); }
          catch { /* use default */ }
        }
        form.setFieldsValue({
          tagline:           d.tagline ?? '',
          bioPanjang:        d.bioPanjang ?? '',
          tahunMulaiPraktik: d.tahunMulaiPraktik ?? undefined,
          wilayah:           d.wilayah ?? '',
          nomorSK:           d.nomorSK ?? '',
          deskripsi:         d.deskripsi ?? '',
          telepon:           d.telepon ?? '',
          emailPublik:       d.emailPublik ?? '',
          alamatKantor:      d.alamatKantor ?? '',
          jamOperasional:    d.jamOperasional ?? '',
          isPublic:          d.isPublic ?? true,
        });
      })
      .catch(() => message.error('Gagal memuat profil publik'))
      .finally(() => setLoading(false));
  }, [form]);

  const readImageFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { message.error('Ukuran foto maksimal 2MB'); return; }
    setFoto(await readImageFile(file));
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { message.error('Ukuran cover maksimal 4MB'); return; }
    setCover(await readImageFile(file));
  };

  const addSpesialisasi = () => {
    const val = spesialisasiInput.trim();
    if (val && !spesialisasiList.includes(val)) {
      setSpesialisasiList(prev => [...prev, val]);
    }
    setSpesialisasiInput('');
  };

  const removeSpesialisasi = (s: string) => {
    setSpesialisasiList(prev => prev.filter(x => x !== s));
  };

  const handleSave = async (values: NotarisProfileForm) => {
    setSaving(true);
    try {
      const res = await api.put('/notaris-profile/me', {
        ...values,
        spesialisasi:  spesialisasiList,
        foto:          foto ?? undefined,
        cover:         cover ?? undefined,
        sectionConfig: JSON.stringify(pageConfig),
      });
      setSlug(res.data.slug);
      message.success('Profil publik berhasil disimpan');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const profileUrl = slug ? `${window.location.origin}/notary/${slug}` : null;
  const initial = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Preview link */}
      {profileUrl && (
        <div style={{
          background: `${NAVY}0d`, border: `1px solid ${NAVY}20`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <LinkOutlined style={{ color: NAVY, fontSize: 15 }} />
          <span style={{ fontSize: 13, color: '#595959', flex: 1, wordBreak: 'break-all' }}>
            Halaman publik Anda: <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 600 }}>{profileUrl}</a>
          </span>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={handleSave} disabled={loading}>

        {/* Foto & Cover */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Foto & Cover</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Foto Profil */}
            <div style={{ textAlign: 'center' }}>
              <div
                onClick={() => fotoRef.current?.click()}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  border: `3px solid ${GOLD}`, cursor: 'pointer',
                  overflow: 'hidden', background: `${NAVY}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, color: NAVY, fontWeight: 700,
                }}
              >
                {foto
                  ? <img src={foto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial}
              </div>
              <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFotoChange} />
              <Button size="small" icon={<UploadOutlined />} style={{ marginTop: 8 }} onClick={() => fotoRef.current?.click()}>
                Foto Profil
              </Button>
            </div>

            {/* Cover */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                onClick={() => coverRef.current?.click()}
                style={{
                  width: '100%', height: 80, borderRadius: 10,
                  border: `2px dashed ${NAVY}30`, cursor: 'pointer',
                  overflow: 'hidden', background: cover ? 'transparent' : `${NAVY}05`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: MUTED, fontSize: 13,
                }}
              >
                {cover
                  ? <img src={cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '+ Upload cover (opsional)'}
              </div>
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleCoverChange} />
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Maks. 4MB — tampil sebagai background hero</div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Identitas */}
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Identitas Profesional</div>

        <Form.Item label="Tagline" name="tagline" extra="Kalimat singkat yang menggambarkan positioning Anda, misal: 'Mitra Hukum Terpercaya untuk Keluarga Indonesia'">
          <Input placeholder="Tagline profesional..." maxLength={200} />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="Nomor SK" name="nomorSK">
            <Input placeholder="No. SK Pengangkatan..." />
          </Form.Item>
          <Form.Item label="Wilayah Kerja" name="wilayah">
            <Input placeholder="Kota / Kabupaten..." />
          </Form.Item>
        </div>

        <Form.Item label="Tahun Mulai Praktik" name="tahunMulaiPraktik">
          <InputNumber min={1970} max={new Date().getFullYear()} style={{ width: '100%' }} placeholder="misal: 2005" />
        </Form.Item>

        <Divider />

        {/* Bio */}
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Bio & Deskripsi</div>

        <Form.Item label="Deskripsi Singkat" name="deskripsi" extra="Ditampilkan di daftar notaris (maks. 300 karakter)">
          <Input.TextArea rows={2} maxLength={300} showCount placeholder="Deskripsi singkat yang menarik..." />
        </Form.Item>

        <Form.Item label="Bio Lengkap" name="bioPanjang" extra="Ditampilkan di halaman profil Anda (lebih panjang)">
          <Input.TextArea rows={5} maxLength={2000} showCount placeholder="Ceritakan tentang pengalaman, keahlian, dan dedikasi Anda..." />
        </Form.Item>

        <Divider />

        {/* Spesialisasi */}
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Layanan / Spesialisasi</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input
            placeholder="Tambah layanan (misal: Jual Beli Tanah)"
            value={spesialisasiInput}
            onChange={e => setSpesialisasiInput(e.target.value)}
            onPressEnter={addSpesialisasi}
            style={{ flex: 1 }}
          />
          <Button onClick={addSpesialisasi} icon={<PlusOutlined />}>Tambah</Button>
        </div>
        {spesialisasiList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {spesialisasiList.map(s => (
              <Tag
                key={s}
                closable
                onClose={() => removeSpesialisasi(s)}
                style={{ background: `${NAVY}0f`, border: `1px solid ${NAVY}20`, color: NAVY, padding: '2px 10px' }}
              >
                {s}
              </Tag>
            ))}
          </div>
        )}

        <Divider />

        {/* Kontak */}
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Informasi Kontak</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="Telepon / WhatsApp" name="telepon">
            <Input placeholder="+62 812 3456 7890" />
          </Form.Item>
          <Form.Item label="Email Publik" name="emailPublik">
            <Input placeholder="kontak@email.com" />
          </Form.Item>
        </div>

        <Form.Item label="Alamat Kantor" name="alamatKantor">
          <Input.TextArea rows={2} placeholder="Jl. ..." />
        </Form.Item>

        <Form.Item label="Jam Operasional" name="jamOperasional">
          <Input placeholder="Senin–Jumat, 08:00–17:00 WIB" />
        </Form.Item>

        <Divider />

        {/* Visibilitas */}
        <Form.Item label="Tampilkan di direktori notaris" name="isPublic" valuePropName="checked">
          <Switch checkedChildren="Publik" unCheckedChildren="Tersembunyi" />
        </Form.Item>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 24, marginTop: -12 }}>
          Jika diaktifkan, profil Anda akan muncul di halaman utama dan dapat diakses melalui link profil.
        </div>

        <Divider />

        {/* Page Builder */}
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Builder Halaman Profil</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
          Seret untuk reorder, aktifkan/nonaktifkan, atau tambah section baru ke halaman profil Anda.
        </div>
        <div style={{ marginBottom: 24 }}>
          <PageBuilderPanel config={pageConfig} onChange={setPageConfig} />
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} style={{ background: NAVY }}>
            Simpan Profil Publik
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ── SortableBuilderSection ────────────────────────────────────
// Full-row draggable — interactive children wrapped with stopPropagation

function SortableBuilderSection({ section, onToggle, onRemove }: {
  section: PageSection; onToggle: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const meta = SECTION_CATALOG[section.type];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
          transition: `${transition || ''}, box-shadow 0.15s, border-color 0.15s, background 0.15s`,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: isDragging ? `${meta.color}0d` : section.visible ? '#fff' : '#fafafa',
        border: `1px solid ${isDragging ? meta.color + '60' : section.visible ? '#e5e7eb' : '#f0f0f0'}`,
        borderLeft: `4px solid ${section.visible ? meta.color : '#d1d5db'}`,
        borderRadius: 10,
        boxShadow: isDragging
          ? `0 8px 24px rgba(0,0,0,0.12), 0 0 0 2px ${meta.color}30`
          : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? 'relative' : undefined,
        
      }}
    >
      {/* Drag handle hint */}
      <span style={{
        color: isDragging ? meta.color : '#c4c4c4',
        fontSize: 14, flexShrink: 0, lineHeight: 1,
        transition: 'color 0.15s',
      }}>
        <HolderOutlined />
      </span>

      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: section.visible ? meta.color + '15' : '#f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, color: section.visible ? meta.color : '#9ca3af',
        transition: 'all 0.15s',
      }}>
        {meta.icon}
      </div>

      {/* Label + desc */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: section.visible ? '#111' : '#9ca3af' }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.desc}
        </div>
      </div>

      {/* Visible toggle — stop propagation so click works, not drag */}
      <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <Switch
          size="small"
          checked={section.visible}
          onChange={onToggle}
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Delete */}
      <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <Popconfirm
          title="Hapus section ini?"
          onConfirm={onRemove}
          okText="Hapus"
          cancelText="Batal"
          okButtonProps={{ danger: true }}
          placement="left"
        >
          <button
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#d1d5db', fontSize: 13, padding: '3px 5px',
              borderRadius: 5, display: 'flex', alignItems: 'center',
              transition: 'color 0.15s, background 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>
    </div>
  );
}

// ── Page Preview (mini mockup) ────────────────────────────────

function PagePreview({ config }: { config: PageConfig }) {
  const visible = config.sections.filter(s => s.visible);
  return (
    <div style={{
      border: '1.5px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#f9fafb',
      fontSize: 0, // collapse whitespace
    }}>
      {/* Browser chrome */}
      <div style={{
        background: '#e2e8f0',
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
        <div style={{
          flex: 1, marginLeft: 6, background: '#fff',
          borderRadius: 4, height: 13,
          display: 'flex', alignItems: 'center',
          padding: '0 6px',
          fontSize: 7, color: '#9ca3af', fontFamily: 'sans-serif',
        }}>
          notary/{'{slug}'}
        </div>
      </div>

      {/* Hero — always shown */}
      <div style={{
        background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7f 100%)',
        padding: '10px 8px 8px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '1.5px solid #C6A75E',
          background: 'rgba(27,54,93,0.6)',
          margin: '0 auto 5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#C6A75E', fontWeight: 700, fontFamily: 'serif',
        }}>
          N
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 2, width: '55%', margin: '0 auto 3px' }} />
        <div style={{ height: 3, background: 'rgba(198,167,94,0.7)', borderRadius: 2, width: '40%', margin: '0 auto' }} />
      </div>

      {/* Sections in order */}
      {visible.length === 0 ? (
        <div style={{
          padding: '14px 8px', textAlign: 'center',
          fontSize: 9, color: '#9ca3af', fontFamily: 'sans-serif',
        }}>
          Tidak ada section aktif
        </div>
      ) : visible.map(s => {
        const meta = SECTION_CATALOG[s.type];
        return (
          <div key={s.id} style={{
            padding: '7px 8px',
            borderBottom: '1px solid #f0f0ee',
            background: '#fff',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: meta.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: meta.color, flexShrink: 0,
            }}>
              {meta.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 3, background: meta.color + '30', borderRadius: 1, width: '70%', marginBottom: 2 }} />
              <div style={{ height: 2.5, background: '#e5e7eb', borderRadius: 1, width: '50%' }} />
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ background: '#0d1f3c', padding: '5px 8px', textAlign: 'center' }}>
        <div style={{ height: 2.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: '50%', margin: '0 auto' }} />
      </div>
    </div>
  );
}

// ── PageBuilderPanel ──────────────────────────────────────────

function PageBuilderPanel({ config, onChange }: { config: PageConfig; onChange: (c: PageConfig) => void }) {
  const [showLibrary, setShowLibrary] = useState(false);

  // Touch + pointer sensor with distance constraint so clicks still register
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = config.sections.findIndex(s => s.id === active.id);
    const newIdx = config.sections.findIndex(s => s.id === over.id);
    onChange({ ...config, sections: arrayMove(config.sections, oldIdx, newIdx) });
  };

  const toggleVisible = (id: string) =>
    onChange({ ...config, sections: config.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s) });

  const removeSection = (id: string) =>
    onChange({ ...config, sections: config.sections.filter(s => s.id !== id) });

  const addSection = (type: SectionType) => {
    onChange({ ...config, sections: [...config.sections, { id: `s-${Date.now()}-${type}`, type, visible: true }] });
    setShowLibrary(false);
  };

  const usedTypes = new Set(config.sections.map(s => s.type));
  const available = (Object.keys(SECTION_CATALOG) as SectionType[]).filter(t => !usedTypes.has(t));

  return (
    <div className="aktura-pagebuilder-layout" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Left: builder list ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
          Urutan &amp; Visibilitas — drag baris untuk mengubah urutan
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={config.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {config.sections.map(s => (
                <SortableBuilderSection
                  key={s.id}
                  section={s}
                  onToggle={() => toggleVisible(s.id)}
                  onRemove={() => removeSection(s.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Section */}
        {available.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {!showLibrary ? (
              <button
                onClick={() => setShowLibrary(true)}
                style={{
                  width: '100%', padding: '9px', borderRadius: 9,
                  border: `1.5px dashed ${NAVY}40`, background: 'transparent',
                  color: MUTED, cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; e.currentTarget.style.background = `${NAVY}05`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${NAVY}40`; e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent'; }}
              >
                <PlusOutlined /> Tambah Section
              </button>
            ) : (
              <div style={{
                border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '14px', background: '#fafafa', marginTop: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Library Section</span>
                  <button
                    onClick={() => setShowLibrary(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', padding: 4 }}
                  >
                    <CloseOutlined style={{ fontSize: 11 }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {available.map(type => {
                    const meta = SECTION_CATALOG[type];
                    return (
                      <button
                        key={type}
                        onClick={() => addSection(type)}
                        style={{
                          padding: '11px 12px', borderRadius: 9,
                          border: `1px solid ${meta.color}30`,
                          background: `${meta.color}08`,
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `${meta.color}16`;
                          e.currentTarget.style.borderColor = `${meta.color}55`;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = `0 4px 10px ${meta.color}20`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = `${meta.color}08`;
                          e.currentTarget.style.borderColor = `${meta.color}30`;
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 12.5, color: '#111' }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>{meta.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: live preview ── */}
      <div className="aktura-pagebuilder-preview" style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
          Preview
        </div>
        <PagePreview config={config} />
        <div style={{ marginTop: 8, fontSize: 10.5, color: MUTED, textAlign: 'center', lineHeight: 1.5 }}>
          Tampilan otomatis diperbarui saat Anda mengatur section
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function Pengaturan() {
  const user = useAuthStore(s => s.user);
  const isAdmin   = user?.role === 'Admin';
  const isNotaris = user?.role === 'Notaris';

  const tabItems = [
    {
      key: 'pribadi',
      label: <span><UserOutlined /> Data Pribadi</span>,
      children: <TabPribadi />,
    },
    ...(isNotaris ? [
      {
        key: 'profil-publik',
        label: <span><GlobalOutlined /> Profil Publik</span>,
        children: <TabProfilPublik />,
      },
    ] : []),
    ...(isAdmin ? [
      {
        key: 'kantor',
        label: <span><ShopOutlined /> Profil Kantor</span>,
        children: <TabKantor />,
      },
      {
        key: 'approval',
        label: <span><ApartmentOutlined /> Alur Approval</span>,
        children: <TabApprovalFlow />,
      },
      {
        key: 'users',
        label: <span><TeamOutlined /> Manajemen Akun</span>,
        children: <TabUsers />,
      },
    ] : []),
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 20px' }}>Pengaturan</h2>
      <Tabs items={tabItems} defaultActiveKey="pribadi" />
    </div>
  );
}
