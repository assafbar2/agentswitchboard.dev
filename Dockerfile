# Agent Switchboard — Next.js site + streamable-HTTP MCP server at /api/mcp.
# Used by registries (e.g. Glama) to verify the server starts and answers
# MCP introspection. No env vars required: the catalog is read from content/.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
