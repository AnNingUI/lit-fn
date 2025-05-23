## lit-fn  [![npm version](https://img.shields.io/npm/v/lit-fn.svg)](https://www.npmjs.com/package/lit-fn) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/AnNingUI/lit-fn)

一个基于 Lit 的函数式组件框架，提供类似 React Hooks 的能力，让你可以在 Web Components 中轻松使用 `useState`、`useEffect`、`useMemo` 等 Hooks。

---

### 特性

* 基于 Lit 的渲染层，性能优秀
* 部分常用的 Hook 系统：状态管理、生命周期、异步、事件、上下文等
* 简单的函数式组件定义：使用 `defineComponent` / `createComponent`
* 支持 TypeScript，内置类型定义
* 一键打包多种模块格式：ESM、CJS、UMD

---

### 安装

```bash
npm install lit-fn lit
# 或者使用 Yarn
yarn add lit-fn lit
# 或者使用 PNPM
pnpm add lit-fn lit
```

> 注意：`lit` 为 peerDependency，需要额外安装。

---

### 快速开始

```ts
import { defineComponent } from "lit-fn";
import { html } from "lit";

// 定义组件
const MyCounter = defineComponent("my-counter", (props: { initial?: number }) => {
  const [count, setCount] = useState(props.initial ?? 0);
  return html`
    <button @click=${() => setCount(count + 1)}>
      点击次数：${count}
    </button>
  `;
}, { props: ["initial"] });

// 在页面中使用
// <my-counter initial="10"></my-counter>
```

---

### API 概览

#### `defineComponent`

```ts
type ComponentFn<T = any> = (props: T, ctx: ComponentContext<T>) => TemplateResult;
type ComponentOptions<T = any> = {
    style?: string | CSSResult | CSSResult[] | string[] | (CSSResult | string)[];
    props?: (keyof T)[];
    mixinFn?: <T extends new (...args: any) => F, F extends HTMLElement>(clazz: T) => T;
};
type LowercaseDashString<T extends string> = T extends `${string}-${string}` ? T extends Lowercase<T> ? T : never : never;
type TagOptions<T extends string> = {
    name: LowercaseDashString<T>;
    extends: keyof HTMLElementTagNameMap;
};
export interface ComponentClass<T> {
    get tag(): string;
    get props(): T;
}
export interface ComponentContext<T> extends ComponentClass<T> {
    onAdopted: (callback: () => void) => void;
    lazy<Args extends any[]>(callback: () => (...args: Args) => TemplateResult): (...args: Args) => TemplateResult;
}
export declare function defineComponent<T, Name extends string>(
  tag: LowercaseDashString<Name> | TagOptions<Name>, 
  component: ComponentFn<T>, 
  options?: ComponentOptions<T>
): ComponentClass<T>;
export declare function createComponent<T>(component: ComponentFn<T>, options?: ComponentOptions<T>): {
    register: <S extends string>(tag: LowercaseDashString<S> | TagOptions<S>) => ComponentClass<T>;
};

```

* `tag`: 自定义元素标签名（或带 extends 配置）
* `renderFn`: 渲染函数，接收 `props`，返回 `TemplateResult`
* `options.props`: 属性列表，会自动映射属性到 props
* `style`: 作用域样式

---

#### Hooks 列表

* **useState**: 在函数组件中声明状态变量，并返回当前状态和更新函数。

* **useReducer**: 类似 `useState`，但使用 reducer 函数管理复杂状态逻辑。

* **useSetState**: 对象状态合并更新，保留旧值并只修改指定属性。

* **useEffect**: 在渲染后执行副作用，并可返回清理函数。

* **useLayoutEffect**: 与 `useEffect` 类似，但在 DOM 更新之前同步触发。

* **useUpdateEffect**: 跳过首次渲染，只在依赖变化时执行副作用。

* **useMemo**: 缓存计算结果，只有在依赖变更时重新计算。

* **useCallback**: 缓存函数引用，避免在依赖未变时重新创建。

* **useMemoizedFn**: 始终保持同一个函数引用，但内部调用更新。

* **useRef**: 创建可变引用对象，可跨渲染保持不变。

* **usePrevious**: 获取上一次渲染时的值。

* **useLatest**: 总是返回最新值的引用对象。

* **createContext**: 创建共享上下文，用于组件树之间传递数据。

* **useContext**: 订阅并使用上下文中的当前值。

* **useEventBus**: 获取同一个 `EventBus` 实例，用于组件间事件总线。

* **useEmitter**: 订阅 `EventBus` 中的特定事件并自动清理监听器。

* **useEventListener**: 在指定目标上绑定并自动清理事件监听。

* **useOnClickOutside**: 点击组件外部时触发回调。

* **useLongPress**: 监听长按事件。

* **useResizeObserver**: 监听元素尺寸变化。

* **useTimeout**: 在指定延迟后执行一次回调。

* **useInterval**: 在指定间隔内重复执行回调。

* **useDebounce**: 返回防抖后的值，只在静止后更新。

* **useThrottle**: 返回节流后的值，限制更新频率。

* **useDebounceFn**: 返回防抖后的函数版本。

* **useThrottleFn**: 返回节流后的函数版本。

* **useMount**: 组件首次挂载时执行回调。

* **useUnmount**: 组件卸载时执行回调。

* **useIsMounted**: 获取组件挂载状态的函数。

* **useCounter**: 提供增、减、重置功能的计数器 Hook。

* **useBoolean**: 管理布尔状态，包括开、关、切换操作。

* **useToggle**: 简化的布尔切换 Hook。

* **useRerender**: 强制组件重新渲染的函数。

* **useUpdate**: 在组件更新时（不含首次）执行回调。

* **useId**: 生成唯一 ID，常用于表单元素等。

* **useImperativeHandle**: 在父组件中暴露子组件实例方法。

* **useTransition**: 管理异步过渡状态，提供 pending/loading 指示。

* **useDeferredValue**: 延迟更新值，用于优化渲染优先级。

* **useOptimistic**: 支持乐观更新的状态管理。

* **useActionState**: 管理异步动作的 pending 和错误状态。

* **useFormState**: `useActionState` 的表单专用别名。

---

### 最佳实践

先使用`vite`创建`lit`项目再引入`lit-fn`：

```bash
pnpm create vite my-app --template lit
cd my-app
pnpm i lit-fn
```
然后在`src/components/my-counter.ts`中定义组件：
```ts
import { createComponent, useState } from "lit-fn";
import { html } from "lit";

export const MyCounter = createComponent((props: { initial?: number }) => {
  const [count, setCount] = useState(props.initial ?? 0);
  return html`
    <button @click=${() => setCount(count + 1)}>
      点击次数：${count}
    </button>
  `;
}, { props: ["initial"] });
```
再`src/main.ts`中注册组件
```ts
import { MyCounter } from "./components/my-counter";
MyCounter.register("my-counter");
```
最后在`index.html`中使用组件
```html
...
<script type="module" src="/src/main.ts"></script>
...
<my-counter initial="10"></my-counter>
```

### 注意事项
> [对于箭头函数组件TDZ(Uncaught ReferenceError: Cannot access 'xxx' before initialization)问题的处理](./Precautions/TDZ.md)
> [任何创建hook适配器](./Precautions/Adapter.md)