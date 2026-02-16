import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

export interface Operation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Schema;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

export interface Response {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

export interface Schema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  additionalProperties?: Schema | boolean;
}

export interface FortnoxEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: Parameter[];
  requestBodySchema?: Schema;
  responseSchema?: Schema;
  tags?: string[];
}

export class OpenAPIParser {
  private spec: OpenAPISpec;

  constructor(specPath: string) {
    const specContent = readFileSync(specPath, 'utf-8');
    this.spec = JSON.parse(specContent);
  }

  getSpec(): OpenAPISpec {
    return this.spec;
  }

  getBaseUrl(): string {
    if (!this.spec.servers || this.spec.servers.length === 0) {
      throw new Error('No servers defined in OpenAPI spec');
    }
    return this.spec.servers[0].url;
  }

  getAllEndpoints(): FortnoxEndpoint[] {
    const endpoints: FortnoxEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

      for (const method of methods) {
        const operation = pathItem[method];
        if (operation) {
          endpoints.push(this.parseOperation(path, method, operation));
        }
      }
    }

    return endpoints;
  }

  getEndpointsByTag(tag: string): FortnoxEndpoint[] {
    return this.getAllEndpoints().filter(endpoint => 
      endpoint.tags?.includes(tag)
    );
  }

  private parseOperation(
    path: string,
    method: string,
    operation: Operation
  ): FortnoxEndpoint {
    const endpoint: FortnoxEndpoint = {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      parameters: operation.parameters || [],
      tags: operation.tags,
    };

    // Parse request body schema
    if (operation.requestBody) {
      const content = operation.requestBody.content;
      const contentType = Object.keys(content)[0];
      if (contentType && content[contentType]?.schema) {
        endpoint.requestBodySchema = content[contentType].schema;
      }
    }

    // Parse response schema (typically the 200 response)
    const successResponse = operation.responses['200'] || operation.responses['201'];
    if (successResponse?.content) {
      const contentType = Object.keys(successResponse.content)[0];
      if (contentType && successResponse.content[contentType]?.schema) {
        endpoint.responseSchema = successResponse.content[contentType].schema;
      }
    }

    return endpoint;
  }

  resolveSchemaRef(ref: string): Schema | undefined {
    // Handle $ref like "#/components/schemas/SchemaName"
    if (!ref.startsWith('#/components/schemas/')) {
      return undefined;
    }

    const schemaName = ref.replace('#/components/schemas/', '');
    return this.spec.components?.schemas?.[schemaName];
  }

  getSchemaDescription(schema: Schema): string {
    if (schema.$ref) {
      const resolved = this.resolveSchemaRef(schema.$ref);
      return resolved?.description || 'Schema reference';
    }

    if (schema.description) {
      return schema.description;
    }

    if (schema.type === 'object' && schema.properties) {
      const props = Object.keys(schema.properties).slice(0, 3).join(', ');
      return `Object with properties: ${props}${Object.keys(schema.properties).length > 3 ? '...' : ''}`;
    }

    if (schema.type === 'array' && schema.items) {
      return `Array of ${schema.items.type || 'items'}`;
    }

    return schema.type || 'unknown';
  }
}

// Singleton instance
let parser: OpenAPIParser | null = null;

export function getOpenAPIParser(): OpenAPIParser {
  if (!parser) {
    // Get the directory where this module is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Load the OpenAPI spec from the project root (one level up from dist/)
    const specPath = join(__dirname, '..', 'openapi.json');
    parser = new OpenAPIParser(specPath);
  }
  return parser;
}
