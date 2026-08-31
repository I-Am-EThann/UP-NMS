# Build from the MONOREPO ROOT: docker build -f apps/frontend/Dockerfile .

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
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build --workspace=apps/frontend

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
# Standalone output only bundles the node_modules this app actually needs —
# much smaller than copying the whole monorepo's node_modules.
COPY --from=build /repo/apps/frontend/.next/standalone ./
COPY --from=build /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /repo/apps/frontend/public ./apps/frontend/public
USER app
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
