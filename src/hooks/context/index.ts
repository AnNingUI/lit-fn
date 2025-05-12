import { TemplateResult } from "lit";
import { currentContainer, EventBus } from "../core";
import { useEffect } from "../effect";
import { useRef } from "../ref";
import { useState } from "../state";

type ContextChildren = TemplateResult | (() => TemplateResult);
interface Context<T> {
	_currentValue: T;
	Provider: {
		(value: T): (children: ContextChildren) => TemplateResult; // 第一种调用方式
		(props: { value: T; children: ContextChildren }): TemplateResult; // 第二种调用方式
	};
	__contextId: string; // 唯一标识符用于事件隔离
}
let contextCounter = 0;
/**
 * 创建一个新的上下文对象
 */
export function createContext<T>(defaultValue: T): Context<T> {
	const contextId = `context-${++contextCounter}`;

	const provider = (arg: T | { value: T; children: ContextChildren }): any => {
		if (typeof arg === "object" && "value" in arg! && "children" in arg) {
			const { value, children } = arg as {
				value: T;
				children: ContextChildren;
			};

			context._currentValue = value;

			window.dispatchEvent(
				new CustomEvent(`context-update:${contextId}`, {
					detail: value,
				})
			);

			return typeof children === "function" ? children() : children;
		} else {
			const value = arg as T;

			// 设置当前值并触发更新
			context._currentValue = value;

			window.dispatchEvent(
				new CustomEvent(`context-update:${contextId}`, {
					detail: value,
				})
			);

			// 返回接受 children 的函数
			return (children: ContextChildren) => {
				return typeof children === "function" ? children() : children;
			};
		}
	};

	const context: Context<T> = {
		_currentValue: defaultValue,
		__contextId: contextId,
		Provider: provider as Context<T>["Provider"], // 类型断言确保符合接口
	};
	return context;
}

/**
 * 在组件中使用当前上下文
 */
export function useContext<T>(context: Context<T>): T {
	const c = currentContainer!;
	const idx = c.currentIndex++;

	// 初始化状态缓存
	if (c.states[idx] === undefined) {
		c.states[idx] = context._currentValue;
	}

	useEffect(() => {
		const handler = (e: Event) => {
			const event = e as CustomEvent;
			c.states[idx] = event.detail;
			c.rerender();
		};

		// 监听本上下文的专属事件
		window.addEventListener(`context-update:${context.__contextId}`, handler);

		return () => {
			window.removeEventListener(
				`context-update:${context.__contextId}`,
				handler
			);
		};
	}, []);

	return c.states[idx];
}

// 提供单例事件总线
export function useEventBus<Payload = any>(): EventBus<Payload> {
	const ref = useRef<EventBus<Payload>>(new EventBus());
	return ref.current;
}

// 订阅 EventBus
export function useEmitter<Payload = any>(
	emitter: EventBus<Payload>,
	event: string,
	handler: (payload: Payload) => void
) {
	useEffect(() => {
		emitter.on(event, handler);
		return () => emitter.off(event, handler);
	}, [emitter, event, handler]);
}

export function useSyncExternalStore<S>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => S,
	getServerSnapshot?: () => S
): S {
	const [state, setState] = useState<S>(() => {
		// SSR 支持：优先使用 getServerSnapshot
		return getServerSnapshot ? getServerSnapshot() : getSnapshot();
	});

	useEffect(() => {
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
