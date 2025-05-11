export { currentContainer } from "../fwc";
export type EffectFn = () => void | (() => void);
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
}

export function createUUID(): string {
	return crypto.randomUUID();
}
