import {
	css,
	CSSResult,
	html,
	LitElement,
	PropertyDeclaration,
	PropertyValues,
	TemplateResult,
} from "lit";
import { customElement } from "lit/decorators.js";

// ---------------------------
// Hook 系统相关类型 & 函数
// ---------------------------
export type HookContainer = {
	states: any[];
	effectHooks: any[];
	memoHooks: any[];
	cleanups: any[];
	currentIndex: number;
	rerender: () => void;
};
export let currentContainer: HookContainer | null = null;

export function injectRerender(fn: () => void) {
	if (currentContainer) {
		currentContainer.rerender = fn;
	}
}

export function resetHooks() {
	if (!currentContainer) return;
	currentContainer.currentIndex = 0;
}

// withContainer 必须在 component 调用之前就声明
function withContainer<T>(container: HookContainer, fn: () => T): T {
	const prev = currentContainer;
	currentContainer = container;
	try {
		return fn();
	} finally {
		currentContainer = prev;
	}
}

// ---------------------------
// 工具类型声明
// ---------------------------

type ComponentFn<T = any> =
	| ((props: T, ctx: ComponentContext<T>) => TemplateResult)
	| ((props: T, ctx: ComponentContext<T>) => () => TemplateResult);

type ComponentOptions<T = any> = {
	style?: string | CSSResult | (CSSResult | string)[];
	props?: (keyof T)[];
	mixinFn?: <T2 extends new (...args: any) => any>(clazz: T2) => T2;
};

type LowercaseDashString<T extends string> = T extends `${string}-${string}`
	? T extends Lowercase<T>
		? T
		: never
	: never;
type TagOptions<T extends string> = {
	name: LowercaseDashString<T>;
	extends: keyof HTMLElementTagNameMap;
};

// ComponentClass / ComponentContext 接口，与之前保持一致
export interface ComponentClass<T> {
	get tag(): string;
	get props(): T;
}

export interface ComponentContext<T> extends ComponentClass<T> {
	onAdopted: (callback: () => void | Promise<void>) => void;
	lazy<Args extends any[]>(
		callback: () => (...args: Args) => TemplateResult
	): (...args: Args) => TemplateResult;
}

