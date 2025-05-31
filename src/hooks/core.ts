import { type TemplateResult } from "lit";

export { currentContainer } from "../fwc";
export type EffectFn = () => void | (() => void);
export type ContextChildren = TemplateResult | (() => TemplateResult);
export interface Context<T> {
	_currentValue: T;
	Provider: {
		(value: T): (children: ContextChildren) => TemplateResult; // 第一种调用方式
		(props: { value: T; children: ContextChildren }): TemplateResult; // 第二种调用方式
	};
	__contextId: string; // 唯一标识符用于事件隔离
}
// 事件总线
export class EventBus<Payload = any> {
	private listeners: { [event: string]: ((payload: Payload) => void)[] } = {};
	on(event: string, listener: (payload: Payload) => void) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(listener);
	}
	off(event: string, listener: (payload: Payload) => void) {
		const arr = this.listeners[event];
		if (!arr) return;
		this.listeners[event] = arr.filter((l) => l !== listener);
	}
	emit(event: string, payload: Payload) {
		(this.listeners[event] || []).forEach((l) => l(payload));
	}
	destroy() {
		this.listeners = {};
	}
}

export function createUUID(): string {
	return crypto.randomUUID();
}

export type AsyncState<T> = {
	loading: boolean;
	data: T | null;
	error: Error | null;
};

export type UseAsyncReturn<T, P extends any[]> = AsyncState<T> & {
	run: (...params: P) => Promise<T | undefined>;
	reset: () => void;
};
