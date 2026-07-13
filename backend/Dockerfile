# Tracer backend — Express + TypeScript compiled to dist/.
FROM node:22-alpine

WORKDIR /app

# Install dependencies (incl. dev deps: tsx runs migrations/seed).
# npm install (not ci) so platform-specific optional deps resolve for Alpine
# even when the lockfile was generated on another OS.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Build the TypeScript sources.
COPY . .
RUN npm run build

EXPOSE 4000

# Apply migrations, then start the compiled server.
CMD ["sh", "-c", "npm run db:migrate && node dist/index.js"]
