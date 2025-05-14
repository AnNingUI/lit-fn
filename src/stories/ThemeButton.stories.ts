import type { Meta } from "@storybook/web-components";
import { html } from "lit";
import "./ThemeButton";
const themeShow = () => html`
	<main>
		<theme-display></theme-display>
		<theme-button></theme-button>
	</main>
`;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
	title: "LitFn/ThemeButton",
	tags: ["autodocs"],
	render: () => themeShow(),
} satisfies Meta;

export default meta;
export const Show = {};
