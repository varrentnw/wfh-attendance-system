# One image for the gateway and the three services. They share one codebase;
# Compose chooses which one a container runs.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN for app in auth employee attendance gateway; do npx nest build "$app" || exit 1; done

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# The compiled apps load their libraries from node_modules at run time; build tools are left out.
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
# The attendance service writes photos here. Created now so the volume starts out writable by "node".
RUN mkdir -p uploads && chown node:node uploads
USER node
CMD ["node", "dist/apps/gateway/main"]
