import { useState } from "../state";

// 计数器
export function useCounter(
	initial: number = 0,
	step: number = 1
): [number, { inc: () => void; dec: () => void; reset: () => void }] {
	const [count, setCount] = useState(initial);
	return [
		count,
		{
			inc: () => setCount(count + step),
			dec: () => setCount(count - step),
			reset: () => setCount(initial),
		},
	];
}
