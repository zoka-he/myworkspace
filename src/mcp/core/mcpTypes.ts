// lib/mcp/core/types.ts
export interface MCPSchemaProperty {
    type: string;
    description?: string;
    enum?: string[];
    default?: any;
  }
  
  export interface MCPInputSchema {
    type: 'object';
    properties: Record<string, MCPSchemaProperty>;
    required?: string[];
  }
  
  export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: MCPInputSchema;
  }
  
  export type MCPToolContent =
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'json';
        json: any;
      };
  
  export interface MCPToolResult {
    content: MCPToolContent[];
    isError: boolean;
    rawData?: any;
  }
  
  export interface MCPJsonRpcRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: {
      name?: string;
      arguments?: Record<string, any>;
    };
  }