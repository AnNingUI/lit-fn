import { createUUID } from "../core";
import { useEffect } from "../effect";
import { useMemo } from "../memo";
import { useRef } from "../ref";
import { useState } from "../state";

// 在生命周期开始时生成唯一ID
export function useId(prefix: string = ""): string {
	return useMemo(() => prefix + createUUID(), []);
}
// 强制重渲染
export function useRerender(): () => void {
	const [, setTick] = useState(0);
	return () => setTick((t) => t + 1);
}
// 组件更新时调用（不含首次）
export function useUpdate(fn: () => void): void {
	const isMounted = useRef(false);
	useEffect(() => {
		if (isMounted.current) fn();
		else isMounted.current = true;
	});
}
export function useImperativeHandle<T, R extends T>(
	ref: { current: T | null } | ((instance: T | null) => void),
	create: () => R,
	deps: any[] = []
): void {
	useEffect(() => {
		const instance = create();
		if (typeof ref === "function") {
			ref(instance);
		} else if (ref !== null) {
			ref.current = instance;
		}

		return () => {
			if (typeof ref === "function") {
				ref(null);
			} else if (ref !== null) {
				ref.current = null;
			}
		};
	}, deps);
}
