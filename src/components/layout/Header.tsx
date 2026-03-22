import { useState, useEffect } from 'react';
import { Layout, Button, Dropdown, Avatar, Typography, Space, Badge, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { approvalService } from '../../services/approval.service';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  siderWidth: number;
}

export default function Header({ collapsed, onToggle, siderWidth }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetch = () => {
      approvalService.getPendingCount()
        .then(r => setPendingCount(r.pendingCount))
        .catch(() => { /* silent */ });
    };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Keluar',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader style={{
      padding: '0 24px',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed',
      top: 0,
      left: siderWidth,
      right: 0,
      zIndex: 99,
      boxShadow: 'none',
      borderBottom: '1px solid #E2DDD6',
      transition: 'left 0.2s',
    }}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        style={{ fontSize: 16, color: '#1B365D' }}
      />

      <Space size={8}>
        {/* Notification bell */}
        <Tooltip title={pendingCount > 0 ? `${pendingCount} persetujuan menunggu` : 'Inbox'}>
          <Badge count={pendingCount} size="small" offset={[-2, 4]}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 17 }} />}
              onClick={() => navigate('/inbox')}
              style={{ color: pendingCount > 0 ? '#C6A75E' : '#595959' }}
            />
          </Badge>
        </Tooltip>

        {/* User avatar */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              size={34}
              icon={<UserOutlined />}
              style={{ background: '#1B365D', color: '#C6A75E' }}
            />
            <div style={{ lineHeight: 1.2 }}>
              <Text strong style={{ display: 'block', fontSize: 13, color: '#2F2F2F' }}>
                {user?.fullName}
              </Text>
              <Text style={{ fontSize: 11, color: '#C6A75E', fontWeight: 500 }}>
                {user?.role}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
