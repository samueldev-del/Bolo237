#!/usr/bin/env bash
set -euo pipefail

base="${1:-http://localhost:5060}"
stamp="$(date +%s)"
email="sess.qa.${stamp}@bolo237.test"
pass='Pass1234!'

create="$(curl -sS -X POST "$base/api/users" -H 'Content-Type: application/json' --data "{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"Session QA\",\"role\":\"CANDIDAT\"}")"
id="$(echo "$create" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p')"

code_login="$(curl -sS -o /tmp/login.body -w '%{http_code}' -c /tmp/session.cookie -X POST "$base/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$email\",\"password\":\"$pass\"}")"
code_me="$(curl -sS -o /tmp/me.body -w '%{http_code}' -b /tmp/session.cookie "$base/api/auth/me")"
code_logout="$(curl -sS -o /tmp/logout.body -w '%{http_code}' -b /tmp/session.cookie -X POST "$base/api/auth/logout")"
code_me_after="$(curl -sS -o /tmp/me_after.body -w '%{http_code}' -b /tmp/session.cookie "$base/api/auth/me")"

if [[ -n "$id" ]]; then
  curl -sS -X DELETE "$base/api/users/$id" >/dev/null || true
fi

echo "LOGIN=$code_login ME=$code_me LOGOUT=$code_logout ME_AFTER=$code_me_after"
