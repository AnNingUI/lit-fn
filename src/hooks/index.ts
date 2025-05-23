import { hooksAdapter } from "@/_adaper";
import { EffectFn } from "./adapter";
import * as basic from "./basic";
import { Context, EventBus } from "./core";

// ==== State ====
export const useState = <T>(initial: T | (() => T)) =>
	(hooksAdapter.current?.useState ?? basic.useState)(initial);

export const useReducer = <R extends (...args: any[]) => any>(
	reducer: R,
	initialState: Parameters<R>[1]
) =>
	(hooksAdapter.current?.useReducer ?? basic.useReducer)(reducer, initialState);

export const useSetState = <S extends object>(initial: S) =>
	(hooksAdapter.current?.useSetState ?? basic.useSetState)(initial);

// ==== Effect ====
export const useEffect = (callback: EffectFn, dependencies?: any[]) =>
	(hooksAdapter.current?.useEffect ?? basic.useEffect)(callback, dependencies);

export const useLayoutEffect = (fn: EffectFn, deps?: any[]) =>
	(hooksAdapter.current?.useLayoutEffect ?? basic.useLayoutEffect)(fn, deps);

export const useUpdateEffect = (fn: () => void, deps: any[]) =>
	(hooksAdapter.current?.useUpdateEffect ?? basic.useUpdateEffect)(fn, deps);

// ==== Ref ====
export const useRef = <T>(initial?: T) =>
	(hooksAdapter.current?.useRef ?? basic.useRef)(initial);

export const usePrevious = <T>(value: T) =>
	(hooksAdapter.current?.usePrevious ?? basic.usePrevious)(value);

export const useLatest = <T>(value: T) =>
	(hooksAdapter.current?.useLatest ?? basic.useLatest)(value);

// ==== Memo ====
export const useMemo = <T>(factory: () => T, deps?: any[]) =>
	(hooksAdapter.current?.useMemo ?? basic.useMemo)(factory, deps);

export const useCallback = <T extends (...args: any[]) => any>(
	fn: T,
	deps?: any[]
) => (hooksAdapter.current?.useCallback ?? basic.useCallback)(fn, deps);

export const useMemoizedFn = <T extends (...args: any[]) => any>(fn: T) =>
	(hooksAdapter.current?.useMemoizedFn ?? basic.useMemoizedFn)(fn);

// ==== Context ====
export const createContext = <T>(defaultValue?: T) =>
	(hooksAdapter.current?.createContext ?? basic.createContext)(defaultValue);

export const useContext = <T>(context: Context<T>) =>
	(hooksAdapter.current?.useContext ?? basic.useContext)(context);

export const useEventBus = <Payload = any>() =>
	(hooksAdapter.current?.useEventBus ?? basic.useEventBus)<Payload>();

export const useEmitter = <Payload = any>(
	emitter: EventBus<Payload>,
	event: string,
	handler: (payload: Payload) => void
) =>
	(hooksAdapter.current?.useEmitter ?? basic.useEmitter)(
		emitter,
		event,
		handler
	);

export const useSyncExternalStore = <S>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => S,
	getServerSnapshot?: () => S
) =>
	(hooksAdapter.current?.useSyncExternalStore ?? basic.useSyncExternalStore)(
		subscribe,
		getSnapshot,
		getServerSnapshot
	);

