# Fortnox MCP Server

A Model Context Protocol (MCP) server for exploring Fortnox API documentation. Provides **377 Fortnox API endpoints** documentation from the official OpenAPI specification.

## Overview

- **Documentation-only server** - provides API endpoint information, doesn't make API calls
- **377 Fortnox API endpoints** from official OpenAPI 3.0 spec
- **7 MCP tools** for exploring API documentation
- **No authentication required** - pure documentation browsing
- **AI-optimized** responses with structured markdown formatting

## Installation

```bash
npm install -g fortnox-doc-mcp
```

Or use with `npx`:

```bash
npx fortnox-doc-mcp
```

## Available Tools

1. **get_api_overview** - Get API overview, statistics, and recommended workflow
2. **list_all_endpoints** - Browse all Fortnox API endpoints (with optional filters)
3. **get_endpoint_details** - Get full documentation for a specific endpoint
4. **get_endpoints_by_resource** - Get all endpoints for a resource grouped by operation
5. **search_endpoints** - Search endpoints by keyword
6. **list_resource_groups** - List all 81 API resource categories
7. **get_schema_details** - View data model schemas

## Quick Start

### For Claude Desktop

Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fortnox-docs": {
      "command": "npx",
      "args": ["-y", "fortnox-doc-mcp"]
    }
  }
}
```

Restart Claude Desktop to access the tools.

### For Other MCP Clients

```json
{
  "servers": {
    "fortnox-doc-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "fortnox-doc-mcp"]
    }
  }
}
```

## Usage Examples

Once configured, you can ask AI assistants:

- *"Give me an overview of the Fortnox API"* → Uses `get_api_overview`
- *"List all Fortnox customer endpoints"* → Uses `get_endpoints_by_resource`
- *"Show me details for GET /3/customers"* → Uses `get_endpoint_details`
- *"Search for invoice endpoints"* → Uses `search_endpoints`
- *"What resource groups are available?"* → Uses `list_resource_groups`
- *"Show me the Customer schema"* → Uses `get_schema_details`

## Development

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/fortnox-doc-mcp.git
cd fortnox-doc-mcp

# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

### Project Structure

```
fortnox-doc-mcp/
├── src/
│   ├── index.ts              # MCP server with 7 tools
│   ├── openapi-parser.ts     # OpenAPI spec parser
│   └── test-docs.ts          # Documentation test
├── openapi (1).json          # Fortnox OpenAPI specification
└── dist/                     # Compiled JavaScript
```

## Technical Details

- **OpenAPI Version**: 3.0.3
- **Endpoints**: 377 Fortnox API endpoints
- **Resource Groups**: 81 categories
- **Loading**: Singleton pattern (loaded once into memory)
- **Performance**: O(1) endpoint lookups, no external API calls
- **Node Version**: 18+

## FAQ

**Q: Do I need a Fortnox API token?**  
A: No! This is a documentation server. No API credentials required.

**Q: Can this make API calls to Fortnox?**  
A: No. It only provides documentation about endpoints from the OpenAPI spec.

**Q: How do I use this with Claude Desktop?**  
A: Add the configuration to `claude_desktop_config.json` and restart Claude Desktop.

**Q: Can I use this to build a Fortnox integration?**  
A: Yes! Use this to explore API documentation, understand endpoints, parameters, and schemas before building your integration.

## License

MIT

## Links

- [Fortnox API Documentation](https://api.fortnox.se/apidocs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/anikghosh256/fortnox-doc-mcp)
