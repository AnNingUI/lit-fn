import { currentContainer } from "../core";

export function useRef<T>(initial?: T): { current: T } {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	if (c.states[idx] === undefined) c.states[idx] = { current: initial };
	return c.states[idx];
}

// 记录上一次的值
export function usePrevious<T>(value: T): T | undefined {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	const prev = c.states[idx];
	c.states[idx] = value;
	return prev;
}

// 最新值引用
export function useLatest<T>(value: T): { current: T } {
	const ref = useRef(value);
	ref.current = value;
	return ref;
}
