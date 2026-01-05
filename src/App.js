import React from 'react'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider, ProductsProvider, CartProvider } from './app/context'
import './App.css'

import './app/performance/reportScheduler'
import './app/performance/testPerformance'
import './app/performance/demo'
import './app/performance/xstateBenchmarks'

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
	return (
		<ConfigProvider locale={ruRU}>
			<AuthProvider>
				<ProductsProvider>
					<CartProvider>
						<Router>
							<AppContent />
						</Router>
					</CartProvider>
				</ProductsProvider>
			</AuthProvider>
		</ConfigProvider>
	)
}

export default App
