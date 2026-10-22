# Local hosting/testing only: production is GitHub Pages (.github/workflows/deploy.yml).
# Builds the static site with the same Node version as .nvmrc and CI, then serves dist/ with nginx.
FROM node:26.12.1-alpine AS build
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build

FROM nginx:1.31.8-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 80
