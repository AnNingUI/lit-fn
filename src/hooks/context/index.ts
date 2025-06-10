import { hooksAdapter } from "@/_adaper";
import { TemplateResult } from "lit";
import { Context, ContextChildren, currentContainer, EventBus } from "../core";
import { useEffect as BuseEffect } from "../effect";
import { useRef as BuseRef } from "../ref";
import { useState as BuseState } from "../state";
const useEffect = () => hooksAdapter.current?.useEffect ?? BuseEffect;
const useRef = () => hooksAdapter.current?.useRef ?? BuseRef;
const useState = () => hooksAdapter.current?.useState ?? BuseState;

let contextCounter = 0;
export interface ContextProxy<T> {
	get?: (value: T) => T;
	set?: (oldv: T, newv: T) => T;
}
/**
 * 创建一个新的上下文对象
 */
export function createContext<T>(
	defaultValue: T,
	proxy?: ContextProxy<T>
): Context<T> {
	const contextId = `context-${++contextCounter}`;
	const get = proxy?.get ?? ((v: T) => v);
	const set = proxy?.set ?? ((_: T, newv: T) => newv);

	// 使用函数重载定义Provider的两种调用方式
	function Provider(value: T): (children: ContextChildren) => TemplateResult;
	function Provider(props: {
		value: T;
		children: ContextChildren;
	}): TemplateResult;
	function Provider(arg: T | { value: T; children: ContextChildren }): any {
		let value: T;
		let children: ContextChildren | undefined;

		if (
			typeof arg === "object" &&
			arg !== null &&
			"value" in arg &&
			"children" in arg
		) {
			value = arg.value;
			children = arg.children;
		} else {
			value = arg as T;
		}

		// 设置当前值并触发更新
		context._currentValue = set(context._currentValue, value);

		// window.dispatchEvent(
		// 	new CustomEvent(`context-update:${contextId}`, {
		// 		detail: value,
		// 	})
		// );
		context._eventBus.emit("update", value);

		// 如果提供了children则直接返回，否则返回一个接收children的函数
		if (children !== undefined) {
			return typeof children === "function" ? children() : children;
		} else {
			return (children: ContextChildren) => {
				return typeof children === "function" ? children() : children;
			};
		}
	}

	const context: Context<T> = {
		_currentValue: defaultValue,
		__contextId: contextId,
		Provider: Provider as Context<T>["Provider"],
		_eventBus: new EventBus<T>(),
	};
	(context as any).__getProxy = get;
	return context;
}

/**
 * 在组件中使用当前上下文
 */
export function useContext<T>(context: Context<T>): T {
	if (!currentContainer) {
		throw new Error("useContext must be called within a component");
	}

	const c = currentContainer;
	const idx = c.currentIndex++;

	// 初始化状态缓存
	if (c.states[idx] === undefined) {
		c.states[idx] = context._currentValue;
	}

	useEffect()(() => {
		const handler = (detail: T) => {
			c.states[idx] = detail;
			c.rerender();
		};

		// 监听本上下文的专属事件
		context._eventBus.on("update", handler);

		return () => {
			context._eventBus.off("update", handler);
		};
	}, []);
	const get =
		((context as any).__getProxy as ContextProxy<T>["get"]) ?? ((v: T) => v);

	return get(c.states[idx]);
}

// 提供单例事件总线
export function useEventBus<Payload = any>(): EventBus<Payload> {
	const ref = useRef()<EventBus<Payload>>(new EventBus());
	return ref.current;
}

// 订阅 EventBus
export function useEmitter<Payload = any>(
	emitter: EventBus<Payload>,
	event: string,
	handler: (payload: Payload) => void
) {
	useEffect()(() => {
		emitter.on(event, handler);
		return () => emitter.off(event, handler);
	}, [emitter, event, handler]);
}

export function useSyncExternalStore<S>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => S,
	getServerSnapshot?: () => S
): S {
	const [state, setState] = useState()<S>(() => {
		// SSR 支持：优先使用 getServerSnapshot
		return getServerSnapshot ? getServerSnapshot() : getSnapshot();
	});

	useEffect()(() => {
		// 订阅外部 store 变化
		const unsubscribe = subscribe(() => {
			const snapshot = getSnapshot();
			setState(snapshot);
		});

		// 首次手动同步一次快照（避免初始值和快照不一致）
		const initialSnapshot = getSnapshot();
		if (state !== initialSnapshot) {
			setState(initialSnapshot);
		}

		// 清理订阅
		return () => {
			unsubscribe?.();
		};
	}, [subscribe, getSnapshot]);

	return state;
}
