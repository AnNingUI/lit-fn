import { hooksAdapter } from "@/_adaper";
import { useEffect as BuseEffect } from "../effect";
import { useRef as BuseRef } from "../ref";
import { useState as BuseState } from "../state";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
const useRef = () => hooksAdapter.current?.useRef ?? BuseRef;
const useState = () => hooksAdapter.current?.useState ?? BuseState;

// 视口可见检测
export function useInViewport<T extends HTMLElement = HTMLElement>(ref: {
	current: T | null;
}): boolean {
	const [inView, setInView] = useState()(false);
	useEffect()(() => {
		const el = ref.current;
		if (!el) return;
		const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
		obs.observe(el);
		return () => obs.disconnect();
	}, [ref.current]);
	return inView;
}
// 自定义比较 Memo
export function useMemoCompare<T>(
	value: T,
	compare: (prev: T, next: T) => boolean
): T {
	const prevRef = useRef()(value);
	const [computed, setComputed] = useState()(value);
	if (!compare(prevRef.current, value)) {
		setComputed(value);
		prevRef.current = value;
	}
	return computed;
}
