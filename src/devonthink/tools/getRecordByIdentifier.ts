import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Tool, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { executeJxa } from "../applescript/execute.js";
import {
	escapeStringForJXA,
	formatValueForJXA,
	isJXASafeString,
} from "../utils/escapeString.js";
import {
	getRecordLookupHelpers,
	getDatabaseHelper,
} from "../utils/jxaHelpers.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const GetRecordByIdentifierSchema = z
	.object({
		uuid: z.string().optional().describe("UUID of the record"),
		id: z
			.number()
			.optional()
			.describe("ID of the record (requires databaseName)"),
		databaseName: z
			.string()
			.optional()
			.describe("Database name (required with id)"),
		referenceURL: z
			.string()
			.optional()
			.describe(
				"A x-devonthink-item:// URL. Works for all record types including imported emails which use non-UUID identifiers.",
			),
	})
	.strict()
	.refine(
		(data) =>
			data.referenceURL !== undefined ||
			data.uuid !== undefined ||
			(data.id !== undefined && data.databaseName !== undefined),
		{
			message:
				"Either referenceURL alone, UUID alone, or ID with databaseName must be provided",
		},
	);

type GetRecordByIdentifierInput = z.infer<typeof GetRecordByIdentifierSchema>;

interface RecordResult {
	success: boolean;
	error?: string;
	record?: {
		id: number;
		uuid: string;
		name: string;
		path: string;
		location: string;
		recordType: string;
		kind: string;
		database: string;
		referenceURL: string;
		creationDate?: string;
		modificationDate?: string;
		tags?: string[];
		size?: number;
		url?: string;
		comment?: string;
	};
}

