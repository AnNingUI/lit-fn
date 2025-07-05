import { LitElement } from "lit";
import { renderNow } from "./fwc";

// 响应式上下文
interface ReactiveContext {
	currentComponent: LitElement | null;
	updateQueue: Set<() => void>;
	isUpdating: boolean;
}

// 创建响应式上下文
const createProxyContext = (): ReactiveContext => ({
	currentComponent: null,
	updateQueue: new Set(),
	isUpdating: false,
});

class Scope {
	private readonly deps = new WeakMap<
		object,
		Map<string | symbol, Set<LitElement>>
	>();
	private readonly proxyCache = new WeakMap<object, object>();
	private readonly context: ReactiveContext;

	constructor(context: ReactiveContext) {
		this.context = context;
	}

	createProxy<T extends object>(data: T): T {
		// 优化类型检查
		if (this.proxyCache.has(data)) {
			return this.proxyCache.get(data) as T;
		}

		if (!data || typeof data !== "object" || data === null) {
			return data;
		}

		const proxy = new Proxy(data, {
			get: (target, prop, receiver) => {
				this.context.currentComponent = renderNow.component();
				// 特殊处理数组方法
				if (Array.isArray(target) && typeof prop === "string") {
					const arrayMethods = [
						"push",
						"pop",
						"shift",
						"unshift",
						"splice",
						"sort",
						"reverse",
					] as const;
					if (arrayMethods.includes(prop as any)) {
						const method = target[prop as keyof typeof target];
						return (...args: any[]) => {
							const result = (method as Function).apply(target, args);
							this.queueUpdate(() => this.trigger(target, prop));
							return result;
						};
					}
				}
				return this.handleGet(target, prop, receiver);
			},
			set: (target, prop, value, receiver) => {
				return this.handleSet(target, prop, value, receiver);
			},
			deleteProperty: (target, prop) => this.handleDelete(target, prop),
		});

		this.proxyCache.set(data, proxy);
		return proxy;
	}

	private handleGet(target: object, prop: string | symbol, receiver: any) {
		const value = Reflect.get(target, prop, receiver);
		this.track(target, prop);

		if (typeof value === "object" && value !== null) {
			return this.createProxy(value);
		}
		return value;
	}

	private handleSet(
		target: object,
		prop: string | symbol,
		value: any,
		receiver: any
	) {
		const oldValue = Reflect.get(target, prop, receiver);
		const result = Reflect.set(target, prop, value, receiver);

		if (oldValue !== value && result) {
			this.queueUpdate(() => this.trigger(target, prop));
		}
		return result;
	}

	private handleDelete(target: object, prop: string | symbol) {
		const result = Reflect.deleteProperty(target, prop);
		if (result) {
			this.queueUpdate(() => this.trigger(target, prop));
		}
		return result;
	}

	private track(target: object, prop: string | symbol) {
		if (!this.context.currentComponent) return;

		if (!this.deps.has(target)) {
			this.deps.set(target, new Map());
		}

		const targetDeps = this.deps.get(target)!;
		if (!targetDeps.has(prop)) {
			targetDeps.set(prop, new Set());
		}

		targetDeps.get(prop)!.add(this.context.currentComponent);
	}

	private trigger(target: object, prop: string | symbol) {
		const targetDeps = this.deps.get(target)?.get(prop);
		if (!targetDeps) return;

		// 过滤断开连接的组件并触发更新
		for (const component of targetDeps) {
			if (component.isConnected) {
				component.requestUpdate();
			} else {
				targetDeps.delete(component);
			}
		}

		// 如果没有组件依赖了，清理内存
		if (targetDeps.size === 0) {
			this.deps.get(target)?.delete(prop);
			this.cleanupDeps(target); // 在这里调用 cleanupDeps
		}
	}

	private queueUpdate(update: () => void) {
		this.context.updateQueue.add(update);
		if (!this.context.isUpdating) {
			this.context.isUpdating = true;
			Promise.resolve().then(() => this.flushUpdates());
		}
	}

	private flushUpdates() {
		try {
			this.context.updateQueue.forEach((update) => update());
		} finally {
			this.context.updateQueue.clear();
			this.context.isUpdating = false;
		}
	}

	// 添加批量更新API
	batch(fn: () => void) {
		const wasUpdating = this.context.isUpdating;
		if (!wasUpdating) {
			this.context.isUpdating = true;
		}
		try {
			fn();
		} finally {
			if (!wasUpdating) {
				this.context.isUpdating = false;
				this.flushUpdates();
			}
		}
	}

	private cleanupDeps(target: object) {
		const targetDeps = this.deps.get(target);
		if (!targetDeps) return;

		for (const [prop, components] of targetDeps.entries()) {
			const activeComponents = new Set(
				Array.from(components).filter((comp) => comp.isConnected)
			);

			if (activeComponents.size === 0) {
				targetDeps.delete(prop);
			} else if (activeComponents.size !== components.size) {
				targetDeps.set(prop, activeComponents);
			}
		}

		if (targetDeps.size === 0) {
			this.deps.delete(target);
			this.proxyCache.delete(target);
		}
	}
}

// 创建响应式装饰器
const createProxyReactive = (context: ReactiveContext) => {
	const scope = new Scope(context);

	return {
		createProxy: <T extends object>(data: T) => scope.createProxy(data),
		batchProxy: (fn: () => void) => scope.batch(fn),
	};
};

// 创建默认响应式实例
const defaultProxyContext = createProxyContext();
const { createProxy, batchProxy } = createProxyReactive(defaultProxyContext);

export { batchProxy, createProxy };
