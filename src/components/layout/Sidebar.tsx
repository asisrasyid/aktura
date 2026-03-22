import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Badge, Avatar, Tooltip } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  LayoutOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  BookOutlined,
  ReadOutlined,
  InboxOutlined,
  EditOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { approvalService } from '../../services/approval.service';
import { useAuthStore } from '../../store/auth.store';

const { Sider } = Layout;

interface Props {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    approvalService.getPendingCount()
      .then(r => setPendingCount(r.pendingCount))
      .catch(() => { /* silent */ });
  }, [pathname]);

  const inboxLabel = pendingCount > 0
    ? (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Inbox</span>
        <Badge
          count={pendingCount}
          size="small"
          style={{ background: '#C6A75E', marginLeft: 6, boxShadow: 'none' }}
        />
      </span>
    )
    : 'Inbox';

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      type: 'group' as const,
      label: collapsed ? null : (
        <span style={{ color: 'rgba(198,167,94,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Dokumen
        </span>
      ),
      children: [
        { key: '/akta',           icon: <FileTextOutlined />,  label: 'Produk' },
        { key: '/konsep-dokumen', icon: <EditOutlined />,      label: 'Konsep Dokumen' },
        { key: '/register-akta',  icon: <BookOutlined />,      label: 'Register Akta' },
        { key: '/buku-register',  icon: <ReadOutlined />,      label: 'Buku Register' },
        { key: '/template-akta',  icon: <LayoutOutlined />,    label: 'Template Akta' },
      ],
    },
    {
      type: 'group' as const,
      label: collapsed ? null : (
        <span style={{ color: 'rgba(198,167,94,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Klien &amp; Keuangan
        </span>
      ),
      children: [
        { key: '/klien',     icon: <TeamOutlined />,       label: 'Klien' },
        { key: '/akuntansi', icon: <DollarOutlined />,     label: 'Akuntansi' },
        { key: '/inbox',     icon: <InboxOutlined />,      label: inboxLabel },
        { key: '/arsip',     icon: <FolderOpenOutlined />, label: 'Arsip' },
      ],
    },
    {
      type: 'group' as const,
      label: collapsed ? null : (
        <span style={{ color: 'rgba(198,167,94,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Lainnya
        </span>
      ),
      children: [
        { key: '/pengaturan', icon: <SettingOutlined />, label: 'Pengaturan' },
      ],
    },
  ];

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : 'U';

  const roleLabel: Record<string, string> = {
    Admin: 'Administrator',
    Notaris: 'Notaris / PPAT',
    Staff: 'Staff',
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={220}
      style={{
        background: '#1B365D',
        minHeight: '100vh',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
        borderRight: '1px solid rgba(198,167,94,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand mark */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 20px',
        borderBottom: '1px solid rgba(198,167,94,0.18)',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22, color: '#C6A75E', fontWeight: 700, letterSpacing: '0.02em',
          }}>
            A
          </span>
        ) : (
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#C6A75E', fontWeight: 700, fontSize: 20, letterSpacing: '0.04em',
          }}>
            AKTURA
          </span>
        )}
      </div>

      {/* Scrollable menu area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{ background: 'transparent', borderRight: 'none', marginTop: 8 }}
        />
      </div>

      {/* Bottom user profile strip */}
      <div style={{
        borderTop: '1px solid rgba(198,167,94,0.18)',
        padding: collapsed ? '12px 0' : '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Avatar
          size={32}
          style={{
            background: 'rgba(198,167,94,0.2)',
            color: '#C6A75E',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            border: '1px solid rgba(198,167,94,0.35)',
          }}
          icon={!user ? <UserOutlined /> : undefined}
        >
          {user ? initials : undefined}
        </Avatar>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#E8E0D5',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.fullName ?? '—'}
            </div>
            <div style={{
              color: 'rgba(198,167,94,0.7)',
              fontSize: 11,
              whiteSpace: 'nowrap',
            }}>
              {user ? (roleLabel[user.role] ?? user.role) : ''}
            </div>
          </div>
        )}

        <Tooltip title={collapsed ? 'Keluar' : ''} placement="right">
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(198,167,94,0.6)',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C6A75E')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(198,167,94,0.6)')}
            title=""
          >
            <LogoutOutlined style={{ fontSize: 15 }} />
          </button>
        </Tooltip>
      </div>
    </Sider>
  );
}
