import { useState } from "@/hooks";
import { html } from "lit";
import { createComponent } from "../fwc";

export const AppMain = createComponent((_, ctx) => {
	// 将箭头函数组件的this移动到组件实例上
	const hc = ctx.lazy(() => hookCallback);
	return html`
		<main>
			${hc(1, 2)}
			<slot></slot>
		</main>
	`;
});

const hookCallback = (a: number, b: number) => {
	const [s, ss] = useState(0);
	return html`
		<div>${a + b}</div>
		<div>${s}</div>
		<button @click=${() => ss(s + 1)}>+</button>
		<button @click=${() => ss(s - 1)}>-</button>
	`;
};
