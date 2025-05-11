import { currentContainer, type EffectFn } from "../core";
import { useRef } from "../ref";

export function useMemo<T>(fn: () => T, deps: any[] = []): T {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	const hook = c.effectHooks[idx];
	const hasDeps = deps.length > 0;

	// Initial computation
	if (!hook) {
		const value = fn();
		c.states[idx] = value;
		c.effectHooks[idx] = { fn: fn as EffectFn, deps };
	}
	// Re-compute only if deps array is non-empty and a dependency changed
	else if (hasDeps) {
		const { deps: prevDeps } = hook;
		const changed = deps.some((d, i) => d !== prevDeps[i]);
		if (changed) {
			const value = fn();
			c.states[idx] = value;
			c.effectHooks[idx] = { fn: fn as EffectFn, deps };
		}
	}

	return c.states[idx];
}

export function useCallback<T extends (...args: any[]) => any>(
	fn: T,
	deps: any[] = []
): T {
	return useMemo(() => fn, deps) as T;
}

export function useMemoizedFn<T extends (...args: any[]) => any>(fn: T): T {
	const fnRef = useRef(fn);
	fnRef.current = fn;
	const memoized = useRef<(...args: any[]) => any>();
	if (!memoized.current) {
		memoized.current = ((...args: any[]) => fnRef.current(...args)) as T;
	}
	return memoized.current as T;
}
