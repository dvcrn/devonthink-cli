import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";

export const executeJxa = <T>(script: string): Promise<T> => {
	return new Promise((resolve, reject) => {
		// Pass the script via stdin (osascript reads from stdin when the script
		// argument is "-") instead of an `-e` argv element. Interpolating large
		// user content into an argv string hits the OS argument-length limit
		// (ARG_MAX), which surfaces as E2BIG / "argument list too long" for big
		// notes. stdin has no such ceiling.
		const child = execFile(
			"osascript",
			["-l", "JavaScript", "-"],
			(error, stdout, stderr) => {
				if (error) {
					return reject(
						new McpError(
							ErrorCode.InternalError,
							`JXA execution failed: ${error.message}`,
						),
					);
				}
				if (stderr) {
					return reject(
						new McpError(ErrorCode.InternalError, `JXA error: ${stderr}`),
					);
				}
				try {
					const result = JSON.parse(stdout.trim());
					resolve(result as T);
				} catch (parseError) {
					reject(
						new McpError(
							ErrorCode.InternalError,
							`Failed to parse JXA output: ${parseError}`,
						),
					);
				}
			},
		);

		if (!child.stdin) {
			return reject(
				new McpError(
					ErrorCode.InternalError,
					"Failed to open stdin for osascript",
				),
			);
		}
		child.stdin.on("error", (streamError: Error) => {
			reject(
				new McpError(
					ErrorCode.InternalError,
					`Failed to write script to osascript: ${streamError.message}`,
				),
			);
		});
		child.stdin.end(script);
	});
};
