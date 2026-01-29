// pages/api/mcp/index.ts
// 标准 JSON-RPC 2.0 MCP 端点（返回 JSON 响应）
// 如需 SSE 模式，请使用 /api/mcp/sse 端点
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
      sseEndpoint: '如需 SSE 模式，请使用 POST /api/mcp/sse 端点',
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

      // MCP 初始化方法
      case 'initialize': {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
              sampling: {}
            },
            serverInfo: {
              name: 'next-framework-mcp-server',
              version: '1.0.0'
            }
          }
        });
      }

      // MCP 初始化完成通知（客户端发送，服务器不需要响应）
      case 'notifications/initialized': {
        // 这是一个通知，不需要返回响应
        console.debug('[MCP] Initialized notification received');
        // 返回空响应或 204 No Content
        return res.status(204).end();
      }

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
          // 参数错误应该返回 JSON-RPC 错误（协议级错误）
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
        
        // 确保返回标准 MCP tools/call 响应格式
        // result 应该包含 content 和 isError 字段
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            content: result.content || [],
            isError: result.isError || false
          }
        });
      }
      
      // 心跳检测
      case 'ping': {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { 
            status: 'ok',
            toolCount: mcpToolRegistry.getToolCount(),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // 兜底方法
      default: {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          error: { 
            code: -32601, 
            message: `Method not found: ${method}` 
          }
        });
      }
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