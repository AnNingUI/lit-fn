import { createProxy } from "@/proxy";

export const count = createProxy({
	value: 0,
	name: "count",
	increment: () => count.value++,
	decrement: () => count.value--,
});
