* **Hooks** 必须在`createComponent`或者`defineComponent`中调用，可以在类组件(在this.render函数中使用，但是不推荐，`lit`对类组件提供了更好的支持)，可以再箭头函数组件(或匿名组件)中调用，但请再需注册组件中使用前让JS引擎加载完毕，否则可能会因为[TDZ](https://www.freecodecamp.org/news/what-is-the-temporal-dead-zone/) Error导致渲染阻塞。
错误示范，此外，避免在条件语句或循环中创建 Hooks，以保证每次渲染时 Hook 的调用顺序一致。
```js
import { html } from "lit";
import { createContext, defineComponent, useContext, useState } from "lit-fn";

const ThemeContext = createContext("light");

export const ThemeButton = defineComponent("theme-button", (_) => {
	const [theme, setTheme] = useState("light");

	return ThemeContext.Provider({
		value: theme,
		children: html`
			<button @click=${() => setTheme(theme === "light" ? "dark" : "light")}>
				Theme: ${theme}
			</button>
		`,
	});
});

export const ThemeDisplay = defineComponent("theme-display", (_) => {
	const theme = useContext(ThemeContext);

	return html`
		<div>
			<div>Current theme: ${theme}</div>
			${counter()}
		</div>
	`;
});

// 匿名组件通过箭头函数构建在 ThemeDisplay 外部
// 导致Hooks无法识别当前组件导致渲染阻塞
// Uncaught ReferenceError: Cannot access 'counter' before initialization
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
```

正确示范
```js
import { html } from "lit";
import { createContext, defineComponent, useContext, useState } from "lit-fn";

const ThemeContext = createContext("light");

export const ThemeButton = defineComponent("theme-button", (_) => {
	const [theme, setTheme] = useState("light");

	return ThemeContext.Provider({
		value: theme,
		children: html`
			<button @click=${() => setTheme(theme === "light" ? "dark" : "light")}>
				Theme: ${theme}
			</button>
		`,
	});
});

export const ThemeDisplay = defineComponent("theme-display", (_) => {
	const theme = useContext(ThemeContext);
  // 匿名组件在 ThemeDisplay 内部构建
  // 通过箭头函数包裹，可以访问到当前组件的状态，与ThemeDisplay共享状态
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
	return html`
		<div>
			<div>Current theme: ${theme}</div>
			${counter()}
		</div>
	`;
});


// 当然也可以用function定义外部的普通函数组件，因为function定义的函数会在执行时获取执行域的this指针，所以可以访问到组件的状态
// 或者说将箭头函数定义在组件前面，让JS引擎提前加载counter组件，避免渲染阻塞
function counter() {
	const [count, setCount] = useState(0);
	return html`
		<div>
			<h1>Counter</h1>
			<button @click=${() => setCount(count + 1)}>Increment</button>
			<p>Count: ${count}</p>
		</div>
	`;
}


```
如果你习惯在需要及时注册的组件下面定义箭头函数（即匿名组件），可以在 `defineComponent` 中通过 `ctx.lazy` 函数导入外部定义的箭头函数组件。该功能自 0.1.5 版本起支持。
```ts
export const ThemeDisplay = defineComponent("theme-display", (_, ctx) => {
	const theme = useContext(ThemeContext);
	const _counter = ctx.lazy(() => counter); // 修改外部箭头函数(匿名组件)在组件实例注册后再导入
	return html`
		<div>
			<div>Current theme: ${theme}</div>
			${_counter()}
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
```
但是我们不推荐这样子做，因为`ctx.lazy`本质时先tryCatch查找问题，如果箭头函数（即匿名组件）还没有被js加载
则延迟0秒到任务队列再继续更新组件，从而同步渲染，这会导致大型组件渲染延迟注册或者渲染慢的问题

所以规范编码从你我做起