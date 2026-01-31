import Handlebars from "handlebars";
import type { HelperOptions, TemplateDelegate } from "handlebars";
import { stringify as stringifyYaml } from "yaml";

let _handlebars: ReturnType<typeof Handlebars.create> | undefined = undefined;
const Utils = Handlebars.Utils;
type Func = (...args: unknown[]) => unknown;
const hbError = (message: string): Error => new Handlebars.Exception(message) as Error;

const hbEnv = new Map<string, string | number>();

export function resetHbEnv(
	newEnv?: Record<string, string | number> | Map<string, string | number>
): void {
	hbEnv.clear();
	if (newEnv) {
		if (newEnv instanceof Map) {
			for (const [key, value] of newEnv) {
				hbEnv.set(key, value);
			}
			return;
		}

		for (const [key, value] of Object.entries(newEnv)) {
			hbEnv.set(key, value);
		}
	}
}

export function setHbEnv(key: string, value: string | number | null): void {
	if (value === null || value === undefined) {
		hbEnv.delete(key);
		return;
	}
	if (typeof value !== "string") {
		throw new Error("value must be string");
	}
	hbEnv.set(key, value);
}

export function getHbEnv(key: string): string | number | null {
	return hbEnv.get(key) ?? null;
}

export function getHandlebars() {
	if (_handlebars) {
		return _handlebars;
	}

	const handlebars = Handlebars.create();

	handlebars.registerHelper(
		"if",
		function (
			this: TemplateDelegate,
			conditional: unknown,
			truthyOrOptions: unknown,
			falsy: unknown,
			mayOptions: HelperOptions
		) {
			if (arguments.length == 2) {
				const options = truthyOrOptions as HelperOptions;

				const hasFunc =
					Utils.isFunction(options.fn) ||
					Utils.isFunction(options.inverse);
				if (!hasFunc) {
					throw hbError("#if requires blocks");
				}

				if (Utils.isFunction(conditional)) {
					conditional = (conditional as Func).call(this);
				}

				if (
					(!options.hash.includeZero && !conditional) ||
					Utils.isEmpty(conditional)
				) {
					return options.inverse(this);
				} else {
					return options.fn(this);
				}
			}

			if (arguments.length == 4) {
				const options = mayOptions;
				let truthy = truthyOrOptions;

				const hasFunc =
					Utils.isFunction(options.fn) ||
					Utils.isFunction(options.inverse);
				if (hasFunc) {
					throw hbError(
						"inline if should not have block"
					);
				}

				if (Utils.isFunction(conditional)) {
					conditional = (conditional as Func).call(this);
				}

				if (
					(!options.hash.includeZero && !conditional) ||
					Utils.isEmpty(conditional)
				) {
					if (Utils.isFunction(falsy)) {
						falsy = (falsy as Func).call(this);
					}
					return falsy;
				} else {
					if (Utils.isFunction(truthy)) {
						truthy = (truthy as Func).call(this);
					}
					return truthy;
				}
			}

			throw hbError(
				"#if requires one, inline-if requires three arguments"
			);
		}
	);

	handlebars.registerHelper(
		"ifText",
		function (
			this: TemplateDelegate,
			conditional: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"#ifText requires exactly one argument"
				);
			}
			if (typeof conditional === "string") {
				return options.fn(this);
			}
			return options.inverse(this);
		}
	);

	handlebars.registerHelper(
		"ifObject",
		function (
			this: TemplateDelegate,
			conditional: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"#ifObject requires exactly one argument"
				);
			}
			if (
				typeof conditional === "object" &&
				conditional !== null &&
				!Array.isArray(conditional)
			) {
				return options.fn(this);
			}

			return options.inverse(this);
		}
	);

	handlebars.registerHelper(
		"ifEquals",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"#ifEquals requires exactly one argument"
				);
			}
			if (a === b) {
				return options.fn(this);
			}

			return options.inverse(this);
		}
	);

	handlebars.registerHelper(
		"asArray",
		function (this: TemplateDelegate, context, options: HelperOptions) {
			if (arguments.length != 2) {
				throw hbError(
					"asArray requires exactly one argument"
				);
			}

			if (Utils.isFunction(context)) {
				context = (context as Func).call(this);
			}

			if (!Array.isArray(context)) {
				context = [context];
			}

			return context;
		}
	);

	handlebars.registerHelper(
		"asObject",
		function (this: TemplateDelegate, val, key, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"asObject requires exactly two arguments"
				);
			}

			if (typeof key !== "string") {
				throw hbError(
					"asObject requires key as string"
				);
			}

			if (val === null || val === undefined) {
				return {};
			}

			if (Array.isArray(val)) {
				return {
					[key]: val,
				};
			}

			if (typeof val === "object") {
				return val;
			}

			return {
				[key]: val,
			};
		}
	);

	handlebars.registerHelper(
		"repeatText",
		function (
			this: TemplateDelegate,
			text: unknown,
			count: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"repeatText requires exactly two arguments"
				);
			}

			if (Utils.isFunction(text)) {
				text = (text as Func).call(this);
			}

			if (typeof text !== "string") {
				throw hbError(
					"repeatText requires text as string"
				);
			}

			if (Utils.isFunction(count)) {
				count = (count as Func).call(this);
			}

			if (typeof count !== "number") {
				throw hbError(
					"repeatText requires count as number"
				);
			}

			const result: string[] = [];
			for (let i = 0; i < count; i++) {
				result.push(text);
			}
			return result.join("");
		}
	);

	handlebars.registerHelper(
		"noSpace",
		function (
			this: TemplateDelegate,
			text: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"noSpace requires exactly one argument"
				);
			}

			if (typeof text !== "string") {
				throw hbError(
					"noSpace requires text as string"
				);
			}

			return text.replace(/\s/g, "");
		}
	);

	handlebars.registerHelper(
		"regexp",
		function (
			this: TemplateDelegate,
			pattern: string | RegExp,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"regexp requires exactly one argument"
				);
			}

			if (pattern instanceof RegExp) {
				return pattern;
			}

			if (typeof pattern !== "string") {
				throw hbError(
					"regexp requires pattern as string or RegExp"
				);
			}

			let flags = options.hash.flags as string | undefined;
			if (!flags) {
				flags = "g";
			} else if (typeof flags !== "string") {
				throw hbError(
					"regexp requires flags as string"
				);
			} else if (!flags.includes("g")) {
				flags += "g";
			}

			return new RegExp(pattern, flags);
		}
	);

	handlebars.registerHelper(
		"replace",
		function (
			this: TemplateDelegate,
			text: unknown,
			from: string | RegExp,
			to: string,
			options: HelperOptions
		) {
			if (arguments.length != 4) {
				throw hbError(
					"replace requires exactly three arguments"
				);
			}

			if (typeof text !== "string") {
				throw hbError(
					"replace requires text as string"
				);
			}

			if (typeof from !== "string" && !(from instanceof RegExp)) {
				throw hbError(
					"replace requires from as string or RegExp"
				);
			}

			if (typeof to !== "string") {
				throw hbError("replace requires to as string");
			}

			return text.replaceAll(from, to);
		}
	);

	handlebars.registerHelper(
		"escapeTemplate",
		function (
			this: TemplateDelegate,
			text: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"force_code requires exactly one argument"
				);
			}

			if (typeof text !== "string") {
				throw hbError(
					"force_code requires text as string"
				);
			}

			return text.replaceAll("{", "｛").replaceAll("}", "｝");
		}
	);

	handlebars.registerHelper(
		"eq",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"eq requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a === b;
		}
	);

	handlebars.registerHelper(
		"neq",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"neq requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a !== b;
		}
	);

	handlebars.registerHelper(
		"lt",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"lt requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a < b;
		}
	);

	handlebars.registerHelper(
		"gt",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"gt requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a > b;
		}
	);

	handlebars.registerHelper(
		"lte",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"lte requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a <= b;
		}
	);

	handlebars.registerHelper(
		"gte",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"gte requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			return a >= b;
		}
	);

	function deepEqArr(a: unknown[], b: unknown[]) {
		if (a.length !== b.length) {
			return false;
		}

		for (let i = 0; i < a.length; i++) {
			if (!deepEq(a[i], b[i])) {
				return false;
			}
		}

		return true;
	}

	function deepEqObj(
		a: Record<string | symbol | number, unknown>,
		b: Record<string | symbol | number, unknown>
	) {
		const aKeys = Object.keys(a);
		const bKeys = new Set(Object.keys(b));

		if (aKeys.length !== bKeys.size) {
			return false;
		}

		for (const key of aKeys) {
			if (!bKeys.has(key)) {
				return false;
			}
			const aVal = a[key];
			const bVal = b[key];
			if (!deepEq(aVal, bVal)) {
				return false;
			}
		}

		return true;
	}

	function deepEq(a: unknown, b: unknown) {
		if (typeof a !== typeof b) {
			return false;
		}

		if (a === b) {
			return true;
		}

		if (a === null || b === null || a === undefined || b === undefined) {
			return a === b;
		}

		if (Array.isArray(a) && Array.isArray(b)) {
			return deepEqArr(a, b);
		}

		if (typeof a === "object" && typeof b === "object") {
			return deepEqObj(
				a as Record<string | symbol | number, unknown>,
				b as Record<string | symbol | number, unknown>
			);
		}

		return false;
	}

	handlebars.registerHelper(
		"deepEq",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"deepEq requires exactly two arguments"
				);
			}

			return deepEq(a, b);
		}
	);

	handlebars.registerHelper(
		"deepNeq",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"deepNeq requires exactly two arguments"
				);
			}

			return !deepEq(a, b);
		}
	);

	handlebars.registerHelper(
		"and",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"and requires at least one argument"
				);
			}

			const options = args.pop() as HelperOptions;

			let val: unknown = false;
			for (val of args) {
				if (Utils.isFunction(val)) {
					val = (val as Func).call(this);
				}

				if ((!options.hash.includeZero && !val) || Utils.isEmpty(val)) {
					return false;
				}
			}

			return val;
		}
	);

	handlebars.registerHelper(
		"or",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"or requires at least one argument"
				);
			}

			const options = args.pop() as HelperOptions;

			let val: unknown = false;
			for (val of args) {
				if (Utils.isFunction(val)) {
					val = (val as Func).call(this);
				}

				if (
					!((!options.hash.includeZero && !val) || Utils.isEmpty(val))
				) {
					return val;
				}
			}

			return false;
		}
	);

	handlebars.registerHelper(
		"not",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"not requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if ((!options.hash.includeZero && !val) || Utils.isEmpty(val)) {
				return true;
			} else {
				return false;
			}
		}
	);

	handlebars.registerHelper(
		"notNull",
		function (this: TemplateDelegate, ...args: unknown[]) {
			args.pop() as HelperOptions;

			for (const arg of args) {
				if (arg !== null && arg !== undefined) {
					return arg;
				}
			}

			return null;
		}
	);

	handlebars.registerHelper(
		"concat",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"concat requires at least one argument"
				);
			}

			args.pop();

			const result: string[] = [];
			for (let arg of args) {
				if (Utils.isFunction(arg)) {
					arg = (arg as Func).call(this);
				}
				result.push(String(arg));
			}

			return result.join("");
		}
	);

	handlebars.registerHelper(
		"length",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"length requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (Array.isArray(val)) {
				return val.length;
			}
			if (typeof val === "string") {
				return val.length;
			}
			if (typeof val === "object" && val !== null) {
				return Object.keys(val).length;
			}

			return 0;
		}
	);

	handlebars.registerHelper(
		"keyExists",
		function (
			this: TemplateDelegate,
			key: unknown,
			obj: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"keyExists requires exactly two arguments"
				);
			}

			if (Utils.isFunction(key)) {
				key = (key as Func).call(this);
			}

			if (Utils.isFunction(obj)) {
				obj = (obj as Func).call(this);
			}

			if (key === null || key === undefined) {
				return false;
			}

			if (Array.isArray(obj)) {
				if (typeof key !== "number") {
					return false;
				}
				return key in obj;
			}

			if (obj === null || obj === undefined) {
				return false;
			}

			if (typeof obj !== "object") {
				return false;
			}

			return (key as string) in obj;
		}
	);

	handlebars.registerHelper(
		"contains",
		function (
			this: TemplateDelegate,
			val: unknown,
			arr: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"contains requires exactly two arguments"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (Utils.isFunction(arr)) {
				arr = (arr as Func).call(this);
			}

			if (arr === null || arr === undefined) {
				return false;
			}

			if (Array.isArray(arr)) {
				if (val instanceof RegExp) {
					for (const item of arr) {
						if (val.test(item)) {
							return true;
						}
					}
					return false;
				}
				return arr.includes(val);
			}

			if (typeof arr === "object") {
				return Object.values(arr).includes(val);
			}

			if (typeof arr === "string") {
				if (val instanceof RegExp) {
					if (val.test(arr)){
						return true;
					}
					return false;
				}
				if (typeof val !== "string" && typeof val !== "number") {
					return false;
				}
				return arr.includes(String(val));
			}

			return false;
		}
	);

	handlebars.registerHelper(
		"indexOf",
		function (
			this: TemplateDelegate,
			val: unknown,
			arr: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"indexOf requires exactly two arguments"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (Utils.isFunction(arr)) {
				arr = (arr as Func).call(this);
			}

			if (arr === null || arr === undefined) {
				return undefined;
			}

			if (Array.isArray(arr)) {
				const result = arr.indexOf(val);
				if (result < 0) {
					return undefined;
				}
				return result;
			}

			if (typeof arr === "object") {
				for (const [idx, value] of Object.entries(arr)) {
					if (value === val) {
						return idx;
					}
				}
				return undefined;
			}

			if (typeof arr === "string") {
				if (typeof val !== "string" && typeof val !== "number") {
					return undefined;
				}
				return arr.indexOf(String(val));
			}

			return undefined;
		}
	);

	handlebars.registerHelper(
		"merge",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"merge requires exactly two arguments"
				);
			}

			args.pop() as HelperOptions;

			let first = args.shift();
			if (Utils.isFunction(first)) {
				first = (first as Func).call(this);
			}

			if (first === null || first === undefined) {
				throw hbError(
					"merge requires object or array argument[0]"
				);
			}

			if (Array.isArray(first)) {
				const result: unknown[] = [...first];

				for (const [idxMinus1, _arg] of args.entries()) {
					const arg = Utils.isFunction(_arg)
						? (_arg as Func).call(this)
						: _arg;

					if (!Array.isArray(arg)) {
						throw hbError(
							`merge requires array as argument[${idxMinus1 + 1}]`
						);
					}

					result.push(...arg);
				}
				return result;
			}

			if (typeof first !== "object") {
				throw hbError(
					"merge requires object or array argument[0]"
				);
			}

			const result: Record<string | symbol | number, unknown> = {
				...first,
			};
			for (const [key, _arg] of Object.entries(args)) {
				const arg = Utils.isFunction(_arg)
					? (_arg as Func).call(this)
					: _arg;

				if (Array.isArray(arg)) {
					throw hbError(
						`merge requires object as argument[${key}]`
					);
				}

				if (arg === null || arg === undefined) {
					throw hbError(
						`merge requires object as argument[${key}]`
					);
				}

				if (typeof arg !== "object") {
					throw hbError(
						`merge requires object as argument[${key}]`
					);
				}

				for (const [key, value] of Object.entries(arg)) {
					result[key] = value;
				}
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"slice",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"slice requires at least two arguments"
				);
			}

			args.pop() as HelperOptions;

			let [val, start, end] = args;

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (Utils.isFunction(start)) {
				start = (start as Func).call(this);
			}

			if (Utils.isFunction(end)) {
				end = (end as Func).call(this);
			}

			if (!Array.isArray(val) && typeof val !== "string") {
				throw hbError(
					"slice requires array as argument[0]"
				);
			}

			if (typeof start !== "number" && start !== undefined) {
				throw hbError(
					"slice requires number as argument[1]"
				);
			}

			if (typeof end !== "number" && end !== undefined) {
				throw hbError(
					"slice requires number as argument[2]"
				);
			}

			return val.slice(start, end);
		}
	);

	handlebars.registerHelper(
		"range",
		function (this: TemplateDelegate, ..._args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"range requires at least two arguments"
				);
			}

			_args.pop();

			let [start, end, step] = _args as [
				number | undefined | Func,
				(number | undefined | Func)?,
				(number | undefined | Func)?
			];

			if (Utils.isFunction(start)) {
				start = (start as Func).call(this) as number | undefined;
			}

			if (Utils.isFunction(end)) {
				end = (end as Func).call(this) as number | undefined;
			}

			if (Utils.isFunction(step)) {
				step = (step as Func).call(this) as number | undefined;
			}

			const result: number[] = [];

			if (typeof start !== "number") {
				throw hbError(
					"range requires number as argument[0]"
				);
			}

			if (typeof end !== "number" && end !== undefined) {
				throw hbError(
					"range requires number as argument[1]"
				);
			}

			if (typeof step !== "number" && step !== undefined) {
				throw hbError(
					"range requires number as argument[2]"
				);
			}

			if (end === undefined && step !== undefined) {
				throw hbError(
					"range requires end as argument[1] when step is given"
				);
			}

			if (step === undefined) {
				step = 1;
			}

			if (end === undefined) {
				end = start;
				start = 0;
			}

			if (step === 0) {
				throw hbError(
					"range requires step as non-zero number"
				);
			}

			if (step < 0) {
				for (let i = start; i > end; i += step) {
					result.push(i);
				}
				return result;
			}

			for (let i = start; i < end; i += step) {
				result.push(i);
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"isString",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isString requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return typeof val === "string";
		}
	);

	handlebars.registerHelper(
		"isText",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isText requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return typeof val === "string";
		}
	);

	handlebars.registerHelper(
		"isNumber",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isNumber requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return typeof val === "number";
		}
	);

	handlebars.registerHelper(
		"isArray",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isArray requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return Array.isArray(val);
		}
	);

	handlebars.registerHelper(
		"isObject",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isObject requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return (
				typeof val === "object" && val !== null && !Array.isArray(val)
			);
		}
	);

	handlebars.registerHelper(
		"isEmpty",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"isEmpty requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (val === null || val === undefined) {
				return true;
			}

			if (typeof val === "string") {
				return val.length === 0;
			}

			if (Array.isArray(val)) {
				return val.length === 0;
			}

			if (typeof val === "object") {
				return Object.keys(val).length === 0;
			}

			return false;
		}
	);

	handlebars.registerHelper(
		"add",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"add requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			let result = 0;
			for (const arg of args) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}

				if (typeof value !== "number") {
					throw hbError(
						"add requires number as argument"
					);
				}
				result += value;
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"sub",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 3) {
				throw hbError(
					"sub requires at least two arguments"
				);
			}

			args.pop() as HelperOptions;

			let first = args.shift();
			if (Utils.isFunction(first)) {
				first = (first as Func).call(this);
			}
			if (typeof first !== "number") {
				throw hbError(
					"sub requires number as argument[0]"
				);
			}

			let result = first;

			for (const [idxMinus1, arg] of args.entries()) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}
				if (typeof value !== "number") {
					throw hbError(
						`sub requires number as argument[${idxMinus1 + 1}]`
					);
				}
				result -= value;
			}

			return result;
		}
	);

	handlebars.registerHelper(
		"mul",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"mul requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			let result = 1;
			for (const [idx, arg] of args.entries()) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}

				if (typeof value !== "number") {
					throw hbError(
						`mul requires number as argument[${idx}]`
					);
				}
				result *= value;
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"div",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 3) {
				throw hbError(
					"div requires at least two arguments"
				);
			}

			args.pop() as HelperOptions;

			let first = args.shift();
			if (Utils.isFunction(first)) {
				first = (first as Func).call(this);
			}
			if (typeof first !== "number") {
				throw hbError(
					"div requires number as argument[0]"
				);
			}

			let result = first;

			for (const [idxMinus1, arg] of args.entries()) {
				if (Utils.isFunction(arg)) {
					first = (arg as Func).call(this);
				}
				if (typeof arg !== "number") {
					throw hbError(
						`div requires number as argument[${idxMinus1 + 1}]`
					);
				}
				result /= arg;
			}

			return result;
		}
	);

	handlebars.registerHelper(
		"divInt",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 3) {
				throw hbError(
					"divInt requires at least two arguments"
				);
			}

			args.pop() as HelperOptions;

			let first = args.shift();
			if (Utils.isFunction(first)) {
				first = (first as Func).call(this);
			}
			if (typeof first !== "number") {
				throw hbError(
					"divInt requires number as argument[0]"
				);
			}

			let result = first;

			for (const [idxMinus1, arg] of args.entries()) {
				if (Utils.isFunction(arg)) {
					first = (arg as Func).call(this);
				}
				if (typeof arg !== "number") {
					throw hbError(
						`divInt requires number as argument[${idxMinus1 + 1}]`
					);
				}
				result = Math.floor(result / arg);
			}

			return result;
		}
	);

	handlebars.registerHelper(
		"mod",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"mod requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			if (typeof a !== "number") {
				throw hbError(
					"mod requires number as argument[0]"
				);
			}

			if (typeof b !== "number") {
				throw hbError(
					"mod requires number as argument[1]"
				);
			}

			return a % b;
		}
	);

	handlebars.registerHelper(
		"avg",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"avg requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			let result = 0;
			for (const arg of args) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}

				if (typeof value !== "number") {
					throw hbError(
						"avg requires number as argument"
					);
				}
				result += value;
			}
			return result / args.length;
		}
	);

	handlebars.registerHelper(
		"max",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"max requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			let result = -Infinity;
			for (const arg of args) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}

				if (typeof value !== "number") {
					throw hbError(
						"max requires number as argument"
					);
				}
				result = Math.max(result, value);
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"min",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"min requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			let result = Infinity;
			for (const arg of args) {
				let value = arg;
				if (Utils.isFunction(value)) {
					value = (value as Func).call(this);
				}

				if (typeof value !== "number") {
					throw hbError(
						"min requires number as argument"
					);
				}
				result = Math.min(result, value);
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"pow",
		function (this: TemplateDelegate, a, b, options: HelperOptions) {
			if (arguments.length != 3) {
				throw hbError(
					"pow requires exactly two arguments"
				);
			}

			if (Utils.isFunction(a)) {
				a = (a as Func).call(this);
			}

			if (Utils.isFunction(b)) {
				b = (b as Func).call(this);
			}

			if (typeof a !== "number") {
				throw hbError(
					"pow requires number as argument[0]"
				);
			}

			if (typeof b !== "number") {
				throw hbError(
					"pow requires number as argument[1]"
				);
			}

			return a ** b;
		}
	);

	handlebars.registerHelper(
		"floor",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"floor requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (typeof val !== "number") {
				throw hbError(
					"floor requires number as argument"
				);
			}

			return Math.floor(val);
		}
	);

	handlebars.registerHelper(
		"ceil",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"ceil requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (typeof val !== "number") {
				throw hbError(
					"ceil requires number as argument"
				);
			}

			return Math.ceil(val);
		}
	);

	handlebars.registerHelper(
		"round",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"round requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (typeof val !== "number") {
				throw hbError(
					"round requires number as argument"
				);
			}

			return Math.round(val);
		}
	);

	handlebars.registerHelper(
		"abs",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"abs requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (typeof val !== "number") {
				throw hbError(
					"abs requires number as argument"
				);
			}

			return Math.abs(val);
		}
	);

	handlebars.registerHelper(
		"toYaml",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"toYAML requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (
				typeof val === "string" ||
				typeof val === "number" ||
				typeof val === "boolean"
			) {
				return stringifyYaml(val);
			}

			const level = options.hash.level ?? 0;
			const indent = options.hash.indent ?? 2;
			const prefix = options.hash.prefix ?? "";

			const yaml = stringifyYaml(val, {
				indent,
			});

			if (level === 0) {
				return prefix + yaml;
			}

			const yamlLines = yaml.split("\n");
			const yamlPrefix = prefix + " ".repeat(indent * level);

			return "\n" + yamlLines.map((line) => yamlPrefix + line).join("\n");
		}
	);

	handlebars.registerHelper(
		"toJson",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"toJSON requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return JSON.stringify(val);
		}
	);

	handlebars.registerHelper(
		"fromJson",
		function (
			this: TemplateDelegate,
			val: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"fromJSON requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			return JSON.parse(val as string);
		}
	);

	handlebars.registerHelper(
		"split",
		function (this: TemplateDelegate, val: unknown, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"split requires at least one argument"
				);
			}

			const sep: string | RegExp = (() => {
				if (args.length == 1) {
					const options = args[0] as HelperOptions;
					if (options.hash.sep) {
						return options.hash.sep as string;
					}
				} else {
					const sep: unknown = args[0];
					if (typeof sep === "string" || sep instanceof RegExp) {
						return sep;
					}
				}
				return "\n";
			})();

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this);
			}

			if (typeof val !== "string") {
				throw hbError(
					"split requires string as argument[0]"
				);
			}

			return val.split(sep);
		}
	);

	handlebars.registerHelper(
		"convertMap",
		function (
			this: TemplateDelegate,
			arr: Record<string, unknown>[],
			keyName: string,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"convertMap requires exactly two arguments"
				);
			}

			if (Array.isArray(arr) === false) {
				throw hbError(
					"convertMap requires array as argument[0]"
				);
			}

			const result: Record<string, unknown> = {};
			for (const [idx, item] of Object.entries(arr)) {
				if (typeof item !== "object") {
					throw hbError(
						"convertMap requires object as argument"
					);
				}

				if (keyName in item) {
					const key = item[keyName];
					if (typeof key === "string" || typeof key === "number") {
						result[key] = item;
					}
					throw hbError(
						`convertMap requires string or number as key(${keyName}) in arr[${idx}]`
					);
				}
			}
			return result;
		}
	);

	handlebars.registerHelper(
		"set",
		function (this: unknown, _context: unknown, ...args: unknown[]) {
			if (args.length % 2 != 1) {
				throw hbError(
					"set requires odd number of arguments"
				);
			}

			const options = args.pop() as HelperOptions;

			if (Utils.isFunction(options.fn)) {
				throw hbError(
					"set is not allowed to have block"
				);
			}

			if (Utils.isFunction(options.inverse)) {
				throw hbError(
					"set is not allowed to have inverse"
				);
			}

			if (Utils.isFunction(_context)) {
				_context = (_context as Func).call(this);
			}

			if (_context === null || typeof _context !== "object") {
				throw hbError(
					"set requires object as context"
				);
			}

			if (Utils.isArray(_context)) {
				throw hbError(
					"set requires object as context"
				);
			}

			const context = _context as Record<
				string | symbol | number,
				unknown
			>;

			for (let i = 0; i < args.length; i += 2) {
				const key = args[i];
				const value = args[i + 1];

				if (typeof key !== "string") {
					throw hbError(
						"set requires string as key"
					);
				}

				if (Utils.isFunction(value)) {
					context[key] = (value as Func).call(this);
					continue;
				}

				context[key] = value;
			}

			for (const [key, _value] of Object.entries(options.hash)) {
				if (typeof key !== "string") {
					throw hbError(
						"set requires string as key"
					);
				}

				const value = Utils.isFunction(_value)
					? (_value as Func).call(this)
					: _value;

				if (Utils.isFunction(context[key])) {
					throw hbError(
						"set requires key not to be function"
					);
				}

				context[key] = value;
			}

			return undefined;
		}
	);

	handlebars.registerHelper(
		"push",
		function (this: TemplateDelegate, arr: unknown, ...args: unknown[]) {
			if (arguments.length < 2) {
				throw hbError(
					"push requires at least one argument"
				);
			}

			args.pop() as HelperOptions;

			if (Utils.isFunction(arr)) {
				arr = (arr as Func).call(this);
			}

			if (!Array.isArray(arr)) {
				throw hbError(
					"push requires array as argument[0]"
				);
			}

			for (const arg of args) {
				if (Utils.isFunction(arg)) {
					arr.push((arg as Func).call(this));
				} else {
					arr.push(arg);
				}
			}

			return undefined;
		}
	);

	handlebars.registerHelper(
		"pop",
		function (
			this: TemplateDelegate,
			arr: unknown,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"pop requires exactly one argument"
				);
			}

			if (Utils.isFunction(arr)) {
				arr = (arr as Func).call(this);
			}

			if (!Array.isArray(arr)) {
				throw hbError(
					"pop requires array as argument[0]"
				);
			}

			let count = 1;
			if (options.hash?.count !== undefined) {
				if (typeof options.hash.count === "number") {
					count = options.hash.count as number;
				}
			}

			for (let i = 1; i < count; i++) {
				arr.pop();
			}

			return arr.pop();
		}
	);

	handlebars.registerHelper(
		"makeObject",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (args.length % 2 != 1) {
				throw hbError(
					"makeObject requires even number of arguments"
				);
			}

			const options = args.pop() as HelperOptions;

			if (Utils.isFunction(options.fn)) {
				throw hbError(
					"makeObject is not allowed to have block"
				);
			}

			if (Utils.isFunction(options.inverse)) {
				throw hbError(
					"makeObject is not allowed to have inverse"
				);
			}

			const result: Record<string | symbol | number, unknown> = {};

			for (let i = 0; i < args.length; i += 2) {
				const key = args[i];
				const value = args[i + 1];

				if (typeof key !== "string") {
					throw hbError(
						"makeObject requires string as key"
					);
				}

				if (Utils.isFunction(value)) {
					result[key] = (value as Func).call(this);
					continue;
				}

				result[key] = value;
			}

			for (const [key, _value] of Object.entries(options.hash)) {
				if (typeof key !== "string") {
					throw hbError(
						"makeObject requires string as key"
					);
				}

				const value = Utils.isFunction(_value)
					? (_value as Func).call(this)
					: _value;

				result[key] = value;
			}

			return result;
		}
	);

	handlebars.registerHelper(
		"makeArray",
		function (this: TemplateDelegate, ...args: unknown[]) {
			if (arguments.length < 1) {
				throw hbError("something wrong");
			}

			args.pop() as HelperOptions;

			const result: unknown[] = [];

			for (const [idx, arg] of args.entries()) {
				const value = Utils.isFunction(arg)
					? (arg as Func).call(this)
					: arg;

				result[idx] = value;
			}

			return result;
		}
	);

	handlebars.registerHelper(
		"ignore",
		function (this: TemplateDelegate, ..._args: unknown[]) {
			if (arguments.length < 1) {
				throw hbError("something wrong");
			}

			_args.pop() as HelperOptions;

			for (const arg of _args) {
				if (Utils.isFunction(arg)) {
					(arg as Func).call(this);
				}
			}

			return undefined;
		}
	);

	handlebars.registerHelper(
		"numberFormat",
		function (
			this: TemplateDelegate,
			val: number | Func,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError(
					"numberFormat requires exactly one argument"
				);
			}

			if (Utils.isFunction(val)) {
				val = (val as Func).call(this) as number;
			}

			if (typeof val !== "number") {
				throw hbError(
					"numberFormat requires number as argument"
				);
			}

			const minimumFractionDigits = options.hash.minimumFractionDigits;
			const maximumFractionDigits = options.hash.maximumFractionDigits;

			const formatOptions: Intl.NumberFormatOptions = {};
			if (minimumFractionDigits !== undefined) {
				formatOptions.minimumFractionDigits = minimumFractionDigits;
			}
			if (maximumFractionDigits !== undefined) {
				formatOptions.maximumFractionDigits = maximumFractionDigits;
			}

			return val.toLocaleString(undefined, formatOptions);
		}
	);

	handlebars.registerHelper(
		"join",
		function (
			this: TemplateDelegate,
			arr: unknown,
			separator: string,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"join requires exactly two arguments"
				);
			}

			if (Utils.isFunction(arr)) {
				arr = (arr as Func).call(this);
			}

			if (!Array.isArray(arr)) {
				throw hbError(
					"join requires array as argument[0]"
				);
			}

			if (typeof separator !== "string") {
				throw hbError(
					"join requires string as argument[1]"
				);
			}

			return arr.join(separator);
		}
	);

	handlebars.registerHelper(
		"del",
		function (
			this: TemplateDelegate,
			obj: unknown,
			key: number | string,
			options: HelperOptions
		) {
			if (arguments.length != 3) {
				throw hbError(
					"del requires exactly two arguments"
				);
			}

			if (Utils.isFunction(obj)) {
				obj = (obj as Func).call(this);
			}

			if (!obj) {
				return undefined;
			}

			if (Array.isArray(obj)) {
				if (typeof key !== "number") {
					throw hbError(
						"del requires number as key for array"
					);
				}

				obj.splice(key, 1);
			}

			if (obj === null || typeof obj !== "object") {
				throw hbError(
					"del requires object as argument[0]"
				);
			}

			if (typeof key !== "string" && typeof key !== "number") {
				throw hbError(
					"del requires string or number as key for object"
				);
			}

			delete (obj as Record<string | number, unknown>)[key];
		}
	);

	handlebars.registerHelper(
		"getEnv",
		function (this: TemplateDelegate, key: string, options: HelperOptions) {
			if (arguments.length != 2) {
				throw hbError(
					"getEnv requires exactly one argument"
				);
			}

			if (typeof key !== "string") {
				throw hbError(
					"getEnv requires string as argument"
				);
			}

			return getHbEnv(key);
		}
	);

	handlebars.registerHelper(
		"purifyName",
		function (
			this: TemplateDelegate,
			str: string,
			options: HelperOptions
		) {
			if (arguments.length != 2) {
				throw hbError("purifyName requires one");
			}

			if (typeof str !== "string") {
				throw hbError(
					"noSpace requires text as string"
				);
			}

			const map = {
				"」": "",
				"』": "",
				"》": "",
				"〉": "",
				"】": "",
				Ⅰ: "1",
				Ⅱ: "2",
				Ⅲ: "3",
				Ⅳ: "4",
				Ⅴ: "5",
				Ⅵ: "6",
				Ⅶ: "7",
				Ⅷ: "8",
				Ⅸ: "9",
				Ⅹ: "10",
				Ⅺ: "11",
				Ⅻ: "12",
				"·": "_",
			};

			const asSpace = /[!¡¿?「」『』《》〈〉【】〔〕«»„“‘’—–·…~、。，；：？！．,~…:?\-%]/g;

			for (const [k, v] of Object.entries(map)) {
				str = str.replaceAll(k, v);
			}

			str = str.replaceAll(asSpace, " ");
			str = str.replaceAll(/\s+/g, " ");
			str = str.replaceAll(/[^\p{L}\p{N}_() ]/gu, "");
			str = str.replaceAll("()", "");
			if (str.startsWith(" ")) {
				str = str.slice(1);
			}
			if (str.endsWith(" ")) {
				str = str.slice(0, -1);
			}

			return str;
		}
	);

	_handlebars = handlebars;
	return handlebars;
}
