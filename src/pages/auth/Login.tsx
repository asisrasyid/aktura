import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Divider, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import type { LoginPayload, User } from '../../types';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const { login }                         = useAuthStore();
  const navigate                          = useNavigate();
  const [form]                            = Form.useForm();

  const handleSubmit = async (values: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(values);
      const user: User = {
        fullName: data.fullName,
        email:    data.email,
        role:     data.role as User['role'],
      };
      login(data.token, user, data.expiresAt);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Email atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const googleContainerRef = useGoogleAuth(async (idToken) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const data = await authService.googleLogin(idToken);
      const user: User = {
        fullName: data.fullName,
        email:    data.email,
        role:     data.role as User['role'],
      };
      login(data.token, user, data.expiresAt);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Gagal masuk dengan Google. Silakan coba lagi.');
    } finally {
      setGoogleLoading(false);
    }
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1B365D',
      backgroundImage: 'radial-gradient(ellipse at 70% 20%, rgba(198,167,94,0.08) 0%, transparent 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand mark above card */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28, fontWeight: 700, color: '#C6A75E', letterSpacing: '0.06em',
          }}>
            AKTURA
          </span>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4, letterSpacing: '0.04em' }}>
            Platform Notaris & PPAT Digital
          </div>
        </div>

        <Card
          style={{
            borderRadius: 8,
            border: '1px solid #E2DDD6',
            boxShadow: '0 8px 40px rgba(27,54,93,0.18)',
          }}
          styles={{ body: { padding: '36px 36px 28px' } }}
        >
          <Title level={4} style={{
            margin: '0 0 24px', color: '#1B365D', textAlign: 'center',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600, fontSize: 20,
          }}>
            Masuk ke Akun Anda
          </Title>

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 6 }} />
          )}

          <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email wajib diisi' },
                { type: 'email', message: 'Format email tidak valid' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#C6A75E' }} />} placeholder="email@domain.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password wajib diisi' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#C6A75E' }} />} placeholder="Password" size="large" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary" htmlType="submit" loading={loading} block size="large"
                style={{ height: 44, borderRadius: 6, fontWeight: 600, letterSpacing: '0.02em' }}
              >
                Masuk
              </Button>
            </Form.Item>
          </Form>

          <Divider plain style={{ color: '#aaa', fontSize: 12, margin: '20px 0' }}>
            atau masuk dengan
          </Divider>

          {googleLoading ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Spin tip="Memverifikasi akun Google..." />
            </div>
          ) : (
            <div ref={googleContainerRef} style={{ display: 'flex', justifyContent: 'center' }} />
          )}

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 13, color: '#595959' }}>
              Belum punya akun?{' '}
              <Link to="/daftar" style={{ color: '#1B365D', fontWeight: 600 }}>Daftar</Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
