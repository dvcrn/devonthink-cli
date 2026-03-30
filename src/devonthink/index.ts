import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { addTagsTool } from "./tools/addTags.js";
import { askAiAboutDocumentsTool } from "./tools/ai/askAiAboutDocuments.js";
import { checkAIHealthTool } from "./tools/ai/checkAIHealth.js";
import { createSummaryDocumentTool } from "./tools/ai/createSummaryDocument.js";
import { getToolDocumentationTool } from "./tools/ai/getToolDocumentation.js";
import { classifyTool } from "./tools/classify.js";
import { compareTool } from "./tools/compare.js";
import { convertRecordTool } from "./tools/convertRecord.js";
import { createFromUrlTool } from "./tools/createFromUrl.js";
import { createRecordTool } from "./tools/createRecord.js";
import { deleteRecordTool } from "./tools/deleteRecord.js";
import { duplicateRecordTool } from "./tools/duplicateRecord.js";
import { currentDatabaseTool } from "./tools/getCurrentDatabase.js";
import { getOpenDatabasesTool } from "./tools/getOpenDatabases.js";
import { getRecordByIdentifierTool } from "./tools/getRecordByIdentifier.js";
import { getRecordContentTool } from "./tools/getRecordContent.js";
import { getRecordPropertiesTool } from "./tools/getRecordProperties.js";
import { selectedRecordsTool } from "./tools/getSelectedRecords.js";
import { isRunningTool } from "./tools/isRunning.js";
import { listGroupContentTool } from "./tools/listGroupContent.js";
import { lookupRecordTool } from "./tools/lookupRecord.js";
import { moveRecordTool } from "./tools/moveRecord.js";
import { removeTagsTool } from "./tools/removeTags.js";
import { renameRecordTool } from "./tools/renameRecord.js";
import { replicateRecordTool } from "./tools/replicateRecord.js";
import { searchTool } from "./tools/search.js";
import { setRecordPropertiesTool } from "./tools/setRecordProperties.js";
import { updateRecordContentTool } from "./tools/updateRecordContent.js";

export const devonthinkTools: Tool[] = [
  isRunningTool,
  createRecordTool,
  deleteRecordTool,
  moveRecordTool,
  getRecordPropertiesTool,
  getRecordByIdentifierTool,
  searchTool,
  lookupRecordTool,
  createFromUrlTool,
  getOpenDatabasesTool,
  currentDatabaseTool,
  selectedRecordsTool,
  listGroupContentTool,
  getRecordContentTool,
  renameRecordTool,
  addTagsTool,
  removeTagsTool,
  classifyTool,
  compareTool,
  replicateRecordTool,
  duplicateRecordTool,
  convertRecordTool,
  updateRecordContentTool,
  setRecordPropertiesTool,
  askAiAboutDocumentsTool,
  checkAIHealthTool,
  createSummaryDocumentTool,
  getToolDocumentationTool,
];

export const devonthinkToolMap = new Map(
  devonthinkTools.map((tool) => [tool.name, tool]),
);

export function getTool(name: string): Tool | undefined {
  return devonthinkToolMap.get(name);
}

export async function runTool(name: string, input: unknown): Promise<unknown> {
  const tool = getTool(name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  if (typeof tool.run !== "function") {
    throw new Error(`Tool '${name}' has no run function.`);
  }

  return tool.run(input);
}
