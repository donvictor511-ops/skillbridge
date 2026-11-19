#!/usr/bin/env bash
set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
PASSWORD="blue-river-lamp-seven"

EMAIL_A="posts-a-${RUN_ID}@example.com"
EMAIL_B="posts-b-${RUN_ID}@example.com"
EMAIL_C="posts-c-${RUN_ID}@example.com"

NAME_A="Posts Test A ${RUN_ID}"
NAME_B="Posts Test B ${RUN_ID}"
NAME_C="Posts Test C ${RUN_ID}"

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

ok() {
  PASS=$((PASS + 1))
  echo "  PASS  $1"
}

bad() {
  FAIL=$((FAIL + 1))
  echo "  FAIL  $1"
}

section() {
  echo
  echo "== $1 =="
}

call() {
  local method="$1" path="$2" data="$3"
  shift 3

  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}"
    -X "$method" "$BASE$path")

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

extract_data_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const id = response.data?.id;
    if (typeof id !== "string") process.exit(1);
    process.stdout.write(id);
  ' "$BODY"
}

contains_text() {
  local needle="$1"
  grep -qF -- "$needle" "$BODY"
}

# ------------------------------------------------------- API availability

call GET /health ""

if [ "$STATUS" != "200" ]; then
  echo "API unavailable. Start it with: npm run dev"
  exit 1
fi

echo "Testing Posts API: $BASE"

# ------------------------------------------------------- authentication

section "1. Authentication and cache protection"

call GET /posts ""
check "Anonymous visitor can read the feed -> 200" 200

if grep -qiE '^cache-control: .*no-store' "$HEADERS"; then
  ok "Feed response has no-store cache protection"
else
  bad "Feed response should have no-store cache protection"
fi

call POST /posts '{"content":"Unauthenticated post"}'
check "Unauthenticated user cannot create a post -> 401" 401

# ------------------------------------------------------- create test users

section "2. Create three test users"

call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "Register user A -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_A}\",\"headline\":\"Frontend Developer\",\"location\":\"Lagos\",\"skills\":[\"React\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_A"
check "Onboard user A -> 201" 201
call PATCH /profiles/me '{"visibility":"public"}' -b "$JAR_A"
check "Set user A profile to public for feed test -> 200" 200 '"visibility":"public"'

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "Register user B -> 201" 201

call POST /onboarding "{\"capabilities\":[\"client\"],\"displayName\":\"${NAME_B}\",\"headline\":\"Business Owner\",\"location\":\"Abuja\",\"skills\":[\"Marketing\"],\"interests\":[\"marketing\"],\"goals\":[\"hire-talent\"]}" -b "$JAR_B"
check "Onboard client user B -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_C"
check "Register user C -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_C}\",\"headline\":\"Backend Developer\",\"location\":\"Benin City\",\"skills\":[\"Node.js\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_C"
check "Onboard user C -> 201" 201

# ------------------------------------------------------- create posts

section "3. Create posts and validate the feed"

call POST /posts '{"content":"Posts test: original message from user A"}' -b "$JAR_A"
check "User A creates a post -> 201" 201 "original message from user A"

POST_A_ID="$(extract_data_id 2>/dev/null || true)"

if [ -z "$POST_A_ID" ]; then
  bad "Could not extract user A's post ID"
else
  ok "User A's post ID is available"
fi

call GET /posts ""
check "Anonymous visitor can see A's public post -> 200" 200 "original message from user A"

call GET /posts "" -b "$JAR_B"
check "User B can see A's public post -> 200" 200 "original message from user A"

call POST /posts '{"content":"Posts test: message from user B"}' -b "$JAR_B"
check "Client user B can create a post -> 201" 201 "message from user B"

POST_B_ID="$(extract_data_id 2>/dev/null || true)"

if [ -z "$POST_B_ID" ]; then
  bad "Could not extract user B's post ID"
else
  ok "User B's post ID is available"
fi

call POST /posts '{"content":"   "}' -b "$JAR_A"
check "Empty post content is rejected -> 400" 400

# ------------------------------------------------------- post ownership

section "4. Post ownership"

if [ -n "$POST_A_ID" ]; then
  call PATCH "/posts/${POST_A_ID}" '{"content":"Changed by user B"}' -b "$JAR_B"
  check "B cannot edit A's post -> 404" 404 '"code":"POST_NOT_FOUND"'

  call DELETE "/posts/${POST_A_ID}" "" -b "$JAR_B"
  check "B cannot delete A's post -> 404" 404 '"code":"POST_NOT_FOUND"'

  call PATCH "/posts/${POST_A_ID}" '{"content":"Updated successfully by A"}' -b "$JAR_A"
  check "A can edit A's post -> 200" 200 '"Updated successfully by A"'

  call GET /posts "" -b "$JAR_C"
  check "A's updated post appears in the feed" 200 "Updated successfully by A"
fi

# ------------------------------------------------------- likes


# ------------------------------------------------------- likes

section "5. Like and unlike posts"

