# Ảnh Docker "tất cả trong một" của VNS: giao diện + pipeline + dữ liệu.
# Dùng cho nơi chạy Docker (VPS, Railway, Fly.io, Hugging Face Spaces...).
#
#   docker build -t vns .
#   docker run -p 3001:3001 -v vns-data:/data \
#     -e PIPELINE_API_KEY=... -e ADMIN_PASSWORD=... \
#     -e LLM_ENABLED=true -e LLM_PROVIDER=gemini -e GEMINI_API_KEY=... vns
#
# Trên Render không cần tệp này: render.yaml dùng môi trường Node có sẵn.

# --- Giao diện ---------------------------------------------------------------
FROM node:22-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json \
     tailwind.config.ts postcss.config.js components.json ./
COPY public ./public
COPY src ./src
RUN npm run build:standalone

# --- Pipeline ----------------------------------------------------------------
FROM node:22-slim AS server
WORKDIR /app/pipeline
COPY pipeline/package.json pipeline/package-lock.json ./
RUN npm ci --include=dev
COPY pipeline/tsconfig.json ./
COPY pipeline/src ./src
RUN npm run build && npm prune --omit=dev

# --- Ảnh chạy ----------------------------------------------------------------
FROM node:22-slim
ENV NODE_ENV=production \
    WEB_ENABLED=true \
    PIPELINE_ALLOWED_IPS=* \
    DATA_DIR=/data
WORKDIR /app/pipeline
COPY --from=server /app/pipeline/node_modules ./node_modules
COPY --from=server /app/pipeline/dist ./dist
COPY pipeline/package.json pipeline/eng.traineddata pipeline/vie.traineddata ./
COPY pipeline/data ./data
COPY --from=web /app/dist /app/dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME /data
EXPOSE 3001
CMD ["node", "dist/main.js"]
