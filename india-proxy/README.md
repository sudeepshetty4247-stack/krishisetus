# KRISHISETU India mandi price proxy (AWS Mumbai, ap-south-1)

Why: data.gov.in refuses or times out connections from the hosted KRISHISETU servers (outside India).
This tiny service runs in Mumbai, calls data.gov.in with your key, validates the records and hands one
page at a time to the existing every-minute KRISHISETU job. The key never reaches the browser.

## Step 0 — test from India FIRST (do not skip)
1. AWS console → region **Asia Pacific (Mumbai) ap-south-1** → Lightsail (or EC2) → create an Ubuntu 22.04/24.04 instance (smallest size is fine).
2. SSH in, upload `diagnose.sh`, run: `DATA_GOV_IN_API_KEY=<your key> bash diagnose.sh`
3. Read the result:
   - `http=200` and the body shows `"records":[...]` → good, continue to Step 1.
   - `http=403` → key invalid or WAF block: regenerate the key at data.gov.in → My Account → API key and retry; if still 403, data.gov.in blocks AWS IPs — try an Indian provider (e.g. a small VPS in India) and re-run.
   - `curl failed: exit 28` (timeout) or `exit 7` (refused) → data.gov.in is down or blocking this IP; re-run after 30 minutes; if persistent, same next step as 403.
   Do not continue until Step 0 shows http=200.

## Step 1 — run the proxy
```bash
sudo apt-get update && sudo apt-get install -y docker.io
docker build -t krishisetu-proxy .
docker run -d --restart=always --name proxy -p 8080:8080 \
  -e DATA_GOV_IN_API_KEY=<your key> -e PROXY_TOKEN=<same token you save in Lovable> -e AWS_REGION=ap-south-1 \
  krishisetu-proxy
curl http://localhost:8080/health
```
(Without Docker: install Node 20 and run `node server.mjs` with the same environment variables under systemd.)

## Step 2 — HTTPS
Put HTTPS in front (required): Lightsail/EC2 → install Caddy: `sudo apt install caddy`, point a domain/subdomain
(e.g. `mandi.yourdomain.in`) at the server IP, `/etc/caddy/Caddyfile`:
```
mandi.yourdomain.in {
  reverse_proxy localhost:8080
}
```
Open ports 80/443 in the instance firewall; keep 8080 closed to the internet.

## Step 3 — verify from the server
```bash
curl -H "Authorization: Bearer <PROXY_TOKEN>" https://mandi.yourdomain.in/health/upstream
curl -H "Authorization: Bearer <PROXY_TOKEN>" "https://mandi.yourdomain.in/v1/mandi?limit=5&offset=0"
```
`latest_date` in the second response tells you whether same-day reports exist.

## Step 4 — connect KRISHISETU
In Lovable save two secrets: `MANDI_PROXY_URL` = `https://mandi.yourdomain.in`, `MANDI_PROXY_TOKEN` = the PROXY_TOKEN.
The every-minute job then uses: proxy → direct data.gov.in → backup relay.

## Environment variables (proxy)
| Name | Required | Meaning |
|---|---|---|
| DATA_GOV_IN_API_KEY | yes | your data.gov.in key (server-side only) |
| PROXY_TOKEN | yes, ≥24 chars | shared secret; KRISHISETU sends it as Bearer token |
| PORT | no (8080) | listen port |
| CACHE_TTL_MS | no (60000) | repeat-request cache |
| UPSTREAM_TIMEOUT_MS / UPSTREAM_ATTEMPTS | no (15000 / 3) | timeout and retries (backoff 1s, 2s) |

## Endpoints
- `GET /health` — public, no secrets: configured flag, last success, last error.
- `GET /health/upstream` — token; one-row live test of data.gov.in with latency.
- `GET /v1/mandi?offset=&limit=(≤1000)&state=&district=&market=&commodity=&arrival_date=` — token; normalized records
  (state, district, market, commodity, variety, grade, date, min/max/modal price), plus total, next_offset, rejected, duplicates.
  Rows missing a required field or modal price are rejected, never filled in.
