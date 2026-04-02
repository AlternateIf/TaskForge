FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/api/package.json apps/api/
COPY --chown=node:node packages/shared/package.json packages/shared/
COPY --chown=node:node packages/db/package.json packages/db/
COPY --chown=node:node packages/email-templates/package.json packages/email-templates/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node apps/api/ apps/api/
COPY --chown=node:node packages/shared/ packages/shared/
COPY --chown=node:node packages/db/ packages/db/
COPY --chown=node:node packages/email-templates/ packages/email-templates/

CMD ["pnpm", "--filter", "@taskforge/api", "dev:worker"]
