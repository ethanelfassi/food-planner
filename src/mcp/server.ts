#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_TOOLS } from './tools.js';

const server = new McpServer({
  name: 'food-planner',
  version: '1.0.0',
});

// Enregistrer tous les outils (avec ou sans confirmation humaine)
for (const toolDef of Object.values(ALL_TOOLS)) {
  server.tool(
    toolDef.name,
    toolDef.description,
    toolDef.schema.shape,
    async (args: any) => {
      try {
        const result = await toolDef.execute(args);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Erreur : ${err.message || String(err)}` }],
        };
      }
    }
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 FoodPlanner MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
