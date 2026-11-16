/*
 * Catalog page components. This file is IDENTICAL in every version of the
 * test application (copied from bench/shared/catalog). Only ./bindings.js
 * differs: it connects these components to the state manager of the version,
 * using the subscription pattern recommended for that library.
 *
 * The page is split into components with their own subscriptions, so that a
 * change of the cart re-renders only the components that depend on it:
 *   DashboardPage      - page shell, user data, catalog loading
 *   CartButton         - cart badge (total number of items)
 *   ProductGrid        - list of products and pagination
 *   ProductCard        - one product and its quantity in the cart
 *   CartDrawer*        - contents of the cart drawer (mounted only when open)
 * Every component reports its renders through useRenderTracker.
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	Typography,
	Space,
	Avatar,
	Row,
	Col,
	Spin,
	Pagination,
	Image,
	Tag,
	Empty,
	Button,
	Drawer,
	InputNumber,
	message,
	Badge,
} from 'antd'
import {
	UserOutlined,
	ShoppingOutlined,
	ShoppingCartOutlined,
	PlusOutlined,
	MinusOutlined,
	DeleteOutlined,
} from '@ant-design/icons'
import { useRenderTracker } from '../../app/performance/useRenderTracker'
import {
	reactive,
	useUserData,
	useCatalog,
	useCartTotals,
	useCartItems,
	useItemQuantity,
	useCartActions,
} from './bindings'

const { Title, Text, Paragraph } = Typography

const FALLBACK_IMAGE = 'data:image/png;base64,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'

const cardStyle = {
	marginBottom: '20px',
	boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
	borderRadius: '8px',
}

// ------------------------------------------------------------- cart badge
export const CartButton = reactive(function CartButton({ onOpen }) {
	useRenderTracker('CartButton')
	const { totalItems } = useCartTotals()
	return (
		<Badge count={totalItems} showZero>
			<Button
				type='primary'
				icon={<ShoppingCartOutlined />}
				size='large'
				onClick={onOpen}
				style={{
					height: '48px',
					borderRadius: '8px',
					fontSize: '16px',
					fontWeight: '500',
				}}
			>
				Кошик
			</Button>
		</Badge>
	)
})

// ------------------------------------------------------------- product card
export const ProductCard = reactive(function ProductCard({ product }) {
	useRenderTracker('ProductCard')
	const cartQuantity = useItemQuantity(product.id)
	const { addToCart, updateQuantity, removeFromCart } = useCartActions()

	const handleAddToCart = () => {
		addToCart(product)
		message.success(`${product.title} додано до корзини!`)
	}
	const handleRemoveFromCart = () => {
		removeFromCart(product.id)
		message.success('Товар видалено з корзини')
	}

	return (
		<Card
			hoverable
			cover={
				<div
					style={{
						height: '200px',
						overflow: 'hidden',
						background: '#f0f0f0',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Image
						alt={product.title}
						src={product.images[0]}
						style={{ width: '100%', height: '100%', objectFit: 'cover' }}
						fallback={FALLBACK_IMAGE}
					/>
				</div>
			}
			style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
		>
			<Space direction='vertical' size='small' style={{ width: '100%' }}>
				<Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, minHeight: '48px' }}>
					{product.title}
				</Title>

				<Tag color='blue'>{product.category.name}</Tag>

				<Paragraph
					ellipsis={{ rows: 3 }}
					style={{ margin: '8px 0', minHeight: '66px', color: '#666' }}
				>
					{product.description}
				</Paragraph>

				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginTop: 'auto',
						paddingTop: '12px',
						borderTop: '1px solid #f0f0f0',
					}}
				>
					<Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
						${product.price}
					</Text>
					<Text type='secondary' style={{ fontSize: '12px' }}>
						ID: {product.id}
					</Text>
				</div>

				{cartQuantity > 0 ? (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: '8px',
							marginTop: '8px',
						}}
					>
						<Button
							icon={<MinusOutlined />}
							onClick={() => updateQuantity(product.id, cartQuantity - 1)}
							size='small'
						/>
						<Text strong style={{ minWidth: '40px', textAlign: 'center' }}>
							{cartQuantity}
						</Text>
						<Button
							icon={<PlusOutlined />}
							onClick={() => updateQuantity(product.id, cartQuantity + 1)}
							size='small'
						/>
						<Button
							type='text'
							danger
							icon={<DeleteOutlined />}
							onClick={handleRemoveFromCart}
							size='small'
						/>
					</div>
				) : (
					<Button
						type='primary'
						icon={<ShoppingCartOutlined />}
						block
						onClick={handleAddToCart}
						style={{ marginTop: '8px', borderRadius: '8px' }}
					>
						Додати до кошика
					</Button>
				)}
			</Space>
		</Card>
	)
})

// ------------------------------------------------------------- product grid
export const ProductGrid = reactive(function ProductGrid() {
	useRenderTracker('ProductGrid')
	const { products, loading, error, pagination, getProducts } = useCatalog()

	const handlePageChange = (page, pageSize) => {
		getProducts({ offset: (page - 1) * pageSize, limit: pageSize })
	}

	if (loading) {
		return (
			<div style={{ textAlign: 'center', padding: '50px' }}>
				<Spin size='large' tip='Завантаження товарів...' />
			</div>
		)
	}
	if (error) {
		return (
			<Card>
				<Empty description={<span style={{ color: 'red' }}>Помилка завантаження: {error}</span>} />
			</Card>
		)
	}
	if (products.length === 0) {
		return (
			<Card>
				<Empty description='Товари не знайдено' />
			</Card>
		)
	}
	return (
		<>
			<Row gutter={[16, 16]}>
				{products.map(product => (
					<Col xs={24} sm={12} md={8} lg={6} key={product.id}>
						<ProductCard product={product} />
					</Col>
				))}
			</Row>

			<div
				style={{
					marginTop: '30px',
					textAlign: 'center',
					padding: '20px',
					background: '#fff',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
				}}
			>
				<Pagination
					current={pagination.currentPage}
					pageSize={pagination.limit}
					total={200}
					onChange={handlePageChange}
					showSizeChanger
					showQuickJumper
					showTotal={(total, range) => `${range[0]}-${range[1]} з ${total} товарів`}
					pageSizeOptions={['10', '20', '30', '50']}
				/>
			</div>
		</>
	)
})

// ------------------------------------------------------------- cart drawer
// Ant Design does not render the contents of a closed Drawer, so these
// components subscribe to the cart only while the drawer is open.
const CartDrawerTitle = reactive(function CartDrawerTitle() {
	useRenderTracker('CartDrawerTitle')
	const { totalItems } = useCartTotals()
	return (
		<Space>
			<ShoppingCartOutlined />
			<span>Кошик ({totalItems} товарів)</span>
		</Space>
	)
})

const CartClearButton = reactive(function CartClearButton() {
	useRenderTracker('CartClearButton')
	const items = useCartItems()
	const { clearCart } = useCartActions()
	if (items.length === 0) return null
	return (
		<Button
			danger
			onClick={() => {
				clearCart()
				message.success('Корзину очищено')
			}}
		>
			Очистити кошик
		</Button>
	)
})

const CartDrawerContent = reactive(function CartDrawerContent() {
	useRenderTracker('CartDrawerContent')
	const items = useCartItems()
	const { totalPrice } = useCartTotals()
	const { updateQuantity, removeFromCart } = useCartActions()

	if (items.length === 0) {
		return <Empty description='Кошик порожній' image={Empty.PRESENTED_IMAGE_SIMPLE} />
	}
	return (
		<Space direction='vertical' size='large' style={{ width: '100%' }}>
			{items.map(item => (
				<Card key={item.product.id} style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
					<Space align='start' style={{ width: '100%' }}>
						<Image
							src={item.product.images[0]}
							alt={item.product.title}
							width={80}
							height={80}
							style={{ objectFit: 'cover', borderRadius: '8px' }}
							fallback={FALLBACK_IMAGE}
						/>
						<div style={{ flex: 1 }}>
							<Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
								{item.product.title}
							</Title>
							<Text type='secondary' style={{ display: 'block', marginBottom: '8px' }}>
								${item.product.price} за одиницю
							</Text>
							<Space>
								<Button
									icon={<MinusOutlined />}
									size='small'
									onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
								/>
								<InputNumber
									min={1}
									value={item.quantity}
									onChange={value => updateQuantity(item.product.id, value)}
									style={{ width: '80px' }}
								/>
								<Button
									icon={<PlusOutlined />}
									size='small'
									onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
								/>
								<Text strong style={{ marginLeft: '16px' }}>
									${(item.product.price * item.quantity).toFixed(2)}
								</Text>
							</Space>
						</div>
						<Button
							type='text'
							danger
							icon={<DeleteOutlined />}
							onClick={() => {
								removeFromCart(item.product.id)
								message.success('Товар видалено з корзини')
							}}
						/>
					</Space>
				</Card>
			))}

			<Card style={{ background: '#f0f2f5', border: '2px solid #1890ff' }}>
				<Space direction='vertical' style={{ width: '100%' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text strong style={{ fontSize: '18px' }}>
							Загальна сума:
						</Text>
						<Text strong style={{ fontSize: '24px', color: '#1890ff' }}>
							${totalPrice.toFixed(2)}
						</Text>
					</div>
					<Button
						type='primary'
						block
						size='large'
						style={{ marginTop: '16px', height: '48px', fontSize: '16px', fontWeight: '500' }}
					>
						Оформити замовлення
					</Button>
				</Space>
			</Card>
		</Space>
	)
})

export function CartDrawer({ open, onClose }) {
	return (
		<Drawer
			title={<CartDrawerTitle />}
			placement='right'
			onClose={onClose}
			open={open}
			width={500}
			extra={<CartClearButton />}
		>
			<CartDrawerContent />
		</Drawer>
	)
}

// ------------------------------------------------------------- page
export const DashboardPage = reactive(function DashboardPage() {
	useRenderTracker('DashboardPage')
	const userData = useUserData()
	const { getProducts } = useCatalog({ actionsOnly: true })
	const [cartVisible, setCartVisible] = useState(false)
	const openCart = useCallback(() => setCartVisible(true), [])
	const closeCart = useCallback(() => setCartVisible(false), [])

	useEffect(() => {
		getProducts({ offset: 0, limit: 10 })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div
			style={{
				padding: '20px',
				minHeight: 'calc(100vh - 64px)',
				background: '#f0f2f5',
				width: '100%',
			}}
		>
			<div style={{ maxWidth: '1400px', margin: '0 auto' }}>
				<Card style={cardStyle}>
					<Space align='center' style={{ width: '100%', justifyContent: 'space-between' }}>
						<Space align='center'>
							<Avatar size={64} icon={<UserOutlined />} style={{ background: '#1890ff' }} />
							<div>
								<Title level={3} style={{ margin: 0, color: '#262626' }}>
									Ласкаво просимо, {userData?.email || 'Користувач'}!
								</Title>
								<Text type='secondary'>Керуйте товарами та переглядайте каталог</Text>
							</div>
						</Space>
						<CartButton onOpen={openCart} />
					</Space>
				</Card>

				<Card style={cardStyle}>
					<Space>
						<ShoppingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
						<Title level={3} style={{ margin: 0 }}>
							Каталог товарів
						</Title>
					</Space>
				</Card>

				<ProductGrid />
			</div>

			<CartDrawer open={cartVisible} onClose={closeCart} />
		</div>
	)
})
