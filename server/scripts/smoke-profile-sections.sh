#!/usr/bin/env bash
# Smoke test for the experience and education API.
#
# 1. Start the API:           npm run dev                          (in server/)
# 2. In another terminal:     npm run test:smoke:profile-sections  (in server/)
#
# It talks to the API directly with curl. It never uses the React app.

set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="sec-a-${RUN_ID}@example.com"
EMAIL_B="sec-b-${RUN_ID}@example.com"
PASSWORD="blue-river-lamp-seven"
FAKE_ID="00000000-0000-4000-8000-000000000000"

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
section() { echo; echo "== $1 =="; }

# call METHOD PATH JSON_BODY [extra curl arguments...]
call() {
  local method="$1" path="$2" data="$3"
  shift 3
  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" -X "$method" "$BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  STATUS="$(curl "${args[@]}" "$@")"
}

# check DESCRIPTION EXPECTED_STATUS [TEXT_THE_BODY_MUST_CONTAIN]
check() {
  local name="$1" expected="$2" needle="${3:-}"
  if [ "$STATUS" != "$expected" ]; then
    bad "$name (status $STATUS, expected $expected)"
  elif [ -n "$needle" ] && ! grep -qF -- "$needle" "$BODY"; then
    bad "$name (body should contain: $needle)"
  else
    ok "$name"
  fi
}

assert_body_lacks() {
  if grep -qiF -- "$1" "$BODY"; then bad "$2"; else ok "$2"; fi
}

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "Cannot reach the API at $BASE (status $STATUS)."
  echo "Start it first with: npm run dev"
  exit 1
fi
echo "Testing $BASE"

ONBOARD='{"capabilities":["professional"],"displayName":"Test Person","skills":[],"interests":[],"goals":["learn"]}'

section "1. Every section endpoint needs a login"
for path in /profiles/me/experiences /profiles/me/education; do
  call POST "$path" '{}'
  check "POST $path without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
  call PUT "$path/$FAKE_ID" '{}'
  check "PUT $path/:id without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
  call DELETE "$path/$FAKE_ID" ''
  check "DELETE $path/:id without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
done

section "2. Set up two users with profiles"
call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "register user A -> 201" 201
call POST /onboarding "$ONBOARD" -b "$JAR_A"
check "onboard user A -> 201" 201
call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "register user B -> 201" 201
call POST /onboarding "$ONBOARD" -b "$JAR_B"
check "onboard user B -> 201" 201

