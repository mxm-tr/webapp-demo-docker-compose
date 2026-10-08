FROM node:22-alpine AS app

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public

USER node
EXPOSE 3000
CMD ["npm", "start"]

FROM postgres:16-alpine AS db