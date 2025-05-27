FROM node:12-alpine AS builder
WORKDIR '/app'
COPY ./package.json ./
RUN node --version && npm --version

COPY . .
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
