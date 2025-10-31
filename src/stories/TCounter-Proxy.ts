import { css, html } from "lit";
// 推荐使用 lit 自带的 map 指令 来渲染数组，而不是 数组的 map 方法
import { map } from "lit/directives/map.js";
import { defineComponent } from "../fwc";
import { createProxy, ProxyReflect } from "../proxy";

// 创建响应式对象
const state = createProxy({
	count: 0,
	user: {
		name: "张三",
		age: 25,
	},
	items: ["item1", "item2"],
});

const push = <T extends K[], K>(item: K) => {
	return (self: T) => Array.prototype.push.call(self, item);
};
export const TCounter = defineComponent(
	"t-counter",
	() => {
		// 对于 数组 代理对象我们需要通过 ProxyReflect 来获取到一个 $set 方法对象来进行修改，负责会导致视图不更新
		const setItemsCallback = ProxyReflect.$get(state, "items");
		const pushItem3 = push("item");
		const onClick = setItemsCallback.$set(pushItem3);
		return html`
			<div>
				<p>计数: ${state.count}</p>
				<p>用户名: ${state.user.name}</p>
				<p>年龄: ${state.user.age}</p>
				<ul>
					${map(state.items, (item) => html`<li>${item}</li>`)}
				</ul>
				<button @click=${() => state.count++}>增加</button>
				<button
					@click=${() => {
						state.user.name = "李四";
						state.user.age = 30;
					}}
				>
					更新用户
				</button>
				<!-- 这里的 $set 方法返回一个执行修改数据的 callback 函数 -->
				<!-- 这个callback 在执行了用户传入的 callback后会进行数据与视图的同步更新 -->
				<button @click=${onClick}>添加项目</button>
			</div>
		`;
	},
	{
		style: css`
			p {
				margin: 10px;
			}
			ul {
				list-style: none;
				padding: 0;
			}
			li {
				margin: 5px;
			}
			button {
				margin: 10px;
			}
		`,
	}
);
