import { currentContainer, type EffectFn } from "../core";
import { useRef } from "../ref";

export function useEffect(fn: EffectFn, deps: any[] = []): void {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	const hook = c.effectHooks[idx];
	const hasDeps = deps.length > 0;

	// Initial mount
	if (!hook) {
		const cleanup = fn();
		c.effectHooks[idx] = { fn, deps };
		c.cleanups[idx] = cleanup;
	}
	// Subsequent renders: only run if deps array is non-empty and a value changed
	else if (hasDeps) {
		const { deps: prevDeps } = hook;
		const changed = deps.some((d, i) => d !== prevDeps[i]);
		if (changed) {
			const prevCleanup = c.cleanups[idx];
			if (prevCleanup) prevCleanup();
			const cleanup = fn();
			c.effectHooks[idx] = { fn, deps };
			c.cleanups[idx] = cleanup;
		}
	}
}

export function useLayoutEffect(fn: EffectFn, deps: any[] = []) {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	const hook = c.effectHooks[idx];

	if (!hook) {
		// 首次挂载时立即执行一次
		const cleanup = fn();
		c.effectHooks[idx] = { fn, deps };
		c.cleanups[idx] = cleanup;
	} else {
		// 后续更新时，在 update() 之前执行
		const { deps: prevDeps } = hook;
		const hasChanged = deps.some((d, i) => d !== prevDeps[i]);
		if (hasChanged) {
			const prevCleanup = c.cleanups[idx];
			if (prevCleanup) prevCleanup();
			const cleanup = fn();
			c.effectHooks[idx] = { fn, deps };
			c.cleanups[idx] = cleanup;
		}
	}
}

// 跳过首次渲染，依赖变化时才调用
export function useUpdateEffect(fn: () => void, deps: any[]): void {
	const isFirstRef = useRef(true);
	useEffect(() => {
		if (isFirstRef.current) {
			isFirstRef.current = false;
		} else {
			fn();
		}
	}, deps);
}
