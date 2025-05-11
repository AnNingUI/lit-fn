import { useEffect } from "../effect";

/**
 * useDebugValue - 调试用 Hook 值展示
 */
export function useDebugValue<T>(
	value: T,
	formatter?: (value: T) => any
): void {
	useEffect(() => {
		// @ts-ignore
		if (process.env.NODE_ENV !== "production") {
			const display = formatter ? formatter(value) : value;
			console.debug(`[useDebugValue]`, display);
		}
	}, [value]);
}
