# Deploy to Railway

## 1. Deploy the server

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo** (or upload this folder).
3. Select this repo. Railway will detect the root `package.json` and run `npm start`.
4. After deploy, open your service → **Settings** → **Generate Domain** to get a URL like `miniture-combat-production.up.railway.app`.

## 2. Point the game to your server

**Option A – URL parameter (no code change):**  
Host the game somewhere (e.g. GitHub Pages) and add `?server=wss://YOUR-APP.up.railway.app` to the game URL:

```
https://your-game.github.io/miniture-combat/?server=wss://miniture-combat-production.up.railway.app
```

**Option B – Change default in code:**  
Edit `game.js` and set:

```js
const DEFAULT_SERVER_URL = "wss://YOUR-APP.up.railway.app";
```

## 3. Notes

- Use **wss://** (not ws://) for Railway; the platform handles TLS.
- No port in the URL: `wss://your-app.up.railway.app` (Railway uses 443).
- The server listens on `process.env.PORT` (Railway sets this automatically).
