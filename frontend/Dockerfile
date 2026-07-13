# Tracer frontend — Next.js 14 production server.
FROM node:22-alpine

WORKDIR /app

# npm install (not ci) so platform-specific optional deps resolve for Alpine.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# NEXT_PUBLIC_* vars are inlined at build time, so pass the API URL as the
# browser will reach it (the host), not the Docker network name.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
