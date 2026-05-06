import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { TOKEN_PROVIDERS, providerIds, resolveProviderEnv } from './providers.js';

const serverInfo = {
    name: 'get-access-token-mcp',
    version: '1.0.0'
};

const instructions =
    '从本机环境变量读取各平台 access token（不发起网络请求）。使用前请在运行 MCP 的进程中配置对应环境变量。' +
    '可用 list_access_token_providers 查看已配置的 provider；用 get_access_token 按平台取值。';

function toolError(message) {
    return {
        content: [{ type: 'text', text: message }],
        isError: true
    };
}

/**
 * @returns {McpServer}
 */
export function createTokenMcpServer() {
    const server = new McpServer(serverInfo, {
        instructions,
        capabilities: {}
    });

    server.registerTool(
        'list_access_token_providers',
        {
            title: '列出令牌来源',
            description:
                '列出内置平台（Gitee、蓝湖等）及对应环境变量名，并标记当前进程是否已配置该变量（不返回密钥内容）。'
        },
        async () => {
            const list = providerIds.map((id) => {
                const p = TOKEN_PROVIDERS[id];
                const envVars = p.envVars ?? (p.envVar ? [p.envVar] : []);
                const { value } = resolveProviderEnv(p);
                return {
                    id,
                    title: p.title,
                    description: p.description,
                    envVars,
                    configured: Boolean(value)
                };
            });
            const text = JSON.stringify({ providers: list }, null, 2);
            return { content: [{ type: 'text', text }] };
        }
    );

    server.registerTool(
        'get_access_token',
        {
            title: '获取内置平台令牌',
            description:
                '按内置 provider id 从环境变量读取原始令牌字符串，供调用方用于 API 请求。若未配置则返回错误。',
            inputSchema: z.object({
                provider: z
                    .enum(providerIds)
                    .describe(`内置平台 id，可选值：${providerIds.join(', ')}`)
            })
        },
        async ({ provider }) => {
            const meta = TOKEN_PROVIDERS[provider];
            const { value: raw, resolvedEnvVar } = resolveProviderEnv(meta);
            if (!raw || String(raw).trim() === '') {
                const hint = (meta.envVars ?? [meta.envVar]).filter(Boolean).join(' 或 ');
                return toolError(`环境变量 ${hint} 均未设置或为空，无法提供 ${meta.title} 的 access token。`);
            }
            const payload = {
                provider,
                title: meta.title,
                token: raw,
                source: `env:${resolvedEnvVar}`
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
            };
        }
    );

    server.registerTool(
        'get_token_from_env',
        {
            title: '按环境变量名读取令牌',
            description:
                '从任意环境变量名读取字符串（用于未列入内置表的令牌）。请仅传入你自己在环境中配置过的变量名。',
            inputSchema: z.object({
                envVar: z
                    .string()
                    .min(1)
                    .describe('环境变量名称，例如 MY_CUSTOM_API_TOKEN'),
                optional: z
                    .boolean()
                    .optional()
                    .describe('为 true 时若未设置则返回空字符串而非错误')
            })
        },
        async ({ envVar, optional }) => {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envVar)) {
                return toolError('envVar 仅允许字母、数字与下划线，且不能以数字开头。');
            }
            const raw = process.env[envVar];
            if (raw === undefined || String(raw).trim() === '') {
                if (optional) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ envVar, token: '', configured: false }, null, 2)
                            }
                        ]
                    };
                }
                return toolError(`环境变量 ${envVar} 未设置或为空。`);
            }
            const payload = { envVar, token: raw, configured: true };
            return {
                content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
            };
        }
    );

    return server;
}
