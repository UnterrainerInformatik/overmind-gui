FROM node:12-alpine as builder
WORKDIR '/app'
COPY ./package.json ./
RUN node --version && npm --version

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
