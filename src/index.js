#!/usr/bin/env node
import { runStdio } from './run-stdio.js';
import { runSse } from './run-sse.js';

const mode = (process.argv[2] || process.env.MCP_TRANSPORT || 'stdio').toLowerCase();

async function main() {
    if (mode === 'sse' || mode === 'http') {
        await runSse();
        return;
    }
    if (mode === 'stdio' || mode === 'cli') {
        await runStdio();
        return;
    }
    console.error(`未知模式: ${mode}。请使用 stdio（默认）或 sse。`);
    process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
