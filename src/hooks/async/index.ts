import { hooksAdapter } from "@/_adaper";
import { useEffect as BuseEffect } from "../effect";
import { useRef as BuseRef } from "../ref";
import { useState as BuseState } from "../state";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
const useRef = () => hooksAdapter.current?.useRef ?? BuseRef;
const useState = () => hooksAdapter.current?.useState ?? BuseState;
// setTimeout 管理
export function useTimeout(fn: () => void, delay: number) {
	useEffect()(() => {
		const timer = setTimeout(fn, delay);
		return () => clearTimeout(timer);
	}, [delay]);
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
