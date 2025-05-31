import { hooksAdapter } from "@/_adaper";
import {
	currentContainer,
	EventBus,
	UseAsyncReturn,
	type Context as Ctx,
	type EffectFn as effn,
} from "../core";
export type EffectFn = effn;
export type Context<T> = Ctx<T>;
export interface HooksAdapterInterface {
	// ==== State ====
	useState<T>(
		initial: T | (() => T)
	): [T, (updater: T | ((prev: T) => T)) => void];
	useReducer<R extends (...args: any[]) => any>(
		reducer: R,
		initialState: Parameters<R>[1]
	): [ReturnType<R>, (action: Parameters<R>[0]) => void];
	useSetState<S extends object>(initial: S): [S, (patch: Partial<S>) => void];
	// ==== Effect ====
	useEffect(callback: EffectFn, dependencies?: any[]): void;
	useLayoutEffect(fn: EffectFn, deps?: any[]): void;
	useUpdateEffect(fn: () => void, deps: any[]): void;
	// ==== Ref ====
	useRef<T>(initial?: T): { current: T };
	usePrevious<T>(value: T): T | undefined;
	useLatest<T>(value: T): { current: T };
	// ==== Memo ====
	useMemo<T>(factory: () => T, deps?: any[]): T;
	useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
	useMemoizedFn<T extends (...args: any[]) => any>(fn: T): T;
	// ==== Context ====
	createContext<T>(defaultValue: T): Context<T>;
	useContext<T>(context: Context<T>): T;
	useEventBus<Payload = any>(): EventBus<Payload>;
	useEmitter<Payload = any>(
		emitter: EventBus<Payload>,
		event: string,
		handler: (payload: Payload) => void
	): void;
	useSyncExternalStore<S>(
		subscribe: (onStoreChange: () => void) => () => void,
		getSnapshot: () => S,
		getServerSnapshot?: () => S
	): S;
	// ==== Event ====
	useEventListener<K extends keyof HTMLElementEventMap>(
		target: EventTarget,
		type: K,
		listener: (e: HTMLElementEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	useOnClickOutside(
		ref: { current: HTMLElement | null },
		handler: (e: MouseEvent) => void
	): void;
	useLongPress<T extends HTMLElement = HTMLElement>(
		ref: { current: T | null },
		callback: () => void,
		ms?: number
	): void;
	useResizeObserver<T extends HTMLElement = HTMLElement>(
		ref: { current: T | null },
		callback: ResizeObserverCallback
	): void;
	// ==== LifeCycle ====
	useMount(fn: () => void): void;
	useUnmount(fn: () => void): void;
	useBeforeUnmount(callback: () => void): void;
	useDidUpdate(callback: () => void | (() => void), deps?: any[]): void;
	useLayoutMount(callback: () => void): void;
	useIsMounted(): () => boolean;
	useInViewport<T extends HTMLElement = HTMLElement>(ref: {
		current: T | null;
	}): boolean;
	useMemoCompare<T>(value: T, compare: (prev: T, next: T) => boolean): T;
	// ==== async ====
	useTimeout(fn: () => void, delay: number): void;
	useInterval(fn: () => void, interval: number): void;
	useAsync<T = any, P extends any[] = any[]>(
		asyncFunction: (...params: P) => Promise<T>,
		option: {
			immediate?: boolean;
			initialParams?: P;
		}
	): UseAsyncReturn<T, P>;
	useDebounce<T>(value: T, wait: number): T;
	useThrottle<T>(value: T, limit: number): T;
	useDebounceFn<T extends (...args: any[]) => any>(
		fn: T,
		deps: any[],
		wait: number
	): T;
	useThrottleFn<T extends (...args: any[]) => any>(
		fn: T,
		deps: any[],
		wait: number
	): T;
	useTransition(
		delay?: number
	): readonly [(fn: () => Promise<any>) => void, boolean, boolean];
	useDeferredValue<T>(value: T, delay?: number): T;
	useOptimistic<T>(
		initialValue: T
	): [T, (optimisticValue: T) => void, () => void];
	useActionState<T>(
		action: (input: T) => Promise<any>,
		initialInput: T
	): [T, boolean, string | null, (input: T) => void];
	useFormState<T>(
		action: (formData: T) => Promise<any>,
		initialFormData: T
	): [T, boolean, string | null, (input: T) => void];
	// ==== boolean ====
	useBoolean(
		initial?: boolean
	): [
		boolean,
		{ setTrue: () => void; setFalse: () => void; toggle: () => void }
	];
	useToggle(initial?: boolean): [boolean, () => void];
	// ==== dev ====
	useDebugValue<T>(value: T, formatter?: (value: T) => any): void;
	// ==== counter ====
	useCounter(
		initial?: number,
		step?: number
	): [number, { inc: () => void; dec: () => void; reset: () => void }];
	// ==== Utils ====
	useId(prefix?: string): string;
	useRerender(): () => void;
	useUpdate(fn: () => void): void;
	useImperativeHandle<T, R extends T>(
		ref: { current: T | null } | ((instance: T | null) => void),
		create: () => R,
		deps?: any[]
	): void;
}
export type BasicHooksAdapter = Pick<
	HooksAdapterInterface,
	| "useState"
	| "useEffect"
	| "useLayoutEffect"
	| "useMemo"
	| "useRef"
	| "usePrevious"
>;
export type DerivedHooksAdapter = Omit<
	HooksAdapterInterface,
	keyof BasicHooksAdapter
>;

export function useHookAdapter(
	adapter: HooksAdapterInterface | BasicHooksAdapter
): void {
	hooksAdapter.current = adapter as HooksAdapterInterface;
}

const basicGetHookContainer = () => currentContainer;

export function getHookContainer() {
	const self = {
		now: () => Object.freeze(basicGetHookContainer()),
		next() {
			currentContainer!.currentIndex++;
			return self;
		},
		prev() {
			currentContainer!.currentIndex--;
			return self;
		},
	};
	return self;
}
