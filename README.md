# FragForge — GLSL Shader Forum

A full-stack web application where users can write, run, share, and discuss GLSL fragment and compute shaders directly in the browser — similar to Shadertoy.

Built as a university project fulfilling all requirements: **3-tier monolithic architecture, REST + GraphQL, SSE real-time AJAX, React CSR, JWT auth with email verification, admin panel, client & server validation, Bootstrap-equivalent (Tailwind CSS)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Tailwind CSS, Vite |
| Backend | Node.js, Express |
| Database | SQLite via `@libsql/client` |
| API | REST + GraphQL (`graphql-http`) |
| Auth | JWT (httpOnly cookie), bcrypt, email verification |
| Real-time | SSE (Server-Sent Events) for live gallery updates |
| Shader runner | WebGL (custom in-browser GLSL compiler) |

---

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure backend

Copy the example and customize:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```bash
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ADMIN_EMAIL=admin@fragforge.dev
ADMIN_PASSWORD=change-me-on-first-login
ADMIN_USERNAME=admin

# Optional: Configure real SMTP (see "Email Setup" below)
# Leave empty to use auto-generated Ethereal test account
```

**⚠️ IMPORTANT:** Never commit `.env` to git. Use `.gitignore` (already configured).

### 3. Run (two terminals)

```bash
# Terminal 1 — backend (starts on http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — frontend (starts on http://localhost:5173)
cd frontend && npm run dev
```

**On first run:** Admin account auto-creates. Check `.env` for credentials.  
**Email verification:** During dev, links appear in terminal. For production, configure real SMTP (see "Email Setup" above).

### 4. Open

- **User UI:** http://localhost:5173
- **Admin UI:** http://localhost:5173/admin  (log in as admin@fragforge.dev / admin1234)
- **GraphiQL:** http://localhost:4000/graphiql
- **REST Health:** http://localhost:4000/health

---

## Email Setup

### Development (Automatic)
Leave `SMTP_*` variables empty in `.env` — Ethereal test account auto-creates on startup.
Verification emails preview in browser (link shown in terminal):

```
📧 PREVIEW EMAIL HERE:
   https://ethereal.email/message/xxxxx
```

### Production (Gmail)

1. **Enable 2-Step Verification** on your Google Account
2. **Generate App Password:**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" → "Windows Computer"
   - Copy 16-char password (spaces removed)

3. **Update `.env`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxxxxxxxxxxx
   SMTP_SECURE=false
   EMAIL_FROM="FragForge" <your-email@gmail.com>
   ```

### Other Providers
- **SendGrid:** `SMTP_USER=apikey`, `SMTP_PASS=SG.xxxxxx`
- **AWS SES, Mailgun, etc.:** See Nodemailer docs for SMTP config

---

## Architecture

```
fragforge/
├── backend/                     ← Node.js / Express API
│   └── src/
│       ├── app.js               ← Entry point, Express setup, bootstrap
│       ├── config/db.js         ← libsql/SQLite + schema init
│       ├── middleware/auth.js   ← JWT middleware, role guards
│       ├── models/              ← Data access layer (User, Shader, Comment)
│       ├── routes/rest/         ← REST endpoints (auth, shaders, admin)
│       ├── graphql/             ← GraphQL schema + resolvers
│       ├── services/email.js    ← Nodemailer (verification emails)
│       └── events/index.js      ← SSE broadcast (real-time AJAX)
│
└── frontend/                    ← React SPA
    └── src/
        ├── api/index.js         ← Axios REST client + gql() helper
        ├── contexts/            ← AuthContext (global user state)
        ├── components/          ← ShaderCanvas, ShaderCard, ShaderEditor, Navbar
        └── pages/               ← HomePage, ShaderPage, ShaderFormPage,
                                    AuthPages, VerifyEmailPage, UserPage,
                                    admin/AdminPage
```

### Separation of Concerns

- **Presentation layer:** React components (CSR) — receives JSON from API
- **Business logic layer:** Express routes + GraphQL resolvers — validates, authorizes, orchestrates
- **Data layer:** Models (`User`, `Shader`, `Comment`) — all DB queries isolated here

---

## REST API Reference

> All endpoints base: `http://localhost:4000`

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register (sends verification email) |
| POST | `/api/auth/verify` | — | Verify email with token |
| POST | `/api/auth/login` | — | Login → sets httpOnly JWT cookie |
| POST | `/api/auth/logout` | — | Clear cookie |
| GET | `/api/auth/me` | JWT | Get current user |

