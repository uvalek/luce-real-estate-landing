# Servicio de render de reels — imagen para EasyPanel (o cualquier Docker).
#
# OJO: la imagen base de Node NO trae las librerías de sistema que necesita el
# Chromium con el que Remotion renderiza. Sin ellas el contenedor arranca bien
# y falla en el primer render con un error de librería compartida. Por eso se
# instalan explícitamente abajo.
#
# Contexto de build: la carpeta `video/` de este repo (no la raíz).

FROM node:22-bookworm-slim

# Librerías que pide Chrome Headless Shell + fuentes para que el texto no salga
# con cuadros en lugar de acentos.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgbm1 \
    libasound2 \
    libxrandr2 \
    libxkbcommon0 \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Se descarga Chrome durante el build (~100 MB) para que el primer video no
# tenga que esperarlo.
RUN npx remotion browser ensure

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["node", "server/index.mjs"]
