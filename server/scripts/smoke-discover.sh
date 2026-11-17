
#!/usr/bin/env bash
set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="discover-a-${RUN_ID}@example.com"
EMAIL_B="discover-b-${RUN_ID}@example.com"
NAME_A="Discovery Test A ${RUN_ID}"
NAME_B="Discovery Test B ${RUN_ID}"
PASSWORD="blue-river-lamp-seven"

TMP_DIR="$(mktemp -d)"
JAR_A="$TMP_DIR/a.txt"
JAR_B="$TMP_DIR/b.txt"
BODY="$TMP_DIR/body.txt"
HEADERS="$TMP_DIR/headers.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS=0
FAIL=0
STATUS=""

ok() { PASS=$((PASS + 1)); echo "  PASS  $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }

call() {
  local method="$1" path="$2" data="$3"
  shift 3
  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" -X "$method" "$BASE$path")

  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  STATUS="$(curl "${args[@]}" "$@")"
}

check() {
  local name="$1" expected="$2" needle="${3:-}"

  if [ "$STATUS" != "$expected" ]; then
    bad "$name (status $STATUS, expected $expected)"
  elif [ -n "$needle" ] && ! grep -qF -- "$needle" "$BODY"; then
    bad "$name (missing: $needle)"
  else
    ok "$name"
  fi
}

section() { echo; echo "== $1 =="; }

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "API unavailable. Start it with: npm run dev"
  exit 1
fi

echo "Testing discovery API: $BASE"

section "1. Authentication"

call GET /discover ""
check "Unauthenticated discovery -> 401" 401 '"code":"UNAUTHENTICATED"'

if grep -qiE '^cache-control: .*no-store' "$HEADERS"; then
  ok "Discovery response is not cacheable"
else
  bad "Discovery response should have no-store cache header"
fi

section "2. Create test users"

call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "Register user A -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_A}\",\"headline\":\"Frontend Developer\",\"location\":\"Lagos\",\"skills\":[\"React\",\"TypeScript\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_A"
check "Onboard user A -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "Register user B -> 201" 201

call POST /onboarding "{\"capabilities\":[\"client\"],\"displayName\":\"${NAME_B}\",\"headline\":\"Business Owner\",\"location\":\"Abuja\",\"skills\":[\"Marketing\"],\"interests\":[\"marketing\"],\"goals\":[\"hire-talent\"]}" -b "$JAR_B"
check "Onboard user B -> 201" 201

section "3. Discovery results"

call GET /discover "" -b "$JAR_A"
check "Authenticated discovery -> 200" 200 "\"displayName\":\"${NAME_B}\""

if grep -qF "\"displayName\":\"${NAME_A}\"" "$BODY"; then
  bad "Discovery must exclude the current user's profile"
else
  ok "Discovery excludes the current user's profile"
fi

if grep -qiE '"email"|"passwordHash"|"goals"|"sessions"' "$BODY"; then
  bad "Discovery must not expose private account data"
else
  ok "Discovery does not expose private account data"
fi

section "4. Search filters"

call GET "/discover?search=${NAME_B// /%20}" "" -b "$JAR_A"
check "Search by name -> 200" 200 "\"displayName\":\"${NAME_B}\""

call GET "/discover?location=Abuja" "" -b "$JAR_A"
check "Filter by location -> 200" 200 "\"displayName\":\"${NAME_B}\""

call GET "/discover?skill=Marketing" "" -b "$JAR_A"
check "Filter by skill -> 200" 200 '"name":"Marketing"'

call GET "/discover?accountType=client" "" -b "$JAR_A"
check "Filter by account type -> 200" 200 "\"displayName\":\"${NAME_B}\""

section "5. Pagination and validation"

call GET "/discover?page=1&limit=1" "" -b "$JAR_A"
check "Pagination -> 200" 200 '"pagination"'

call GET "/discover?limit=100" "" -b "$JAR_A"
check "Reject limit above 30 -> 400" 400 '"code":"VALIDATION_ERROR"'

echo
echo "Passed: $PASS    Failed: $FAIL"
echo
echo "Test users created:"
echo "  $EMAIL_A"
echo "  $EMAIL_B"
echo "Clean them up after testing if desired."

[ "$FAIL" -eq 0 ]
