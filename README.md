# OSRS Clan Bingo

A shared board for an Old School RuneScape clan bingo. Visitors see the 5 by 5 board, which team has put an X on each tile, the live standings, and a feed of recent completions. An admin marks tiles, uploads proof screenshots, and edits teams, tiles, and the event window.

The board is stored in a SQLite file on the server, so every visitor sees the same event. The public page polls every few seconds.

## Run it locally

You need Node.js 20 or newer. This project was built on Node 22.

```bash
npm ci
npm test
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

- Board: [http://127.0.0.1:4317](http://127.0.0.1:4317)
- Gallery: [http://127.0.0.1:4317/gallery](http://127.0.0.1:4317/gallery)
- Rules: [http://127.0.0.1:4317/rules](http://127.0.0.1:4317/rules)
- Admin: [http://127.0.0.1:4317/admin](http://127.0.0.1:4317/admin)

The development admin password is `bingo-admin`. It is used whenever `ADMIN_PASSWORD` is unset. Change it before anyone else can reach the server. Copy `.env.example` to `.env.local` if you want the variables loaded for you:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Password for `/admin` | `bingo-admin` |
| `ADMIN_SESSION_SECRET` | Signs the admin cookie | a dev-only string |
| `DATABASE_PATH` | SQLite file | `data/bingo.sqlite` |
| `COOKIE_SECURE` | Set to `1` to force a Secure cookie | off, unless the proxy says HTTPS |

The first launch creates the database and seeds the Serpent Cup: four teams, 25 tiles, and a mid-event sample of marks so the scoring is visible. Change the dates, the clan-chat word, and the tiles in the admin panel for your own event. **Clear progress** wipes the Xs. **Restore default event** puts the seed back. Restoring asks you to type `RESET`.

## Scoring

Tile points are printed on each square. The centre FREE tile is filled for every team, scores 0, and still completes the middle of the centre row, the centre column, and both diagonals.

On top of tile points:

- +5 for each finished row
- +5 for each finished column
- +5 for each finished diagonal (both count)
- +25 for a blackout, which is every square including FREE

An admin can change those bonuses on the Event tab. Ties break by tile points, then by whichever team reached the score earlier.

`npm test` covers the line math, the blackout, the tie-break, the seeded card, and a SQLite round-trip that marks, unmarks, and resets.

## Proof screenshots

Admins upload PNG, JPG, WEBP, or GIF files from the mark dialog. Drag a file onto the drop zone, use the file picker, or paste an image from the clipboard. Each file can be up to 10MB, and one team mark can hold eight shots. The admin can remove a shot without clearing the X.

Files are stored on disk in a `proofs` folder beside the SQLite file. If `DATABASE_PATH` is `/data/bingo.sqlite`, the images live in `/data/proofs`. That folder has to sit on the same persistent disk as the database. A volume mounted at `/data` covers both. Deleting the database without the folder, or the other way around, leaves broken pictures or orphaned files.

The public board shows the shots when a visitor opens a tile, with a zoom view. The gallery page lists every uploaded shot and can be filtered by team and by tile.

## Deploy

The process has to be able to write `DATABASE_PATH`. Serverless hosts that wipe the disk, including a default Vercel deploy, will forget the board. Use a VM, a container with a volume, or any host with a persistent disk.

### Docker Compose

```bash
docker compose up --build -d
```

Edit `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in `docker-compose.yml` first. The board and the `proofs` image folder are stored in the `bingo-data` volume. The app listens on port 4317.

### A small VM

```bash
npm ci
npm run build
ADMIN_PASSWORD='use-a-long-password' \
ADMIN_SESSION_SECRET='use-another-long-secret' \
DATABASE_PATH=/var/lib/osrs-bingo/bingo.sqlite \
npm start
```

Put a reverse proxy in front of port 4317. If the proxy sets `X-Forwarded-Proto: https`, the admin cookie is marked Secure. For plain HTTP, leave `COOKIE_SECURE` unset.

### Railway, Fly.io, or a similar host

1. Deploy this repo with the Dockerfile, or with `npm run build` and `npm start`.
2. Attach a volume and set `DATABASE_PATH` to a file on that volume, for example `/data/bingo.sqlite`. Screenshots are written to `/data/proofs` next to that file, so the volume must include the whole directory, not only the database file.
3. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
4. Expose port 4317.

The container binds to `0.0.0.0`. Do not rely on the default `HOSTNAME` inside Docker. `npm start` already passes `--hostname 0.0.0.0`.

## What is seeded

Teams: Zulrah (green), Vorkath (blue), Jad (orange), Bandos (crimson), each with four placeholder members.

The card mixes boss drops (Godwars hilt, dragon warhammer, zenyte shard, tanzanite fang or magma mutagen, a Barrows set, a Vorkath head, any raids purple, a boss jar, any pet), skilling (5M XP in one skill, tome of fire, heron or rift guardian, a crystal tool seed, 1M team Agility XP), clues and minigames (3rd age, a master clue, an elite clue, a Tempoross or Guardians of the Rift unique, a Penance Queen kill), and combat (50 Zulrah KC, a Fire cape, an Inferno attempt to wave 50, 20 Barrows chests, a Corrupted Gauntlet seed). Team Zulrah starts with the centre column finished, which is why they lead by a line bonus.
