import { currentContainer } from "../core";
import { useRef } from "../ref";

export function useMemo<T>(factory: () => T, deps: any[] = []): T {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	// memoHooks 专门存 { deps, value }
	if (!c.memoHooks) c.memoHooks = [];
	const hook = c.memoHooks[idx] as { deps: any[]; value: T } | undefined;

	const hasDeps = deps.length > 0;
	if (!hook) {
		// 第一次：一定执行
		const value = factory();
		c.memoHooks[idx] = { deps, value };
		return value;
	}

	// 如果传了依赖数组并且有变化，再执行
	if (hasDeps) {
		const changed =
			deps.length !== hook.deps.length ||
			deps.some((d, i) => d !== hook.deps[i]);
		if (changed) {
			const value = factory();
			c.memoHooks[idx] = { deps, value };
			return value;
		}
	}

	// 不更新
	return hook.value;
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
