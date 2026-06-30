FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build

FROM nginx:1.29-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/shell/dist /usr/share/nginx/html
COPY --from=build /app/apps/iam/dist /usr/share/nginx/html/mfes/iam
COPY --from=build /app/apps/platform/dist /usr/share/nginx/html/mfes/platform
COPY --from=build /app/apps/finance/dist /usr/share/nginx/html/mfes/finance
COPY --from=build /app/apps/account/dist /usr/share/nginx/html/mfes/account

EXPOSE 8080

