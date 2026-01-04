# Dockerfile para Next.js - Optimizado para Easypanel
FROM node:18-alpine AS base

# Instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build de la aplicación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
# Con output: 'standalone', Next.js crea todo en .next/standalone
# Copiamos el contenido de standalone a la raíz
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

# Exponer el puerto (Easypanel lo mapea al 3002)
EXPOSE 3002

# El puerto puede ser configurado por Easypanel (default 3002 para coincidir con Easypanel)
ENV PORT=${PORT:-3002}
ENV HOSTNAME="0.0.0.0"

# Con standalone, server.js está en la raíz después del COPY
CMD ["node", "server.js"]

