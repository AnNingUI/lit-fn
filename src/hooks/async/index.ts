import { hooksAdapter } from "@/_adaper";
import { UseAsyncReturn } from "../core";
import { useEffect as BuseEffect } from "../effect";
import { useCallback as BuseCallback } from "../memo";
import { useRef as BuseRef } from "../ref";
import { useState as BuseState } from "../state";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
const useRef = () => hooksAdapter.current?.useRef ?? BuseRef;
const useState = () => hooksAdapter.current?.useState ?? BuseState;
const useCallback = () => hooksAdapter.current?.useCallback ?? BuseCallback;
// setTimeout 管理
export function useTimeout(fn: () => void, delay: number) {
	useEffect()(() => {
		const timer = setTimeout(fn, delay);
		return () => clearTimeout(timer);
	}, [delay]);
}

export function useAsync<T = any, P extends any[] = any[]>(
	asyncFunction: (...params: P) => Promise<T>,
	options?: {
		immediate?: boolean;
		initialParams?: P;
	}
): UseAsyncReturn<T, P> {
	const { immediate = true, initialParams } = options || {};

	const [loading, setLoading] = useState()<boolean>(false);
	const [data, setData] = useState()<T | null>(null);
	const [error, setError] = useState()<Error | null>(null);

	// Use ref to store the latest asyncFunction without recreating `run`
	const asyncFnRef = useRef()(asyncFunction);
	asyncFnRef.current = asyncFunction; // Always keep the latest version

	// Use ref for request identifier to prevent race conditions
	const lastCallId = useRef()(0);

	// Use ref for AbortController to manage cancellation of ongoing requests
	const abortControllerRef = useRef()<AbortController | null>(null);

	// The 'run' function is stable across renders due to useCallback with empty deps.
	// It will always use the latest asyncFunction from asyncFnRef.
	const run = useCallback()(async (...params: P): Promise<T | undefined> => {
		const callId = ++lastCallId.current;

		// Abort any previously ongoing request managed by this hook
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		// Create a new AbortController for the current request
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		setLoading(true);
		setError(null); // Clear previous errors

		try {
			// Call the actual async function.
			// If the async function supports AbortSignal (e.g., fetch), pass it.
			// You might need to adjust P to include AbortSignal if always passed.
			// For now, assuming asyncFunction doesn't *always* take it directly
			// and the consumer adapts or it's handled internally.
			// A common pattern is: asyncFunction: (signal: AbortSignal, ...params: P) => Promise<T>
			// For simplicity here, we assume if signal is needed, asyncFnRef.current will somehow get it.
			// A more robust approach might be:
			// const result = asyncFnRef.current(signal, ...params.slice(1));
			// if P includes signal.
			// OR the asyncFunction is wrapped to handle the signal internally.
			// For direct use of fetch, a common workaround is:
			// return fetch(url, { signal }).then(...)
			// If the asyncFunction *is* fetch itself:
			// const result = asyncFnRef.current(...params, { signal }); // Example if fetch is passed directly

			const result = asyncFnRef.current(...params); // Assuming asyncFunction doesn't *always* need signal directly as a param

			const res = await result;

			// Only update state if this is the latest call and not aborted
			if (callId === lastCallId.current && !signal.aborted) {
				setData(res);
				setLoading(false);
				abortControllerRef.current = null; // Clear controller on successful completion
			}
			return res;
		} catch (err: any) {
			// Only update state if this is the latest call and not aborted
			if (callId === lastCallId.current && !signal.aborted) {
				// If it's an AbortError, don't set an error state, just return undefined/reject silently.
				// This prevents showing an error when the user explicitly cancelled.
				if (err.name === "AbortError") {
					// console.log('Request aborted gracefully.');
					setLoading(false); // Still stop loading
					abortControllerRef.current = null;
					return undefined; // Or throw a specific cancellation error
				}

				setError(err);
				setLoading(false);
				abortControllerRef.current = null; // Clear controller on error
			}
			return Promise.reject(err); // Re-throw for downstream error handling
		}
	}, []); // `run` is stable and relies on `asyncFnRef.current`

	const reset = useCallback()(() => {
		setLoading(false);
		setData(null);
		setError(null);
		lastCallId.current = 0;
		// Abort any ongoing request when resetting
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	// Effect for immediate execution and cleanup on unmount
	useEffect()(() => {
		if (immediate) {
			// Provide initialParams if they exist, otherwise an empty array (needs type assertion)
			// Ensure initialParams are stable if they are objects/arrays
			run(...(initialParams || ([] as unknown as P)));
		}

		// Cleanup function: abort any ongoing request when the component unmounts
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
				abortControllerRef.current = null;
			}
		};
	}, [immediate, run, initialParams]); // initialParams should be stable (memoized by consumer)

	return { loading, data, error, run, reset };
}

// setInterval 管理
export function useInterval(fn: () => void, interval: number) {
	useEffect()(() => {
		const timer = setInterval(fn, interval);
		return () => clearInterval(timer);
	}, [interval]);
}

