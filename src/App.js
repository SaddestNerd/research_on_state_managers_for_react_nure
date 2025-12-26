import React, { useEffect } from 'react'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ukUA from 'antd/locale/uk_UA'
import { useAuthStore } from './app/store'
import './App.css'

import './app/performance/reportScheduler'
import './app/performance/testPerformance'
import './app/performance/demo'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { Header, HeaderUnlog } from './widgets'
import PrivateRoute from './app/routes/privateRoute'
import PublicRoute from './app/routes/pablicRoute'

function AppContent() {
	const AccountHeaderFooter = ({ element }) => {
		return (
			<main className='flex-box'>
				<Header isAuth={true} />
				{element}
			</main>
		)
	}

	return (
		<div className='App'>
			<Routes>
				<Route path='/' element={<Navigate to='/login' replace />} />

				<Route
					path='/login'
					element={
						<PublicRoute
							element={
								<main>
									<HeaderUnlog />
									<LoginPage />
								</main>
							}
						/>
					}
				/>

				<Route
					path='/dashboard'
					element={
						<PrivateRoute
							element={<AccountHeaderFooter element={<DashboardPage />} />}
						/>
					}
				/>
			</Routes>
		</div>
	)
}

function App() {
	const initAuth = useAuthStore(state => state.init)

	useEffect(() => {
		initAuth()
	}, [])

	return (
		<ConfigProvider locale={ukUA}>
			<Router>
				<AppContent />
			</Router>
		</ConfigProvider>
	)
}

export default App
