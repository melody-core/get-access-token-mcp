import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { createTokenMcpServer } from './create-server.js';

/**
 * HTTP 上的 MCP：仅使用 StreamableHTTPServerTransport（GET/POST/DELETE 同一端点）。
 * 不支持已废弃的 HTTP+SSE（2024-11-05）传输；客户端需使用 Streamable HTTP。
 *
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {string} [options.host]
 * @param {string} [options.httpPath] 默认 /mcp
 */
export async function runSse(options = {}) {
    const port =
        options.port ??
        (process.env.PORT !== undefined && process.env.PORT !== ''
            ? Number(process.env.PORT)
            : 3333);
    const host = options.host ?? process.env.HOST ?? '127.0.0.1';
    const httpPath = options.httpPath ?? process.env.MCP_HTTP_PATH ?? '/mcp';

    const app = createMcpExpressApp({ host });
    /** @type {Record<string, StreamableHTTPServerTransport>} */
    const transports = {};

    app.all(httpPath, async (req, res) => {
        try {
            const sessionId = req.headers['mcp-session-id'];
            let transport;
            if (sessionId && transports[sessionId]) {
                transport = transports[sessionId];
            } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
                const eventStore = new InMemoryEventStore();
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    eventStore,
                    onsessioninitialized: (sid) => {
                        transports[sid] = transport;
                    }
                });
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) {
                        delete transports[sid];
                    }
                };
                const server = createTokenMcpServer();
                await server.connect(transport);
            } else {
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided'
                    },
                    id: null
                });
                return;
            }
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error('Streamable HTTP 处理失败:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error'
                    },
                    id: null
                });
            }
        }
    });

    const httpServer = await new Promise((resolve, reject) => {
        const s = app.listen(port, host, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(s);
        });
    });

    const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
    const base = `http://${displayHost}:${port}`;
    console.error(
        `[get-access-token-mcp] Streamable HTTP 已监听 ${host}:${port}\n` +
            `  端点: ${base}${httpPath} （GET / POST / DELETE）`
    );

    const shutdown = async () => {
        for (const sid of Object.keys(transports)) {
            try {
                await transports[sid].close();
            } catch {
                /* ignore */
            }
            delete transports[sid];
        }
        httpServer.close();
    };
    process.on('SIGINT', () => {
        shutdown().finally(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        shutdown().finally(() => process.exit(0));
    });

    return httpServer;
}