if [ -n "$POST_A_ID" ]; then
  call POST "/posts/${POST_A_ID}/likes" "" -b "$JAR_B"
  check "B can like A's post -> 204" 204

  call POST "/posts/${POST_A_ID}/likes" "" -b "$JAR_B"
  check "Liking twice does not create a duplicate -> 204" 204

  call GET /posts "" -b "$JAR_B"
  check "B sees isLikedByViewer true after liking" 200 '"isLikedByViewer":true'

  call GET /posts ""
  check "Anonymous visitor sees isLikedByViewer false" 200 '"isLikedByViewer":false'

  call DELETE "/posts/${POST_A_ID}/likes" "" -b "$JAR_B"
  check "B can unlike A's post -> 204" 204

  call GET /posts "" -b "$JAR_B"
  check "B sees isLikedByViewer false after unliking" 200 '"isLikedByViewer":false'

  call DELETE "/posts/${POST_A_ID}/likes" "" -b "$JAR_B"
  check "Unliking twice is safe -> 204" 204
fi

# ------------------------------------------------------- comments

section "6. Comments and comment ownership"

COMMENT_B_ID=""

if [ -n "$POST_A_ID" ]; then
  call POST "/posts/${POST_A_ID}/comments" '{"content":"Comment written by B"}' -b "$JAR_B"
  check "B can comment on A's post -> 201" 201 '"Comment written by B"'

  COMMENT_B_ID="$(extract_data_id 2>/dev/null || true)"

  if [ -z "$COMMENT_B_ID" ]; then
    bad "Could not extract B's comment ID"
  else
    ok "B's comment ID is available"
  fi

  call GET "/posts/${POST_A_ID}/comments" "" -b "$JAR_B"
  check "Authenticated user can read comments -> 200" 200 "Comment written by B"

  call GET "/posts/${POST_A_ID}/comments" ""
  check "Anonymous visitor cannot read comments -> 401" 401

  if [ -n "$COMMENT_B_ID" ]; then
    call PATCH "/posts/${POST_A_ID}/comments/${COMMENT_B_ID}" '{"content":"Edited by A"}' -b "$JAR_A"
    check "Post owner A cannot edit B's comment -> 404" 404 '"code":"COMMENT_NOT_FOUND"'

    call DELETE "/posts/${POST_A_ID}/comments/${COMMENT_B_ID}" "" -b "$JAR_A"
    check "Post owner A cannot delete B's comment -> 404" 404 '"code":"COMMENT_NOT_FOUND"'

    call PATCH "/posts/${POST_A_ID}/comments/${COMMENT_B_ID}" '{"content":"B edited their own comment"}' -b "$JAR_B"
    check "B can edit B's own comment -> 200" 200 '"B edited their own comment"'

    call DELETE "/posts/${POST_A_ID}/comments/${COMMENT_B_ID}" "" -b "$JAR_B"
    check "B can delete B's own comment -> 204" 204
  fi

  call POST "/posts/${POST_A_ID}/comments" '{"content":"   "}' -b "$JAR_C"
  check "Empty comment content is rejected -> 400" 400
fi

# ------------------------------------------------------- profile visibility

section "7. Profile visibility controls post visibility"

if [ -n "$POST_A_ID" ]; then
  call PATCH /profiles/me '{"visibility":"members"}' -b "$JAR_A"
  check "A changes profile visibility to members -> 200" 200

  call GET /posts ""
  if contains_text "Updated successfully by A"; then
    bad "Anonymous visitor must not see A's members-only post"
  else
    ok "Anonymous visitor cannot see A's members-only post"
  fi

  call GET /posts "" -b "$JAR_B"
  check "Logged-in member can see A's members-only post" 200 "Updated successfully by A"

  call PATCH /profiles/me '{"visibility":"private"}' -b "$JAR_A"
  check "A changes profile visibility to private -> 200" 200

  call GET /posts "" -b "$JAR_B"
  if contains_text "Updated successfully by A"; then
    bad "Another member must not see A's private post"
  else
    ok "Another member cannot see A's private post"
  fi

  call GET /posts ""
  if contains_text "Updated successfully by A"; then
    bad "Anonymous visitor must not see A's private post"
  else
    ok "Anonymous visitor cannot see A's private post"
  fi

  call GET /posts "" -b "$JAR_A"
  check "A can still see A's own private post" 200 "Updated successfully by A"

  check "A restores public visibility -> 200" 200
fi

# ------------------------------------------------------- deletion

section "8. Post deletion"

if [ -n "$POST_A_ID" ]; then
  call DELETE "/posts/${POST_A_ID}" "" -b "$JAR_A"
  check "A can delete A's own post -> 204" 204

  call GET /posts "" -b "$JAR_A"
  if contains_text "Updated successfully by A"; then
    bad "Deleted post should no longer appear in the feed"
  else
    ok "Deleted post no longer appears in the feed"
  fi
fi

if [ -n "$POST_B_ID" ]; then
  call DELETE "/posts/${POST_B_ID}" "" -b "$JAR_B"
  check "B can delete B's own post -> 204" 204
fi

# ------------------------------------------------------- summary

section "9. Results"

echo "Passed: $PASS    Failed: $FAIL"

echo
echo "Test data cleanup SQL (run manually in SQL Shell after reviewing):"
echo "DELETE FROM users WHERE email LIKE 'posts-%@example.com';"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
