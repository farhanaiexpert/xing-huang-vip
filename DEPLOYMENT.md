# Xing Huang — Deployment Guide

Two deployment options are supported. Both use the same Neon PostgreSQL database.

| Option | Where | How |
|---|---|---|
| **Render** | Cloud PaaS | `render.yaml` blueprint — push to GitHub, Render auto-deploys |
| **Hostinger VPS** | Self-hosted | Docker Compose — `docker compose up -d --build` |

---

## Option A — Render (current production)

See `render.yaml` for the full configuration. Short version:

1. Push this repo to GitHub.
2. Render → **New + → Blueprint** → connect the repo.
3. Fill in every `sync: false` env var in the Render dashboard.
4. Render builds and deploys automatically on every push.

---

## Option B — Hostinger VPS with Docker

### Prerequisites

- Hostinger KVM VPS running **Ubuntu 22.04** or **24.04**
- A domain pointing at your VPS IP
- SSH access as `root`

---

### 1. Connect to the VPS

```bash
ssh root@YOUR_VPS_IP
```

---

### 2. Install Docker

```bash
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh

# Verify
docker --version
docker compose version
```

---

### 3. Clone the repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git xinghuang
cd xinghuang
```

---

### 4. Create `.env`

```bash
cp .env.example .env
nano .env
```

Minimum required values:

```dotenv
# Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Generate with: openssl rand -hex 32
JWT_SECRET=your_64_char_hex_secret
```

Add API keys and wallet addresses as needed. `NODE_ENV`, `PORT`, and `BASE_PATH`
are already set in `docker-compose.yml` — **do not add them to `.env`**.

---

### 5. Build and start

```bash
docker compose up -d --build
```

First build takes 3–5 minutes. Subsequent builds use cached layers and are faster.

```bash
docker compose ps          # confirm container is running
docker compose logs -f     # tail live logs
```

---

### 6. Create the admin account (first time only)

First, set `ADMIN_INIT_TOKEN` in your `.env` to any random string you choose:

```bash
# Generate a secure token
openssl rand -hex 16
```

Then visit this URL (replace `<your_token>` with the value you set):

```
http://YOUR_VPS_IP:3000/api/init-admin?token=<your_token>
```

You should see: `{ "ok": true }`. After that, **remove `ADMIN_INIT_TOKEN`** from
`.env` immediately and restart the container — leaving it active is a security risk:

```bash
nano .env   # delete the ADMIN_INIT_TOKEN line
docker compose restart xinghuang
```

Admin login:
- **URL**: `http://YOUR_VPS_IP:3000/admin`
- **Email**: `admin@xinghuang.vip`
- **Password**: `XingAdmin2026!`

---

### 7. Set up Nginx + SSL

Nginx listens on 80/443 and reverse-proxies to `localhost:3000`.

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/xinghuang`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
ln -s /etc/nginx/sites-available/xinghuang /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### 8. Verify

```bash
curl https://yourdomain.com/api/healthz
curl https://yourdomain.com/api/debug/database
```

`/api/debug/database` should return `"jwtSecret": "set"` and `"connection": "ok"`.

---

### Updating

```bash
cd /opt/xinghuang
git pull
docker compose up -d --build
```

---

### Useful commands

| Command | What it does |
|---|---|
| `docker compose ps` | Show container status |
| `docker compose logs -f` | Tail live logs |
| `docker compose logs --tail=200` | Last 200 lines |
| `docker compose restart xinghuang` | Restart without rebuild |
| `docker compose down` | Stop and remove container |
| `docker compose up -d --build` | Full rebuild and restart |
| `docker system prune -f` | Remove unused images/layers |

---

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | 64-char hex — `openssl rand -hex 32` |
| `ODDS_API_KEY` | Recommended | The Odds API — live match odds |
| `BETSAPI_KEY` | Recommended | BetsAPI — in-play data |
| `NOWPAYMENTS_API_KEY` | Optional | NOWPayments gateway |
| `NOWPAYMENTS_IPN_SECRET` | Optional | NOWPayments webhooks |
| `CRYPTOMUS_API_KEY` | Optional | Cryptomus gateway |
| `CRYPTOMUS_MERCHANT_ID` | Optional | Cryptomus merchant ID |
| `PLISIO_API_KEY` | Optional | Plisio gateway |
| `PLISIO_IPN_SECRET` | Optional | Plisio webhooks |
| `DEPOSIT_WALLET_ADDRESS` | Optional | TRC-20 USDT address |
| `DEPOSIT_WALLET_ADDRESS_ERC` | Optional | ERC-20 USDT address |
| `DEPOSIT_WALLET_ADDRESS_BSC` | Optional | BSC USDT address |
| `DEPOSIT_WALLET_ADDRESS_BTC` | Optional | Bitcoin address |
| `DEPOSIT_WALLET_ADDRESS_SOL` | Optional | Solana address |
| `DEPOSIT_WALLET_ADDRESS_TON` | Optional | TON address |
| `DEPOSIT_WALLET_ADDRESS_XRP` | Optional | XRP address |
| `ADMIN_INIT_TOKEN` | One-time | Remove after bootstrapping admin |
