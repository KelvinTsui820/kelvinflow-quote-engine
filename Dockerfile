# 基础镜像使用轻量稳定的 Node.js LTS
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖配置文件以利用 Docker 缓存
COPY package*.json tsconfig.json ./

# 安装依赖
RUN npm ci

# 复制所有源码
COPY . .

# 构建 TypeScript 生产代码
RUN npm run build

# 生产运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制编译后的 dist 目录
COPY --from=builder /app/dist ./dist

# 如果有静态资源或必要模板，复制过来
COPY --from=builder /app/data ./data 2>/dev/null || true

EXPOSE 3000

CMD ["node", "dist/index.js"]
