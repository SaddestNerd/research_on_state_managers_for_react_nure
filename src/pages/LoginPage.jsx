import React, { useEffect } from 'react'
import { observer, inject } from 'mobx-react'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useRenderTracker } from '../app/performance/useRenderTracker'

const { Title, Text } = Typography

const LoginPage = observer(({ authStore }) => {
  useRenderTracker('LoginPage')
  
  const navigate = useNavigate()
  const { loading, error, success, userData, login } = authStore

  const onFinish = async (values) => {
    try {
      await login({
        email: values.email,
        password: values.password
      })
    } catch (err) {
      message.error(err.message || 'Помилка входу')
    }
  }

  useEffect(() => {
    if (success && userData) {
      message.success('Успішний вхід!')
      navigate('/dashboard')
    }
  }, [success, userData, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
          border: 'none'
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <LoginOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              Вхід до системи
            </Title>
            <Text type="secondary">
              Введіть свої облікові дані для входу
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Будь ласка, введіть email!' },
                { type: 'email', message: 'Введіть коректний email!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="john@mail.com"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: 'Будь ласка, введіть пароль!' },
                { min: 6, message: 'Пароль має містити щонайменше 6 символів!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Введіть пароль"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                }}
              >
                {loading ? 'Вхід...' : 'Увійти'}
              </Button>
            </Form.Item>
          </Form>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text type="danger">{error}</Text>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Тестові дані: john@mail.com / changeme
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
})

export default inject('authStore')(LoginPage)