section "3. Experience: add, validate, replace"
EXP_OK='{"title":"Senior Engineer","company":"Analytical Engines Ltd","location":"Lagos","startDate":"2023-03","endDate":null,"description":"Lead a small team."}'
call POST /profiles/me/experiences "$EXP_OK" -b "$JAR_A"
check "add a job -> 201" 201 '"title":"Senior Engineer"'
check "month is stored as the first day" 201 '"startDate":"2023-03-01"'
check "no end date means current" 201 '"endDate":null'
EXP_ID="$(sed -n 's/.*"experiences":\[{"id":"\([^"]*\)".*/\1/p' "$BODY")"

call POST /profiles/me/experiences '{"title":"X","company":"Y","startDate":"2023-05","endDate":"2023-01"}' -b "$JAR_A"
check "end before start -> 400" 400 'End date cannot be before the start date.'
call POST /profiles/me/experiences '{"title":"","company":"Y","startDate":"2023-05"}' -b "$JAR_A"
check "empty title -> 400" 400 'Job title is required.'
call POST /profiles/me/experiences '{"title":"X","company":"Y","startDate":"March 2023"}' -b "$JAR_A"
check "bad month format -> 400" 400 'must be a month'
call POST /profiles/me/experiences '{"title":"X","company":"Y","startDate":"1850-01"}' -b "$JAR_A"
check "year out of range -> 400" 400 'between 1900 and 2100'
LONG="$(head -c 2100 /dev/zero | tr '\0' 'a')"
call POST /profiles/me/experiences "{\"title\":\"X\",\"company\":\"Y\",\"startDate\":\"2023-05\",\"description\":\"${LONG}\"}" -b "$JAR_A"
check "description too long -> 400" 400 'at most 2000'

call PUT "/profiles/me/experiences/${EXP_ID}" '{"title":"Staff Engineer","company":"Analytical Engines Ltd","startDate":"2023-03","endDate":"2024-06"}' -b "$JAR_A"
check "replace a job -> 200" 200 '"title":"Staff Engineer"'
check "end date saved" 200 '"endDate":"2024-06-01"'
check "fields left out are cleared" 200 '"description":null'

section "4. Experience: ownership"
call PUT "/profiles/me/experiences/${EXP_ID}" "$EXP_OK" -b "$JAR_B"
check "user B cannot replace A's job -> 404" 404 '"code":"EXPERIENCE_NOT_FOUND"'
call DELETE "/profiles/me/experiences/${EXP_ID}" '' -b "$JAR_B"
check "user B cannot delete A's job -> 404" 404 '"code":"EXPERIENCE_NOT_FOUND"'
call GET /profiles/me '' -b "$JAR_A"
check "A's job is still there" 200 '"title":"Staff Engineer"'
call PUT "/profiles/me/experiences/not-a-uuid" "$EXP_OK" -b "$JAR_A"
check "malformed id -> 404" 404 '"code":"EXPERIENCE_NOT_FOUND"'

call POST /profiles/me/experiences "{\"id\":\"${FAKE_ID}\",\"profileId\":\"${FAKE_ID}\",\"title\":\"Extra fields test\",\"company\":\"Co\",\"startDate\":\"2022-01\"}" -b "$JAR_A"
check "id and profileId in the body are ignored -> 201" 201 '"title":"Extra fields test"'

section "5. Experience: delete and limit"
call DELETE "/profiles/me/experiences/${EXP_ID}" '' -b "$JAR_A"
check "owner deletes a job -> 200" 200
assert_body_lacks "Staff Engineer" "the deleted job is gone from the profile"
call DELETE "/profiles/me/experiences/${EXP_ID}" '' -b "$JAR_A"
check "deleting it again -> 404" 404

# A now has 1 job ("Extra fields test"). Add 19 more to reach 20.
for i in $(seq 1 19); do
  call POST /profiles/me/experiences "{\"title\":\"Job ${i}\",\"company\":\"Co\",\"startDate\":\"2020-01\"}" -b "$JAR_A"
done
check "the 20th job is accepted -> 201" 201 '"title":"Job 19"'
call POST /profiles/me/experiences '{"title":"One too many","company":"Co","startDate":"2020-01"}' -b "$JAR_A"
check "the 21st job -> 409 LIMIT_REACHED" 409 '"code":"LIMIT_REACHED"'

section "6. Education: add, validate, replace"
EDU_OK='{"school":"University of Lagos","degree":"BSc","fieldOfStudy":"Computer Science","startYear":2016,"endYear":2020}'
call POST /profiles/me/education "$EDU_OK" -b "$JAR_A"
check "add a school -> 201" 201 '"school":"University of Lagos"'
check "years are numbers" 201 '"startYear":2016'
EDU_ID="$(sed -n 's/.*"education":\[{"id":"\([^"]*\)".*/\1/p' "$BODY")"

call POST /profiles/me/education '{"school":"X","startYear":2020,"endYear":2016}' -b "$JAR_A"
check "end year before start year -> 400" 400 'End year cannot be before the start year.'
call POST /profiles/me/education '{"school":"","startYear":2016}' -b "$JAR_A"
check "empty school -> 400" 400 'School is required.'
call POST /profiles/me/education '{"school":"X","startYear":"2016"}' -b "$JAR_A"
check "a year sent as text -> 400" 400 'must be a year'
call POST /profiles/me/education '{"school":"X","startYear":1800}' -b "$JAR_A"
check "year out of range -> 400" 400 'between 1900 and 2100'

call PUT "/profiles/me/education/${EDU_ID}" '{"school":"University of Ibadan","degree":"MSc","startYear":2021,"endYear":2023}' -b "$JAR_A"
check "replace a school -> 200" 200 '"school":"University of Ibadan"'

section "7. Education: ownership, delete, and limit"
call PUT "/profiles/me/education/${EDU_ID}" "$EDU_OK" -b "$JAR_B"
check "user B cannot replace A's school -> 404" 404 '"code":"EDUCATION_NOT_FOUND"'
call DELETE "/profiles/me/education/${EDU_ID}" '' -b "$JAR_B"
check "user B cannot delete A's school -> 404" 404 '"code":"EDUCATION_NOT_FOUND"'

call DELETE "/profiles/me/education/${EDU_ID}" '' -b "$JAR_A"
check "owner deletes a school -> 200" 200
assert_body_lacks "University of Ibadan" "the deleted school is gone"

for i in $(seq 1 10); do
  call POST /profiles/me/education "{\"school\":\"School ${i}\"}" -b "$JAR_A"
done
check "the 10th school is accepted -> 201" 201 '"school":"School 10"'
call POST /profiles/me/education '{"school":"One too many"}' -b "$JAR_A"
check "the 11th school -> 409 LIMIT_REACHED" 409 '"code":"LIMIT_REACHED"'

section "8. Other people can see public entries"
call PATCH /profiles/me '{"visibility":"public"}' -b "$JAR_A"
check "make A's profile public -> 200" 200
A_ID="$(sed -n 's/.*"userId":"\([^"]*\)".*/\1/p' "$BODY")"
call GET "/profiles/${A_ID}" ''
check "a logged-out visitor sees A's jobs -> 200" 200 '"title":"Job 1"'
check "and A's schools" 200 '"school":"School 1"'

echo
echo "Passed: ${PASS}    Failed: ${FAIL}"
echo
echo "Clean up the test data in SQL Shell:"
echo "  DELETE FROM users WHERE email LIKE 'sec-%@example.com';"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi