import { hooksAdapter } from "@/_adaper";
import { createUUID } from "../core";
import { useEffect as BuseEffect } from "../effect";
import { useMemo as BuseMemo } from "../memo";
import { useRef as BuseRef } from "../ref";
import { useState as BuseState } from "../state";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
const useRef = () => hooksAdapter.current?.useRef ?? BuseRef;
const useState = () => hooksAdapter.current?.useState ?? BuseState;
const useMemo = () => hooksAdapter.current?.useMemo ?? BuseMemo;
// 在生命周期开始时生成唯一ID
export function useId(prefix: string = ""): string {
	return useMemo()(() => prefix + createUUID(), []);
}
// 强制重渲染
export function useRerender(): () => void {
	const [, setTick] = useState()(0);
	return () => setTick((t) => t + 1);
}
// 组件更新时调用（不含首次）
export function useUpdate(fn: () => void): void {
	const isMounted = useRef()(false);
	useEffect()(() => {
		if (isMounted.current) fn();
		else isMounted.current = true;
	});
}
export function useImperativeHandle<T, R extends T>(
	ref: { current: T | null } | ((instance: T | null) => void),
	create: () => R,
	deps: any[] = []
): void {
	useEffect()(() => {
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
