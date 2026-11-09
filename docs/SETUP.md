# Setting it up

## Getting started

1. Download `baby-registry-template.zip` from the [latest release](https://github.com/d-plenty/baby-registry-template/releases/latest) and unzip it, or clone this repo.
2. Open **`config/registry.json`** in a text editor. Everything you need to change is in there:
   - Your names, the baby's last name and the due date
   - The access code (change it from `123456`!)
   - Your unwrapping day (`openingDate`). Until you set it, the site shows `dd/mm/yyyy`
   - Gift items, categories and optional shop links
   - Shipping address and charity (both optional)
   - Facebook group or live stream link (optional)
   - Your story chapters and photo captions
3. Swap the silhouette photos in `config/photos/` for your own (or keep them). Each photo has a `full` and a `thumb` copy with the same file name.
4. Run it (see below).

[EDITING.md](EDITING.md) has more detail on every setting.

> ⚠️ **Privacy note:** If you fork this repo publicly, **don't commit your real address, access code or photos** to GitHub. Make your edits on the copy you host, not in your public fork. The `data/` folder (where guests' purchases and guesses are saved) is already in `.gitignore`.

### Try it on your own computer first

You need Docker or Podman. From inside the repo folder:

```bash
docker run --rm -p 3480:3000 \
  -v "$PWD/app:/app:ro" -v "$PWD/config:/config:ro" -v "$PWD/data:/data" \
  -e CONFIG_FILE=/config/registry.json -e DATA_DIR=/data \
  -w /app node:22-alpine node server.js
```

Then open <http://localhost:3480>. On Fedora or other SELinux systems, use `podman` instead of `docker` and add `:z` to each volume (for example `"$PWD/data:/data:z"`).

If you have Node.js 22 installed, this works too:

```bash
mkdir -p data
CONFIG_FILE=config/registry.json DATA_DIR=data PORT=3480 node app/server.js
```

> **Why not just open `index.html`?** The real site needs its small server to save purchases and guesses so every guest sees the same thing. Opening the HTML file on its own won't let you in. If you only want to look around, use `baby-registry-demo.html` from the release, which fakes the server inside your browser.

---

## How I self-hosted it

I run a small homelab, so I hosted the registry in a Docker container on my TrueNAS box and published it to the internet through a Cloudflare Tunnel. You don't need a setup like that. Anything that can run a Docker container (or Node.js) will work. Here's an outline of how I did it in case it's useful.

### 1. Run it in Docker

I manage my containers with [Dockge](https://github.com/louislam/dockge), but any way of running Docker Compose works.

1. Make a folder on your server, for example `/mnt/your-pool/baby-registry`, and copy `app`, `config` and `compose.yaml` into it.
2. Make an empty `data` folder next to them.
3. In `compose.yaml`, change `/mnt/your-pool/baby-registry` to your folder and set `TZ` to your time zone.
4. The container runs as user `568` (the TrueNAS "apps" user). Either give that user the folder, or change `user:` in `compose.yaml` to your own user's ID:
   ```bash
   sudo chown -R 568:568 /mnt/your-pool/baby-registry
   ```
5. Start it:
   ```bash
   docker compose up -d
   ```

The registry is now at `http://<your-server-ip>:3480`. The compose file uses the official `node:22-alpine` image, so there's nothing to build. The website code and settings are mounted read-only, and only the `data` folder can be written to.

### 2. Make it reachable from the internet

I used a **Cloudflare Tunnel** (`cloudflared`), so I didn't have to open any ports on my home router. The tunnel points a subdomain (for example `registry.yourdomain.com`) at `http://<your-server-ip>:3480`, and Cloudflare handles HTTPS automatically.

Other options:
- A reverse proxy such as Nginx Proxy Manager, Caddy or Traefik, with a domain and Let's Encrypt
- Tailscale Funnel
- A cheap VPS

Set `siteAddress` in `registry.json` to your web address so it shows on the printed keepsake.

### 3. Updating it without losing anything

Once guests start marking items as bought, **update the registry in place. Don't redeploy it from scratch, and never delete the `data` folder.** Everything guests have done lives in `data/state.json` (with hourly backups in `data/backups/`).

- **Changing settings or the gift list:** just edit `config/registry.json` and save. The site picks it up by itself, no restart needed.
- **Updating the code:** stop the container, back up `data`, replace only `app` (and `config` if you want), then start it again:
  ```bash
  cd /mnt/your-pool/baby-registry
  docker compose down
  cp -a data "data-backup-$(date +%Y%m%d-%H%M)"
  rm -rf app
  # copy the new app folder in here
  sudo chown -R 568:568 app
  docker compose up -d
  ```

Removing an item from the gift list doesn't delete anyone's purchase, so it's safe to tidy the list as you go.

---

## Can I use GitHub Pages or Netlify?

Not for the real registry. Those only serve static files, and the registry needs its small server to save purchases, guesses and scores so every guest sees the same thing. `baby-registry-demo.html` is the only part that works without a server, and it's meant to be downloaded and opened on your own computer.
