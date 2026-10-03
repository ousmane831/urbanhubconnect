FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
ARG VITE_API_URL=/api
ARG VITE_SITE_URL=https://www.urbanhubconnect.com
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM alpine:3.20
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "rm -rf /out/* && cp -r /app/dist/* /out/"]