### Shaders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/shaders` | — | List active shaders (`?search=&page=&limit=`) |
| GET | `/api/shaders/:id` | — | Get single shader |
| POST | `/api/shaders` | verified | Create shader |
| PUT | `/api/shaders/:id` | verified+owner | Update shader |
| DELETE | `/api/shaders/:id` | verified+owner | Delete shader |
| PATCH | `/api/shaders/:id/active` | admin | Activate/deactivate |
| POST | `/api/shaders/:id/like` | verified | Toggle like |
| GET | `/api/shaders/:id/comments` | — | Get comments |
| POST | `/api/shaders/:id/comments` | verified | Add comment |
| DELETE | `/api/shaders/:shaderId/comments/:commentId` | verified+owner | Delete comment |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | admin | Dashboard statistics |
| GET | `/api/admin/users` | admin | All users |
| PATCH | `/api/admin/users/:id/role` | admin | Change user role |
| DELETE | `/api/admin/users/:id` | admin | Delete user |
| GET | `/api/admin/shaders` | admin | All shaders (incl. inactive) |
| PATCH | `/api/admin/shaders/:id/active` | admin | Toggle active |
| DELETE | `/api/admin/shaders/:id` | admin | Delete shader |

### Real-time (SSE)
```
GET /api/events
```
Streams events: `shader_created`, `shader_deleted`, `shader_activated`, `shader_deactivated`

---

## GraphQL API

**Endpoint:** `POST /graphql`  
**Explorer:** `GET /graphiql`

### Key queries
```graphql
query GetShaders {
  shaders(search: "plasma", page: 1, limit: 12) {
    shaders { id title author_name likes_count tags }
    total pages
  }
}

query GetShader {
  shader(id: "...") {
    id title fragment_code author_name views likes_count
  }
}

query AdminStats {
  adminStats { userCount shaderCount activeShaderCount }
}
```

### Key mutations
```graphql
mutation CreateShader {
  createShader(
    title: "Cool effect"
    fragment_code: "void mainImage(out vec4 c, in vec2 uv) { c = vec4(1,0,0,1); }"
    tags: ["demo"]
  ) { id title }
}

mutation ToggleLike {
  likeShader(id: "...") { liked }
}

mutation AdminToggle {
  setShaderActive(id: "...", is_active: true)
}
```

---

## GLSL Shader Format

Shaders use Shadertoy-compatible `mainImage` signature:

```glsl
// Available uniforms:
uniform vec2  iResolution;   // canvas width/height
uniform float iTime;         // seconds since start
uniform vec4  iMouse;        // xy=cursor, zw=click pos
uniform int   iFrame;        // frame counter

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5*sin(iTime), 1.0);
}
```

---

## Security

- Passwords hashed with **bcrypt** (cost 10)
- Auth via **httpOnly, SameSite=lax** JWT cookies (no XSS token theft)
- **Helmet.js** sets security headers
- **express-rate-limit** — 500 req/15min general, 30 req/15min on auth routes
- Server-side validation on every mutating endpoint
- Admin endpoints protected by role check middleware
- CORS restricted to `CLIENT_URL`

---

## Validation

**Client-side** (React, before submit):
- Username: required, 3–30 chars, `/^[a-zA-Z0-9_]+$/`
- Email: required, regex pattern check
- Password: required, min 6 chars
- Title: required, max 100 chars
- Shader code: required

**Server-side** (Express, independent):
- All the same checks repeated
- Uniqueness enforced at DB level (UNIQUE constraints)
- Role/ownership enforced in middleware before any DB write

---

## Testing with Postman

Import this base URL: `http://localhost:4000`

**Register:**
```
POST /api/auth/register
{ "username": "testuser", "email": "test@example.com", "password": "secret123" }
```

**Get verification link:** check server console output

**Login:**
```
POST /api/auth/login
{ "email": "admin@fragforge.dev", "password": "admin1234" }
```
→ Sets `token` cookie automatically in Postman (enable "Send cookies")

**Create shader:**
```
POST /api/shaders
{
  "title": "Test Shader",
  "fragment_code": "void mainImage(out vec4 c, in vec2 u) { c = vec4(1,0,0,1); }",
  "tags": ["test"]
}
```

---

## Seeded Data

On first start, 3 example shaders are created under the admin account:
- **Plasma Globe** — animated color plasma using sin waves
- **Mandelbrot Set** — classic fractal explorer
- **Ray Marching Sphere** — SDF-based 3D sphere with lighting

---

## Features Checklist

- [x] **Registration** with email verification (hyperlink in email / console)
- [x] **Login / Logout** — JWT httpOnly cookie session
- [x] **Search & filter** shaders (title, description, author)
- [x] **CRUD** — create, view, edit, delete shaders
- [x] **Activate/Deactivate** shaders (admin)
- [x] **REST API** with all CRUD operations
- [x] **GraphQL API** with same operations
- [x] **AJAX / real-time** — new shaders appear on homepage without page reload (SSE)
- [x] **Client-side rendering** via React
- [x] **Admin panel** — manage users and all shaders
- [x] **Client-side validation** — before form submit
- [x] **Server-side validation** — independent of client
- [x] **Postman-testable** REST API
- [x] **Tailwind CSS** (Bootstrap-equivalent)
- [x] **3-tier architecture** with proper separation of concerns
- [x] **WebGL shader runner** — runs GLSL in-browser, live preview
- [x] **Comments** on shaders
- [x] **Likes** toggle
- [x] **Pagination**
- [x] **Rate limiting** against brute force
- [x] **Helmet** security headers
