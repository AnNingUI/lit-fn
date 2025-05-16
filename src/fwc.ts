import { CSSResult, html, render, TemplateResult } from "lit";
export function injectRerender(fn: () => void) {
	if (currentContainer) {
		currentContainer.rerender = fn;
	}
}

export function resetHooks() {
	if (!currentContainer) return;
	currentContainer.currentIndex = 0;
}

type ComponentFn<T = any> = (
	props: T,
	ctx: ComponentContext<T>
) => TemplateResult;

type ComponentOptions<T = any> = {
	style?: string | CSSResult;
	props?: (keyof T)[];
	mixinFn?: <T extends new (...args: any) => F, F extends HTMLElement>(
		clazz: T
	) => T;
};

// type ComponentContext = {
// 	onAdopted?: () => void;
// };

function withContainer<T>(container: HookContainer, fn: () => T): T {
	const prev = currentContainer;
	currentContainer = container;
	try {
		return fn();
	} finally {
		currentContainer = prev;
	}
}

function camelToHyphen(str: string): string {
	return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function hyphenToCamel(str: string): string {
	return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export type HookContainer = {
	states: any[];
	effectHooks: any[];
	memoHooks: any[];
	cleanups: any[];
	currentIndex: number;
	rerender: () => void;
};
export let currentContainer: HookContainer | null = null;

type LowercaseDashString<T extends string> = T extends `${string}-${string}`
	? T extends Lowercase<T>
		? T
		: never
	: never;

type TagOptions<T extends string> = {
	name: LowercaseDashString<T>;
	extends: keyof HTMLElementTagNameMap;
};

export interface ComponentClass<T> {
	get tag(): string;
	get props(): T;
}

export interface ComponentContext<T> extends ComponentClass<T> {
	onAdopted: (callback: () => void) => void;
	lazy<Args extends any[]>(
		callback: () => (...args: Args) => TemplateResult
	): (...args: Args) => TemplateResult;
}

// 在模块顶层初始化一次
const scheduleMicrotask: (fn: () => void) => void = (() => {
	if (typeof Promise !== "undefined" && Promise.resolve) {
		// 标准微任务
		return (fn) => Promise.resolve().then(fn);
	}
	if (typeof MessageChannel !== "undefined") {
		// MessageChannel 微任务
		const { port1, port2 } = new MessageChannel();
		const queue: Array<() => void> = [];
		port1.onmessage = () => {
			const cb = queue.shift();
			if (cb) cb();
		};
		return (fn) => {
			queue.push(fn);
			port2.postMessage(0);
		};
	}
	if (typeof MutationObserver !== "undefined") {
		// MutationObserver 微任务
		const queue: Array<() => void> = [];
		const node = document.createTextNode("");
		new MutationObserver(() => {
			const cb = queue.shift();
			if (cb) cb();
		}).observe(node, { characterData: true });
		let toggle = 0;
		return (fn) => {
			queue.push(fn);
			node.data = String((toggle = 1 - toggle));
		};
	}
	// 最后退回到 setTimeout 宏任务
	return (fn) => setTimeout(fn, 0);
})();

export function defineComponent<T, Name extends string>(
	tag: LowercaseDashString<Name> | TagOptions<Name>,
	component: ComponentFn<T>,
	options?: ComponentOptions<T>
): ComponentClass<T> {
	const observedAttributes =
		options?.props?.map((p) => camelToHyphen(p as string)) || [];
	const mixinFn = options?.mixinFn || ((clazz) => clazz);

	class FunctionElement
		extends mixinFn(HTMLElement)
		implements ComponentClass<T>
	{
		private _props: T = {} as T;
		private sheet: CSSStyleSheet | null = null;
		private shadow = this.attachShadow({ mode: "open" });
		private hookContainer: HookContainer;
		private __onAdopted: (() => void | Promise<void>)[] = [];
		private templates: Record<string, HTMLTemplateElement> = {};
		private isUpdating = false;
		private _dirty = false;
		private _scheduled = false;

		get tag() {
			return (
				(tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>)
			);
		}

		static get observedAttributes() {
			return observedAttributes;
		}

		constructor() {
			super();
			if (options?.style) {
				if (typeof options.style === "string") {
					const s = new CSSStyleSheet();
					s.replaceSync(options.style);
					this.sheet = s;
				} else {
					this.sheet = options.style.styleSheet!;
				}
			}
			// 为每个prop定义访问器
			this.hookContainer = {
				states: [],
				effectHooks: [],
				memoHooks: [],
				cleanups: [],
				currentIndex: 0,
				rerender: () => {},
			};
			options?.props?.forEach((prop) => {
				const propName = prop as string;
				Object.defineProperty(this, propName, {
					get: () => this._props[propName as keyof T],
					set: (value) => {
						if (this._props[prop as keyof T] !== value) {
							this._props[prop as keyof T] = value;
							this._dirty = true;
							this.scheduleUpdate();
						}
					},
					enumerable: true,
					configurable: true,
				});
			});
			if (this.sheet) {
				this.shadow.adoptedStyleSheets = [this.sheet];
			}
		}

		// Uncaught ReferenceError: Cannot access 'counter' before initialization
		// 用来避免在构造函数中使用 未定义 函数时报错
		public lazy<Args extends any[]>(
			callback: () => (...args: Args) => TemplateResult
		) {
			const _callback = (callback ?? (() => callback)) as () => (
				...args: Args
			) => TemplateResult;
			// 延迟到真正渲染子组件时再调用，并捕获任何运行时错误
			return (...args: Args) => {
				try {
					return _callback().apply(this, args);
				} catch (e) {
					setTimeout(() => {
						this.update();
					}, 0);
					return html`<!-- lazy component error: ${(e as Error).message} -->`;
				}
			};
		}

		public onAdopted(callback: () => void | Promise<void>) {
			if (typeof callback === "function") {
				this.__onAdopted.push(callback);
			}
		}

		private async runCallbacks(
			callbacks: ((
				element?: HTMLElement,
				oldProps?: T,
				newProps?: T
			) => void | Promise<void>)[],
			element?: HTMLElement,
			oldProps?: T,
			newProps?: T
		): Promise<void> {
			const asyncCallbacks: Array<Promise<void>> = [];
			const syncCallbacks: Array<
				(element?: HTMLElement, oldProps?: T, newProps?: T) => void
			> = [];

			// 拆分异步和同步回调
			for (const callback of callbacks) {
				if (callback && callback.constructor.name === "AsyncFunction") {
					asyncCallbacks.push(
						Promise.resolve(callback(element, oldProps, newProps))
					);
				} else if (callback) {
					syncCallbacks.push(callback);
				}
			}

			// 先执行所有异步回调
			await Promise.all(asyncCallbacks);

			// 再执行所有同步回调
			for (const callback of syncCallbacks) {
				callback(element, oldProps, newProps);
			}
		}

		connectedCallback() {
			Array.from(this.children).forEach((node) => {
				if (node.nodeName === "TEMPLATE") {
					const tpl = node as HTMLTemplateElement;
					const slotName = tpl.getAttribute("slot") || "";
					this.templates[slotName] = tpl;
					tpl.remove();
				}
			});
			// 处理初始属性
			withContainer(this.hookContainer, () => {
				this.syncPropsFromAttributes();
				injectRerender(() => this.update());
				this.update();
			});
		}

		adoptedCallback() {
			// 元素被移动到新 document 时触发
			this.runCallbacks(this.__onAdopted).then(() => {
				this.update();
			});
		}

		private syncPropsFromAttributes() {
			const attributeNames = this.getAttributeNames();
			attributeNames.forEach((attr) => {
				const hyphenName = attr;
				if (observedAttributes.includes(hyphenName)) {
					const propName = hyphenToCamel(hyphenName) as keyof T;
					this._props[propName] = this.parseAttr(this.getAttribute(attr));
					this.removeAttribute(attr); // 移除声明为props的属性
				}
			});
		}

		disconnectedCallback() {
			this.hookContainer.cleanups.forEach((cleanup) => {
				if (typeof cleanup === "function") cleanup();
			});
		}

		attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
			const propName = hyphenToCamel(name) as keyof T;
			if (options?.props?.includes(propName)) {
				this._props[propName] = this.parseAttr(newVal);
				this.update();
			}
		}

		private parseAttr(val: string | null): any {
			// 属性不存在时，返回 undefined 而非 true
			if (val === null) return undefined;

			// 布尔
			if (val === "true" || val === "false") {
				return val === "true";
			}
			// 数值
			if (!isNaN(Number(val))) {
				return Number(val);
			}
			// JSON 对象/数组
			try {
				const parsed = JSON.parse(val);
				// 只有对象或数组才返回 parsed
				if (typeof parsed === "object") return parsed;
			} catch {
				/* ignore */
			}

			// 退化为字符串
			return val;
		}

		setProps(newProps: Partial<T>) {
			for (const key in newProps) {
				if (
					Object.prototype.hasOwnProperty.call(newProps, key) &&
					this._props[key] !== newProps[key]
				) {
					this._props[key] = newProps[key] as T[typeof key];
					this._dirty = true;
				}
			}
			this.scheduleUpdate();
		}

		private scheduleUpdate() {
			if (this._scheduled) return;
			this._scheduled = true;
			scheduleMicrotask(() => {
				this._scheduled = false;
				if (this.shouldUpdate()) {
					this.update();
				}
			});
		}

		private shouldUpdate(): boolean {
			const d = this._dirty;
			this._dirty = false; // 清零以备下次写入
			return d;
		}

		get props(): T {
			return this._props;
		}

		private update() {
			if (this.isUpdating) return;
			this.isUpdating = true;
			withContainer(this.hookContainer, () => {
				resetHooks();
				const tpl = component(
					this.props,
					this as unknown as ComponentContext<T>
				);
				render(tpl, this.shadow);
				Object.entries(this.templates).forEach(([name, tmpl]) => {
					const fragment = tmpl.content.cloneNode(true);
					const target = name
						? this.shadow.querySelector(`[slot="${name}"]`)
						: this.shadow;
					target?.appendChild(fragment);
				});
			});
			this.isUpdating = false;
		}
	}
	if ((tag as TagOptions<Name>)?.extends) {
		customElements.define(
			(tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>),
			FunctionElement,
			{ extends: (tag as TagOptions<Name>)?.extends }
		);
	} else {
		customElements.define(
			(tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>),
			FunctionElement
		);
	}
	return FunctionElement as unknown as ComponentClass<T>;
}

export function createComponent<T>(
	component: ComponentFn<T>,
	options?: ComponentOptions<T>
) {
	return {
		register: <S extends string>(tag: LowercaseDashString<S> | TagOptions<S>) =>
			defineComponent(tag, component, options),
	};
}
