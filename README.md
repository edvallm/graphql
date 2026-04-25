# Zone01 GraphQL Profile

A personal profile page for the Zone01 Athens platform, built with vanilla HTML, CSS, and JavaScript. Authenticates via JWT and displays user data fetched from the platform's GraphQL API.

**Live:** https://graphql.magnus6139.workers.dev  
**Backup:** https://edvallm.github.io/graphql/

---

## Features

- **Login** — accepts username or email + password, displays errors on invalid credentials
- **Session persistence** — JWT stored in `localStorage`, session restored on page reload
- **Logout** — clears token and returns to login
- **Profile sections:**
  1. User Info (login, name, email, campus)
  2. Experience Points (total XP, transaction count)
  3. Recent Activity (last 5 XP transactions)
  4. Audit Ratio (ratio, done, received)
  5. Statistics (3 SVG graphs)
- **Graphs:**
  - XP over time — line chart with hover tooltips showing project name, XP gained, and date
  - Project pass / fail — donut chart with hover showing count and percentage
  - Skills radar — spider chart of top skills with hover tooltips
- **Responsive** dark UI

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES modules) |
| Auth | JWT via Basic auth → Bearer token |
| API | GraphQL (Hasura) |
| CORS proxy | Cloudflare Worker |
| Hosting | Cloudflare Workers (static assets + proxy) |

---

## Running Locally

```bash
git clone https://github.com/edvallm/graphql.git
cd graphql
python3 -m http.server
```

Open `http://localhost:8000`.

The app automatically routes API calls through the deployed Cloudflare Worker (`graphql.magnus6139.workers.dev`) to avoid CORS issues when running from localhost.

---

## Architecture

```
index.html          — SPA shell, login + profile views
favicon.svg         — inline SVG favicon
worker.js           — Cloudflare Worker: proxies /api/* to platform.zone01.gr
wrangler.toml       — Cloudflare Workers config
css/
  style.css         — all styles
js/
  config.js         — proxy URL (auto-detects environment)
  auth.js           — login(), logout(), getToken(), JWT decode
  api.js            — GraphQL fetch wrapper with Bearer auth
  profile.js        — data queries + section rendering
  graphs.js         — SVG graphs (line chart, donut, radar)
  main.js           — view switching, form handling
```

### CORS Proxy

The platform's signin and GraphQL endpoints do not return CORS preflight headers, blocking browser requests from external origins. `worker.js` runs as a Cloudflare Worker that forwards requests to `platform.zone01.gr` and adds the required `Access-Control-Allow-*` headers. When served from the Worker's own domain, the app uses relative URLs (same origin, no CORS). From any other origin it calls the Worker URL directly.

---

## GraphQL Queries

The project uses all three required query types. All queries are defined as constants at the top of [`js/profile.js`](js/profile.js): `Q_USER`, `Q_AUDIT`, `Q_XP`, `Q_RESULTS`, and `Q_SKILLS`.

### 1 — Normal query

A plain query with no arguments or nesting. Used for basic user info and audit data:

```graphql
{
  user {
    id
    login
    email
    firstName
    lastName
    campus
  }
}
```

```graphql
{
  user {
    totalUp
    totalDown
    auditRatio
  }
}
```

### 2 — Query with arguments

Arguments filter or sort the result set. Used to fetch only XP transactions from the main curriculum, excluding piscine sub-exercises:

```graphql
{
  transaction(
    where: {
      type: { _eq: "xp" }
      _and: [
        { path: { _like: "/athens/div-01/%" } }
        { path: { _nlike: "/athens/div-01/piscine-%/%" } }
      ]
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object {
      name
    }
  }
}
```

Also used for skill transactions:

```graphql
{
  transaction(
    where: { type: { _like: "skill_%" } }
    order_by: { amount: desc }
  ) {
    type
    amount
  }
}
```

### 3 — Nested query

Queries a related table as a sub-field. Used to fetch project results with their object details in a single request:

```graphql
{
  result {
    grade
    object {
      name
      type
    }
  }
}
```

Here `object` is a related table joined inside `result` — a single query that spans two tables.

---

## File Descriptions

| File | Purpose |
|---|---|
| `js/auth.js` | `login()` encodes credentials as `Basic base64(login:password)`, POSTs to signin endpoint, stores JWT. `getUserId()` decodes the JWT payload to extract the user ID. |
| `js/api.js` | `query(gql, variables)` sends authenticated GraphQL requests using `Bearer <jwt>`. |
| `js/config.js` | Sets `PROXY` to an empty string when served from the Worker (same-origin, no CORS), or to the full Worker URL from any other origin. |
| `js/profile.js` | Defines all GraphQL queries, fetches data in parallel with `Promise.all`, and renders each profile section. |
| `js/graphs.js` | Pure SVG graph rendering — no external libraries. All three graphs are built from `document.createElementNS` calls. |
| `worker.js` | Cloudflare Worker that intercepts `/api/*` requests, proxies them to `platform.zone01.gr`, and adds CORS headers to the response. Serves all other paths as static assets. |
