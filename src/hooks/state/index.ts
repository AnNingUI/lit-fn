import { currentContainer } from "../core";

export function useState<T>(
	initial: T | (() => T)
): [T, (updater: T | ((prev: T) => T)) => void] {
	const c = currentContainer!;
	const idx = c.currentIndex++;
	if (c.states[idx] === undefined)
		c.states[idx] =
			typeof initial === "function" ? (initial as () => T)() : initial;

	const setState = (v: T | ((prev: T) => T)) => {
		if (c.states[idx] !== v) {
			c.states[idx] =
				typeof v === "function" ? (v as (prev: T) => T)(c.states[idx] as T) : v;
			c.rerender();
		}
	};

	return [c.states[idx] as T, setState] as const;
}

export function useReducer<R extends (...args: any[]) => any>(
	reducer: R,
	initialState: Parameters<R>[1]
): [ReturnType<R>, (action: Parameters<R>[0]) => void] {
	const [state, setState] = useState(initialState as any);
	const dispatch = (action: Parameters<R>[0]) =>
		setState(reducer(state, action));
	return [state as ReturnType<R>, dispatch];
}

export function useSetState<S extends object>(
	initial: S
): [S, (patch: Partial<S>) => void] {
	const [state, setState] = useState(initial);
	const setMerged = (patch: Partial<S>) => setState({ ...state, ...patch });
	return [state, setMerged];
}
