// pages/api/mcp/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { mcpToolRegistry } from '../../../src/mcp/core/mcpToolRegistry';
import { allTools } from '../../../src/mcp/index';

// 初始化注册（确保只执行一次）
if (mcpToolRegistry.getToolCount() === 0) {
  console.log('初始化MCP工具注册...');
  mcpToolRegistry.registerAll(allTools);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  // GET：返回 MCP 端点说明，便于直接访问 /api/mcp 时有预期结果
  if (req.method === 'GET') {
    return res.status(200).json({
      type: 'mcp',
      endpoint: 'POST /api/mcp',
      usage: 'POST JSON-RPC 2.0 请求，Content-Type: application/json',
      methods: ['tools/list', 'tools/call', 'ping'],
      toolsListHint: 'POST {"jsonrpc":"2.0","id":1,"method":"tools/list"} 获取工具列表',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Method Not Allowed' }
    });
  }
  
  try {
    const rpcRequest = req.body;
    
    // 验证JSON-RPC基本结构
    if (!rpcRequest || rpcRequest.jsonrpc !== '2.0') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request' }
      });
    }
    
    const { method, id, params } = rpcRequest;
    console.debug('[MCP]', method, 'id=', id, 'params.name=', params?.name);

    // 处理不同的MCP方法
    switch (method) {

      // 获取所有工具列表
      case 'tools/list': {
        const tools = mcpToolRegistry.getAllToolDefinitions();
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { tools }
        });
      }
      
      // 执行工具
      case 'tools/call': {
        if (!params || !params.name) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id,
            error: { 
              code: -32602, 
              message: 'Invalid params: missing tool name' 
            }
          });
        }
        
        const result = await mcpToolRegistry.executeTool(
          params.name, 
          params.arguments || {}
        );
        
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result
        });
      }
      
      // 心跳检测
      case 'ping':
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { 
            status: 'ok',
            toolCount: mcpToolRegistry.getToolCount(),
            timestamp: new Date().toISOString()
          }
        });
      
      // 兜底方法
      default:
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          error: { 
            code: -32601, 
            message: `Method not found: ${method}` 
          }
        });
    }
    
  } catch (error: any) {
    console.error('MCP API Error:', error);
    return res.status(200).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { 
        code: -32603, 
        message: `Internal error: ${error.message}` 
      }
    });
  }
}