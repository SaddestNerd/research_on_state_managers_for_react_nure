import { reduxMetrics } from './metrics'

export const performanceMiddleware = store => next => action => {
	const measureData = reduxMetrics.startActionMeasure(action.type)
	const stateUpdateStart = reduxMetrics.startStateUpdate()

	const stateBefore = store.getState()

	const result = next(action)

	const stateAfter = store.getState()

	const actionTime = reduxMetrics.endActionMeasure(measureData)
	const updateTime = reduxMetrics.endStateUpdate(stateUpdateStart, action.type)

	if (Math.random() < 0.1) {
		reduxMetrics.measureStateSize(stateAfter)
	}

	if (process.env.NODE_ENV === 'development') {
		console.log(
			`[Redux Performance] Дія: ${action.type}, Час: ${actionTime.toFixed(
				3
			)}мс`
		)
	}

	return result
}

export const memoryMiddleware = store => next => action => {
	const result = next(action)

	if (Math.random() < 0.1) {
		reduxMetrics.measureMemory()
	}

	return result
}
