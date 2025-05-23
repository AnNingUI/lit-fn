import { hooksAdapter } from "@/_adaper";
import { useState as BuseState } from "../state";
const useState = () => hooksAdapter.current?.useState ?? BuseState;
// 专用布尔状态管理
export function useBoolean(
	initial: boolean = false
): [
	boolean,
	{ setTrue: () => void; setFalse: () => void; toggle: () => void }
] {
	const [state, setState] = useState()(initial);
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
	const [state, setState] = useState()(initial);
	const toggle = () => setState(!state);
	return [state, toggle];
}
