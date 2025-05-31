// 文件: src/components/async-data-component.ts
import { useEffect } from "@/hooks/effect";
import { css, html } from "lit";
import { createComponent } from "../fwc";
import { useAsync } from "../hooks/async";

// 定义 props 类型
interface AsyncDataProps {
	url: string;
}

// 定义组件
export const AsyncDataComponent = createComponent<AsyncDataProps>(
	(props, _) => {
		// 使用 useAsync Hook 获取数据
		const { loading, error, data, run } = useAsync(
			async () => {
				const res = await fetch(props.url);
				if (!res.ok) throw new Error("请求失败");
				return res.json();
			},
			{
				immediate: true,
			}
		);
		useEffect(() => {
			run();
		}, [props.url]);

		// 根据状态渲染不同 UI
		if (loading) {
			return html`<div>加载中...</div>`;
		}

		if (error) {
			return html`<div style="color: red;">错误: ${error.message}</div>`;
		}

		return html`
			<div>
				<h3>获取到的数据：</h3>
				<pre>${JSON.stringify(data, null, 2)}</pre>
			</div>
		`;
	},
	{
		props: ["url"],
		style: css`
			:host {
				display: block;
				padding: 1em;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-family: sans-serif;
			}
			pre {
				background: #f9f9f9;
				padding: 1em;
				overflow-x: auto;
			}
		`,
	}
);
