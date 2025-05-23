import { HooksAdapterInterface } from "./hooks/adapter/index";
import * as basic from "./hooks/basic";

let _hooksAdapter: HooksAdapterInterface = basic;
export const basicAdapter = basic;
export const hooksAdapter = {
	get current(): HooksAdapterInterface {
		return _hooksAdapter ?? basic;
	},
	set current(value: HooksAdapterInterface) {
		_hooksAdapter = value;
	},
};
