import { useEffect, useRef } from 'react'
import { reduxMetrics } from './metrics'

export const useRenderTracker = componentName => {
	const renderCount = useRef(0)

	useEffect(() => {
		renderCount.current += 1
		reduxMetrics.trackComponentRender(componentName)

		if (process.env.NODE_ENV === 'development') {
			console.log(
				`[Render Tracker] ${componentName} rendered ${renderCount.current} times`
			)
		}
	})

	return renderCount.current
}

export const useRenderPerformance = componentName => {
	const startTime = useRef(performance.now())

	useEffect(() => {
		const renderTime = performance.now() - startTime.current

		if (process.env.NODE_ENV === 'development') {
			console.log(
				`[Render Performance] ${componentName} took ${renderTime.toFixed(
					3
				)}ms to render`
			)
		}

		startTime.current = performance.now()
	})
}
