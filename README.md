# Baby Registry

A simple, self-hosted baby registry you can customise and run yourself. No accounts, no third-party registry service, no tracking.

I built this for our own baby because I didn't want to put our details and gift list on a big commercial registry site. Our version is live for family and friends. This repo is a cleaned-up copy with all personal details swapped for placeholders, so anyone can use it.

**👀 Try the demo:** download `baby-registry-demo.html` from the [latest release](../../releases/latest) (or [`demo.html`](demo.html) in this repo) and open it in your browser. It's a single file with a made-up couple, real baby products, and pretend purchases, guesses and high scores from Mum, Dad, Nan, Auntie Kate and friends. The code is **123456**. Anything you do in the demo stays in your browser, and the **Reset demo** button at the top puts it back to the start.

![Opening screen](docs/screenshots/01-opening-screen.png)

---

## What it's good for

- **Online or long-distance baby showers.** Guests can see the list, pick a gift, buy it from any shop, and have it shipped to you.
- **Stopping double-ups.** When a guest marks an item as bought, everyone else sees it straight away.
- **Keeping it private.** The whole site sits behind a numeric access code, so only people you've given the code to can see it.
- **Buying from any shop.** Items can link to a shop's product page if you want, but guests can buy from anywhere. No money ever goes through the registry.
- **Owning your data.** It runs on your own hardware or server, not someone else's platform.

## Features

**The registry**
- Gift list with categories, search, and optional links to one or more shops per item
- "I'll get this" so everyone can see what's been bought, with a thank-you message
- Items like nappies, wipes, clothes and vouchers can be bought any number of times
- "I bought something else" for gifts that aren't on the list
- Optional "Ship to us" section with your postal address
- Optional charity section for guests who'd rather donate

**The fun bits**
- Guessing games: boy or girl, name, birth date, time, weight, length, how much hair, hair colour and who the baby will look like, with live charts of everyone's guesses
- Fireworks (pink or blue) when the guesses are revealed
- A mini racing game with a high score table
- Your story told in photo chapters (it ships with plain couple silhouettes you can keep or swap for your own photos)
- A countdown to your unwrapping day, with an optional link to a Facebook group or live stream
- A printable A4 keepsake page with all the guesses, winners and who bought what

**Under the hood**
- One small Node.js server with **no dependencies** to install
- Guests' purchases, guesses and scores are saved to a single file, with hourly backups
- Your settings and gift list are one file (`config/registry.json`) that reloads by itself when you save it
- Access code lockout after too many wrong tries, signed cookies and a strict content security policy
- Works well on phones

## Screenshots

| | |
|---|---|
| ![Code screen](docs/screenshots/02-code-screen.png) | ![How it works](docs/screenshots/03-how-it-works.png) |
| Enter the code | The home page |
| ![How the registry works](docs/screenshots/04-how-the-registry-works.png) | ![Our story](docs/screenshots/05-our-story.png) |
| How the registry works | Your story |
| ![Gift registry](docs/screenshots/06-gift-registry.png) | ![Gift list](docs/screenshots/07-gift-list.png) |
| The gift registry | The gift list |
| ![Category filter](docs/screenshots/08-category-filter.png) | ![Search](docs/screenshots/09-search.png) |
| Filter by category | Search |
| ![Buy dialog](docs/screenshots/10-buy-dialog.png) | ![Thank you](docs/screenshots/11-thank-you.png) |
| Marking a gift as bought | The thank-you message |
| ![Bought something else](docs/screenshots/12-bought-something-else.png) | ![Ship to us](docs/screenshots/13-ship-to-us.png) |
| Bought something not on the list | Ship to us |
| ![Guessing games](docs/screenshots/14-guessing-games.png) | ![Guess charts](docs/screenshots/15-guess-charts.png) |
| Guessing games | Everyone's guesses |
| ![Date and time charts](docs/screenshots/16-date-and-time-charts.png) | ![Fireworks](docs/screenshots/17-fireworks.png) |
| Birth date and time guesses | The big reveal |
| ![Mini game start](docs/screenshots/18-mini-game-start.png) | ![Mini game playing](docs/screenshots/19-mini-game-playing.png) |
| The mini game | Playing |
| ![Mini game over](docs/screenshots/20-mini-game-over.png) | ![High scores](docs/screenshots/21-high-scores.png) |
| Game over | High scores |
| ![Charity](docs/screenshots/22-charity.png) | ![Keepsake](docs/screenshots/23-keepsake.png) |
| Donate instead | The printable keepsake |

![Keepsake gifts](docs/screenshots/24-keepsake-gifts.png)

There's also an [example keepsake PDF](docs/keepsake-demo.pdf).

### On a phone

| | | |
|---|---|---|
| ![Phone opening](docs/screenshots/m1-opening-screen.png) | ![Phone home](docs/screenshots/m2-home.png) | ![Phone gift list](docs/screenshots/m3-gift-list.png) |
| ![Phone guessing games](docs/screenshots/m4-guessing-games.png) | ![Phone mini game](docs/screenshots/m5-mini-game-full-screen.png) | ![Phone game over](docs/screenshots/m6-mini-game-over.png) |

---

## What's in the repo

```
app/          the website and the Node.js server (you normally don't need to touch this)
config/       registry.json (your settings and gift list) and the photos
compose.yaml  Docker Compose file to run it
demo.html     the standalone demo
docs/         EDITING.md, screenshots and the example keepsake
```

## Getting started

1. Download `baby-registry-template.zip` from the [latest release](../../releases/latest) and unzip it, or clone this repo.
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

[`docs/EDITING.md`](docs/EDITING.md) has more detail on every setting.

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

> **Why not just open `index.html`?** The real site needs its small server to save purchases and guesses so every guest sees the same thing. Opening the HTML file on its own won't let you in. If you only want to look around, use `demo.html`, which fakes the server inside your browser.

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

Not for the real registry. Those only serve static files, and the registry needs its small server to save purchases, guesses and scores so every guest sees the same thing. `demo.html` is the only part that works without a server, and it's meant to be downloaded and opened on your own computer.

---

## Credits

- Icons from [IconPark](https://github.com/bytedance/IconPark) (Apache 2.0)
- Silhouettes based on [Material Design Icons](https://github.com/google/material-design-icons) (Apache 2.0)
- Products in the demo are real items from Australian shops, used only as examples. This project isn't connected to any of them.

## Contributing

Ideas, fixes and pull requests are welcome. If you use this for your own little one, I'd love to hear about it!

## Licence

MIT. Free to use, modify and share. See [LICENSE](LICENSE).
