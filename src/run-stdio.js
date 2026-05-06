import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTokenMcpServer } from './create-server.js';

export async function runStdio() {
    const server = createTokenMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
