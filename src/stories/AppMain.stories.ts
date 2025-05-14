import type { Meta } from "@storybook/web-components";

import { html } from "lit";
import { AppMain } from "./AppMain";
AppMain.register("app-main");
const AppMainShow = () => html` <app-main></app-main> `;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
	title: "LitFn/AppMain",
	tags: ["autodocs"],
	render: () => AppMainShow(),
} satisfies Meta;

export default meta;
export const Show = {};
