import { CSSResult, render, TemplateResult } from "lit";
export function injectRerender(fn: () => void) {
	if (currentContainer) {
		currentContainer.rerender = fn;
	}
}

export function resetHooks() {
	if (!currentContainer) return;
	currentContainer.currentIndex = 0;
}

type ComponentFn<T = any> = (props: T) => TemplateResult;

type ComponentOptions<T = any> = {
	style?: string | CSSResult;
	props?: (keyof T)[];
	context?: ComponentContext;
	mixinFn?: <T extends new (...args: any) => F, F extends HTMLElement>(
		clazz: T
	) => T;
};

type ComponentContext = {
	onAdopted?: () => void;
};

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
	setProps(newProps: Partial<T>): void;
	get props(): T;
}

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
		private __onAdopted!: () => void;
		private templates: Record<string, HTMLTemplateElement> = {};
		public static tag: string =
			(tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>);
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
				cleanups: [],
				currentIndex: 0,
				rerender: () => {},
			};
			if (options?.context?.onAdopted) {
				this.__onAdopted = options.context.onAdopted;
			}
			options?.props?.forEach((prop) => {
				const propName = prop as string;
				Object.defineProperty(this, propName, {
					get: () => this._props[propName as keyof T],
					set: (value) => {
						this._props[propName as keyof T] = value;
						this.update();
					},
					enumerable: true,
					configurable: true,
				});
			});
			if (this.sheet) {
				this.shadow.adoptedStyleSheets = [this.sheet];
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
			if (typeof this.__onAdopted === "function") {
				this.__onAdopted.call(this);
			}
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
			this._props = { ...this._props, ...newProps };
			this.update();
		}

		get props(): T {
			return this._props;
		}

		private update() {
			withContainer(this.hookContainer, () => {
				resetHooks();
				const tpl = component(this.props);
				render(tpl, this.shadow);
				Object.entries(this.templates).forEach(([name, tmpl]) => {
					const fragment = tmpl.content.cloneNode(true);
					const target = name
						? this.shadow.querySelector(`[slot="${name}"]`)
						: this.shadow;
					target?.appendChild(fragment);
				});
			});
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
