---
name: VPS deployment config
description: xinghuang.vip VPS server details — path, port, nginx setup
---

## VPS details

- **Project path:** `/var/www/xing-huang-vip`
- **Express port:** `3000`
- **Domain:** `xinghuang.vip`

## Correct nginx config

Single `location /` block — proxy everything to Express (port 3000). Express handles all routing internally: `/api/*` (API), `/admin/*` (admin SPA + static), `/` (sportsbook SPA + static).

```nginx
server {
    listen 80;
    server_name xinghuang.vip www.xinghuang.vip;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name xinghuang.vip www.xinghuang.vip;

    ssl_certificate     /etc/letsencrypt/live/xinghuang.vip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xinghuang.vip/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 20M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

**Why:** old configs had separate location blocks for /admin/, /api/ etc. which bypassed Express's SPA fallback, causing /admin/users etc. to 404. One broad location / lets Express handle everything.

## VPS deployment steps (after code changes)

```bash
cd /var/www/xing-huang-vip
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/admin run build
pnpm --filter @workspace/sportsbook run build
pm2 restart all
```

## Common issue: admin routes return "Cannot GET /api/admin/stats" HTML 404

Cause: VPS running old build without admin routes. Fix: pull + rebuild + restart as above.
