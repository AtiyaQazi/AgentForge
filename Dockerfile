FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# Persistent storage (PRD Â§11): mount a volume at /app/data and point
# AgentForge_DB_PATH at a file inside it, e.g. AgentForge_DB_PATH=/app/data/AgentForge.db.
# Example: docker run -v AgentForge_data:/app/data -e AgentForge_DB_PATH=/app/data/AgentForge.db ...
VOLUME ["/app/data"]

EXPOSE 3000
# --experimental-sqlite: node:sqlite is still an experimental API on Node 22
# (PRD Â§7 chose it explicitly for "no native build step"); drop this flag
# once the runtime Node version stabilizes it.
CMD ["node", "--experimental-sqlite", "dist/server.js"]

