# get-access-token-mcp

通过 MCP 工具从**本机环境变量**读取各平台 access token（例如 Gitee、蓝湖），不发起网络请求、不落盘密钥。

## 模式

| 模式 | 说明 |
|------|------|
| **stdio / cli**（默认） | 供 Cursor、Claude Desktop 等以子进程方式启动，`stdin/stdout` 走 JSON-RPC。 |
| **sse**（HTTP） | 仅 **Streamable HTTP**（`StreamableHTTPServerTransport`）：`GET` / `POST` / `DELETE` 同一 URL，默认 `/mcp`。不支持已废弃的 HTTP+SSE（2024-11-05）客户端。 |

## 安装与运行

```bash
npm install
```

- CLI（stdio）：`npm start` 或 `node src/index.js` / `node src/index.js stdio`
- SSE：`npm run start:sse` 或 `node src/index.js sse`

环境变量（可选）：

- `MCP_TRANSPORT`：`stdio` | `sse`（与命令行参数二选一）
- HTTP：`PORT`（默认 `3333`）、`HOST`（默认 `127.0.0.1`）、`MCP_HTTP_PATH`（默认 `/mcp`）。

## Docker 一键部署

镜像默认以 **Streamable HTTP** 监听 `0.0.0.0:3333`（容器内）。

```bash
cp .env.example .env
# 编辑 .env 填入需要的令牌

docker compose up -d --build
```

仅构建/运行镜像（不配 compose）：

```bash
docker build -t get-access-token-mcp .
docker run -d --name access-token-mcp -p 3333:3333 \
  -e HOST=0.0.0.0 \
  -e GITEE_ACCESS_TOKEN=xxx \
  -e LANHU_ACCESS_TOKEN=xxx \
  get-access-token-mcp
```

客户端请将 MCP URL 指向 **`http://<宿主机>:3333/mcp`**（须支持 **Streamable HTTP**，例如 Python / 新版 TypeScript SDK 的 `StreamableHTTPClientTransport`）。**勿把未加防护的端口暴露到公网**；生产环境建议前置反向代理、TLS 与访问控制。

### 其它客户端报错 `streamable_err` / UnboundLocalError

多见于 **Python MCP SDK** 在「先 Streamable、再回退旧版 SSE」分支里的 bug。本服务**仅提供 Streamable HTTP**，请使用支持该传输的客户端并升级到较新的 `mcp` 包；仅支持旧版 `SSEClientTransport`（纯 SSE）的客户端将无法连接。

## Cursor / MCP 客户端配置示例

**stdio：**

```json
{
  "mcpServers": {
    "access-tokens": {
      "command": "node",
      "args": ["/绝对路径/get-access-token-mcp/src/index.js", "stdio"],
      "env": {
        "GITEE_ACCESS_TOKEN": "你的令牌",
        "LANHU_ACCESS_TOKEN": "你的令牌"
      }
    }
  }
}
```

**HTTP / Streamable（需保证本机可访问该 URL）：**

```json
{
  "mcpServers": {
    "access-tokens-sse": {
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

## 工具说明

- `list_access_token_providers`：列出内置平台及对应环境变量、是否已配置。
- `get_access_token`：按内置 `provider`（`gitee`、`lanhu`、`github` 等）读取令牌。
- `get_token_from_env`：按任意合法环境变量名读取（用于自定义平台）。

内置变量名见 `src/providers.js`，也可参考仓库根目录 `.env.example`。

## 安全提示

令牌仅应通过环境变量注入运行 MCP 的进程；勿将真实密钥提交到仓库或写进客户端配置并共享。
