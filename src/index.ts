#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getOpenAPIParser, FortnoxEndpoint, Parameter, Schema } from './openapi-parser.js';

interface ToolCallArguments {
  [key: string]: string | number | boolean | object | undefined;
}

export class FortnoxMCPServer {
  private server: Server;
  private endpoints: FortnoxEndpoint[];
  private parser: any;

  constructor() {
    this.server = new Server(
      {
        name: 'fortnox-api-documentation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load endpoints from OpenAPI spec
    this.parser = getOpenAPIParser();
    this.endpoints = this.parser.getAllEndpoints();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.generateTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments as ToolCallArguments);
    });
  }

  /**
   * Generate MCP tools for exploring Fortnox API documentation
   */
  private generateTools(): Tool[] {
    return [
      {
        name: 'get_api_overview',
        description: 'Get comprehensive overview of the Fortnox API including base URL, authentication requirements, rate limits, and available resource groups. Use this FIRST to understand the API before exploring specific endpoints.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_all_endpoints',
        description: 'List all 377 Fortnox API endpoints with method, path, summary, and resource tags. Supports filtering by HTTP method or resource group. Returns a comprehensive catalog of available endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'Optional: Filter by HTTP method (GET, POST, PUT, DELETE, PATCH)',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            },
            tag: {
              type: 'string',
              description: 'Optional: Filter by resource group (e.g., fortnox_Customers, fortnox_Invoices). Use list_resource_groups to see all available tags.',
            },
            limit: {
              type: 'number',
              description: 'Optional: Limit number of results (default: all)',
            },
          },
        },
      },
      {
        name: 'get_endpoint_details',
        description: 'Get complete documentation for a specific endpoint including: description, parameters (path/query), request body schema, response schema, required vs optional fields. Essential for understanding how to use an endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The API endpoint path exactly as shown in list_all_endpoints (e.g., /3/customers, /3/invoices/{DocumentNumber})',
            },
            method: {
              type: 'string',
              description: 'The HTTP method (must match exactly)',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            },
          },
          required: ['path', 'method'],
        },
      },
      {
        name: 'get_endpoints_by_resource',
        description: 'Get all endpoints for a specific resource (e.g., all Customer endpoints, all Invoice endpoints). Returns grouped operations (list, create, get, update, delete) for easier understanding.',
        inputSchema: {
          type: 'object',
          properties: {
            resource: {
              type: 'string',
              description: 'Resource name (e.g., Customers, Invoices, Orders). Use list_resource_groups to see all available resources.',
            },
          },
          required: ['resource'],
        },
      },
      {
        name: 'search_endpoints',
        description: 'Search across all endpoints by keyword. Searches in: path, summary, description, and tags. Returns ranked results. Use this when you know what you want to do but not the exact endpoint name.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search keyword (e.g., "customer", "invoice", "payment", "bookkeep", "email")',
            },
            limit: {
              type: 'number',
              description: 'Optional: Maximum number of results to return (default: 20)',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'list_resource_groups',
        description: 'List all 81 resource groups in the Fortnox API with endpoint counts. Resource groups represent different business entities (Customers, Invoices, Products, etc.). Use this to discover what resources are available.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_schema_details',
        description: 'Get detailed schema information for a specific data model referenced in the API.',
        inputSchema: {
          type: 'object',
          properties: {
            schemaName: {
              type: 'string',
              description: 'The schema name (e.g., fortnox_Customer, fortnox_Invoice)',
            },
          },
          required: ['schemaName'],
        },
      },
    ];
  }

  /**
   * Handle tool execution - returns documentation only
   */
  private async handleToolCall(toolName: string, args: ToolCallArguments): Promise<any> {
    try {
      switch (toolName) {
        case 'get_api_overview':
          return this.getAPIOverview();
        case 'list_all_endpoints':
          return this.listAllEndpoints(args);
        case 'get_endpoint_details':
          return this.getEndpointDetails(args);
        case 'get_endpoints_by_resource':
          return this.getEndpointsByResource(args);
        case 'search_endpoints':
          return this.searchEndpoints(args);
        case 'list_resource_groups':
          return this.listResourceGroups();
        case 'get_schema_details':
          return this.getSchemaDetails(args);
        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${toolName}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private getAPIOverview(): any {
    const spec = this.parser.getSpec();
    const baseUrl = this.parser.getBaseUrl();
    
    const methodCounts: Record<string, number> = {};
    for (const endpoint of this.endpoints) {
      methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
    }

    const tagCounts: Record<string, number> = {};
    for (const endpoint of this.endpoints) {
      if (endpoint.tags) {
        for (const tag of endpoint.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const overview = `# Fortnox API Overview

## General Information
- **API Title**: ${spec.info.title}
- **Version**: ${spec.info.version || 'Not specified'}
- **Base URL**: ${baseUrl}

## Authentication
Based on the OpenAPI spec, Fortnox API uses:
- **Access-Token**: Required header for authentication
- **Client-Secret**: Optional header for certain endpoints

## Rate Limits (from documentation)
- **25 requests per 5 seconds** per access token
- **300 requests per minute** per access token

## API Statistics
- **Total Endpoints**: ${this.endpoints.length}
- **Resource Groups**: ${Object.keys(tagCounts).length}

### Endpoints by Method:
${Object.entries(methodCounts).map(([method, count]) => `- ${method}: ${count} endpoints`).join('\n')}

### Top 10 Resource Groups:
${Object.entries(tagCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([tag, count]) => `- ${tag}: ${count} endpoints`)
  .join('\n')}

## Recommended Workflow
1. Use \`list_resource_groups\` to see all available resources
2. Use \`get_endpoints_by_resource\` to see all operations for a resource
3. Use \`get_endpoint_details\` to understand specific endpoint requirements
4. Use \`search_endpoints\` to find endpoints by functionality

## API Description
${spec.info.description || 'No description available'}
`;

    return {
      content: [
        {
          type: 'text',
          text: overview,
        },
      ],
    };
  }

  private listAllEndpoints(args: ToolCallArguments): any {
    let filteredEndpoints = this.endpoints;

    // Filter by method if provided
    if (args.method) {
      filteredEndpoints = filteredEndpoints.filter(
        e => e.method.toUpperCase() === (args.method as string).toUpperCase()
      );
    }

    // Filter by tag if provided
    if (args.tag) {
      filteredEndpoints = filteredEndpoints.filter(
        e => e.tags?.includes(args.tag as string)
      );
    }

    // Apply limit if provided
    const limit = args.limit ? Number(args.limit) : filteredEndpoints.length;
    const limitedEndpoints = filteredEndpoints.slice(0, limit);

    const result = limitedEndpoints.map(endpoint => ({
      method: endpoint.method,
      path: endpoint.path,
      operationId: endpoint.operationId,
      summary: endpoint.summary || 'No summary',
      tags: endpoint.tags || [],
    }));

    const markdown = `# Fortnox API Endpoints

**Total Found**: ${filteredEndpoints.length} ${args.method ? `${args.method} ` : ''}endpoints${args.tag ? ` in ${args.tag}` : ''}
**Showing**: ${limitedEndpoints.length} endpoints${limit < filteredEndpoints.length ? ` (limited to ${limit})` : ''}

## Endpoints

${result.map(e => `### ${e.method} ${e.path}
- **Operation**: ${e.operationId}
- **Summary**: ${e.summary}
- **Tags**: ${e.tags.join(', ') || 'None'}
`).join('\n')}

${filteredEndpoints.length > limit ? `\n*Note: ${filteredEndpoints.length - limit} additional endpoints not shown. Use limit parameter to see more.*` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  private getEndpointDetails(args: ToolCallArguments): any {
    const path = args.path as string;
    const method = (args.method as string).toUpperCase();

    const endpoint = this.endpoints.find(
      e => e.path === path && e.method === method
    );

    if (!endpoint) {
      return {
        content: [
          {
            type: 'text',
            text: `Endpoint not found: ${method} ${path}\n\nTip: Use search_endpoints or list_all_endpoints to find the correct path.`,
          },
        ],
        isError: true,
      };
    }

    // Separate required and optional parameters
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    const requiredParams = endpoint.parameters.filter(p => p.required);
    const optionalParams = endpoint.parameters.filter(p => !p.required);

    const markdown = `# ${endpoint.method} ${endpoint.path}

## Overview
- **Operation ID**: ${endpoint.operationId}
- **Summary**: ${endpoint.summary || 'N/A'}
- **Resource Tags**: ${endpoint.tags?.join(', ') || 'N/A'}

## Description
${endpoint.description || 'No detailed description available.'}

## Parameters

${pathParams.length > 0 ? `### Path Parameters (Required)
${pathParams.map(p => `- **${p.name}** (${p.schema?.type || 'unknown'})
  - ${p.description || 'No description'}
  - ${p.schema?.pattern ? `Pattern: \`${p.schema.pattern}\`` : ''}
  - ${p.schema?.enum ? `Allowed values: ${p.schema.enum.join(', ')}` : ''}`).join('\n\n')}
` : '### Path Parameters\nNone\n'}

${queryParams.length > 0 ? `### Query Parameters
${queryParams.map(p => `- **${p.name}** (${p.schema?.type || 'unknown'})${p.required ? ' *REQUIRED*' : ' *optional*'}
  - ${p.description || 'No description'}
  - ${p.schema?.enum ? `Allowed values: ${p.schema.enum.join(', ')}` : ''}
  - ${p.schema?.minimum !== undefined ? `Min: ${p.schema.minimum}` : ''}
  - ${p.schema?.maximum !== undefined ? `Max: ${p.schema.maximum}` : ''}`).join('\n\n')}
` : '### Query Parameters\nNone\n'}

${endpoint.requestBodySchema ? `## Request Body
Required for ${endpoint.method} requests.

\`\`\`json
${JSON.stringify(endpoint.requestBodySchema, null, 2)}
\`\`\`
` : '## Request Body\nNot applicable for this endpoint.\n'}

${endpoint.responseSchema ? `## Response Schema
\`\`\`json
${JSON.stringify(endpoint.responseSchema, null, 2)}
\`\`\`
` : '## Response\nResponse schema not documented in OpenAPI spec.\n'}

## Quick Reference
- **Base URL**: https://api.fortnox.se
- **Full URL**: https://api.fortnox.se${endpoint.path}
- **Required Parameters**: ${requiredParams.length > 0 ? requiredParams.map(p => p.name).join(', ') : 'None'}
- **Optional Parameters**: ${optionalParams.length > 0 ? optionalParams.map(p => p.name).join(', ') : 'None'}

## Notes for Implementation
1. Authentication: Include 'Access-Token' header
2. Rate Limit: 25 requests per 5 seconds
3. Content-Type: application/json
`;

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  private getEndpointsByResource(args: ToolCallArguments): any {
    const resource = args.resource as string;
    
    // Find matching tag (case-insensitive, partial match)
    const matchingEndpoints = this.endpoints.filter(e => 
      e.tags?.some(tag => 
        tag.toLowerCase().includes(resource.toLowerCase()) ||
        resource.toLowerCase().includes(tag.toLowerCase().replace('fortnox_', ''))
      )
    );

    if (matchingEndpoints.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No endpoints found for resource: ${resource}\n\nTip: Use list_resource_groups to see all available resources.`,
          },
        ],
        isError: true,
      };
    }

    // Group by operation type
    const grouped = {
      list: matchingEndpoints.filter(e => e.method === 'GET' && !e.path.includes('{')),
      get: matchingEndpoints.filter(e => e.method === 'GET' && e.path.includes('{')),
      create: matchingEndpoints.filter(e => e.method === 'POST'),
      update: matchingEndpoints.filter(e => e.method === 'PUT' || e.method === 'PATCH'),
      delete: matchingEndpoints.filter(e => e.method === 'DELETE'),
    };

    const markdown = `# ${resource} Resource Endpoints

**Total Endpoints**: ${matchingEndpoints.length}

## Operations Summary
- **List/Search**: ${grouped.list.length} endpoints
- **Get Single**: ${grouped.get.length} endpoints
- **Create**: ${grouped.create.length} endpoints
- **Update**: ${grouped.update.length} endpoints
- **Delete**: ${grouped.delete.length} endpoints

${grouped.list.length > 0 ? `## List/Search Operations
${grouped.list.map(e => `### ${e.method} ${e.path}
- **Summary**: ${e.summary || 'N/A'}
- **Operation**: ${e.operationId}
`).join('\n')}` : ''}

${grouped.get.length > 0 ? `## Get Single Resource
${grouped.get.map(e => `### ${e.method} ${e.path}
- **Summary**: ${e.summary || 'N/A'}
- **Operation**: ${e.operationId}
`).join('\n')}` : ''}

${grouped.create.length > 0 ? `## Create Operations
${grouped.create.map(e => `### ${e.method} ${e.path}
- **Summary**: ${e.summary || 'N/A'}
- **Operation**: ${e.operationId}
`).join('\n')}` : ''}

${grouped.update.length > 0 ? `## Update Operations
${grouped.update.map(e => `### ${e.method} ${e.path}
- **Summary**: ${e.summary || 'N/A'}
- **Operation**: ${e.operationId}
`).join('\n')}` : ''}

${grouped.delete.length > 0 ? `## Delete Operations
${grouped.delete.map(e => `### ${e.method} ${e.path}
- **Summary**: ${e.summary || 'N/A'}
- **Operation**: ${e.operationId}
`).join('\n')}` : ''}

## Next Steps
Use \`get_endpoint_details\` with the specific path and method to see full documentation for any endpoint above.
`;

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  private searchEndpoints(args: ToolCallArguments): any {
    const keyword = (args.keyword as string).toLowerCase();
    const limit = args.limit ? Number(args.limit) : 20;

    const results = this.endpoints.filter(endpoint => {
      const pathMatch = endpoint.path.toLowerCase().includes(keyword);
      const summaryMatch = endpoint.summary?.toLowerCase().includes(keyword);
      const descMatch = endpoint.description?.toLowerCase().includes(keyword);
      const tagMatch = endpoint.tags?.some(t => t.toLowerCase().includes(keyword));
      const operationMatch = endpoint.operationId.toLowerCase().includes(keyword);

      return pathMatch || summaryMatch || descMatch || tagMatch || operationMatch;
    });

    const limitedResults = results.slice(0, limit);

    const markdown = `# Search Results for "${keyword}"

**Total Matches**: ${results.length} endpoints
**Showing**: ${limitedResults.length} endpoints

${limitedResults.map((e, i) => `## ${i + 1}. ${e.method} ${e.path}
- **Summary**: ${e.summary || 'No summary'}
- **Operation**: ${e.operationId}
- **Tags**: ${e.tags?.join(', ') || 'None'}
${e.description ? `- **Description**: ${e.description.substring(0, 150)}${e.description.length > 150 ? '...' : ''}` : ''}
`).join('\n')}

${results.length > limit ? `\n**Note**: ${results.length - limit} additional results not shown. Use the limit parameter to see more.` : ''}

${results.length > 0 ? '\n**Tip**: Use `get_endpoint_details` with the exact path and method to see full documentation.' : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: results.length > 0 ? markdown : `No endpoints found matching "${keyword}"\n\nTip: Try different keywords or use list_resource_groups to explore available resources.`,
        },
      ],
    };
  }

  private listResourceGroups(): any {
    const tagCounts: Record<string, number> = {};

    for (const endpoint of this.endpoints) {
      if (endpoint.tags) {
        for (const tag of endpoint.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

    // Group by category
    const categories: Record<string, string[]> = {
      'Core Business': [],
      'Financial': [],
      'Documents': [],
      'Configuration': [],
      'Other': [],
    };

    sorted.forEach(([tag, count]) => {
      const cleanTag = tag.replace('fortnox_', '');
      const entry = `${cleanTag} (${count} endpoints)`;
      
      if (['Customers', 'Suppliers', 'Employees', 'Articles', 'Products'].some(k => tag.includes(k))) {
        categories['Core Business'].push(entry);
      } else if (['Invoice', 'Payment', 'Account', 'Currency', 'Financial'].some(k => tag.includes(k))) {
        categories['Financial'].push(entry);
      } else if (['Order', 'Offer', 'Contract', 'Voucher'].some(k => tag.includes(k))) {
        categories['Documents'].push(entry);
      } else if (['Settings', 'Mode', 'Price', 'Label', 'Unit'].some(k => tag.includes(k))) {
        categories['Configuration'].push(entry);
      } else {
        categories['Other'].push(entry);
      }
    });

    const markdown = `# Fortnox API Resource Groups

**Total Resource Groups**: ${sorted.length}

## Categories

${Object.entries(categories).filter(([_, items]) => items.length > 0).map(([category, items]) => `### ${category}
${items.map(item => `- ${item}`).join('\n')}
`).join('\n')}

## All Resources (Alphabetically)
${sorted.sort((a, b) => a[0].localeCompare(b[0])).map(([tag, count]) => 
  `- **${tag.replace('fortnox_', '')}**: ${count} endpoints`
).join('\n')}

## Usage Tips
- Use \`get_endpoints_by_resource\` with a resource name to see all its endpoints
- Resource names can be used with or without 'fortnox_' prefix
- Example: \`get_endpoints_by_resource("Customers")\` or \`get_endpoints_by_resource("fortnox_Customers")\`
`;

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  private getSchemaDetails(args: ToolCallArguments): any {
    const schemaName = args.schemaName as string;
    const schema = this.parser.resolveSchemaRef(`#/components/schemas/${schemaName}`);

    if (!schema) {
      return {
        content: [
          {
            type: 'text',
            text: `Schema not found: ${schemaName}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `# Schema: ${schemaName}\n\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Fortnox API Documentation Server started successfully');
    console.error(`Loaded ${this.endpoints.length} endpoints from OpenAPI specification`);
    console.error('Providing documentation and endpoint information (no API calls)');
    console.error('🔌 Waiting for MCP client connections via stdio...\n');
  }
}

// Start server (works when run directly or by MCP client)
const startServer = async () => {
  try {
    console.error('🚀 Starting Fortnox MCP Server...\n');
    const server = new FortnoxMCPServer();
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\nFailed to initialize Fortnox MCP Server\n');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}\n`);
      console.error(`Stack: ${error.stack}\n`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
};

startServer();
