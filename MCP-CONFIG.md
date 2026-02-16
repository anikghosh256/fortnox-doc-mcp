# MCP Configuration for VS Code

This file provides the MCP configuration for VS Code and other MCP clients.

## For VS Code

Add this to your VS Code settings or MCP client configuration:

```json
{
  "servers": {
    "fortnox-doc-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "fortnox-doc-mcp"
      ]
    }
  },
  "inputs": []
}
```

## For Claude Desktop

Windows: `%APPDATA%\Claude\claude_desktop_config.json`
Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

## What You Get

Once configured, you'll have access to 7 tools:
- `get_api_overview` - Get API overview and statistics
- `list_all_endpoints` - Browse 377 Fortnox API endpoints
- `get_endpoint_details` - Get detailed endpoint documentation
- `get_endpoints_by_resource` - Get endpoints grouped by resource
- `search_endpoints` - Search endpoints by keyword
- `list_resource_groups` - List all 81 resource groups
- `get_schema_details` - View data model schemas

No API credentials required - this is a pure documentation server!
