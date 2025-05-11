import { useState } from "../state";

// 专用布尔状态管理
export function useBoolean(
	initial: boolean = false
): [
	boolean,
	{ setTrue: () => void; setFalse: () => void; toggle: () => void }
] {
	const [state, setState] = useState(initial);
	return [
		state,
		{
			setTrue: () => setState(true),
			setFalse: () => setState(false),
			toggle: () => setState(!state),
		},
	];
}

// 布尔切换
export function useToggle(initial: boolean = false): [boolean, () => void] {
	const [state, setState] = useState(initial);
	const toggle = () => setState(!state);
	return [state, toggle];
}
