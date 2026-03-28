FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/

RUN chown -R node:node /app
USER node

EXPOSE 5173

CMD ["pnpm", "--filter", "@taskforge/web", "dev"]
