FROM node:17-alpine as builder
WORKDIR '/app'
COPY ./package.json ./

RUN apk add --update python3 make g++
RUN npm install -g npm@8.1.3
RUN npm install -g node-gyp
RUN npm install

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
