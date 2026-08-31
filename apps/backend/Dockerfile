# Build from the MONOREPO ROOT: docker build -f apps/backend/Dockerfile .
# (needed so `npm ci` can see every workspace's package.json referenced by
# the single root package-lock.json)

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
# Needs real internet access to binaries.prisma.sh — works in a normal CI/
# build environment; see the root README for why this can't be verified in
# this project's dev sandbox.
RUN npx prisma generate --schema apps/backend/prisma/schema.prisma
RUN npm run build --workspace=apps/backend

FROM node:20-alpine AS runtime
WORKDIR /repo/apps/backend
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/package.json /repo/package.json
COPY --from=build /repo/apps/backend /repo/apps/backend
USER app
EXPOSE 3001
CMD ["node", "dist/main.js"]
