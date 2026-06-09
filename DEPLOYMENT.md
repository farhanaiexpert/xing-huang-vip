# Deployment Guide

Xing Huang has two parts that deploy differently:

- **Frontend** (`artifacts/sportsbook`, `artifacts/admin`) — static files, can be served by nginx or a CDN like Vercel.
- **API server** (`artifacts/api-server`) — Express + PostgreSQL + cron jobs. **Must run on a real server (VPS).** It cannot run on Vercel/Netlify serverless.

The reference production setup is a single VPS at `gobet.mywebpage.pro` running nginx (static files + reverse proxy) and PM2 (API server on port 5000).

---

## 1. VPS deployment (full stack)

### 1.1 First-time setup

```bash
cd /var/www/xinghuang        # your project root (where .env lives)
pnpm install                 # re-run after EVERY upload — new deps break the server silently
```

Make sure `.env` is at the project root (same level as `artifacts/`, `lib/`, `package.json`).
If the file was created on Windows, strip carriage returns once:

```bash
sed -i 's/\r//' .env
```

### 1.2 Build the frontends

The frontend must know where the API lives. Set `VITE_API_BASE_URL` **at build time**
(it is baked into the static bundle — changing it later requires a rebuild):

```bash
VITE_API_BASE_URL=https://gobet.mywebpage.pro pnpm --filter @workspace/sportsbook run build
VITE_API_BASE_URL=https://gobet.mywebpage.pro BASE_PATH=/admin/ pnpm --filter @workspace/admin run build
```

Output:
- Sportsbook → `artifacts/sportsbook/dist/public`
- Admin → `artifacts/admin/dist/public`

### 1.3 Run the API server with PM2

```bash
cd /var/www/xinghuang
pm2 start "pnpm --filter @workspace/api-server run start" --name xinghuang-api
pm2 save
pm2 logs xinghuang-api --lines 30      # confirm migrations + crons started
```

The API listens on port 5000 (set `PORT` in `.env` to change it).

### 1.4 nginx config

```nginx
server {
    listen 443 ssl;
    server_name gobet.mywebpage.pro;

    # --- SSL certs (certbot / Let's Encrypt) ---
    ssl_certificate     /etc/letsencrypt/live/gobet.mywebpage.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gobet.mywebpage.pro/privkey.pem;

    # --- API server (Express on port 5000) ---
    # Must come BEFORE the SPA fallback so /api/ is never swallowed by index.html
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Admin panel (built with BASE_PATH=/admin/) ---
    location /admin/ {
        alias /var/www/xinghuang/artifacts/admin/dist/public/;
        try_files $uri $uri/ /admin/index.html;
    }

    # --- Sportsbook (root) ---
    location / {
        root /var/www/xinghuang/artifacts/sportsbook/dist/public;
        try_files $uri $uri/ /index.html;
    }
}

# --- Redirect HTTP → HTTPS ---
server {
    listen 80;
    server_name gobet.mywebpage.pro;
    return 301 https://$host$request_uri;
}
```

Apply it:

```bash
sudo nginx -t            # test config
sudo systemctl reload nginx
```

### 1.5 Redeploy checklist (every update)

```bash
cd /var/www/xinghuang
git pull                                                            # or re-upload files
pnpm install                                                        # pick up new deps
VITE_API_BASE_URL=https://gobet.mywebpage.pro pnpm --filter @workspace/sportsbook run build
VITE_API_BASE_URL=https://gobet.mywebpage.pro BASE_PATH=/admin/ pnpm --filter @workspace/admin run build
pm2 restart xinghuang-api
```

---

## 2. Vercel deployment (frontend only — optional)

Vercel can host the **sportsbook frontend only**. The API server stays on your VPS.
`vercel.json` (already in the repo root) builds the sportsbook and serves it as a SPA.

Steps:

1. Import the GitHub repo into Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `VITE_API_BASE_URL = https://gobet.mywebpage.pro`
3. Leave Build Command / Output Directory empty — `vercel.json` already sets them.
4. Deploy.

**Important:** Vercel only serves the static sportsbook. All odds/auth/wallet/bet
requests go to `https://gobet.mywebpage.pro/api/...` on your VPS, so:

- The API server must stay running on the VPS (PM2 + nginx as above).
- The VPS must allow CORS from your Vercel domain. The API already uses permissive
  CORS, but confirm your Vercel URL is accepted if you tighten it later.

The admin panel is **not** included in the Vercel build — serve it from the VPS at `/admin/`.

---

## Why the API can't go on Vercel

Vercel (and similar serverless platforms) can't run:

- a long-lived Express process,
- persistent PostgreSQL connections,
- background cron jobs (auto-settlement, odds refresh),
- PM2-managed processes.

Keep the API on a VPS. Vercel is only worth it if you want a CDN in front of the
static frontend — otherwise the VPS already serves everything.
