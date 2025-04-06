// JSONx is an extension of JSON that allows for some additional types that are not supported by JSON:
//   - undefined
//   - bigint
//   - symbol
//   - regexp
//   - date

// JSONx is a superset of JSON, meaning that any valid JSON document is also a valid JSONx document.

const ws = new Set(" \t\n\r");
const digits = new Set("0123456789");
const hex = new Set("0123456789abcdefABCDEF");
const signs = new Set("+-");

export function parse(input: string): unknown {
	let index = 0;

	function consumeSet(set: Set<string>): string {
		let startIndex = index;
		while (set.has(input[index])) {
			index++;
		}
		return input.slice(startIndex, index);
	}

	function consumeWs() {
		consumeSet(ws);
	}

	function consumeExactly(expected: string) {
		if (input.slice(index, index + expected.length) !== expected) {
			throw new Error(`Invalid character at position ${index}; expected ${expected}`);
		}

		index += expected.length;
	}

	function consumeChar() {
		if (index >= input.length) {
			throw new Error("Unexpected end of input");
		}
		const result = input[index];
		index++;
		return result;
	}

	function peekChar() {
		if (index >= input.length) {
			throw new Error("Unexpected end of input");
		}
		return input[index];
	}

	function consumeIf(char: string) {
		if (input[index] === char) {
			index++;
			return true;
		}

		return false;
	}

	function consumeNumeric() {
		let negative = false;

		if (consumeIf("-")) {
			negative = true;
		}

		let base: string;

		switch (peekChar()) {
			case "0": {
				base = "0";
				consumeChar();
				break;
			}

			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9": {
				base = consumeSet(digits);
				break;
			}

			default: {
				throw new Error(`Invalid character at position ${index}; expected digit`);
			}
		}

		if (consumeIf("n")) {
			return negative ? -BigInt(base) : BigInt(base);
		}

		const fraction = consumeNumericFraction();
		const exponent = consumeNumericExponent();
		const result = parseFloat(base + (fraction ?? "") + (exponent ?? ""));
		return negative ? -result : result;
	}

	function consumeNumericFraction(): string | undefined {
		if (consumeIf(".")) {
			return "." + consumeSet(digits);
		}

		return undefined;
	}

	function consumeNumericExponent(): string | undefined {
		if (consumeIf("e") || consumeIf("E")) {
			return "e" + consumeSet(signs) + consumeSet(digits);
		}

		return undefined;
	}

	function consumeString(): string {
		consumeExactly("\"");

		let result: string[] = [];

		while (true) {
			const char = consumeChar();
			switch (char) {
				case "\\": {
					result.push(consumeEscape());
					break;
				}

				case "\"": {
					return result.join("");
				}

				default: {
					if (char.charCodeAt(0) < 32) {
						throw new Error(`Invalid character at position ${index}; control characters must be escaped`);
					}
					result.push(char);
					break;
				}
			}
		}
	}

	function consumeEscape(): string {
		switch (consumeChar()) {
			case '"': return '"';
			case "\\": return "\\";
			case "/": return "/";
			case "b": return "\b";
			case "f": return "\f";
			case "n": return "\n";
			case "r": return "\r";
			case "t": return "\t";
			case "u": return consumeUnicodeEscape();

			default: {
				throw new Error(`Invalid character at position ${index}; expected escape character`);
			}
		}
	}

	function consumeUnicodeEscape(): string {
		let result = "";

		for (let i = 0; i < 4; i++) {
			const char = consumeChar();
			if (!hex.has(char)) {
				throw new Error(`Invalid character at position ${index}; expected hex digit`);
			}

			result += input[index];
		}

		return String.fromCharCode(parseInt(result, 16));
	}

	function consumeRegExp(): RegExp {
		consumeExactly("RegExp(");
		consumeWs();
		const pattern = consumeString();
		consumeWs();

		if (consumeIf(",")) {
			consumeWs();
			const flags = consumeString();
			consumeWs();
			consumeExactly(")");
			return new RegExp(pattern, flags);
		} else {
			consumeExactly(")");
			return new RegExp(pattern);
		}
	}

	function consumeDate(): Date {
		consumeExactly("Date(");
		consumeWs();
		const value = consumeString();
		consumeWs();
		consumeExactly(")");
		return new Date(value);
	}

	function consumeSymbol(): symbol {
		consumeExactly("Symbol(");
		consumeWs();
		const value = consumeString();
		consumeWs();
		consumeExactly(")");
		return Symbol(value);
	}

	function consumeArray(): unknown[] {
		consumeExactly("[");
		consumeWs();

		if (consumeIf("]")) {
			return [];
		}

		let result: unknown[] = [];

		while (true) {
			result.push(consumeValue());
			consumeWs();

			if (consumeIf("]")) {
				return result;
			}

			consumeExactly(",");
			consumeWs();
		}
	}

	function consumeObject(): Record<string, unknown> {
		consumeExactly("{");
		consumeWs();

		if (consumeIf("}")) {
			return {};
		}

		let entries: [string, unknown][] = [];

		while (true) {
			const key = consumeString();
			consumeWs();
			consumeExactly(":");
			consumeWs();

			const value = consumeValue();
			entries.push([key, value]);

			consumeWs();

			if (consumeIf("}")) {
				return Object.fromEntries(entries);
			}

			consumeExactly(",");
			consumeWs();
		}
	}

	function consumeValue(): unknown {
		consumeWs();

		switch (peekChar()) {
			case '"': {
				const value = consumeString();
				consumeWs();
				return value;
			}

			case "t": {
				consumeExactly("true");
				consumeWs();
				return true;
			}

			case "f": {
				consumeExactly("false");
				consumeWs();
				return false;
			}

			case "n": {
				consumeExactly("null");
				consumeWs();
				return null;
			}

			case "u": {
				consumeExactly("undefined");
				consumeWs();
				return undefined;
			}

			case "R": {
				const value = consumeRegExp();
				consumeWs();
				return value;
			}

			case "D": {
				const value = consumeDate();
				consumeWs();
				return value;
			}

			case "S": {
				const value = consumeSymbol();
				consumeWs();
				return value;
			}

			case "-":
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9": {
				const value = consumeNumeric();
				consumeWs();
				return value;
			}

			case "[": {
				const value = consumeArray();
				consumeWs();
				return value;
			}

			case "{": {
				const value = consumeObject();
				consumeWs();
				return value;
			}

			default: {
				throw new Error(`Invalid character at position ${index}; expected value`);
			}
		}
	}

	const result = consumeValue();
	if (index !== input.length) {
		throw new Error(`Unexpected character at position ${index}; expected end of input`);
	}
	return result;
}

