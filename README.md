FragForge — GLSL Shader Forum

FragForge is a full-stack web app where you can write, run, share, and
discuss GLSL shaders directly in the browser. Think of it as a
lightweight Shadertoy-style platform, built as a university project but
designed to feel like a real product.

------------------------------------------------------------------------

TECH STACK

Frontend: - React 18 - React Router - Tailwind CSS - Vite

Backend: - Node.js - Express - REST + GraphQL

Database: - SQLite (@libsql/client)

Other: - JWT auth (httpOnly cookies) - bcrypt - SSE (real-time
updates) - WebGL shader runner

------------------------------------------------------------------------

GETTING STARTED

1.  Install dependencies

backend: cd backend npm install

frontend: cd frontend npm install

2.  Configure environment

cp backend/.env.example backend/.env

Edit .env:

PORT=4000 CLIENT_URL=http://localhost:5173 JWT_SECRET=your-secret

ADMIN_EMAIL=admin@fragforge.dev ADMIN_PASSWORD=admin1234
ADMIN_USERNAME=admin

3.  Run

backend: npm run dev

frontend: npm run dev

4.  Open

http://localhost:5173 http://localhost:5173/admin
http://localhost:4000/graphiql

------------------------------------------------------------------------

EMAIL

In development, email previews appear in the console (Ethereal). For
production, configure SMTP (Gmail, SendGrid, etc.).

------------------------------------------------------------------------

ARCHITECTURE

-   Frontend (React)
-   Backend (Express)
-   Data layer (models)

Real-time updates via SSE.

------------------------------------------------------------------------

API

REST: http://localhost:4000 GraphQL: /graphql

------------------------------------------------------------------------

SHADER FORMAT

void mainImage(out vec4 fragColor, in vec2 fragCoord) { vec2 uv =
fragCoord / iResolution.xy; fragColor = vec4(uv, sin(iTime), 1.0); }

Uniforms: iResolution, iTime, iMouse, iFrame

------------------------------------------------------------------------

SECURITY

-   bcrypt password hashing
-   JWT httpOnly cookies
-   rate limiting
-   Helmet headers
-   server-side validation
-   role-based access

------------------------------------------------------------------------

FEATURES

-   Shader editor + live preview
-   Likes and comments
-   Search and pagination
-   Admin panel
-   Email verification
-   REST + GraphQL
-   Real-time updates

------------------------------------------------------------------------
