# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Baked into the static JS bundle at build time - must be the public URL, since this
# code runs in the end user's browser, not in the backend container.
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

# Web Push's VAPID public key - not secret, it's meant to ship in the client bundle (only
# the matching private key, backend-only, needs protecting).
ARG EXPO_PUBLIC_VAPID_PUBLIC_KEY
ENV EXPO_PUBLIC_VAPID_PUBLIC_KEY=${EXPO_PUBLIC_VAPID_PUBLIC_KEY}

RUN npx expo export -p web

# --- Runtime stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