// 防抖
export function useDebounce<T>(value: T, wait: number): T {
	const [debounced, setDebounced] = useState()(value);
	useEffect()(() => {
		const timer = setTimeout(() => setDebounced(value), wait);
		return () => clearTimeout(timer);
	}, [value, wait]);
	return debounced;
}

// 节流
export function useThrottle<T>(value: T, limit: number): T {
	const [throttled, setThrottled] = useState()(value);
	const lastRanRef = useRef()(Date.now());
	useEffect()(() => {
		const handler = () => {
			if (Date.now() - lastRanRef.current >= limit) {
				setThrottled(value);
				lastRanRef.current = Date.now();
			}
		};
		const id = setInterval(handler, limit);
		return () => clearInterval(id);
	}, [value, limit]);
	return throttled;
}

// 防抖函数
export function useDebounceFn<T extends (...args: any[]) => any>(
	fn: T,
	deps: any[],
	wait: number
): T {
	const fnRef = useRef()(fn);
	fnRef.current = fn;
	const debounced = useRef()<(...args: any[]) => void>();
	if (!debounced.current) {
		debounced.current = ((...args: any[]) => {
			clearTimeout((debounced as any).timer);
			(debounced as any).timer = window.setTimeout(
				() => fnRef.current(...args),
				wait
			);
		}) as T;
	}
	useEffect()(() => () => clearTimeout((debounced as any).timer), deps);
	return debounced.current as T;
}
// 节流函数
export function useThrottleFn<T extends (...args: any[]) => any>(
	fn: T,
	deps: any[],
	wait: number
): T {
	const fnRef = useRef()(fn);
	fnRef.current = fn;
	const throttled = useRef()<(...args: any[]) => void>();
	const last = useRef()(Date.now());
	if (!throttled.current) {
		throttled.current = ((...args: any[]) => {
			if (Date.now() - last.current >= wait) {
				fnRef.current(...args);
				last.current = Date.now();
			}
		}) as T;
	}
	// 在依赖变化时可执行清理或重置操作
	useEffect()(() => {
		// 可根据需要重置 last 时间戳
		last.current = Date.now();
		return () => {
			// no-op cleanup（占位清理函数，暂无实际操作）
		};
	}, deps);
	return throttled.current as T;
}

/**
 * useTransition - 支持同步/异步状态过渡 + 加载状态提示
 */
export function useTransition(delay: number = 300) {
	const [isPending, setIsPending] = useState()(false);
	const [isLoading, setIsLoading] = useState()(false);

	const startTransition = (fn: () => Promise<any>) => {
		setIsLoading(true);
		setIsPending(true);

		fn().finally(() => {
			setTimeout(() => {
				setIsPending(false);
				setIsLoading(false);
			}, delay);
		});
	};

	return [startTransition, isPending, isLoading] as const;
}

/**
 * useDeferredValue - 返回一个延迟更新的值（类似 React 的 useDeferredValue）
 */
export function useDeferredValue<T>(value: T, delay: number = 300): T {
	const [deferred, setDeferred] = useState()(value);
	const valueRef = useRef()(value);

	useEffect()(() => {
		valueRef.current = value;
		const timer = setTimeout(() => {
			setDeferred(valueRef.current);
		}, delay);

		return () => clearTimeout(timer);
	}, [value, delay]);

	return deferred;
}

/**
 * useOptimistic - 乐观更新 Hook
 */
export function useOptimistic<T>(
	initialValue: T
): [T, (optimisticValue: T) => void, () => void] {
	const [current, setCurrent] = useState()(initialValue);
	const [optimistic, setOptimistic] = useState()<T | null>(null);

	function updateWithOptimistic(optimisticValue: T) {
		setOptimistic(optimisticValue);
	}

	function commitUpdate() {
		if (optimistic !== null) {
			setCurrent(optimistic);
			setOptimistic(null);
		}
	}

	return [
		optimistic !== null ? optimistic : current,
		updateWithOptimistic,
		commitUpdate,
	];
}

/**
 * useActionState - 异步动作状态管理（pending/error）
 */
export function useActionState<T>(
	action: (input: T) => Promise<any>,
	initialInput: T
): [T, boolean, string | null, (input: T) => void] {
	const [input, setInput] = useState()<T>(initialInput);
	const [isPending, setIsPending] = useState()(false);
	const [error, setError] = useState()<string | null>(null);

	const run = async (newInput: T) => {
		setInput(newInput);
		setIsPending(true);
		setError(null);

		try {
			await action(newInput);
		} catch (e: any) {
			setError(e.message || "提交失败");
		} finally {
			setIsPending(false);
		}
	};

	return [input, isPending, error, run];
}

/**
 * useFormState - useActionState 的表单别名版本
 */
export function useFormState<T>(
	action: (formData: T) => Promise<any>,
	initialFormData: T = {} as T
) {
	return useActionState(action, initialFormData);
}
