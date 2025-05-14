import { html } from "lit";
import { createContext, defineComponent, useContext, useState } from "../index";

const ThemeContext = createContext("light");

export const ThemeButton = defineComponent("theme-button", (_) => {
	const [theme, setTheme] = useState("light");

	return ThemeContext.Provider(theme)(
		html`
			<button @click=${() => setTheme(theme === "light" ? "dark" : "light")}>
				Theme: ${theme}
			</button>
		`
	);
});

export const ThemeDisplay = defineComponent("theme-display", (_, ctx) => {
	const theme = useContext(ThemeContext);

	return html`
		<div>
			<div>Current theme: ${theme}</div>
			${ctx.lazy(counter)()}
		</div>
	`;
});
const counter = () => {
	const [count, setCount] = useState(0);
	return html`
		<div>
			<h1>Counter</h1>
			<button @click=${() => setCount(count + 1)}>Increment</button>
			<p>Count: ${count}</p>
		</div>
	`;
};
