#!/usr/bin/env bash
# Smoke test for the portfolio project and company details API.
#
# 1. Start the API:           npm run dev                           (in server/)
# 2. In another terminal:     npm run test:smoke:profile-portfolio  (in server/)
#
# It talks to the API directly with curl. It never uses the React app.

set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="pf-a-${RUN_ID}@example.com"
EMAIL_B="pf-b-${RUN_ID}@example.com"
EMAIL_C="pf-c-${RUN_ID}@example.com"
PASSWORD="blue-river-lamp-seven"
FAKE_ID="00000000-0000-4000-8000-000000000000"

TMP_DIR="$(mktemp -d)"
JAR_A="$TMP_DIR/a.txt"
JAR_B="$TMP_DIR/b.txt"
JAR_C="$TMP_DIR/c.txt"
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

section "1. Every endpoint needs a login"
call POST /profiles/me/projects '{}'
check "POST /projects without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
call PUT "/profiles/me/projects/${FAKE_ID}" '{}'
check "PUT /projects/:id without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
call DELETE "/profiles/me/projects/${FAKE_ID}" ''
check "DELETE /projects/:id without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
call PUT /profiles/me/business '{}'
check "PUT /business without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'
call DELETE /profiles/me/business ''
check "DELETE /business without a cookie -> 401" 401 '"code":"UNAUTHENTICATED"'

section "2. Set up three users"
# A: professional with skills React and TypeScript.
call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "register user A -> 201" 201
call POST /onboarding '{"capabilities":["professional"],"displayName":"Ada Lovelace","skills":["React","TypeScript"],"interests":[],"goals":["find-work"]}' -b "$JAR_A"
check "onboard user A -> 201" 201

# B: professional with the skill Python (used to test "not your skill").
call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "register user B -> 201" 201
call POST /onboarding '{"capabilities":["professional"],"displayName":"Bea Builder","skills":["Python"],"interests":[],"goals":["learn"]}' -b "$JAR_B"
check "onboard user B -> 201" 201

