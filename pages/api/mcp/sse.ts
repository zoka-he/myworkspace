// pages/api/mcp/sse.ts
// 专门用于 SSE (Server-Sent Events) 模式的 MCP 端点
import type { NextApiRequest, NextApiResponse } from 'next';
import { mcpToolRegistry } from '../../../src/mcp/core/mcpToolRegistry';

// SSE 辅助函数：发送 SSE 格式的数据
function sendSSE(res: NextApiResponse, data: any) {
  if (res.writableEnded) {
    console.warn('[MCP SSE] Attempted to write to closed response');
    return false;
  }
  try {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const written = res.write(message);
    // 确保数据立即刷新
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
    return written;
  } catch (error) {
    console.error('[MCP SSE] Write error:', error);
    return false;
  }
}

// SSE 辅助函数：发送错误（不关闭连接，让客户端决定是否重连）
function sendSSEError(res: NextApiResponse, id: any, error: any) {
  sendSSE(res, {
    jsonrpc: '2.0',
    id,
    error
  });
  // 不立即关闭连接，允许客户端继续使用
  // res.end() 会在响应完成后由 Next.js 自动处理
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 只支持 POST 请求
  if (req.method !== 'POST') {
    // 对于非 POST 请求，也返回 SSE 格式的错误
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(200);
    sendSSEError(res, null, { 
      code: -32600, 
      message: 'Method Not Allowed. Only POST requests are supported.' 
    });
    setTimeout(() => {
      if (!res.writableEnded) {
        res.end();
      }
    }, 50);
    return;
  }

  // 始终设置 SSE 响应头（必须在任何写入之前设置）
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  res.setHeader('Access-Control-Allow-Origin', '*'); // 如果需要 CORS
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200);
  
  // 立即发送初始连接确认（SSE 注释，帮助客户端确认连接已建立）
  // 这必须在处理请求之前发送，以避免超时
  try {
    if (!res.writableEnded) {
      res.write(': connected\n\n');
      // 立即刷新，确保客户端收到连接确认
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }
  } catch (error) {
    console.error('[MCP SSE] Initial write error:', error);
    // 如果初始写入失败，仍然继续处理请求
  }

  // 处理连接关闭事件
  let isClosed = false;
  req.on('close', () => {
    isClosed = true;
    console.debug('[MCP SSE] Client disconnected');
  });
  
  // 检查连接是否已关闭的辅助函数
  const checkClosed = () => isClosed || res.writableEnded;

  try {
    const rpcRequest = req.body;
    
    // 验证JSON-RPC基本结构
    if (!rpcRequest || rpcRequest.jsonrpc !== '2.0') {
      sendSSEError(res, null, { 
        code: -32600, 
        message: 'Invalid Request' 
      });
      // 延迟关闭，给客户端时间接收错误消息
      setTimeout(() => {
        if (!res.writableEnded) {
          res.end();
        }
      }, 100);
      return;
    }
    
    const { method, id, params } = rpcRequest;
    console.debug('[MCP SSE]', method, 'id=', id, 'params.name=', params?.name);

    // 处理不同的MCP方法
    switch (method) {

      // MCP 初始化方法
      case 'initialize': {
        if (checkClosed()) return;
        
        const response = {
          jsonrpc: '2.0' as const,
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
        };
        
        if (sendSSE(res, response)) {
          // 延迟关闭，确保数据已发送
          setTimeout(() => {
            if (!checkClosed()) {
              try {
                res.end();
              } catch (e) {
                console.error('[MCP SSE] Error closing response:', e);
              }
            }
          }, 100);
        }
        return;
      }

      // MCP 初始化完成通知（客户端发送，服务器不需要响应）
      case 'notifications/initialized': {
        // 这是一个通知，不需要返回响应
        console.debug('[MCP SSE] Initialized notification received');
        // 不关闭连接，保持连接打开以供后续请求使用
        return;
      }

      // 获取所有工具列表
      case 'tools/list': {
        if (checkClosed()) return;
        
        const tools = mcpToolRegistry.getAllToolDefinitions();
        const response = {
          jsonrpc: '2.0' as const,
          id,
          result: { tools }
        };
        
        if (sendSSE(res, response)) {
          // 延迟关闭，确保数据已发送
          setTimeout(() => {
            if (!checkClosed()) {
              try {
                res.end();
              } catch (e) {
                console.error('[MCP SSE] Error closing response:', e);
              }
            }
          }, 100);
        }
        return;
      }
      
      // 执行工具
      case 'tools/call': {
        if (checkClosed()) return;
        
        if (!params || !params.name) {
          sendSSEError(res, id, { 
            code: -32602, 
            message: 'Invalid params: missing tool name' 
          });
          setTimeout(() => {
            if (!checkClosed()) {
              try {
                res.end();
              } catch (e) {
                console.error('[MCP SSE] Error closing response:', e);
              }
            }
          }, 100);
          return;
        }
        
        // 执行工具并返回标准 MCP 格式响应
        try {
          if (checkClosed()) return;
          
          const result = await mcpToolRegistry.executeTool(
            params.name, 
            params.arguments || {}
          );
          
          if (checkClosed()) return;
          
          // 确保返回标准 MCP tools/call 响应格式
          const response = {
            jsonrpc: '2.0' as const,
            id,
            result: {
              content: result.content || [],
              isError: result.isError || false
            }
          };
          
          if (sendSSE(res, response)) {
            // 延迟关闭，确保数据已发送
            setTimeout(() => {
              if (!checkClosed()) {
                try {
                  res.end();
                } catch (e) {
                  console.error('[MCP SSE] Error closing response:', e);
                }
              }
            }, 100);
          }
          return;
        } catch (toolError: any) {
          if (checkClosed()) return;
          
          console.error('[MCP SSE] Tool execution error:', toolError);
          // 返回标准错误格式
          const errorResponse = {
            jsonrpc: '2.0' as const,
            id,
            result: {
              content: [{
                type: 'text' as const,
                text: `Tool execution failed: ${toolError.message}`
              }],
              isError: true
            }
          };
          
          if (sendSSE(res, errorResponse)) {
            setTimeout(() => {
              if (!checkClosed()) {
                try {
                  res.end();
                } catch (e) {
                  console.error('[MCP SSE] Error closing response:', e);
                }
              }
            }, 100);
          }
          return;
        }
      }
      
      // 心跳检测
      case 'ping': {
        if (checkClosed()) return;
        
        const response = {
          jsonrpc: '2.0' as const,
          id,
          result: { 
            status: 'ok',
            toolCount: mcpToolRegistry.getToolCount(),
            timestamp: new Date().toISOString()
          }
        };
        
        if (sendSSE(res, response)) {
          // 延迟关闭，确保数据已发送
          setTimeout(() => {
            if (!checkClosed()) {
              try {
                res.end();
              } catch (e) {
                console.error('[MCP SSE] Error closing response:', e);
              }
            }
          }, 100);
        }
        return;
      }
      
      // 兜底方法
      default: {
        if (checkClosed()) return;
        
        sendSSEError(res, id, { 
          code: -32601, 
          message: `Method not found: ${method}` 
        });
        setTimeout(() => {
          if (!checkClosed()) {
            res.end();
          }
        }, 50);
        return;
      }
    }
    
  } catch (error: any) {
    console.error('MCP SSE API Error:', error);
    if (!isClosed && !res.writableEnded) {
      sendSSEError(res, req.body?.id || null, { 
        code: -32603, 
        message: `Internal error: ${error.message}` 
      });
      // 延迟关闭，确保错误消息已发送
      setTimeout(() => {
        if (!isClosed && !res.writableEnded) {
          res.end();
        }
      }, 100);
    }
  }
}
