import { html } from "lit";
import { createComponent } from "../fwc";

export const AppMain = createComponent(() => {
	return html`
		<main>
			<slot></slot>
		</main>
	`;
});