# C: a client (business) account.
call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_C"
check "register user C -> 201" 201
call POST /onboarding '{"capabilities":["client"],"displayName":"Acme","skills":[],"interests":[],"goals":["hire-talent"]}' -b "$JAR_C"
check "onboard user C (client) -> 201" 201
C_ID="$(sed -n 's/.*"userId":"\([^"]*\)".*/\1/p' "$BODY")"
call GET /profiles/me "" -b "$JAR_C"
C_ID="$(sed -n 's/.*"userId":"\([^"]*\)".*/\1/p' "$BODY")"

# Find the skill ids on each profile.
call GET /profiles/me "" -b "$JAR_A"
REACT_ID="$(sed -n 's/.*"skills":\[{"id":"\([^"]*\)","name":"React".*/\1/p' "$BODY")"
TS_ID="$(sed -n 's/.*"name":"React","projectCount":[0-9]*},{"id":"\([^"]*\)","name":"TypeScript".*/\1/p' "$BODY")"
A_ID="$(sed -n 's/.*"userId":"\([^"]*\)".*/\1/p' "$BODY")"
call GET /profiles/me "" -b "$JAR_B"
PYTHON_ID="$(sed -n 's/.*"skills":\[{"id":"\([^"]*\)","name":"Python".*/\1/p' "$BODY")"
if [ -n "$REACT_ID" ] && [ -n "$TS_ID" ] && [ -n "$PYTHON_ID" ]; then
  ok "found the skill ids"
else
  bad "could not find the skill ids (React '${REACT_ID}', TypeScript '${TS_ID}', Python '${PYTHON_ID}')"
fi

section "3. Projects: add and validate"
PROJECT_OK="{\"title\":\"Savings tracker\",\"description\":\"A mobile-friendly savings app.\",\"projectUrl\":\"https://example.com/savings\",\"imageUrl\":null,\"skillIds\":[\"${REACT_ID}\",\"${TS_ID}\"]}"
call POST /profiles/me/projects "$PROJECT_OK" -b "$JAR_A"
check "add a project -> 201" 201 '"title":"Savings tracker"'
check "React now shows 1 project" 201 '"name":"React","projectCount":1'
check "TypeScript now shows 1 project" 201 '"name":"TypeScript","projectCount":1'
PROJECT_ID="$(sed -n 's/.*"projects":\[{"id":"\([^"]*\)".*/\1/p' "$BODY")"

call POST /profiles/me/projects '{"title":"","description":"x"}' -b "$JAR_A"
check "empty title -> 400" 400 'Project title is required.'
call POST /profiles/me/projects '{"title":"X"}' -b "$JAR_A"
check "missing description -> 400" 400 'Description is required.'
call POST /profiles/me/projects '{"title":"X","description":"y","projectUrl":"http://example.com"}' -b "$JAR_A"
check "http link -> 400" 400 'must be a full link starting with https://'
call POST /profiles/me/projects '{"title":"X","description":"y","imageUrl":"javascript:alert(1)"}' -b "$JAR_A"
check "javascript: link -> 400" 400 'must be a full link starting with https://'
call POST /profiles/me/projects '{"title":"X","description":"y","projectUrl":"https://user:secret@example.com"}' -b "$JAR_A"
check "link with a password inside -> 400" 400 'must be a full link starting with https://'

FAKE_SKILLS=""
for n in $(seq 10 20); do
  FAKE_SKILLS="${FAKE_SKILLS}\"00000000-0000-4000-8000-0000000000${n}\","
done
FAKE_SKILLS="${FAKE_SKILLS%,}"
call POST /profiles/me/projects "{\"title\":\"X\",\"description\":\"y\",\"skillIds\":[${FAKE_SKILLS}]}" -b "$JAR_A"
check "11 skills -> 400" 400 'at most 10'

call POST /profiles/me/projects '{"title":"X","description":"y","skillIds":["not-a-uuid"]}' -b "$JAR_A"
check "a skill id that is not an id -> 400" 400 'Choose skills from your own skills list.'
call POST /profiles/me/projects "{\"title\":\"X\",\"description\":\"y\",\"skillIds\":[\"${PYTHON_ID}\"]}" -b "$JAR_A"
check "a skill that is on someone else's list -> 400 (skillIds)" 400 '"field":"skillIds"'

section "4. Projects: replace, ownership, extra fields"
call PUT "/profiles/me/projects/${PROJECT_ID}" "{\"title\":\"Savings tracker v2\",\"description\":\"Now with budgets.\",\"skillIds\":[\"${REACT_ID}\"]}" -b "$JAR_A"
check "replace a project -> 200" 200 '"title":"Savings tracker v2"'
check "React still has 1 project" 200 '"name":"React","projectCount":1'
check "TypeScript lost its proof (0 projects)" 200 '"name":"TypeScript","projectCount":0'
check "omitted links are cleared" 200 '"projectUrl":null'

call PUT "/profiles/me/projects/${PROJECT_ID}" "$PROJECT_OK" -b "$JAR_B"
check "user B cannot replace A's project -> 404" 404 '"code":"PROJECT_NOT_FOUND"'
call DELETE "/profiles/me/projects/${PROJECT_ID}" '' -b "$JAR_B"
check "user B cannot delete A's project -> 404" 404 '"code":"PROJECT_NOT_FOUND"'
call PUT "/profiles/me/projects/not-a-uuid" "$PROJECT_OK" -b "$JAR_A"
check "malformed id -> 404" 404 '"code":"PROJECT_NOT_FOUND"'

call POST /profiles/me/projects "{\"id\":\"${FAKE_ID}\",\"profileId\":\"${FAKE_ID}\",\"title\":\"Extra fields test\",\"description\":\"ok\"}" -b "$JAR_A"
check "id and profileId in the body are ignored -> 201" 201 '"title":"Extra fields test"'

section "5. Removing a skill also removes it from projects"
call PUT /profiles/me/skills '{"skills":["TypeScript"]}' -b "$JAR_A"
check "remove React from the profile -> 200" 200
assert_body_lacks '"name":"React"' "React is gone from the profile and from the project"

section "6. Projects: delete and limit"
call DELETE "/profiles/me/projects/${PROJECT_ID}" '' -b "$JAR_A"
check "owner deletes a project -> 200" 200
assert_body_lacks "Savings tracker v2" "the deleted project is gone"
call DELETE "/profiles/me/projects/${PROJECT_ID}" '' -b "$JAR_A"
check "deleting it again -> 404" 404

# A has 1 project ("Extra fields test"). Add 19 more to reach 20.
for i in $(seq 1 19); do
  call POST /profiles/me/projects "{\"title\":\"Project ${i}\",\"description\":\"Test project ${i}.\"}" -b "$JAR_A"
done
check "the 20th project is accepted -> 201" 201 '"title":"Project 19"'
call POST /profiles/me/projects '{"title":"One too many","description":"no"}' -b "$JAR_A"
check "the 21st project -> 409 LIMIT_REACHED" 409 '"code":"LIMIT_REACHED"'

section "7. Other people can see public projects"
call PATCH /profiles/me '{"visibility":"public"}' -b "$JAR_A"
check "make A's profile public -> 200" 200
call GET "/profiles/${A_ID}" ''
check "a logged-out visitor sees A's projects -> 200" 200 '"title":"Project 1"'

section "8. Company details: who may save them"
COMPANY_OK='{"companyName":"Acme Ltd","websiteUrl":"https://example.com","industry":"Software","sizeRange":"11-50","about":"We build tools."}'
call PUT /profiles/me/business "$COMPANY_OK" -b "$JAR_A"
check "a professional account cannot add company details -> 403" 403 '"code":"NOT_A_BUSINESS_ACCOUNT"'

call PUT /profiles/me/business "$COMPANY_OK" -b "$JAR_C"
check "a client account can -> 200" 200 '"companyName":"Acme Ltd"'
check "size is shown as 11-50" 200 '"sizeRange":"11-50"'

call PUT /profiles/me/business '{"companyName":"Acme Group","sizeRange":"501+"}' -b "$JAR_C"
check "PUT again updates it (upsert) -> 200" 200 '"companyName":"Acme Group"'
check "size 501+ is accepted" 200 '"sizeRange":"501+"'
check "fields left out are cleared" 200 '"industry":null'

call PUT /profiles/me/business '{"companyName":""}' -b "$JAR_C"
check "empty company name -> 400" 400 'Company name is required.'
call PUT /profiles/me/business '{"companyName":"X","websiteUrl":"http://example.com"}' -b "$JAR_C"
check "http website -> 400" 400 'must be a full link starting with https://'
call PUT /profiles/me/business '{"companyName":"X","sizeRange":"huge"}' -b "$JAR_C"
check "invalid size -> 400" 400 'Choose a valid company size.'

section "9. Company details: visitors and delete"
call PATCH /profiles/me '{"visibility":"public"}' -b "$JAR_C"
check "make C's profile public -> 200" 200
call GET "/profiles/${C_ID}" ''
check "a visitor sees the company details -> 200" 200 '"companyName":"Acme Group"'

call DELETE /profiles/me/business '' -b "$JAR_C"
check "client deletes the company details -> 200" 200 '"business":null'
call DELETE /profiles/me/business '' -b "$JAR_A"
check "a professional may delete their own (empty) data -> 200" 200

echo
echo "Passed: ${PASS}    Failed: ${FAIL}"
echo
echo "Clean up the test data in SQL Shell:"
echo "  DELETE FROM users WHERE email LIKE 'pf-%@example.com';"
echo "  DELETE FROM skills WHERE id NOT IN (SELECT skill_id FROM user_skills)"
echo "    AND id NOT IN (SELECT skill_id FROM portfolio_project_skills);"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi