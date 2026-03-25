#!/usr/bin/env bash
set -euo pipefail
base="${1:-http://localhost:5060}"
stamp="$(date +%s)"
email="debug.sess.${stamp}@bolo237.test"
pass='Pass1234!'

create="$(curl -sS -X POST "$base/api/users" -H 'Content-Type: application/json' --data "{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"Debug Session\",\"role\":\"CANDIDAT\"}")"
id="$(echo "$create" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p')"

# login and capture raw set-cookie
curl -sS -D /tmp/login.hdr -o /tmp/login.body -X POST "$base/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$email\",\"password\":\"$pass\"}" >/dev/null
cookie_line="$(grep -i '^Set-Cookie:' /tmp/login.hdr | head -1 | tr -d '\r')"
cookie_value="$(echo "$cookie_line" | sed -n 's/^Set-Cookie: \([^;]*\).*/\1/p')"

# me before logout
code_me_before="$(curl -sS -o /tmp/me_before.body -w '%{http_code}' -H "Cookie: $cookie_value" "$base/api/auth/me")"

# logout with same cookie
code_logout="$(curl -sS -o /tmp/logout_debug.body -w '%{http_code}' -X POST -H "Cookie: $cookie_value" "$base/api/auth/logout")"

# me after logout with the exact same old cookie value
code_me_after="$(curl -sS -o /tmp/me_after_debug.body -w '%{http_code}' -H "Cookie: $cookie_value" "$base/api/auth/me")"

if [[ -n "$id" ]]; then
  curl -sS -X DELETE "$base/api/users/$id" >/dev/null || true
fi

echo "STAMP=$stamp"
echo "COOKIE=$cookie_value"
echo "ME_BEFORE=$code_me_before LOGOUT=$code_logout ME_AFTER_REPLAY=$code_me_after"
