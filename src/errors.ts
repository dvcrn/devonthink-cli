export class CliError extends Error {
	readonly exitCode: number;
	readonly details?: unknown;

	constructor(message: string, exitCode = 1, details?: unknown) {
		super(message);
		this.name = "CliError";
		this.exitCode = exitCode;
		this.details = details;
	}
}
