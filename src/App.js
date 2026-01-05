import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ukUA from 'antd/locale/uk_UA'
import { store } from './app/store/store'
import { TokenService } from './app/services/localstorage/token.service'
import './App.css'

import './app/performance/reportScheduler'
import './app/performance/testPerformance'
import './app/performance/demo'
import './app/performance/cartPerformanceTests'
import './app/performance/reduxPerformanceTests'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { Header, HeaderUnlog, Sidebar } from './widgets'
import PrivateRoute from './app/routes/privateRoute'
import PublicRoute from './app/routes/pablicRoute'

function AppContent() {
	const dispatch = useDispatch()
	const { isAuthenticated } = useSelector(state => state.auth)

	useEffect(() => {
		const token = TokenService.getLocalAccessToken()
		if (token && !isAuthenticated) {
			dispatch({
				type: 'auth/loginThunk/fulfilled',
				payload: { user: { email: 'john@mail.com', id: '1' } },
			})
		}
	}, [])

	useEffect(() => {
		const token = TokenService.getLocalAccessToken()
		if (!token && isAuthenticated) {
			dispatch({
				type: 'auth/logoutThunk/fulfilled',
				payload: true,
			})
		}
	}, [isAuthenticated, dispatch])

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
				<Route
					path='/'
					element={
						isAuthenticated ? (
							<Navigate to='/dashboard' replace />
						) : (
							<Navigate to='/login' replace />
						)
					}
				/>

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
		<Provider store={store}>
			<ConfigProvider locale={ukUA}>
				<Router>
					<AppContent />
				</Router>
			</ConfigProvider>
		</Provider>
	)
}

export default App
