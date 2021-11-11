FROM node:lts-alpine as builder
WORKDIR '/app'
COPY ./package.json ./
RUN apk add --update python3 make g++
RUN npm install 
COPY . . 
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
