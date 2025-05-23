为了适应其他框架的响应式以及做底层的个性化定制，我们创建了一个Hooks适配器，但使用适配器时，原来的hooks不在默认的行为而是走新的适配器流程。

## 创建适配器
```js
// in main.ts
import { hooks } from "lit-fn/adaper";
type BasicHooks = hooks.BasicHooksAdapter; // 基础hooks
type Hooks = hooks.HooksAdapterInterface; // 包含了基础hooks与基于基础hooks封装的hooks
// 在这里实现二者接口其中之一
class MyHooks implements Hooks | BasicHooks {}
// 在这里使用适配器
hooks.useHookAdapter(new MyHooks());
```