export function stringify(value: unknown): string {
	const parts: string[] = [];
	const stack: Set<unknown> = new Set();

	function stringifyValue(value: unknown) {
		if (value instanceof RegExp) {
			if (value.flags === "") {
				parts.push(`RegExp(${JSON.stringify(value.source)})`);
			} else {
				parts.push(`RegExp(${JSON.stringify(value.source)},${JSON.stringify(value.flags)})`);
			}
		} else if (value instanceof Date) {
			parts.push(`Date(${JSON.stringify(value.toISOString())})`);
		} else {
			switch (typeof value) {
				case "undefined": {
					parts.push("undefined");
					break;
				}
				case "string": {
					parts.push(JSON.stringify(value));
					break;
				}
				case "number": {
					parts.push(JSON.stringify(value));
					break;
				}
				case "boolean": {
					parts.push(JSON.stringify(value));
					break;
				}
				case "bigint": {
					parts.push(`${value}n`);
					break;
				}
				case "symbol": {
					parts.push(`Symbol(${JSON.stringify((value as symbol).toString().slice(7, -1))})`);
					break;
				}
				case "function": {
					throw new Error("Cannot stringify function");
				}
				case "object": {
					if (value === null) {
						parts.push("null");
					} else if (stack.has(value)) {
						throw new Error("Circular reference detected");
					} else {
						stack.add(value);

						if (Array.isArray(value)) {
							parts.push("[");
							for (let i = 0; i < value.length; i++) {
								if (i !== 0) {
									parts.push(",");
								}
								stringifyValue(value[i]);
							}
							parts.push("]");
						} else {
							parts.push("{");
							const entries = Object.entries(value);
							for (let i = 0; i < entries.length; i++) {
								if (i !== 0) {
									parts.push(",");
								}
								parts.push(JSON.stringify(entries[i][0]));
								parts.push(":");
								stringifyValue(entries[i][1]);
							}
							parts.push("}");
						}

						stack.delete(value);
					}
					break;
				}
				default: {
					throw new Error(`Cannot stringify value of type ${typeof value}`);
				}
			}
		}
	}

	stringifyValue(value);
	return parts.join("");
}
