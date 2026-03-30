import { readFileSync } from "node:fs";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";

import { devonthinkTools, getTool, runTool } from "./devonthink/index.js";
import { CliError } from "./errors.js";
import { printJson, printSchemaHuman, printToolResultHuman } from "./output.js";

type JsonSchema = {
	type?: string | string[];
	description?: string;
	default?: unknown;
	enum?: unknown[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	items?: JsonSchema;
	oneOf?: JsonSchema[];
	anyOf?: JsonSchema[];
	allOf?: JsonSchema[];
};

const RESERVED_ARG_KEYS = new Set([
	"_",
	"$0",
	"help",
	"h",
	"json",
	"input",
	"tool",
]);

export function buildCli(args: string[]): Argv {
	let cli: Argv = yargs(args) as unknown as Argv;

	cli = cli
		.scriptName("devonthink")
		.usage("$0 <command> [options]")
		.option("json", {
			default: false,
			describe: "Print machine-readable JSON output.",
			type: "boolean",
		})
		.alias("help", "h")
		.version(readPackageVersion())
		.strictCommands()
		.strictOptions()
		.recommendCommands()
		.demandCommand(1, "Use --help to view available commands.")
		.fail((message, error) => {
			if (error) {
				throw error;
			}

			throw new CliError(message ?? "The command failed.");
		})
		.help() as unknown as Argv;

	cli = cli.command(
		"tools",
		"List all available DEVONthink tools.",
		(yargsInstance) => yargsInstance,
		async (argv) => {
			if (argv.json) {
				printJson({
					tools: devonthinkTools.map((tool) => ({
						name: tool.name,
						description: tool.description,
					})),
				});
				return;
			}

			console.table(
				devonthinkTools.map((tool) => ({
					name: tool.name,
					description: firstLine(tool.description ?? ""),
				})),
			);
		},
	) as unknown as Argv;

	cli = cli.command(
		"schema <tool>",
		"Print the JSON schema for a tool.",
		(yargsInstance) =>
			yargsInstance.positional("tool", {
				describe: "Tool name",
				type: "string",
				choices: devonthinkTools.map((tool) => tool.name),
			}),
		async (argv) => {
			const tool = getTool(String(argv.tool));
			if (!tool) {
				throw new CliError(`Unknown tool: ${String(argv.tool)}`);
			}

			const payload = {
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			};

			if (argv.json) {
				printJson(payload);
				return;
			}

			printSchemaHuman(payload);
		},
	) as unknown as Argv;

	for (const tool of devonthinkTools) {
		cli = registerToolCommand(cli, tool);
	}

	return cli;
}

export async function runCli(
	args: string[] = hideBin(process.argv),
): Promise<number> {
	const jsonOutput = args.includes("--json");

	try {
		await buildCli(args).parseAsync();
		return 0;
	} catch (error) {
		printError(error, jsonOutput);
		return error instanceof CliError ? error.exitCode : 1;
	}
}

function registerToolCommand(cli: Argv, tool: Tool): Argv {
	const positionalProperties = getPositionalProperties(tool);
	const commandName = positionalProperties.length > 0
		? `${tool.name} ${positionalProperties.map((property) => `[${toKebabCase(property)}]`).join(" ")}`
		: tool.name;

	return cli.command(
		commandName,
		firstLine(tool.description ?? ""),
		(yargsInstance) =>
			configureToolCommand(yargsInstance, tool, positionalProperties),
		async (argv) => {
			const input = buildToolInput(tool, argv as Record<string, unknown>);
			const result = await runTool(tool.name, input);

			if (
				typeof result === "object" &&
				result !== null &&
				"success" in result &&
				(result as { success?: unknown; error?: unknown }).success === false
			) {
				const errorMessage =
					typeof (result as { error?: unknown }).error === "string"
						? String((result as { error?: unknown }).error)
						: `${tool.name} failed`;

				throw new CliError(errorMessage, 1, result);
			}

			printToolResult(result, Boolean(argv.json));
		},
	) as unknown as Argv;
}

function configureToolCommand(
	yargsInstance: Argv,
	tool: Tool,
	positionalProperties: string[] = [],
): Argv {
	const schema = tool.inputSchema as JsonSchema;
	const properties = schema.properties ?? {};
	const required = new Set(schema.required ?? []);

	let configured = yargsInstance.option("input", {
		describe: "Raw JSON object for the tool input schema.",
		type: "string",
	});

	for (const positionalProperty of positionalProperties) {
		const propertySchema = properties[positionalProperty];
		if (propertySchema) {
			configured = configured.positional(toKebabCase(positionalProperty), {
				describe:
					propertySchema.description ?? `Value for ${positionalProperty}`,
				type: getYargsType(propertySchema),
				coerce: (value: unknown) => coerceOptionValue(propertySchema, value),
			});
		}
	}

	for (const [propertyName, propertySchema] of Object.entries(properties)) {
		configured = configured.option(toKebabCase(propertyName), {
			alias:
				propertyName === toKebabCase(propertyName) ? undefined : propertyName,
			array:
				isArraySchema(propertySchema) &&
				isPrimitiveSchema(propertySchema.items),
			choices: Array.isArray(propertySchema.enum)
				? (propertySchema.enum as ReadonlyArray<string | number>)
				: undefined,
			default: propertySchema.default,
			demandOption:
				required.has(propertyName) && !positionalProperties.includes(propertyName),
			describe: propertySchema.description ?? `Value for ${propertyName}`,
			type: getYargsType(propertySchema),
			coerce: (value: unknown) => coerceOptionValue(propertySchema, value),
		});
	}

	return configured;
}

function buildToolInput(
	tool: Tool,
	argv: Record<string, unknown>,
): Record<string, unknown> {
	const schema = tool.inputSchema as JsonSchema;
	const properties = schema.properties ?? {};

	let input: Record<string, unknown> = {};

	const rawInput = argv.input;
	if (typeof rawInput === "string" && rawInput.trim() !== "") {
		const parsed = parseJson(rawInput, "input");
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			throw new CliError("--input must be a JSON object.");
		}

		input = { ...parsed } as Record<string, unknown>;
	}

	for (const propertyName of Object.keys(properties)) {
		if (propertyName in argv) {
			const value = argv[propertyName];
			if (value !== undefined) {
				input[propertyName] = value;
			}
			continue;
		}

		const kebabName = toKebabCase(propertyName);
		if (kebabName in argv) {
			const value = argv[kebabName];
			if (value !== undefined) {
				input[propertyName] = value;
			}
		}
	}

	for (const [key, value] of Object.entries(argv)) {
		if (RESERVED_ARG_KEYS.has(key) || key.includes("-")) {
			continue;
		}

		if (!(key in properties) || value === undefined) {
			continue;
		}

		input[key] = value;
	}

	return input;
}

