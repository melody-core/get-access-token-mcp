# SSE 模式对外提供 HTTP；容器内需监听 0.0.0.0
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV MCP_TRANSPORT=sse

EXPOSE 3333

CMD ["node", "src/index.js", "sse"]