const getRecordByIdentifier = async (
	input: GetRecordByIdentifierInput,
): Promise<RecordResult> => {
	const { uuid, id, databaseName, referenceURL } = input;

	// Validate string inputs
	if (uuid && !isJXASafeString(uuid)) {
		return { success: false, error: "UUID contains invalid characters" };
	}
	if (databaseName && !isJXASafeString(databaseName)) {
		return {
			success: false,
			error: "Database name contains invalid characters",
		};
	}
	if (referenceURL && !isJXASafeString(referenceURL)) {
		return {
			success: false,
			error: "Reference URL contains invalid characters",
		};
	}
	if (id !== undefined && typeof id !== "number") {
		return { success: false, error: "ID must be a number" };
	}

	const script = `
    (() => {
      const theApp = Application("DEVONthink");
      theApp.includeStandardAdditions = true;

      // Inject helper functions
      ${getRecordLookupHelpers()}
      ${getDatabaseHelper}

      try {
        let targetRecord;
        let targetDatabase;
        let lookupResult;

        if (${referenceURL ? `"${escapeStringForJXA(referenceURL)}"` : "null"}) {
          // Reference URL lookup (x-devonthink-item:// URLs)
          const refURL = ${referenceURL ? `"${escapeStringForJXA(referenceURL)}"` : "null"};
          const prefix = "x-devonthink-item://";

          // Extract the identifier part after the prefix
          const identifier = refURL.startsWith(prefix) ? refURL.substring(prefix.length) : refURL;

          // Check if it looks like a UUID (hex digits and hyphens)
          const uuidPattern = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

          if (uuidPattern.test(identifier)) {
            // Fast path: standard UUID format
            targetRecord = theApp.getRecordWithUuid(identifier.toUpperCase());
          }

          if (!targetRecord) {
            // Non-UUID format (e.g. imported emails with message-ID-based UUIDs).
            // DEVONthink stores the URL-decoded identifier as the record's UUID,
            // so decode and try a direct UUID lookup first.
            try {
              const decoded = decodeURIComponent(identifier);
              if (decoded !== identifier) {
                targetRecord = theApp.getRecordWithUuid(decoded);
              }
            } catch (e) {
              // Invalid percent-encoding — skip
            }
          }

          if (!targetRecord) {
            // Fall back to lookupRecordsWithURL across all open databases.
            // Omitting the "in" option searches globally.
            const results = theApp.lookupRecordsWithURL(refURL);
            if (results && results.length > 0) {
              // lookupRecordsWithURL matches the url property;
              // verify by checking referenceURL
              for (let j = 0; j < results.length; j++) {
                if (results[j].referenceURL() === refURL) {
                  targetRecord = results[j];
                  break;
                }
              }
            }
          }

          if (!targetRecord) {
            return JSON.stringify({
              success: false,
              error: "Record not found for reference URL: " + refURL
            });
          }

          targetDatabase = targetRecord.database();

        } else if (${uuid ? `"${escapeStringForJXA(uuid)}"` : "null"}) {
          // UUID lookup - globally unique
          const lookupOptions = {};
          lookupOptions["uuid"] = ${uuid ? `"${escapeStringForJXA(uuid)}"` : "null"};

          lookupResult = getRecord(theApp, lookupOptions);

          if (!lookupResult.record) {
            return JSON.stringify({
              success: false,
              error: "Record with UUID " + (${uuid ? `"${escapeStringForJXA(uuid)}"` : "null"} || "unknown") + " not found"
            });
          }

          targetRecord = lookupResult.record;
          // Get the database of the record
          targetDatabase = targetRecord.database();

        } else if (${formatValueForJXA(id)} !== null && ${databaseName ? `"${escapeStringForJXA(databaseName)}"` : "null"}) {
          // ID + Database lookup
          targetDatabase = getDatabase(theApp, ${databaseName ? `"${escapeStringForJXA(databaseName)}"` : "null"});

          const lookupOptions = {};
          lookupOptions["id"] = ${formatValueForJXA(id)};
          lookupOptions["database"] = targetDatabase;

          lookupResult = getRecord(theApp, lookupOptions);

          if (!lookupResult.record) {
            return JSON.stringify({
              success: false,
              error: "Record with ID " + ${formatValueForJXA(id)} + " not found in database '" + (${databaseName ? `"${escapeStringForJXA(databaseName)}"` : "null"} || "unknown") + "'"
            });
          }

          targetRecord = lookupResult.record;
        }

        // Extract record properties
        const record = {};
        record["id"] = targetRecord.id();
        record["uuid"] = targetRecord.uuid();
        record["name"] = targetRecord.name();
        record["path"] = targetRecord.path();
        record["location"] = targetRecord.location();
        record["recordType"] = targetRecord.recordType();
        record["kind"] = targetRecord.kind();
        record["database"] = targetDatabase.name();
        record["referenceURL"] = targetRecord.referenceURL();
        record["creationDate"] = targetRecord.creationDate() ? targetRecord.creationDate().toString() : null;
        record["modificationDate"] = targetRecord.modificationDate() ? targetRecord.modificationDate().toString() : null;
        record["tags"] = targetRecord.tags();
        record["size"] = targetRecord.size();

        // Add optional properties if available
        try {
          const recordUrl = targetRecord.url();
          if (recordUrl) record["url"] = recordUrl;
        } catch (e) {}
        try {
          const recordComment = targetRecord.comment();
          if (recordComment) record["comment"] = recordComment;
        } catch (e) {}

        return JSON.stringify({
          success: true,
          record: record
        });

      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.toString()
        });
      }
    })();
  `;

	return await executeJxa<RecordResult>(script);
};

export const getRecordByIdentifierTool: Tool = {
	name: "record_by_identifier",
	description:
		'Get a DEVONthink record using its UUID, ID, or x-devonthink-item:// reference URL.\n\nExample (Reference URL):\n{\n  "referenceURL": "x-devonthink-item://1234-5678-90AB-CDEF"\n}\n\nExample (Reference URL - email):\n{\n  "referenceURL": "x-devonthink-item://message:%3Cfoo@bar.com%3E"\n}\n\nExample (UUID):\n{\n  "uuid": "1234-5678-90AB-CDEF"\n}\n\nExample (ID):\n{\n  "id": 12345,\n  "databaseName": "MyDatabase"\n}',
	inputSchema: zodToJsonSchema(GetRecordByIdentifierSchema) as ToolInput,
	run: getRecordByIdentifier,
};