// ==== Event ====
export const useEventListener = <K extends keyof HTMLElementEventMap>(
	target: EventTarget,
	type: K,
	listener: (e: HTMLElementEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
) =>
	(hooksAdapter.current?.useEventListener ?? basic.useEventListener)(
		target,
		type,
		listener,
		options
	);

export const useOnClickOutside = (
	ref: { current: HTMLElement | null },
	handler: (e: MouseEvent) => void
) =>
	(hooksAdapter.current?.useOnClickOutside ?? basic.useOnClickOutside)(
		ref,
		handler
	);

export const useLongPress = <T extends HTMLElement = HTMLElement>(
	ref: { current: T | null },
	callback: () => void,
	ms?: number
) =>
	(hooksAdapter.current?.useLongPress ?? basic.useLongPress)(ref, callback, ms);

export const useResizeObserver = <T extends HTMLElement = HTMLElement>(
	ref: { current: T | null },
	callback: ResizeObserverCallback
) =>
	(hooksAdapter.current?.useResizeObserver ?? basic.useResizeObserver)(
		ref,
		callback
	);

// ==== LifeCycle ====
export const useMount = (fn: () => void) =>
	(hooksAdapter.current?.useMount ?? basic.useMount)(fn);

export const useUnmount = (fn: () => void) =>
	(hooksAdapter.current?.useUnmount ?? basic.useUnmount)(fn);

export const useBeforeUnmount = (callback: () => void) =>
	(hooksAdapter.current?.useBeforeUnmount ?? basic.useBeforeUnmount)(callback);

export const useDidUpdate = (
	callback: () => void | (() => void),
	deps?: any[]
) => (hooksAdapter.current?.useDidUpdate ?? basic.useDidUpdate)(callback, deps);

export const useLayoutMount = (callback: () => void) =>
	(hooksAdapter.current?.useLayoutMount ?? basic.useLayoutMount)(callback);

export const useIsMounted = () =>
	(hooksAdapter.current?.useIsMounted ?? basic.useIsMounted)();

export const useInViewport = <T extends HTMLElement = HTMLElement>(ref: {
	current: T | null;
}) => (hooksAdapter.current?.useInViewport ?? basic.useInViewport)(ref);

export const useMemoCompare = <T>(
	value: T,
	compare: (prev: T, next: T) => boolean
) =>
	(hooksAdapter.current?.useMemoCompare ?? basic.useMemoCompare)(
		value,
		compare
	);

// ==== async ====
export const useTimeout = (fn: () => void, delay: number) =>
	(hooksAdapter.current?.useTimeout ?? basic.useTimeout)(fn, delay);

export const useInterval = (fn: () => void, interval: number) =>
	(hooksAdapter.current?.useInterval ?? basic.useInterval)(fn, interval);

export const useDebounce = <T>(value: T, wait: number) =>
	(hooksAdapter.current?.useDebounce ?? basic.useDebounce)(value, wait);

export const useThrottle = <T>(value: T, limit: number) =>
	(hooksAdapter.current?.useThrottle ?? basic.useThrottle)(value, limit);

export const useDebounceFn = <T extends (...args: any[]) => any>(
	fn: T,
	deps: any[],
	wait: number
) =>
	(hooksAdapter.current?.useDebounceFn ?? basic.useDebounceFn)(fn, deps, wait);

export const useThrottleFn = <T extends (...args: any[]) => any>(
	fn: T,
	deps: any[],
	wait: number
) =>
	(hooksAdapter.current?.useThrottleFn ?? basic.useThrottleFn)(fn, deps, wait);

export const useTransition = (delay?: number) =>
	(hooksAdapter.current?.useTransition ?? basic.useTransition)(delay);

export const useDeferredValue = <T>(value: T, delay?: number) =>
	(hooksAdapter.current?.useDeferredValue ?? basic.useDeferredValue)(
		value,
		delay
	);

export const useOptimistic = <T>(initialValue: T) =>
	(hooksAdapter.current?.useOptimistic ?? basic.useOptimistic)(initialValue);

export const useActionState = <T>(
	action: (input: T) => Promise<any>,
	initialInput: T
) =>
	(hooksAdapter.current?.useActionState ?? basic.useActionState)(
		action,
		initialInput
	);

export const useFormState = <T>(
	action: (formData: T) => Promise<any>,
	initialFormData: T
) =>
	(hooksAdapter.current?.useFormState ?? basic.useFormState)(
		action,
		initialFormData
	);

// ==== boolean ====
export const useBoolean = (initial?: boolean) =>
	(hooksAdapter.current?.useBoolean ?? basic.useBoolean)(initial);

export const useToggle = (initial?: boolean) =>
	(hooksAdapter.current?.useToggle ?? basic.useToggle)(initial);

// ==== dev ====
export const useDebugValue = <T>(value: T, formatter?: (value: T) => any) =>
	(hooksAdapter.current?.useDebugValue ?? basic.useDebugValue)(
		value,
		formatter
	);

// ==== counter ====
export const useCounter = (initial?: number, step?: number) =>
	(hooksAdapter.current?.useCounter ?? basic.useCounter)(initial, step);

// ==== Utils ====
export const useId = (prefix?: string) =>
	(hooksAdapter.current?.useId ?? basic.useId)(prefix);

export const useRerender = () =>
	(hooksAdapter.current?.useRerender ?? basic.useRerender)();

export const useUpdate = (fn: () => void) =>
	(hooksAdapter.current?.useUpdate ?? basic.useUpdate)(fn);

export const useImperativeHandle = <T, R extends T>(
	ref: { current: T | null } | ((instance: T | null) => void),
	create: () => R,
	deps?: any[]
) =>
	(hooksAdapter.current?.useImperativeHandle ?? basic.useImperativeHandle)(
		ref,
		create,
		deps
	);
