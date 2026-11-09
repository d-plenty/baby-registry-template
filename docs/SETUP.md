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
4. Try it on your computer, then host it (see below).

[EDITING.md](EDITING.md) has more detail on every setting.

> ⚠️ **Privacy note:** If you fork this repo publicly, **don't commit your real address, access code or photos** to GitHub. Make your edits on the copy you host, not in your public fork. The `data/` folder (where guests' purchases and guesses are saved) is already in `.gitignore`.

### Try it on your own computer first

You need Docker or Podman. From inside the unzipped folder:

```bash
mkdir -p data
docker run --rm -p 3480:3000 \
  -v "$PWD/app:/app:ro" -v "$PWD/config:/config:ro" -v "$PWD/data:/data" \
  -e CONFIG_FILE=/config/registry.json -e DATA_DIR=/data \
  -w /app node:22-alpine node server.js
```

Then open <http://localhost:3480>. Stop it with **Ctrl+C**. On Fedora or other SELinux systems, use `podman` instead of `docker` and add `:z` to each volume (for example `"$PWD/data:/data:z"`). If Docker says "permission denied", put `sudo` in front.

If you have Node.js 22 installed, this works too:

```bash
mkdir -p data
CONFIG_FILE=config/registry.json DATA_DIR=data PORT=3480 node app/server.js
```

> **Why not just open `index.html`?** The real site needs its small server to save purchases and guesses so every guest sees the same thing. Opening the HTML file on its own won't let you in. If you only want to look around, use `baby-registry-demo.html` from the release, which fakes the server inside your browser.

---

## How I self-hosted it

I run a small homelab, so I hosted mine in a Docker container on a **TrueNAS** box, managed it with **[Dockge](https://github.com/louislam/dockge)**, and put it on the internet with a **Cloudflare Tunnel**. You don't need a setup like that. Anything that can run Docker (or Node.js) will work. Here's exactly how I did it, so you can copy it.

You'll need:
- A TrueNAS SCALE box (or any Linux machine with Docker)
- Dockge, or plain Docker Compose
- A domain name on Cloudflare (the free plan is fine)

### 1. Make a folder for it

On TrueNAS, go to **Datasets**, pick your pool and click **Add Dataset**. Call it `baby-registry` and choose the **Apps** preset. On a plain Linux machine, any folder works.

Copy these into it (over an SMB share, `scp`, or however you normally move files):

```
baby-registry/
├── app/            from the zip
├── config/         from the zip
└── data/           make this one yourself, empty
```

Then give the TrueNAS "apps" user (ID `568`) ownership, from **System → Shell**:

```bash
sudo mkdir -p /mnt/your-pool/baby-registry/data
sudo chown -R 568:568 /mnt/your-pool/baby-registry
```

Change `your-pool` to your pool's name. Not on TrueNAS? Either use your own user's ID (run `id -u`) in that command and in the `user:` line of `compose.yaml`, or create a user with ID 568.

### 2. Start it in Dockge

1. In Dockge, click **+ Compose** and name the stack `baby-registry`.
2. Paste in everything from `compose.yaml`.
3. Change every `/mnt/your-pool/baby-registry` to your folder's real path (there are three).
4. Set `TZ` to your time zone, for example `Australia/Brisbane` or `Europe/London`. The logs and backups use it.
5. Click **Deploy**.

Dockge keeps the compose file in its own stacks folder. That's fine: the website, your settings and the guest data all stay in your `baby-registry` folder.

Without Dockge, put `compose.yaml` in the `baby-registry` folder, fix the paths the same way, and run `docker compose up -d` there.

Check it's working by opening `http://<your-server's-IP>:3480` from a computer on your home network. You should see the opening screen, and your code should let you in. If it doesn't start, the stack's log in Dockge says why (usually a typo in `registry.json` or a folder permission).

The compose file uses the official `node:22-alpine` image, so there's nothing to build. The website and settings are mounted read-only, and only `data` can be written to.

### 3. Put it on the internet with a Cloudflare Tunnel

A tunnel means you don't open any ports on your home router, and Cloudflare handles HTTPS for you. **Don't port-forward 3480 on your router.**

If you don't have a tunnel yet:
1. In the Cloudflare dashboard, go to **Zero Trust → Networks → Tunnels** and click **Create a tunnel**. Choose **Cloudflared**, give it a name, and copy the token it shows you.
2. Run `cloudflared` with that token. On TrueNAS, install the **Cloudflared** app from **Apps** and paste the token in. Anywhere else, Cloudflare shows you the exact Docker command.
3. Wait until the tunnel shows as **Healthy**.

Then point a web address at the registry:
1. Open your tunnel and add a **Public hostname** (newer dashboards call it a **Published application route**).
2. **Subdomain:** for example `baby`. **Domain:** your domain.
3. **Service type:** `HTTP`. **URL:** `<your-server's-IP>:3480`, for example `192.168.1.20:3480`.
4. Save, then open `https://baby.yourdomain.com` on your phone with Wi-Fi off to check it works from outside.

Finally, set `"siteAddress"` in `registry.json` to that address (for example `baby.yourdomain.com`) so it prints on the keepsake.

Other ways to put it online: Nginx Proxy Manager, Caddy or Traefik with a domain and Let's Encrypt, Tailscale Funnel, or a cheap VPS.

### 4. Before you send the link to anyone

- [ ] Changed `"accessCode"` from `123456` (4 to 10 digits)
- [ ] Replaced everything in `[square brackets]` in `registry.json`: your names, baby's last name, address, charity, story text, and the name options and parent names in the guessing games
- [ ] Set the date game's `"due"`, `"min"` and `"max"`, and `"openingDate"` (your unwrapping day)
- [ ] Set up your gift list (or kept the example one)
- [ ] Swapped the photos, or happy with the silhouettes
- [ ] Checked it on your phone over mobile data

Then send family and friends the link and the code.

### 5. Updating it without losing anything

Once guests start marking items as bought, **update the registry in place. Don't redeploy it from scratch, and never delete the `data` folder.** Everything guests have done lives in `data/state.json`, with hourly backups in `data/backups/`.

**Changing settings or the gift list:** just edit `config/registry.json` and save. The site picks it up by itself within a few seconds, no restart needed. See [EDITING.md](EDITING.md).

**Updating to a new version of the code:**
1. Download the new `baby-registry-template.zip` and copy just its `app` folder to your server, for example into your home folder.
2. **Stop** the stack in Dockge.
3. In **System → Shell**, back up the guest data and swap in the new `app` folder:
   ```bash
   cd /mnt/your-pool/baby-registry
   sudo cp -a data "data-backup-$(date +%Y%m%d-%H%M)"
   sudo rm -rf app
   sudo cp -r ~/app ./app
   sudo chown -R 568:568 app
   ```
4. **Start** the stack in Dockge.

Keep your own `config` folder. Only replace it if the release notes say to, and copy your settings across if you do.

Removing an item from the gift list doesn't delete anyone's purchase, so it's safe to tidy the list as you go.

---

## Can I use GitHub Pages or Netlify?

Not for the real registry. Those only serve static files, and the registry needs its small server to save purchases, guesses and scores so every guest sees the same thing. `baby-registry-demo.html` is the only part that works without a server, and it's meant to be downloaded and opened on your own computer.
