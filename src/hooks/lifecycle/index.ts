import { useEffect } from "../effect";
import { useRef } from "../ref";

// 只在挂载时调用
export function useMount(fn: () => void): void {
	useEffect(fn, []);
}

// 只在卸载时调用
export function useUnmount(fn: () => void): void {
	useEffect(() => () => fn(), []);
}

// 判断挂载状态
export function useIsMounted(): () => boolean {
	const mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	return () => mounted.current;
}
