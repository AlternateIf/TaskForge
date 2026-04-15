FROM node:22-alpine

RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/web/package.json apps/web/
COPY --chown=node:node packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node apps/web/ apps/web/
COPY --chown=node:node packages/shared/ packages/shared/

EXPOSE 5173

CMD ["pnpm", "--filter", "@taskforge/web", "exec", "vite", "--host", "0.0.0.0"]
