type JsonSchema = {
	type?: string | string[];
	description?: string;
	default?: unknown;
	enum?: unknown[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	items?: JsonSchema;
};

export function printJson(payload: unknown): void {
	console.log(JSON.stringify(payload, null, 2));
}

export function printToolResultHuman(result: unknown): void {
	if (result === null || result === undefined) {
		console.log(String(result));
		return;
	}

	if (Array.isArray(result)) {
		printArray("Results", result, 0);
		return;
	}

	if (typeof result !== "object") {
		console.log(String(result));
		return;
	}

	if (isRenameResult(result)) {
		console.log(`Renamed: ${result.oldName} -> ${result.newName}`);
		return;
	}

	printObject(result as Record<string, unknown>, 0);
}

export function printSchemaHuman(input: {
	name: string;
	description?: string;
	inputSchema: unknown;
}): void {
	const schema = input.inputSchema as JsonSchema;
	const properties = schema.properties ?? {};
	const required = new Set(schema.required ?? []);

	console.log(`Name: ${input.name}`);
	if (input.description) {
		console.log(`Description: ${input.description}`);
	}

	if (Object.keys(properties).length === 0) {
		console.log("Input: none");
		return;
	}

	console.log("Input options:");
	for (const [name, property] of Object.entries(properties)) {
		const suffix = required.has(name) ? "required" : "optional";
		console.log(`- ${name} (${describeSchemaType(property)}, ${suffix})`);

		if (property.description) {
			console.log(`  ${property.description}`);
		}

		if (property.default !== undefined) {
			console.log(`  default: ${formatPrimitive(property.default)}`);
		}

		if (property.enum?.length) {
			console.log(
				`  choices: ${property.enum.map((item) => formatPrimitive(item)).join(", ")}`,
			);
		}
	}
}

function printObject(value: Record<string, unknown>, indent: number): void {
	const entries = Object.entries(value);
	const scalarEntries = entries.filter(([, entryValue]) =>
		isScalar(entryValue),
	);
	const complexEntries = entries.filter(
		([, entryValue]) => !isScalar(entryValue),
	);

	for (const [key, entryValue] of scalarEntries) {
		printScalar(key, entryValue, indent);
	}

	for (const [key, entryValue] of complexEntries) {
		if (Array.isArray(entryValue)) {
			printSectionTitle(key, indent);
			printArray(key, entryValue, indent + 2);
			continue;
		}

		if (entryValue && typeof entryValue === "object") {
			printSectionTitle(key, indent);
			printObject(entryValue as Record<string, unknown>, indent + 2);
			continue;
		}

		printScalar(key, entryValue, indent);
	}
}

function printArray(label: string, value: unknown[], indent: number): void {
	if (value.length === 0) {
		console.log(`${pad(indent)}(empty)`);
		return;
	}

	if (value.every((item) => isScalar(item))) {
		for (const item of value) {
			console.log(`${pad(indent)}- ${formatPrimitive(item)}`);
		}
		return;
	}

	if (value.every((item) => isPlainObject(item))) {
		const objects = value as Record<string, unknown>[];
		const rows = objects.map((item) => flattenObject(item));

		if (shouldUseTable(rows)) {
			console.table(rows);
			return;
		}

		objects.forEach((item, index) => {
			console.log(`${pad(indent)}- Item ${index + 1}`);
			printObject(item, indent + 2);
		});
		return;
	}

	for (const item of value) {
		if (isPlainObject(item)) {
			console.log(`${pad(indent)}-`);
			printObject(item as Record<string, unknown>, indent + 2);
			continue;
		}

		if (Array.isArray(item)) {
			console.log(`${pad(indent)}-`);
			printArray(label, item, indent + 2);
			continue;
		}

		console.log(`${pad(indent)}- ${String(item)}`);
	}
}

function printScalar(key: string, value: unknown, indent: number): void {
	if (typeof value === "string" && value.includes("\n")) {
		console.log(`${pad(indent)}${toLabel(key)}:`);
		for (const line of value.split("\n")) {
			console.log(`${pad(indent + 2)}${line}`);
		}
		return;
	}

	console.log(`${pad(indent)}${toLabel(key)}: ${formatPrimitive(value)}`);
}

function printSectionTitle(key: string, indent: number): void {
	console.log(`${pad(indent)}${toLabel(key)}:`);
}

function flattenObject(
	value: Record<string, unknown>,
	prefix = "",
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, entryValue] of Object.entries(value)) {
		const nextKey = prefix ? `${prefix}.${key}` : key;

		if (isScalar(entryValue)) {
			result[nextKey] = Array.isArray(entryValue)
				? entryValue.map((item) => formatPrimitive(item)).join(", ")
				: entryValue;
			continue;
		}

		if (Array.isArray(entryValue)) {
			result[nextKey] = JSON.stringify(entryValue);
			continue;
		}

		if (entryValue && typeof entryValue === "object") {
			Object.assign(
				result,
				flattenObject(entryValue as Record<string, unknown>, nextKey),
			);
			continue;
		}

		result[nextKey] = String(entryValue);
	}

	return result;
}

function shouldUseTable(rows: Record<string, unknown>[]): boolean {
	if (rows.length === 0) {
		return false;
	}

	const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
	if (keys.length > 5) {
		return false;
	}

	const longValue = rows.some((row) =>
		Object.values(row).some(
			(value) => typeof value === "string" && value.length > 40,
		),
	);

	return !longValue;
}

function describeSchemaType(schema: JsonSchema): string {
	if (Array.isArray(schema.type)) {
		return schema.type.join(" | ");
	}

	if (schema.type === "array") {
		return schema.items
			? `array<${describeSchemaType(schema.items)}>`
			: "array";
	}

	if (schema.enum?.length) {
		return "enum";
	}

	return schema.type ?? "unknown";
}

function isRenameResult(
	value: unknown,
): value is { success: true; oldName: string; newName: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { success?: unknown }).success === true &&
		typeof (value as { oldName?: unknown }).oldName === "string" &&
		typeof (value as { newName?: unknown }).newName === "string"
	);
}

function isPlainObject(value: unknown): boolean {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	);
}

function formatPrimitive(value: unknown): string {
	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "undefined";
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	return JSON.stringify(value);
}

function toLabel(value: string): string {
	return value
		.replace(/([A-Z])/g, " $1")
		.replace(/[_-]+/g, " ")
		.replace(/^./, (match) => match.toUpperCase())
		.trim();
}

function pad(indent: number): string {
	return " ".repeat(indent);
}
