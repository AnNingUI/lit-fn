import { hooksAdapter } from "@/_adaper";
import { useEffect as BuseEffect } from "../effect";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
// 通用事件绑定
export function useEventListener<K extends keyof HTMLElementEventMap>(
	target: EventTarget,
	type: K,
	listener: (e: HTMLElementEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
) {
	useEffect()(() => {
		target.addEventListener(type, listener as EventListener, options);
		return () => {
			target.removeEventListener(type, listener as EventListener, options);
		};
	}, [target, type, listener, options]);
}

// 点击组件外部触发回调
export function useOnClickOutside(
	ref: { current: HTMLElement | null },
	handler: (e: MouseEvent) => void
) {
	useEventListener(document, "mousedown", (event) => {
		if (ref.current && !ref.current.contains(event.target as Node)) {
			handler(event as MouseEvent);
		}
	});
}

// 长按监听
export function useLongPress<T extends HTMLElement = HTMLElement>(
	ref: { current: T | null },
	callback: () => void,
	ms: number = 300
) {
	useEffect()(() => {
		const el = ref.current;
		if (!el) return;
		let timer: number;
		const onDown = () => {
			timer = window.setTimeout(callback, ms);
		};
		const onUp = () => clearTimeout(timer);
		el.addEventListener("mousedown", onDown);
		el.addEventListener("mouseup", onUp);
		el.addEventListener("mouseleave", onUp);
		return () => {
			el.removeEventListener("mousedown", onDown);
			el.removeEventListener("mouseup", onUp);
			el.removeEventListener("mouseleave", onUp);
		};
	}, [ref.current, callback, ms]);
}

// 大小监听
export function useResizeObserver<T extends HTMLElement = HTMLElement>(
	ref: { current: T | null },
	callback: ResizeObserverCallback
) {
	useEffect()(() => {
		const el = ref.current;
		if (!el) return;
		const obs = new ResizeObserver(callback);
		obs.observe(el);
		return () => obs.disconnect();
	}, [ref.current, callback]);
}
