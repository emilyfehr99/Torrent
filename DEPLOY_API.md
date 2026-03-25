# Deploy the microstats API (free tier) for GitHub Pages

The site at `https://emilyfehr99.github.io/Torrent/` is **static only**. The hub UI calls a **FastAPI** backend at `/api/hub`. You must host that API separately and point the frontend at it.

## 1) Bake the API URL into the Pages build

1. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `VITE_API_URL`
3. Value: your public API origin **with no trailing slash**, e.g. `https://torrent-hub-api.onrender.com`
4. Push to `main` (or re-run the **Deploy GitHub Pages** workflow). The build embeds this value into the JS bundle.

Local dev: leave `VITE_API_URL` empty; Vite proxies `/api` to `127.0.0.1:8787`.

## 2) Run the API (code: `hub_python`)

From your machine (same layout as `Microstats/hub_python`):

```bash
cd hub_python
pip install -r requirements.txt
uvicorn api_server:app --host 0.0.0.0 --port 8787
```

For production, use port `10000` on **Render** or the platform’s `$PORT`.

### CORS

`api_server.py` allows localhost dev origins and `https://emilyfehr99.github.io` by default. To allow a custom domain or extra origins, set:

```bash
export CORS_ORIGINS="https://yourdomain.com,https://emilyfehr99.github.io"
```

## 3) Free hosting options (pick one)

### Render (free web service)

1. Create a **Web Service** from the GitHub repo that contains `hub_python` (or upload the folder).
2. **Root directory:** `hub_python` (if the repo is the monorepo root, adjust to where `api_server.py` lives).
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `uvicorn api_server:app --host 0.0.0.0 --port $PORT`
5. **Environment variables:**
   - `CORS_ORIGINS` = `https://emilyfehr99.github.io` (plus your custom domain if any)
6. After deploy, copy the service URL (e.g. `https://torrent-hub-api.onrender.com`) into `VITE_API_URL` and redeploy Pages.

**Note:** Free Render services spin down when idle; first request can be slow.

### Railway / Fly.io

Same idea: Python 3.11+, install `requirements.txt`, start `uvicorn` on `$PORT`, set `CORS_ORIGINS`.

## 4) Data paths

The hub reads game CSV paths from `microstats_hub/config.py` (`GAME_PATHS`, team name, etc.). On a host with no CSVs, `/api/hub` may return empty data until you configure paths or mount storage—see your `hub_python` README.

## 5) Verify

- Browser: `https://<your-api-host>/api/health` → `{"status":"ok"}`
- Then open the Pages site; Overview should load without “Could not load microstats”.
