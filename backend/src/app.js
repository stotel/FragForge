require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDb } = require('./config/db');
const { authMiddleware } = require('./middleware/auth');
const { addClient, removeClient } = require('./events');
const { initializeEmail } = require('./services/email');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500 }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 30 }));

app.use(authMiddleware);

app.use('/api/auth', require('./routes/rest/auth'));
app.use('/api/shaders', require('./routes/rest/shaders'));
app.use('/api/admin', require('./routes/rest/admin'));

const { handler: graphqlHandler } = require('./graphql');
app.use('/graphql', graphqlHandler);

app.get('/graphiql', (_, res) => {
  res.send(`<!DOCTYPE html><html><head><title>FragForge GraphiQL</title>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css"/>
    </head><body style="margin:0"><div id="g" style="height:100vh"></div>
    <script src="https://unpkg.com/react/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/graphiql/graphiql.min.js"></script>
    <script>ReactDOM.createRoot(document.getElementById('g')).render(
      React.createElement(GraphiQL,{fetcher:GraphiQL.createFetcher({url:'/graphql',credentials:'include'})})
    )</script></body></html>`);
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('data: {"type":"connected"}\n\n');
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(ping); } }, 25000);
  addClient(res);
  req.on('close', () => { clearInterval(ping); removeClient(res); });
});

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

async function bootstrap() {
  await initDb();
  
  // Initialize email service
  try {
    await initializeEmail();
    console.log('✅ Email service initialized\n');
  } catch (err) {
    console.error('❌ Email service failed:', err.message);
  }

  const User = require('./models/User');
  const Shader = require('./models/Shader');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fragforge.dev';
  const adminPass  = process.env.ADMIN_PASSWORD || 'admin1234';
  const adminUser  = process.env.ADMIN_USERNAME || 'admin';

  let admin = await User.findByEmail(adminEmail);
  if (!admin) {
    admin = await User.create({ username: adminUser, email: adminEmail, password: adminPass, role: 'admin' });
    // Auto-verify admin account
    await User.verify(admin.id);
    console.log(`\n👤 Admin created: ${adminEmail} / ${adminPass}`);
    console.log(`✅ Admin account auto-verified\n`);
  }

  const count = await Shader.count({ activeOnly: false });
  if (count === 0) {
    await Shader.create({
      title: 'Plasma Globe',
      description: 'A colorful plasma effect using sin waves',
      fragment_code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.5;
    float r = length(uv);
    float plasma = sin(r * 10.0 - t * 3.0) + sin(uv.x * 8.0 + t) + sin(uv.y * 8.0 - t);
    vec3 col = 0.5 + 0.5 * cos(plasma + vec3(0.0, 2.094, 4.189));
    col *= smoothstep(1.0, 0.3, r);
    fragColor = vec4(col, 1.0);
}`,
      author_id: admin.id, tags: ['plasma', 'waves', 'colorful'],
    });

    await Shader.create({
      title: 'Mandelbrot Set',
      description: 'Classic Mandelbrot fractal explorer',
      fragment_code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 c = uv * 2.5 - vec2(0.5, 0.0);
    vec2 z = vec2(0.0);
    float iter = 0.0;
    const float MAX = 64.0;
    for (float i = 0.0; i < MAX; i++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        if (dot(z,z) > 4.0) { iter = i; break; }
    }
    float t = iter / MAX;
    vec3 col = vec3(t * 0.1, t * t, sqrt(t));
    fragColor = vec4(col, 1.0);
}`,
      author_id: admin.id, tags: ['fractal', 'math', 'mandelbrot'],
    });

    await Shader.create({
      title: 'Ray Marching Sphere',
      description: 'Basic ray marching with a glowing sphere',
      fragment_code: `float sdSphere(vec3 p, float r) { return length(p) - r; }
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sdSphere(p+e.xyy,1.0)-sdSphere(p-e.xyy,1.0),
        sdSphere(p+e.yxy,1.0)-sdSphere(p-e.yxy,1.0),
        sdSphere(p+e.yyx,1.0)-sdSphere(p-e.yyx,1.0)));
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.5));
    vec3 col = vec3(0.05, 0.05, 0.1);
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd*t;
        float d = sdSphere(p, 1.0);
        if (d < 0.001) {
            vec3 n = calcNormal(p);
            vec3 light = normalize(vec3(sin(iTime), 1.0, cos(iTime)));
            float diff = max(dot(n,light),0.0);
            float spec = pow(max(dot(reflect(-light,n),-rd),0.0),32.0);
            col = vec3(0.1,0.5,1.0)*diff + spec; break;
        }
        t += d; if (t>10.0) break;
    }
    fragColor = vec4(col, 1.0);
}`,
      author_id: admin.id, tags: ['raymarching', '3d', 'sdf'],
    });
    console.log('Example shaders seeded\n');
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`FragForge API  -  http://localhost:${PORT}`);
    console.log(`GraphQL        -  http://localhost:${PORT}/graphql`);
    console.log(`GraphiQL       -  http://localhost:${PORT}/graphiql`);
    console.log(`SSE Events     -  http://localhost:${PORT}/api/events\n`);
  });
}

bootstrap().catch(err => { console.error('Startup error:', err); process.exit(1); });
