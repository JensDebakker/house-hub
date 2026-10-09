# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: openapi-typescript (dev-only, used by gen:api-types) peer-requires
# typescript ^5.x while the project runs ~6.0.3; it's never invoked at build time.
RUN npm ci --legacy-peer-deps

COPY . .

# Baked into the static JS bundle at build time - must be the public URL, since this
# code runs in the end user's browser, not in the backend container.
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

RUN npx expo export -p web

# --- Runtime stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
