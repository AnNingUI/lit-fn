import type { Meta } from "@storybook/web-components";
import { html } from "lit";
import { AsyncDataComponent } from "./async-data-component";
AsyncDataComponent.register("async-data-component");
// 注册主组件

// 默认 URL 参数
const DEFAULT_URL = "https://jsonplaceholder.typicode.com/posts/1";

// 可配置的组件模板
const AppMainShow = (args: any) => {
	return html` <async-data-component .url=${args.url}></async-data-component> `;
};

// Story 配置
const meta = {
	title: "LitFn/useAsync",
	tags: ["autodocs"],
	render: (args) => {
		return AppMainShow(args);
	},
	argTypes: {
		url: {
			control: "text",
			name: "URL",
			description: "要请求的数据地址",
			defaultValue: DEFAULT_URL,
		},
	},
} satisfies Meta;

export default meta;

// 默认故事
export const Show = {
	args: {
		url: DEFAULT_URL,
	},
};
