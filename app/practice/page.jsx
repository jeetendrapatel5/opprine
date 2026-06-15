'use client';

import { useState } from "react";

const lessons = [
  {
    id: 1,
    title: "What is Redis?",
    emoji: "🧠",
    tagline: "The world's fastest short-term memory",
    content: [
      {
        type: "analogy",
        text: "Imagine your brain vs a notebook. When you're doing math, you keep numbers in your head (instant access) — not in a notebook (slow). Redis is your app's 'in-head' memory. Your database (PostgreSQL) is the notebook.",
      },
      {
        type: "explain",
        text: "Redis stands for Remote Dictionary Server. It stores data in RAM (memory), not on disk. That's why it's blazing fast — typically under 1ms response time.",
      },
      {
        type: "visual",
        label: "Request Flow WITHOUT Redis",
        flow: ["User Request", "→ Node.js", "→ PostgreSQL (disk read)", "→ 200-500ms", "→ Response"],
        color: "#ef4444",
      },
      {
        type: "visual",
        label: "Request Flow WITH Redis",
        flow: ["User Request", "→ Node.js", "→ Redis (RAM hit)", "→ <1ms", "→ Response"],
        color: "#22c55e",
      },
      {
        type: "usecases",
        title: "Where you'll use Redis in real projects:",
        items: [
          "⚡ Caching — Store DB results so you don't re-query every time",
          "🔐 Sessions — Store user login sessions (JWT blacklists, etc.)",
          "⏳ Rate Limiting — Limit API calls per user (e.g., 100 req/min)",
          "📬 Queues — Background jobs (send email, resize image)",
          "🔴 Pub/Sub — Real-time notifications, chat apps",
          "🏆 Leaderboards — Sorted scores (gaming, rankings)",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Data Structures",
    emoji: "🗂️",
    tagline: "Redis isn't just key-value — it's a Swiss Army knife",
    content: [
      {
        type: "explain",
        text: "Redis gives you 5 core data types. Each is optimized for specific use cases. Most beginners only use Strings — but the real power is in knowing when to use which one.",
      },
      {
        type: "dataTypes",
        types: [
          {
            name: "String",
            icon: "📝",
            desc: "Any text or number. The simplest type.",
            cmd: 'SET user:name "Jeetendra"\nGET user:name\nSET counter 0\nINCR counter',
            usecase: "Caching HTML, storing config, counters",
          },
          {
            name: "Hash",
            icon: "📦",
            desc: "Like a JavaScript object — key with multiple fields.",
            cmd: 'HSET user:1 name "Jeet" age 25 city "Pune"\nHGET user:1 name\nHGETALL user:1',
            usecase: "User profiles, product details",
          },
          {
            name: "List",
            icon: "📋",
            desc: "Ordered list. Push/pop from both ends (like a queue or stack).",
            cmd: "LPUSH tasks \"send-email\"\nLPUSH tasks \"resize-image\"\nRPOP tasks",
            usecase: "Job queues, activity feeds, message logs",
          },
          {
            name: "Set",
            icon: "🎯",
            desc: "Unique values only. No duplicates. Fast membership checks.",
            cmd: 'SADD online:users "jeet" "ravi" "priya"\nSISMEMBER online:users "jeet"\nSMEMBERS online:users',
            usecase: "Online users, tags, unique visitors",
          },
          {
            name: "Sorted Set",
            icon: "🏆",
            desc: "Like Set, but each member has a score. Auto-sorted.",
            cmd: 'ZADD leaderboard 1500 "jeet"\nZADD leaderboard 2300 "ravi"\nZRANK leaderboard "jeet"\nZRANGE leaderboard 0 -1 WITHSCORES',
            usecase: "Leaderboards, priority queues, rate limiting",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "TTL & Expiry",
    emoji: "⏱️",
    tagline: "Data that auto-deletes itself — like Snapchat",
    content: [
      {
        type: "analogy",
        text: "Think of TTL (Time To Live) like a food expiry date. You set how long the data lives. After that, Redis auto-deletes it. No cron job needed.",
      },
      {
        type: "explain",
        text: "This is one of Redis's most powerful features. Cache an API response for 5 minutes. Store OTP for 10 minutes. Session tokens for 24 hours. It all expires automatically.",
      },
      {
        type: "codeBlock",
        title: "TTL Commands",
        code: `# Set with expiry at creation time (seconds)
SET otp:9876543210 "482910" EX 600

# Set expiry on existing key
SET session:abc123 "user_id_42"
EXPIRE session:abc123 86400       # expires in 24 hours

# Check how much time is left
TTL otp:9876543210                # returns seconds remaining
# Returns -1 if no expiry, -2 if key doesn't exist

# Set with milliseconds precision
SET cache:response "..." PX 5000  # 5 seconds`,
      },
      {
        type: "projectTip",
        text: "Real Pattern: OTP Login Flow",
        detail: `When user requests OTP:
1. Generate OTP: "482910"
2. SET otp:+919876543210 "482910" EX 600
3. User submits OTP
4. GET otp:+919876543210 → compare
5. If match → login, DEL the key
6. If expired → TTL returns -2 → "OTP expired, try again"`,
      },
    ],
  },
  {
    id: 4,
    title: "Caching Pattern",
    emoji: "⚡",
    tagline: "The #1 reason everyone uses Redis",
    content: [
      {
        type: "explain",
        text: "Caching means: check Redis first. If data is there (cache HIT), return it instantly. If not (cache MISS), fetch from DB, store in Redis, then return. Next request is instant.",
      },
      {
        type: "codeBlock",
        title: "Cache-Aside Pattern in Node.js + Express",
        code: `import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

const redis = createClient({ url: 'redis://localhost:6379' });
const prisma = new PrismaClient();
await redis.connect();

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = \`product:\${id}\`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('CACHE HIT ✅');
    return res.json(JSON.parse(cached));
  }

  // 2. Cache miss — go to DB
  console.log('CACHE MISS ❌ — fetching from DB');
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) }
  });

  if (!product) return res.status(404).json({ error: 'Not found' });

  // 3. Store in Redis for 5 minutes
  await redis.setEx(cacheKey, 300, JSON.stringify(product));

  res.json(product);
});`,
      },
      {
        type: "explain",
        text: "Cache Invalidation: When you UPDATE a product in DB, delete the cache key so next request fetches fresh data.",
      },
      {
        type: "codeBlock",
        title: "Invalidating Cache on Update",
        code: `app.put('/products/:id', async (req, res) => {
  const { id } = req.params;

  // Update in DB
  const updated = await prisma.product.update({
    where: { id: parseInt(id) },
    data: req.body,
  });

  // Bust the cache
  await redis.del(\`product:\${id}\`);

  res.json(updated);
});`,
      },
    ],
  },
  {
    id: 5,
    title: "Rate Limiting",
    emoji: "🚦",
    tagline: "Stop API abuse with 10 lines of code",
    content: [
      {
        type: "analogy",
        text: "Imagine a bouncer at a club who lets you in only 5 times per hour. Redis is that bouncer — it counts your requests per time window and blocks you when you exceed the limit.",
      },
      {
        type: "codeBlock",
        title: "Rate Limiter Middleware",
        code: `const rateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const key = \`ratelimit:\${ip}\`;
  const LIMIT = 10;        // max requests
  const WINDOW = 60;       // per 60 seconds

  // Atomic increment
  const requests = await redis.incr(key);

  if (requests === 1) {
    // First request — set expiry window
    await redis.expire(key, WINDOW);
  }

  if (requests > LIMIT) {
    const ttl = await redis.ttl(key);
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: ttl
    });
  }

  res.setHeader('X-RateLimit-Remaining', LIMIT - requests);
  next();
};

app.use('/api', rateLimiter);`,
      },
      {
        type: "projectTip",
        text: "Why INCR is perfect here",
        detail: "INCR is atomic — it increments AND returns the new value in a single operation. No race conditions, even with 1000 concurrent requests. This is impossible to do safely with just a DB.",
      },
    ],
  },
  {
    id: 6,
    title: "Session Management",
    emoji: "🔐",
    tagline: "Stateless servers, stateful sessions",
    content: [
      {
        type: "explain",
        text: "In a multi-server setup, if you store sessions in server memory, users get logged out when requests hit a different server. Redis solves this — all servers share one Redis instance.",
      },
      {
        type: "codeBlock",
        title: "Session Store with express-session + Redis",
        code: `import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  }
}));

// Login route
app.post('/login', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email }
  });
  // verify password...
  req.session.userId = user.id;
  res.json({ message: 'Logged in' });
});

// Protected route
app.get('/me', (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Not authenticated' });
  res.json({ userId: req.session.userId });
});`,
      },
    ],
  },
  {
    id: 7,
    title: "Pub/Sub",
    emoji: "📡",
    tagline: "Real-time messaging between services",
    content: [
      {
        type: "analogy",
        text: "Pub/Sub is like a YouTube channel. Publishers post videos (messages) to a channel. All subscribers instantly get notified. Publisher doesn't know or care who's watching.",
      },
      {
        type: "codeBlock",
        title: "Publisher (e.g., when order is placed)",
        code: `// publisher.js
const publisher = createClient();
await publisher.connect();

app.post('/orders', async (req, res) => {
  const order = await prisma.order.create({ data: req.body });

  // Publish event to channel
  await publisher.publish(
    'order:created',
    JSON.stringify({ orderId: order.id, userId: order.userId })
  );

  res.json(order);
});`,
      },
      {
        type: "codeBlock",
        title: "Subscriber (e.g., email service)",
        code: `// emailService.js
const subscriber = createClient();
await subscriber.connect();

await subscriber.subscribe('order:created', (message) => {
  const { orderId, userId } = JSON.parse(message);
  console.log(\`Sending confirmation email for order \${orderId}\`);
  // sendEmail(userId, orderId);
});`,
      },
      {
        type: "projectTip",
        text: "Use Case in SaaS",
        detail: "Order placed → publish 'order:created' → email service sends receipt + inventory service updates stock + analytics service logs event. All happen in parallel, fully decoupled.",
      },
    ],
  },
  {
    id: 8,
    title: "Leaderboards",
    emoji: "🏆",
    tagline: "Sorted Sets — Redis's killer feature",
    content: [
      {
        type: "explain",
        text: "Sorted Sets store members with a score and auto-sort them. Getting the top 10 users is O(log N) — insanely fast compared to ORDER BY in SQL on millions of rows.",
      },
      {
        type: "codeBlock",
        title: "Building a Real-Time Leaderboard",
        code: `// Add/update score
app.post('/score', async (req, res) => {
  const { userId, score } = req.body;
  await redis.zAdd('leaderboard:global', [{
    score: score,
    value: userId.toString()
  }]);
  res.json({ message: 'Score updated' });
});

// Get top 10 players
app.get('/leaderboard', async (req, res) => {
  const top10 = await redis.zRangeWithScores(
    'leaderboard:global',
    0, 9,
    { REV: true }   // highest score first
  );

  const result = top10.map((entry, index) => ({
    rank: index + 1,
    userId: entry.value,
    score: entry.score,
  }));

  res.json(result);
});

// Get a specific user's rank
app.get('/rank/:userId', async (req, res) => {
  const rank = await redis.zRevRank(
    'leaderboard:global',
    req.params.userId
  );
  res.json({ rank: rank + 1 }); // 0-indexed → 1-indexed
});`,
      },
    ],
  },
];

const CodeBlock = ({ code, title }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: 16 }}>
      {title && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontFamily: "monospace", letterSpacing: 1 }}>{title.toUpperCase()}</div>}
      <div style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#1e293b" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          </div>
          <button onClick={copy} style={{ background: "none", border: "1px solid #334155", color: copied ? "#22c55e" : "#94a3b8", fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <pre style={{ margin: 0, padding: "16px", overflowX: "auto", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}>{code}</pre>
      </div>
    </div>
  );
};

export default function RedisGuide() {
  const [activeLesson, setActiveLesson] = useState(0);
  const [expandedType, setExpandedType] = useState(null);
  const lesson = lessons[activeLesson];

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: "1px solid #1e293b", padding: "24px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 32 }}>🔴</span>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: "linear-gradient(90deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Redis Crash Course
            </h1>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>From zero to production-ready — 8 lessons with real code</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>LESSONS</div>
            {lessons.map((l, i) => (
              <button key={l.id} onClick={() => setActiveLesson(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  padding: "10px 12px", marginBottom: 4, borderRadius: 8, border: "none", cursor: "pointer",
                  background: activeLesson === i ? "linear-gradient(135deg, #7c3aed22, #2563eb22)" : "transparent",
                  borderLeft: activeLesson === i ? "3px solid #7c3aed" : "3px solid transparent",
                  color: activeLesson === i ? "#c4b5fd" : "#64748b",
                  transition: "all 0.15s",
                  fontSize: 13,
                }}>
                <span style={{ fontSize: 16 }}>{l.emoji}</span>
                <span style={{ fontWeight: activeLesson === i ? 600 : 400, lineHeight: 1.3 }}>{l.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>
              LESSON {lesson.id} OF {lessons.length}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>
              {lesson.emoji} {lesson.title}
            </h2>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 15 }}>{lesson.tagline}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {lesson.content.map((block, idx) => {
              if (block.type === "analogy") return (
                <div key={idx} style={{ background: "#0c1a2e", border: "1px solid #1e3a5f", borderLeft: "4px solid #3b82f6", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>💡 ANALOGY</div>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.7 }}>{block.text}</p>
                </div>
              );

              if (block.type === "explain") return (
                <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 18 }}>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.8, fontSize: 15 }}>{block.text}</p>
                </div>
              );

              if (block.type === "visual") return (
                <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>{block.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {block.flow.map((step, si) => (
                      <span key={si} style={{
                        background: step.startsWith("→") ? "transparent" : block.color + "22",
                        border: step.startsWith("→") ? "none" : `1px solid ${block.color}44`,
                        color: step.startsWith("→") ? "#475569" : block.color,
                        padding: step.startsWith("→") ? "0 2px" : "4px 12px",
                        borderRadius: 6, fontSize: 13, fontWeight: 500,
                      }}>{step}</span>
                    ))}
                  </div>
                </div>
              );

              if (block.type === "usecases") return (
                <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14 }}>{block.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {block.items.map((item, ii) => (
                      <div key={ii} style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 }}>{item}</div>
                    ))}
                  </div>
                </div>
              );

              if (block.type === "dataTypes") return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {block.types.map((dt, di) => (
                    <div key={di} style={{ background: "#0f172a", border: `1px solid ${expandedType === di ? "#7c3aed" : "#1e293b"}`, borderRadius: 10, overflow: "hidden", transition: "border 0.15s" }}>
                      <button onClick={() => setExpandedType(expandedType === di ? null : di)}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: 22 }}>{dt.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{dt.name}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{dt.desc}</div>
                        </div>
                        <div style={{ color: "#475569", fontSize: 12 }}>{expandedType === di ? "▲" : "▼"}</div>
                      </button>
                      {expandedType === di && (
                        <div style={{ padding: "0 18px 18px" }}>
                          <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 8 }}>✅ Best for: {dt.usecase}</div>
                          <CodeBlock code={dt.cmd} title="Commands" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );

              if (block.type === "codeBlock") return <CodeBlock key={idx} code={block.code} title={block.title} />;

              if (block.type === "projectTip") return (
                <div key={idx} style={{ background: "#0c1f0c", border: "1px solid #14532d", borderLeft: "4px solid #22c55e", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🛠️ {block.text.toUpperCase()}</div>
                  <pre style={{ margin: 0, color: "#86efac", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{block.detail}</pre>
                </div>
              );

              return null;
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid #1e293b" }}>
            <button onClick={() => setActiveLesson(Math.max(0, activeLesson - 1))}
              disabled={activeLesson === 0}
              style={{ padding: "10px 20px", background: activeLesson === 0 ? "#0f172a" : "#1e293b", border: "1px solid #334155", color: activeLesson === 0 ? "#334155" : "#e2e8f0", borderRadius: 8, cursor: activeLesson === 0 ? "not-allowed" : "pointer", fontSize: 14 }}>
              ← Previous
            </button>
            <span style={{ color: "#475569", fontSize: 13, alignSelf: "center" }}>{activeLesson + 1} / {lessons.length}</span>
            <button onClick={() => setActiveLesson(Math.min(lessons.length - 1, activeLesson + 1))}
              disabled={activeLesson === lessons.length - 1}
              style={{ padding: "10px 20px", background: activeLesson === lessons.length - 1 ? "#0f172a" : "linear-gradient(135deg, #7c3aed, #2563eb)", border: "none", color: activeLesson === lessons.length - 1 ? "#334155" : "#fff", borderRadius: 8, cursor: activeLesson === lessons.length - 1 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
