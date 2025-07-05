import { html } from "lit";
import { createComponent } from "../fwc";
import { count } from "./store";

// initGlobalCSS([
// 	css`
// 		* {
// 			background-color: #000000;
// 		}
// 	`,
// ]);

export const AppMain = createComponent(() => {
	// 将箭头函数组件的this移动到组件实例上
	const hc = (a: number, b: number) => {
		return html`
			<div>${a + b}</div>
			<div>${count.value}</div>
			<button @click="${() => count.increment()}">+</button>
			<button @click=${() => count.decrement()}>-</button>
		`;
	};

	return html`
		<main>
			${hc(1, 2)}
			<slot></slot>
		</main>
	`;
});
