#!/usr/bin/env bash
# Run this ON the Mumbai server BEFORE deploying, to see whether data.gov.in answers from India.
# Usage: DATA_GOV_IN_API_KEY=... bash diagnose.sh
set -u
H=api.data.gov.in
echo "== DNS";  getent hosts $H || nslookup $H
echo "== Public IP of this server"; curl -s -m 10 https://checkip.amazonaws.com
echo "== TCP/TLS + HTTP status (key hidden)"
curl -sS -m 30 -o /tmp/dg.json -w 'http=%{http_code} connect=%{time_connect}s tls=%{time_appconnect}s total=%{time_total}s\n' \
  "https://$H/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${DATA_GOV_IN_API_KEY}&format=json&limit=2" || echo "curl failed: exit $?"
echo "== Body (first 400 chars)"; head -c 400 /tmp/dg.json 2>/dev/null; echo