function printToolResult(result: unknown, jsonOutput: boolean): void {
	if (jsonOutput) {
		printJson(result);
		return;
	}

	printToolResultHuman(result);
}

function printError(error: unknown, jsonOutput: boolean): void {
	if (jsonOutput && error instanceof CliError && error.details !== undefined) {
		printJson(error.details);
		return;
	}

	if (error instanceof Error) {
		console.error(error.message);
		return;
	}

	console.error(String(error));
}

function readPackageVersion(): string {
	try {
		const packageJson = JSON.parse(
			readFileSync(new URL("../package.json", import.meta.url), "utf8"),
		) as { version?: string };

		return packageJson.version ?? "0.1.0";
	} catch {
		return "0.1.0";
	}
}

function firstLine(value: string): string {
	return value.split("\n")[0] ?? value;
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getYargsType(schema: JsonSchema): "string" | "number" | "boolean" {
	if (Array.isArray(schema.type)) {
		if (schema.type.includes("boolean")) {
			return "boolean";
		}
		if (schema.type.includes("number") || schema.type.includes("integer")) {
			return "number";
		}
		return "string";
	}

	if (schema.type === "boolean") {
		return "boolean";
	}

	if (schema.type === "number" || schema.type === "integer") {
		return "number";
	}

	return "string";
}

function coerceOptionValue(schema: JsonSchema, value: unknown): unknown {
	if (value === undefined) {
		return value;
	}

	if (typeof value === "string") {
		if (isJsonValueSchema(schema)) {
			return parseJson(value, schema.description ?? "option");
		}

		if (isArraySchema(schema) && value.trim().startsWith("[")) {
			return parseJson(value, schema.description ?? "option");
		}
	}

	if (
		Array.isArray(value) &&
		isArraySchema(schema) &&
		!isPrimitiveSchema(schema.items)
	) {
		if (value.length === 1 && typeof value[0] === "string") {
			return parseJson(value[0], schema.description ?? "option");
		}
	}

	return value;
}

function getPositionalProperties(tool: Tool): string[] {
	if (tool.name === "rename_record") {
		return ["uuid", "newName"];
	}

	const positionalProperty = getPrimaryPositionalProperty(tool);
	return positionalProperty ? [positionalProperty] : [];
}

function getPrimaryPositionalProperty(tool: Tool): string | undefined {
	const schema = tool.inputSchema as JsonSchema;
	const properties = schema.properties ?? {};
	const required = new Set(schema.required ?? []);
	const preferredNames = [
		"query",
		"uuid",
		"recordUuid",
		"url",
		"question",
		"name",
		"toolName",
		"referenceURL",
	];

	for (const [propertyName, propertySchema] of Object.entries(properties)) {
		if (!preferredNames.includes(propertyName)) {
			continue;
		}

		if (!isPositionalCandidate(propertySchema)) {
			continue;
		}

		return propertyName;
	}

	for (const [propertyName, propertySchema] of Object.entries(properties)) {
		if (!required.has(propertyName)) {
			continue;
		}

		if (!isPositionalCandidate(propertySchema)) {
			continue;
		}

		return propertyName;
	}

	for (const [propertyName, propertySchema] of Object.entries(properties)) {
		if (isPositionalCandidate(propertySchema)) {
			return propertyName;
		}
	}

	return undefined;
}

function isPositionalCandidate(schema: JsonSchema): boolean {
	return (
		schema.type === "string" ||
		schema.type === "number" ||
		schema.type === "integer"
	);
}

function isArraySchema(schema: JsonSchema): boolean {
	return schema.type === "array";
}

function isPrimitiveSchema(schema: JsonSchema | undefined): boolean {
	if (!schema) {
		return false;
	}

	if (Array.isArray(schema.type)) {
		return schema.type.every((item) =>
			["string", "number", "integer", "boolean"].includes(item),
		);
	}

	return ["string", "number", "integer", "boolean"].includes(schema.type ?? "");
}

function isJsonValueSchema(schema: JsonSchema): boolean {
	return (
		schema.type === "object" ||
		Boolean(schema.oneOf?.length) ||
		Boolean(schema.anyOf?.length) ||
		Boolean(schema.allOf?.length) ||
		(schema.type === "array" && !isPrimitiveSchema(schema.items))
	);
}

function parseJson(value: string, label: string): unknown {
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new CliError(
			`Invalid JSON for ${label}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
