FROM node:14.15.0-alpine AS builder
WORKDIR '/app'
RUN apk add --no-cache python3 make g++
COPY ./package.json ./
RUN node --version && npm --version

COPY . .
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
