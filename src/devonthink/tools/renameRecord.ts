import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Tool, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { executeJxa } from "../applescript/execute.js";
import {
	escapeStringForJXA,
	formatValueForJXA,
	isJXASafeString,
} from "../utils/escapeString.js";
import { getRecordLookupHelpers } from "../utils/jxaHelpers.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const RenameRecordSchema = z
	.object({
		uuid: z
			.string()
			.optional()
			.describe("UUID of the record to rename (defaults to the currently selected record)"),
		newName: z.string().describe("New name for the record"),
		databaseName: z
			.string()
			.optional()
			.describe("Database to rename the record in (optional)"),
	})
	.strict();

type RenameRecordInput = z.infer<typeof RenameRecordSchema>;

interface RenameRecordResult {
	success: boolean;
	error?: string;
	uuid?: string;
	oldName?: string;
	newName?: string;
}

const renameRecord = async (
	input: RenameRecordInput,
): Promise<RenameRecordResult> => {
	const { uuid, newName, databaseName } = input;

	// Validate string inputs
	if (uuid && !isJXASafeString(uuid)) {
		return { success: false, error: "UUID contains invalid characters" };
	}
	if (!isJXASafeString(newName)) {
		return { success: false, error: "New name contains invalid characters" };
	}
	if (databaseName && !isJXASafeString(databaseName)) {
		return {
			success: false,
			error: "Database name contains invalid characters",
		};
	}

	const script = `
    (() => {
      const theApp = Application("DEVONthink");
      theApp.includeStandardAdditions = true;
      
      // Inject helper functions
      ${getRecordLookupHelpers()}
      
      try {
        // Use the unified lookup function
        const lookupOptions = {
          uuid: ${uuid ? `"${escapeStringForJXA(uuid)}"` : "null"}
        };
        
        const lookupResult = getRecordOrSelected(theApp, lookupOptions);
        
        if (!lookupResult.record) {
          return JSON.stringify({
            success: false,
            error: lookupResult.error || "Record not found"
          });
        }
        
        const record = lookupResult.record;
        const oldName = record.name();
        
        // Verify database if specified
        const pDatabaseName = ${databaseName ? `"${escapeStringForJXA(databaseName)}"` : "null"};
        if (pDatabaseName && record.database().name() !== pDatabaseName) {
          return JSON.stringify({
            success: false,
            error: "Record with UUID " + (${uuid ? `"${escapeStringForJXA(uuid)}"` : "null"} || "unknown") + " not found in database " + (pDatabaseName || "unknown")
          });
        }
        
        record.name = ${newName ? `"${escapeStringForJXA(newName)}"` : "null"};
        
        return JSON.stringify({
          success: true,
          uuid: record.uuid(),
          oldName: oldName,
          newName: record.name()
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.toString()
        });
      }
    })();
  `;

	return await executeJxa<RenameRecordResult>(script);
};

export const renameRecordTool: Tool = {
	name: "rename_record",
	description:
		'Renames a specific record in DEVONthink.\n\nExample:\n{\n  "uuid": "1234-5678-90AB-CDEF",\n  "newName": "New Record Name"\n}',
	inputSchema: zodToJsonSchema(RenameRecordSchema) as ToolInput,
	run: renameRecord,
};
