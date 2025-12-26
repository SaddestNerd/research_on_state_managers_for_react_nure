import React from 'react'
import { Layout, Typography, Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutThunk } from '../app/services/slices/auth/thunks'
import { useRenderTracker } from '../app/performance/useRenderTracker'

const { Header: AntHeader } = Layout
const { Title } = Typography

const Header = ({ isAuth = false }) => {
  useRenderTracker('Header')
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { userData, loading } = useSelector((state) => state.auth)

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 20px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Title level={3} style={{ margin: 0 }}>
        {isAuth ? 'Панель керування' : 'Система'}
      </Title>
      {isAuth && (
        <Button 
          type="primary" 
          danger 
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          loading={loading}
        >
          Вийти
        </Button>
      )}
    </AntHeader>
  )
}

const HeaderUnlog = () => {
  useRenderTracker('HeaderUnlog')
  
  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 20px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Title level={3} style={{ margin: 0 }}>
        Система автентифікації
      </Title>
    </AntHeader>
  )
}



export { Header, HeaderUnlog }
