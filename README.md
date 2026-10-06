# Tasty Crousty 67

A pickup-ordering web app with a Node.js API and PostgreSQL storage.

## Run with Docker

Create your local environment file and change the sample password before using the production stack:

```sh
cp .env.example .env
```

Then start the production stack:

```sh
docker compose up -d
```

## Rebuild a new version

Set a new `APP_IMAGE_TAG` in `.env`, then build, publish, and redeploy:

```sh
docker compose build
docker compose push
docker compose up -d
```

## Run a dev environment

Create a separate development environment file:

```sh
cp .env.dev.example .env.dev
```

Start the app at [http://localhost:3001](http://localhost:3001):

```sh
docker compose --env-file .env.dev -f compose-dev.yaml up --build
```

## API

- `GET /api/health` checks the database connection.
- `GET /api/menu` returns menu items and categories.
- `POST /api/orders` stores a pickup order. Send `customerName`, optional `note`, and `items` as `{ "id": "classic-crousty", "quantity": 1 }` entries. Prices are calculated by the server.