import {
	css,
	CSSResult,
	html,
	LitElement,
	PropertyDeclaration,
	PropertyValues,
	TemplateResult,
} from "lit";

// ---------------------------
// Hook System Types & Functions (keep as is, or in a separate file)
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
// Utility Types (keep as is)
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
	extends?: keyof HTMLElementTagNameMap; // Changed to optional as per usage
};

export interface ComponentClass<T> {
	get tag(): string;
	get props(): T;
}

export interface ComponentContext<T> extends ComponentClass<T> {
	onAdopted: (callback: () => void | Promise<void>) => void;
	lazy<Args extends any[]>(
		callback: () => (...args: Args) => TemplateResult,
		fallback?: TemplateResult | ((e: Error) => TemplateResult)
	): (...args: Args) => TemplateResult;
	injectFields<Fields extends Record<string, any>>(
		fields: Fields
	): ComponentContext<T> & { readonly [P in keyof Fields]: Fields[P] };
}

// ---------------------------
// Helper Functions for Component Definition
// ---------------------------

function normalizeTagName<Name extends string>(
	tag: LowercaseDashString<Name> | TagOptions<Name>
): LowercaseDashString<Name> {
	return (tag as TagOptions<Name>)?.name || (tag as LowercaseDashString<Name>);
}

function getLitStaticProperties<T>(observedProps: (keyof T)[]): {
	[key: string]: PropertyDeclaration;
} {
	const staticProps: { [key: string]: PropertyDeclaration } = {};
	observedProps.forEach((key) => {
		staticProps[key as string] = { type: Object };
	});
	return staticProps;
}

function getLitStaticStyles(
	styleOptions?: ComponentOptions["style"]
): CSSResult | CSSResult[] | undefined {
	if (!styleOptions) return undefined;
	if (Array.isArray(styleOptions)) {
		return styleOptions.map((s) =>
			typeof s === "string" ? css([s] as any) : s
		);
	} else if (typeof styleOptions === "string") {
		return css([styleOptions] as any);
	} else {
		return styleOptions;
	}
}

// ---------------------------
// Main Component Definition Logic
// ---------------------------
export function defineComponent<T, Name extends string>(
	tag: LowercaseDashString<Name> | TagOptions<Name>,
	component: ComponentFn<T>,
	options?: ComponentOptions<T>
): ComponentClass<T> & LitElement {
	const tagName = normalizeTagName(tag);

	if (customElements.get(tagName)) {
		return customElements.get(tagName) as unknown as ComponentClass<T> &
			LitElement;
	}

	const observedProps = options?.props || [];
	const staticProps = getLitStaticProperties(observedProps);
	const combinedStyles = getLitStaticStyles(options?.style);
	const BaseClass = options?.mixinFn ? options.mixinFn(LitElement) : LitElement;

	class FunctionElement
		extends BaseClass
		implements ComponentClass<T>, ComponentContext<T>
	{
		static properties = staticProps;
		static styles = combinedStyles;

		private hookContainer: HookContainer;
		private templates: Record<string, HTMLTemplateElement> = {};
		private __onAdoptedCallbacks: Array<() => void | Promise<void>> = [];

		constructor() {
			super();
			this.hookContainer = {
				states: [],
				effectHooks: [],
				memoHooks: [],
				cleanups: [],
				currentIndex: 0,
				rerender: () => this.requestUpdate(),
			};
		}

		get tag(): string {
			return tagName;
		}

		get props(): T {
			return this as unknown as T;
		}

		onAdopted(callback: () => void | Promise<void>) {
			if (typeof callback === "function") {
				this.__onAdoptedCallbacks.push(callback);
			}
		}

		injectFields<Fields extends Record<string, any>>(
			fields: Fields
		): ComponentContext<T> & Readonly<{ [P in keyof Fields]: Fields[P] }> {
			const self = this as unknown as ComponentContext<T> &
				Readonly<{ [P in keyof Fields]: Fields[P] }>;
			Object.entries(fields).forEach(([key, value]) => {
				if (Object.prototype.hasOwnProperty.call(self, key)) return;
				Object.defineProperty(self, key, {
					value,
					writable: false,
					configurable: true,
				});
			});
			return self;
		}

		public lazy<Args extends any[]>(
			callback: () => (...args: Args) => TemplateResult,
			fallback?: TemplateResult | ((e: Error) => TemplateResult) // Added fallback
		): (...args: Args) => TemplateResult {
			const _callback = (callback ?? (() => callback)) as () => (
				...args: Args
			) => TemplateResult;
			return (...args: Args) => {
				try {
					return _callback().apply(this, args);
				} catch (e) {
					console.error("Lazy component error:", e); // Log the error
					setTimeout(() => {
						this.requestUpdate();
					}, 0);
					if (fallback) {
						return typeof fallback === "function"
							? fallback(e as Error)
							: fallback;
					}
					return html``;
				}
			};
		}

		connectedCallback() {
			super.connectedCallback();
			Array.from(this.children).forEach((node) => {
				if (node.nodeName === "TEMPLATE") {
					const tpl = node as HTMLTemplateElement;
					const slotName = tpl.getAttribute("slot") || "";
					this.templates[slotName] = tpl;
					tpl.remove();
				}
			});

			withContainer(this.hookContainer, () => {
				resetHooks();
			});
		}

		disconnectedCallback() {
			super.disconnectedCallback();
			this.hookContainer.cleanups.forEach((fn) => {
				if (typeof fn === "function") fn();
			});
		}

		// @ts-ignore
		adoptedCallback() {
			(async () => {
				const asyncTasks: Array<Promise<void>> = [];
				const syncTasks: Array<() => void> = [];
				for (const cb of this.__onAdoptedCallbacks) {
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

		protected shouldUpdate(_changedProps: PropertyValues): boolean {
			return super.shouldUpdate(_changedProps);
		}

		protected render(): TemplateResult {
			let tpl!: TemplateResult | (() => TemplateResult);

			withContainer(this.hookContainer, () => {
				resetHooks();
				tpl = component(this.props, this as unknown as ComponentContext<T>);
			});

			const finalTpl: TemplateResult =
				typeof tpl === "function" ? (tpl as () => TemplateResult)() : tpl;

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
