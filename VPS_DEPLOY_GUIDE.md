# VPS Deploy Guide

One-time setup + daily routine for deploying Xing Huang to `xinghuang.vip`.

---

## One-time setup (do this once)

### 1 — Generate an SSH key (skip if you already have one for the VPS)

Run this on your local machine or in any terminal:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/xinghuang_deploy
```

This creates two files:
- `~/.ssh/xinghuang_deploy` — **private key** (goes into GitHub)
- `~/.ssh/xinghuang_deploy.pub` — **public key** (goes onto the VPS)

### 2 — Add the public key to your VPS

SSH into your VPS and run:

```bash
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

Replace `PASTE_PUBLIC_KEY_HERE` with the full contents of `~/.ssh/xinghuang_deploy.pub`.

To get the public key contents:

```bash
cat ~/.ssh/xinghuang_deploy.pub
```

### 3 — Add secrets to GitHub

Go to your repo on GitHub:  
**Settings → Secrets and variables → Actions → New repository secret**

Add these three secrets:

| Secret name | Value |
|---|---|
| `VPS_HOST` | Your VPS IP address or hostname (e.g. `123.45.67.89`) |
| `VPS_USER` | Your SSH username on the VPS (e.g. `root`) |
| `VPS_SSH_KEY` | The **full contents** of `~/.ssh/xinghuang_deploy` (the private key, starts with `-----BEGIN OPENSSH PRIVATE KEY-----`) |

> **Note:** The VPS path (`/var/www/xing-huang-vip`) is set as the default in the workflow. You only need to override it at run time if the path is different.

---

## Daily routine

1. Make your changes in Replit.
2. Push to GitHub — either via Replit's Git panel or:
   ```bash
   git add -A && git commit -m "your message" && git push
   ```
3. Go to your GitHub repo → **Actions** tab → **Deploy to VPS**.
4. Click **Run workflow** → **Run workflow** (green button).
5. Watch the run — it takes ~3–5 minutes. A green checkmark means the site is live and healthy.

---

## What the workflow does

```
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/admin run build
pnpm --filter @workspace/sportsbook run build
pm2 restart all --update-env   ← picks up any .env changes too
pm2 save                       ← keeps pm2 alive after a VPS reboot
curl https://xinghuang.vip/api/healthz   ← fails the run if site is down
```

If any step fails the workflow stops immediately and marks the run as failed — the old version stays up.

---

## Enabling auto-deploy on every push (optional, future)

To make every push to `main` deploy automatically, add this to `.github/workflows/deploy-vps.yml` under the `on:` block:

```yaml
  push:
    branches: [main]
```
