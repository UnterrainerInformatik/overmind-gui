FROM node:17-alpine as builder
WORKDIR '/app'
COPY ./package.json ./

RUN apk add --update python2 make g++
RUN npm install -g node-gyp
RUN npm install

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
