# How to edit it safely

Everything lives in one folder on the NAS: your registry folder (for example `/mnt/your-pool/baby-registry`)

| Folder    | What's in it                                          | Safe to edit?                                  |
|-----------|-------------------------------------------------------|------------------------------------------------|
| `config/` | `registry.json`: gift list, address, code, results, prizes | Yes, any time. The site reloads it within a few seconds. |
| `app/`    | `server.js` and `public/baby-registry.html` (the website itself)   | Yes. Restart the stack in Dockge afterwards.   |
| `data/`   | `state.json` (everyone's purchases, guesses, donations, high scores), `backups/`, `secret.key` | Only with the stack stopped (see below). |

Stopping, restarting, updating or even deleting the container never touches `data/`.

## Keepsake (printable copy for the baby book)

Open `https://[your-site-address]/#keepsake` (after entering the code), then tap **Print or save as PDF**.
Choose A4 and turn on "Background graphics". It fills itself in from whatever's on the site at the time, so print
the final one after the unwrapping and once the results are filled in.

## Facebook page

`"facebookGroupUrl"` in `registry.json` is the link behind every "Go to Facebook page" button (How it works,
Unwrapping day and the footer). Leave it as `""` to hide them all.

## Changing the gift list, address, results or prizes

1. Open `config/registry.json` and change what you need.
2. Save it. That's it, no restart needed.

Rules that keep everyone's data linked up:

- **Never change an item's `"id"`** once people have started buying. Purchases are linked to it.
  Name, price, quantity, links, notes and emoji can all change freely.
- **New item:** copy an existing item, give it a new id (lowercase, no spaces, e.g. `"sleeping-bag"`).
- **Removing an item** hides it and its purchases. Put it back with the same id and they come back.
- **Raising `qty`** puts it back on "available". Lowering it below what's been bought just shows it as all bought.
- **No limit:** use `"unlimited": true` instead of `"qty"` (like the vouchers, wipes and books). People can buy as many as
  they like, the card shows how many have been bought so far, and it doesn't count towards the progress bar.
- **Changing the code** only affects new visitors. People already in stay in.
- **Store links:** add them to an item's `"links"` list like this:
  `{ "store": "Shop name", "label": "Product name", "url": "https://example.com/..." }`
- **Any brand:** a gift with no links automatically gets a small "Any brand" tag (except vouchers).
  For a gift with links, `"anyBrand": true` shows "Any brand or similar" and heads the links "Some ideas if you need one".
  Leave it out and the links show under "Our picks".
- **Category colours:** each category in `"categories"` has a `"colour"`: `sky`, `pink`, `mint`, `sun`, `lilac`, `peach`, `aqua` or `lime`.
- **Pictures:** `"icon"` picks the gift's picture. Choose any of these:
  `baby-bath`, `baby-bottle`, `baby-car-seat`, `baby-mobile`, `baby-one`, `baby-sling`, `bedside`, `blanket`, `bodysuit`, `book-open`, `boy-stroller`, `car`, `chair`, `clothes-diapers`, `clothes-pants`, `crib`, `cup`, `delete`, `diapers-one`, `duck`, `dummy`, `gift-card`, `hair-brush`, `handbag`, `handwashing`, `lotion`, `medical-box`, `mirror`, `moon`, `pacifier`, `pad`, `paperclip`, `puzzle`, `rattle`, `retro-bag`, `scissors`, `short-skirt`, `single-bed`, `singlet`, `sleep-two`, `sleepsuit`, `soap-bubble`, `socks`, `spatula`, `spoon`, `sunshade`, `swaddle`, `t-shirt`, `teeth`, `thermometer`, `thermometer-one`, `towel`, `umbrella`, `water-level`, `wipes`.
  `"iconColour"` (`sky`, `pink`, `mint`, `sun`, `lilac`, `peach`, `aqua` or `lime`) changes its colour; leave it out to use the category colour.
  `"emoji"` is what turns up on the road in the mini game.

If you make a typo (a missing comma or quote), the site keeps running on the last good version
and Dockge's log for the stack says what's wrong and which line.

## Revealing the guessing game answers

Fill in the matching line under `"results"` in `registry.json`, for example:

```
"results": {
  "sex": "girl",
  "name": "Grace",
  "date": "2027-03-04",
  "weight": 3.42,
  "length": 51,
  "time": "14:35",
  "hair": "fuzz",
  "hairColour": "brown",
  "looks": "jellybean"
},
```

Text values go in quotes, numbers don't. Leave a game as `null` until you know it.
For the name, fill in both `"sex"` and `"name"`. Write the name as it appears in the list (e.g. `"Grace"` or `"Sam"`).
The other sex's name list is then retired and doesn't count towards points.
Once a game has an answer, guessing closes for it and its winner shows up.

## Guesses and "Bought something else"

- Guesses belong to a **name**, not a phone. After someone saves, the form clears for the next person.
  Typing the same name again (any capitals) brings their guesses back to edit.
- "Bought something else?" entries are in `data/state.json` under `"extras"`.

## Mini game scoreboard

- Players type their name before starting (remembered on that phone, with a "Change player" link), and the score saves automatically when the game ends. Ending a game early doesn't save it.
- The scoreboard keeps the **top 30** scores. When a new score beats the lowest, the lowest is deleted.
- Each name gets one spot (their best). Blank names show as "Mystery driver", and each of those gets its own spot.
- **Bonus points in the guessing games:** anyone who saves a score with exactly the same full name as their
  guesses gets 10 points. Whoever is number 1 on the scoreboard gets 10 more (only if their name matches a guesser).
- The moment the last answer goes in under `"results"`, the bonus points are locked in, so a high score made
  after that is just for bragging rights.
- Scores are in `data/state.json` under `"scores"`, and the names that have played are under `"players"`.
  To remove a rude name, follow the steps below.

## Fixing or removing an entry someone made (spam, a mistake)

1. In Dockge, **Stop** the stack. (It finishes any save first.)
2. Edit `data/state.json` and delete the entry.
3. **Start** the stack again.

Editing `state.json` while the site is running doesn't work: the site would overwrite your change on the next save.

## Backups

- `data/backups/` keeps an hourly copy for the last 7 days, plus one every time the site starts.
- If `state.json` is ever missing or damaged, the site restores the newest backup by itself when it starts.
- Keep the folder on storage that's backed up or snapshotted.

To roll back by hand: stop the stack, copy the backup you want over `data/state.json`, start the stack.

## Photos ("Our story" tab)

- Photos live in `config/photos/full` (big, for the tap-to-enlarge view) and `config/photos/thumb` (small, for the page).
  They're only sent to people who have entered the code.
- Captions, chapter titles and which photos go where are under `"story"` in `registry.json`. Edit the text freely.
- `"welcome"` lists the three photos shown at the top of "How it works".
- **Adding a photo:** copy the same `.jpg` into both `photos/full` and `photos/thumb` (use a simple name like
  `first-cuddle.jpg`, no spaces), then add it to a chapter's `"photos"` list:
  `{ "file": "first-cuddle.jpg", "caption": "First cuddle" }`
- After copying files in, run: `sudo chown -R 568:568 /mnt/your-pool/baby-registry/config`
- Photos can hide your location inside them. Remove location details before adding them.
