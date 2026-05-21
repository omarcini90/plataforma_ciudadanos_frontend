FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=http://localhost:8000/api/v1
ARG VITE_UPLOADS_URL=http://localhost:8000/uploads
ARG VITE_GOOGLE_MAPS_ENABLED=false
ARG VITE_GOOGLE_MAPS_API_KEY=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_UPLOADS_URL=$VITE_UPLOADS_URL \
    VITE_GOOGLE_MAPS_ENABLED=$VITE_GOOGLE_MAPS_ENABLED \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
