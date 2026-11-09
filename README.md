# baby-registry-template
A simple, single-file HTML baby registry you can customise and host yourself. No accounts, no tracking.

# Baby Registry

A simple, self-hosted baby registry you can customise and run yourself. No accounts, no third-party registry service, and no tracking.

I built this for our own baby because I didn't want to put our details and gift list on a big commercial registry site. Our version is live for family and friends, and this repo is a cleaned-up copy with all personal details swapped for placeholders, so anyone can use it.

---

## What it's good for

- **Online or long-distance baby showers.** Guests can see the list, pick a gift, buy it from the store, and have it shipped to you.
- **Stopping double-ups.** When a guest marks an item as purchased, everyone else with access sees it straight away.
- **Keeping it private.** The registry sits behind a simple numeric access code, so only people you've shared the code with can see it.
- **Buying from any store you like.** Each item links to the retailer's own product page (e.g. Baby Bunting, Big W). All payments happen on the store's site, never through the registry.
- **Owning your data.** It runs on your own hardware or server, not someone else's platform.

## Features

- Gift list with product links to one or more stores per item
- "Mark as purchased" that every guest can see
- Numeric access code on entry
- Optional "ship to us" address section for guests sending gifts
- Optional link to a Facebook group (or any other page) for updates, live streams, etc.
- Placeholder text and stock silhouette images ready to replace with your own

## Getting started

1. Clone or download this repo.
2. Open `index.html` in a text editor.
3. Replace the placeholders with your own details:
   - Names and due date
   - Access code
   - Gift items and product links
   - Shipping address (optional)
   - Facebook group or event link (optional)
4. Swap the stock silhouette images for your own photos (or keep them).
5. Host it (see below).

> ⚠️ **Privacy note:** If you fork this repo publicly, **don't commit your real address, access code or photos** to GitHub. Make your edits on the copy you host, not in your public fork.

---

## How I self-hosted it

I run a small homelab, so I hosted the registry in a Docker container on my NAS and published it to the internet through a Cloudflare Tunnel. You don't need a setup like that. Any web host that can serve a static site will work. Here's an outline of how I did it in case it's useful.

### 1. Run it in Docker

I manage my containers with [Dockge](https://github.com/louislam/dockge), but any way of running Docker Compose works. A minimal `compose.yaml` using nginx:

```yaml
services:
  baby-registry:
    image: nginx:alpine
    container_name: baby-registry
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./site:/usr/share/nginx/html:ro
```

Put `index.html` (and any images) in a `site` folder next to the compose file, then start it:

```bash
docker compose up -d
```

The registry is now at `http://<your-server-ip>:8080`.

### 2. Make it reachable from the internet

I used a **Cloudflare Tunnel** (`cloudflared`), so I didn't have to open any ports on my home router. The tunnel points a subdomain (e.g. `registry.yourdomain.com`) at the container, and Cloudflare handles HTTPS automatically.

Other options:
- A reverse proxy such as Nginx Proxy Manager, Caddy or Traefik, with a domain and Let's Encrypt
- Tailscale Funnel
- A cheap VPS

### 3. Updating it without losing anything

Once guests start marking items as purchased, **update the registry in place. Don't redeploy it from scratch.** Back up any data first, edit the files, and restart the container. Don't wipe the volume.

---

## Hosting without Docker

If you just want it online fast, a static host works too:
- **GitHub Pages:** enable Pages in this repo's settings
- **Cloudflare Pages / Netlify:** drag and drop the folder

Note: Features that save shared data (like "mark as purchased") may need a server or backend. See the notes in `index.html`.

---

## Contributing

Ideas, fixes and pull requests are welcome. If you use this for your own little one, I'd love to hear about it!

## Licence

MIT. Free to use, modify and share.
