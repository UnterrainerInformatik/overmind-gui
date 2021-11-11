FROM node:lts-alpine as builder
WORKDIR '/app'
COPY ./package.json ./
RUN apk add --update python make g++\
   && rm -rf /var/cache/apk/*
RUN npm install 
COPY . . 
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