export function defineComponent<T, Name extends string>(
	tag: LowercaseDashString<Name> | TagOptions<Name>,
	component: ComponentFn<T>,
	options?: ComponentOptions<T>
): ComponentClass<T> & LitElement {
	// 1. 规范化 tagName
	const tagName =
		(tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>);

	// 如果已注册过，直接返回
	if (customElements.get(tagName)) {
		return customElements.get(tagName) as unknown as ComponentClass<T> &
			LitElement;
	}

	// 2. 从 options.props 里构造 LitElement 的 static properties
	const observedProps = options?.props || [];
	const staticProps: { [key: string]: PropertyDeclaration } = {};
	observedProps.forEach((key) => {
		staticProps[key as string] = { type: Object };
	});

	// 3. 收集 style 到 LitElement 的 static styles
	let combinedStyles: CSSResult | CSSResult[] | undefined;
	if (options?.style) {
		if (Array.isArray(options.style)) {
			combinedStyles = options.style.map((s) =>
				typeof s === "string" ? css([s] as any) : s
			);
		} else if (typeof options.style === "string") {
			combinedStyles = css([options.style] as any);
		} else {
			combinedStyles = options.style;
		}
	}

	// 4. mixinFn：如果用户想把 LitElement 再包一层 mixin，可以传入
	const BaseClass = options?.mixinFn ? options.mixinFn(LitElement) : LitElement;

	@customElement(tagName)
	class FunctionElement
		extends BaseClass
		implements ComponentClass<T>, ComponentContext<T>
	{
		// 4.1 把 static properties 和 static styles 挂在类上
		static get properties() {
			return staticProps;
		}
		static styles = combinedStyles;

		// Hook 容器
		private hookContainer: HookContainer;

		// 存储 <template slot="..."> … </template> 的内容
		private templates: Record<string, HTMLTemplateElement> = {};

		// onAdopted 回调队列
		private __onAdopted: Array<() => void | Promise<void>> = [];

		constructor() {
			super();
			// 初始化 HookContainer
			this.hookContainer = {
				states: [],
				effectHooks: [],
				memoHooks: [],
				cleanups: [],
				currentIndex: 0,
				rerender: () => {
					// 当 Hook 调用 injectRerender 时，LitElement.requestUpdate() 负责重新渲染
					this.requestUpdate();
				},
			};
		}

		// ---------------------------
		// ComponentClass & ComponentContext 实现
		// ---------------------------

		get tag(): string {
			return tagName;
		}

		get props(): T {
			// LitElement 会把属性自动映射到实例上，所以直接把 this 断言成 T
			return this as unknown as T;
		}

		onAdopted(callback: () => void | Promise<void>) {
			if (typeof callback === "function") {
				this.__onAdopted.push(callback);
			}
		}

		public lazy<Args extends any[]>(
			callback: () => (...args: Args) => TemplateResult
		): (...args: Args) => TemplateResult {
			const _callback = (callback ?? (() => callback)) as () => (
				...args: Args
			) => TemplateResult;
			return (...args: Args) => {
				try {
					return _callback().apply(this, args);
				} catch (e) {
					setTimeout(() => {
						this.requestUpdate();
					}, 0);
					return html`<!-- lazy component error: ${(e as Error).message} -->`;
				}
			};
		}

		// ---------------------------
		// 覆写 LitElement 的生命周期
		// ---------------------------

		connectedCallback() {
			super.connectedCallback();

			// 提取 <template slot="xxx">…</template> 内容
			Array.from(this.children).forEach((node) => {
				if (node.nodeName === "TEMPLATE") {
					const tpl = node as HTMLTemplateElement;
					const slotName = tpl.getAttribute("slot") || "";
					this.templates[slotName] = tpl;
					tpl.remove();
				}
			});

			// 首次挂载时，只要让 HookContainer 初始化一次即可，后续全部走 render()
			withContainer(this.hookContainer, () => {
				resetHooks();
				// 仅初始化 Hook，不实际渲染。真正渲染由 LitElement 调用 render() 完成
			});
		}

		disconnectedCallback() {
			super.disconnectedCallback();
			// 执行所有注册到 HookContainer 上的 cleanup
			this.hookContainer.cleanups.forEach((fn) => {
				if (typeof fn === "function") fn();
			});
		}

		// LitElement 没有把 adoptedCallback 声明到类型里，直接用 @ts-ignore 绕过
		// 当这个元素被移动到另一个 document 时，会调用 adoptedCallback
		// 在这里把所有 onAdopted 回调执行完
		// 再次触发一次更新
		// tslint:disable-next-line: no-unused-variable
		// @ts-ignore
		adoptedCallback() {
			// 虽然 LitElement 类型声明里没有 adoptedCallback，但它确实会被调用
			// 我们用 @ts-ignore 忽略类型检查
			(async () => {
				const asyncTasks: Array<Promise<void>> = [];
				const syncTasks: Array<() => void> = [];
				for (const cb of this.__onAdopted) {
					if (cb.constructor.name === "AsyncFunction") {
						asyncTasks.push(Promise.resolve(cb()));
					} else {
						syncTasks.push(cb);
					}
				}
				await Promise.all(asyncTasks);
				syncTasks.forEach((cb) => cb());
				this.requestUpdate();
			})();
		}

		// LitElement 在属性（props）变化时，会自动触发 shouldUpdate → render → updateComplete
		// 我们保持默认的 shouldUpdate 逻辑
		protected shouldUpdate(_changedProps: PropertyValues): boolean {
			return super.shouldUpdate(_changedProps);
		}

		// 真正的渲染：把用户的 component(props, ctx) 的输出交给 LitElement
		protected render(): TemplateResult {
			// tpl 可能是 TemplateResult，或者是 ()=>TemplateResult。先用 ! 告诉 TS 我们肯定会给它赋值
			let tpl!: TemplateResult | (() => TemplateResult);

			// 在 render 里，把 currentContainer 设置为 this.hookContainer，从而支持所有 Hook
			withContainer(this.hookContainer, () => {
				resetHooks();
				tpl = component(this.props, this as unknown as ComponentContext<T>);
			});

			// 如果用户返回了函数，就执行它
			const finalTpl: TemplateResult =
				typeof tpl === "function" ? (tpl as () => TemplateResult)() : tpl;

			// 如果存在 <template slot="..."> 内容，把它们拼接到最后
			if (Object.keys(this.templates).length > 0) {
				return html`
					<div>
						${finalTpl}
						${Object.entries(this.templates).map(
							([slotName, tmpl]) => html`
								${slotName
									? html`<div slot="${slotName}">
											${tmpl.content.cloneNode(true)}
									  </div>`
									: html`${tmpl.content.cloneNode(true)}`}
							`
						)}
					</div>
				`;
			}

			return finalTpl;
		}
	}

	// 如果指定了 extends，就用第二个参数形式注册（例如 <button is="my-button">）
	if ((tag as TagOptions<Name>)?.extends) {
		customElements.define(tagName, FunctionElement, {
			extends: (tag as TagOptions<Name>).extends,
		});
	} else {
		customElements.define(tagName, FunctionElement);
	}

	return FunctionElement as unknown as ComponentClass<T> & LitElement;
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
