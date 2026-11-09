<div align="center">

# 🍼 Baby Registry

**A private, self-hosted baby registry you run yourself.**
No accounts, no commercial registry site, no tracking.

[**Download the demo**](https://github.com/d-plenty/baby-registry-template/releases/latest) · [Set it up](docs/SETUP.md) · [Edit your settings](docs/EDITING.md)

<img src="docs/screenshots/01-opening-screen.png" width="85%" alt="Opening screen">

</div>

---

I built this for our own baby because I didn't want to put our details and gift list on a big commercial registry site. Our version is live for family and friends. This is a cleaned-up copy with every personal detail swapped for placeholders, so anyone can use it.

## 👀 Try it first

Download **`baby-registry-demo.html`** from the [latest release](https://github.com/d-plenty/baby-registry-template/releases/latest) and open it in your browser. Nothing to install.

The demo has a made-up couple, real baby products, and pretend purchases, guesses and high scores from Mum, Dad, Nan, Auntie Kate and friends. The code is **`123456`**. Anything you do stays in your own browser, and **Reset demo** starts it fresh.

## ✨ What it does

<table>
<tr>
<td width="33%" valign="top">

**🎁 Gift registry**
- Gift list with categories and search
- "I'll get this", so there are no double-ups
- Unlimited items like nappies and vouchers
- "I bought something else"
- Optional ship-to-us address and charity

</td>
<td width="33%" valign="top">

**🎉 The fun bits**
- Guess the sex, name, date, time, weight, length, hair and looks
- Live charts of everyone's guesses
- Pink or blue fireworks at the reveal
- A mini racing game with high scores
- Printable A4 keepsake page

</td>
<td width="33%" valign="top">

**🔒 Private and yours**
- Whole site behind an access code
- Runs on your own server or NAS
- One tiny Node.js server, no dependencies
- One settings file, reloads by itself
- Hourly backups of guest data

</td>
</tr>
</table>

## 📸 Screenshots

<table>
<tr>
<td><img src="docs/screenshots/06-gift-registry.png" alt="Gift registry"></td>
<td><img src="docs/screenshots/07-gift-list.png" alt="Gift list"></td>
</tr>
<tr><td align="center">The gift registry</td><td align="center">The gift list</td></tr>
<tr>
<td><img src="docs/screenshots/14-guessing-games.png" alt="Guessing games"></td>
<td><img src="docs/screenshots/15-guess-charts.png" alt="Guess charts"></td>
</tr>
<tr><td align="center">Guessing games</td><td align="center">Everyone's guesses</td></tr>
<tr>
<td><img src="docs/screenshots/19-mini-game-playing.png" alt="Mini game"></td>
<td><img src="docs/screenshots/23-keepsake.png" alt="Keepsake"></td>
</tr>
<tr><td align="center">The mini game</td><td align="center">The printable keepsake</td></tr>
</table>

<details>
<summary><b>See all 30 screenshots</b></summary>

<br>

| | |
|---|---|
| ![Code screen](docs/screenshots/02-code-screen.png) | ![Home](docs/screenshots/03-how-it-works.png) |
| Enter the code | The home page |
| ![How the registry works](docs/screenshots/04-how-the-registry-works.png) | ![Our story](docs/screenshots/05-our-story.png) |
| How the registry works | Your story |
| ![Category filter](docs/screenshots/08-category-filter.png) | ![Search](docs/screenshots/09-search.png) |
| Filter by category | Search |
| ![Buy dialog](docs/screenshots/10-buy-dialog.png) | ![Thank you](docs/screenshots/11-thank-you.png) |
| Marking a gift as bought | The thank-you message |
| ![Bought something else](docs/screenshots/12-bought-something-else.png) | ![Ship to us](docs/screenshots/13-ship-to-us.png) |
| Bought something not on the list | Ship to us |
| ![Date and time charts](docs/screenshots/16-date-and-time-charts.png) | ![Fireworks](docs/screenshots/17-fireworks.png) |
| Birth date and time guesses | The big reveal |
| ![Mini game start](docs/screenshots/18-mini-game-start.png) | ![Mini game over](docs/screenshots/20-mini-game-over.png) |
| Mini game start | Game over |
| ![High scores](docs/screenshots/21-high-scores.png) | ![Charity](docs/screenshots/22-charity.png) |
| High scores | Donate instead |
| ![Keepsake gifts](docs/screenshots/24-keepsake-gifts.png) | ![Opening](docs/screenshots/01-opening-screen.png) |
| Keepsake: who bought what | Opening screen |

**On a phone**

| | | |
|---|---|---|
| ![](docs/screenshots/m1-opening-screen.png) | ![](docs/screenshots/m2-home.png) | ![](docs/screenshots/m3-gift-list.png) |
| ![](docs/screenshots/m4-guessing-games.png) | ![](docs/screenshots/m5-mini-game-full-screen.png) | ![](docs/screenshots/m6-mini-game-over.png) |

There's also an [example keepsake PDF](docs/keepsake-demo.pdf).

</details>

## 🚀 Make your own

1. Download **`baby-registry-template.zip`** from the [latest release](https://github.com/d-plenty/baby-registry-template/releases/latest) and unzip it.
2. Put your names, access code, dates and gift list in **`config/registry.json`**. [EDITING.md](docs/EDITING.md) explains every setting.
3. Swap the silhouette photos in `config/photos/` for your own, or keep them.
4. Run it with Docker. The included `compose.yaml` uses the official `node:22-alpine` image, so there's nothing to build.

The full guide, including how I self-hosted mine on TrueNAS with Dockge and a Cloudflare Tunnel and how to update it without losing guests' data, is in **[SETUP.md](docs/SETUP.md)**.

> ⚠️ **Privacy:** if you fork this repo publicly, don't commit your real address, access code or photos. The `data/` folder, where guests' purchases and guesses are saved, is already in `.gitignore`.

## 📦 What's in the release

| File | What it's for |
|---|---|
| `baby-registry-demo.html` | The demo. Open it in any browser. |
| `baby-registry-template.zip` | Everything you need to run your own copy. |
| `baby-registry.html` | The website on its own, if you want to read or tweak the code. It needs the server from the zip to run. |

## 🙏 Credits

- Icons from [IconPark](https://github.com/bytedance/IconPark) (Apache 2.0)
- Silhouettes based on [Material Design Icons](https://github.com/google/material-design-icons) (Apache 2.0)
- Products in the demo are real items from Australian shops, used only as examples. This project isn't connected to any of them.

## 💬 Contributing

Ideas, fixes and pull requests are welcome. If you use this for your own little one, I'd love to hear about it!

## Licence

GPL-3.0. You're free to use, change and share it. If you share a changed version, it has to stay open source under the same licence. See [LICENSE](LICENSE).
