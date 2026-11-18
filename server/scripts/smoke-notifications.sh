
#!/usr/bin/env bash
set -u

BASE="${API_BASE:-http://localhost:4000/api/v1}"
RUN_ID="$(date +%s)"
EMAIL_A="notification-a-${RUN_ID}@example.com"
EMAIL_B="notification-b-${RUN_ID}@example.com"
EMAIL_C="notification-c-${RUN_ID}@example.com"
NAME_A="Notification Test A ${RUN_ID}"
NAME_B="Notification Test B ${RUN_ID}"
NAME_C="Notification Test C ${RUN_ID}"
PASSWORD="blue-river-lamp-seven"

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

call() {
  local method="$1" path="$2" data="$3"
  shift 3

  local args=(-s -o "$BODY" -D "$HEADERS" -w "%{http_code}" \
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

get_profile_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const profile = response.data?.profiles?.find(
      (item) => item.displayName === process.argv[2]
    );

    if (!profile) process.exit(1);
    process.stdout.write(profile.userId);
  ' "$BODY" "$1"
}

get_connection_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));

    if (!response.data?.id) process.exit(1);
    process.stdout.write(response.data.id);
  ' "$BODY"
}

get_notification_id() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const type = process.argv[2];
    const resourceId = process.argv[3];

    const notification = response.data?.find(
      (item) => item.type === type &&
        (!resourceId || item.resourceId === resourceId)
    );

    if (!notification) process.exit(1);
    process.stdout.write(notification.id);
  ' "$BODY" "$1" "$2"
}

get_unread_count() {
  node -e '
    const fs = require("fs");
    const response = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));

    if (typeof response.data?.count !== "number") process.exit(1);
    process.stdout.write(String(response.data.count));
  ' "$BODY"
}

section() { echo; echo "== $1 =="; }

call GET /health ""
if [ "$STATUS" != "200" ]; then
  echo "API unavailable. Start it with: npm run dev"
  exit 1
fi

echo "Testing notifications API: $BASE"

section "1. Authentication and cache protection"

call GET /notifications ""
check "Unauthenticated notifications -> 401" 401 '"code":"UNAUTHENTICATED"'

if grep -qiE '^cache-control: .*no-store' "$HEADERS"; then
  ok "Notifications response is not cacheable"
else
  bad "Notifications response should have no-store cache header"
fi

call GET /notifications/unread-count ""
check "Unauthenticated unread count -> 401" 401 '"code":"UNAUTHENTICATED"'

section "2. Create three test users"

call POST /auth/register "{\"email\":\"${EMAIL_A}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_A"
check "Register user A -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_A}\",\"headline\":\"Frontend Developer\",\"location\":\"Lagos\",\"skills\":[\"React\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_A"
check "Onboard user A -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_B}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_B"
check "Register user B -> 201" 201

call POST /onboarding "{\"capabilities\":[\"client\"],\"displayName\":\"${NAME_B}\",\"headline\":\"Business Owner\",\"location\":\"Abuja\",\"skills\":[\"Marketing\"],\"interests\":[\"marketing\"],\"goals\":[\"hire-talent\"]}" -b "$JAR_B"
check "Onboard user B -> 201" 201

call POST /auth/register "{\"email\":\"${EMAIL_C}\",\"password\":\"${PASSWORD}\"}" -c "$JAR_C"
check "Register user C -> 201" 201

call POST /onboarding "{\"capabilities\":[\"professional\"],\"displayName\":\"${NAME_C}\",\"headline\":\"Backend Developer\",\"location\":\"Benin City\",\"skills\":[\"Node.js\"],\"interests\":[\"software-development\"],\"goals\":[\"find-work\"]}" -b "$JAR_C"
check "Onboard user C -> 201" 201

section "3. Discover test user IDs"

call GET /discover "" -b "$JAR_A"
B_ID="$(get_profile_id "$NAME_B")" || {
  echo "Could not find user B in user A's discovery results."
  exit 1
}
C_ID="$(get_profile_id "$NAME_C")" || {
  echo "Could not find user C in user A's discovery results."
  exit 1
}

call GET /discover "" -b "$JAR_B"
A_ID="$(get_profile_id "$NAME_A")" || {
  echo "Could not find user A in user B's discovery results."
  exit 1
}

ok "Retrieved all three test user IDs"

section "4. Connection request creates notification"

call GET /notifications "" -b "$JAR_B"
check "Recipient notification list -> 200" 200

if grep -qF '"data":[]' "$BODY"; then
  ok "Recipient starts with no notifications"
else
  bad "Recipient should start with no notifications"
fi

call GET /notifications/unread-count "" -b "$JAR_B"
check "Recipient initial unread count -> 200" 200

INITIAL_COUNT="$(get_unread_count)" || INITIAL_COUNT="-1"
if [ "$INITIAL_COUNT" = "0" ]; then
  ok "Initial unread count is zero"
else
  bad "Expected initial unread count 0, got $INITIAL_COUNT"
fi

call POST "/connections/${B_ID}" "" -b "$JAR_A"
check "User A sends request to B -> 201" 201 '"status":"pending"'

CONNECTION_ID="$(get_connection_id)" || {
  echo "Could not extract connection ID."
  exit 1
}

call GET /notifications "" -b "$JAR_B"
check "Recipient receives notification -> 200" 200 '"type":"connection_request"'
check "Notification has expected message" 200 '"message":"You received a connection request."'
check "Notification identifies requester" 200 "\"displayName\":\"${NAME_A}\""

REQUEST_NOTIFICATION_ID="$(get_notification_id "connection_request" "$CONNECTION_ID")" || {
  echo "Could not extract connection request notification ID."
  exit 1
}

call GET /notifications/unread-count "" -b "$JAR_B"
check "Unread count after request -> 200" 200

UNREAD_AFTER_REQUEST="$(get_unread_count)" || UNREAD_AFTER_REQUEST="-1"
if [ "$UNREAD_AFTER_REQUEST" = "1" ]; then
  ok "Unread count increases to one"
else
  bad "Expected unread count 1, got $UNREAD_AFTER_REQUEST"
fi

section "5. Mark notification as read"

call PATCH "/notifications/${REQUEST_NOTIFICATION_ID}/read" "" -b "$JAR_B"
check "Mark notification as read -> 200" 200 '"isRead":true'

call GET /notifications/unread-count "" -b "$JAR_B"
check "Unread count after marking read -> 200" 200

UNREAD_AFTER_READ="$(get_unread_count)" || UNREAD_AFTER_READ="-1"
if [ "$UNREAD_AFTER_READ" = "0" ]; then
  ok "Unread count decreases back to zero"
else
  bad "Expected unread count 0, got $UNREAD_AFTER_READ"
fi

call PATCH "/notifications/${REQUEST_NOTIFICATION_ID}/read" "" -b "$JAR_B"
check "Marking an already-read notification is safe -> 200" 200 '"isRead":true'

section "6. Notification ownership protection"

call PATCH "/notifications/${REQUEST_NOTIFICATION_ID}/read" "" -b "$JAR_C"
check "User C cannot mark B's notification as read -> 404" 404 '"code":"NOTIFICATION_NOT_FOUND"'

call GET /notifications "" -b "$JAR_C"
check "User C notification list -> 200" 200

if grep -qF "$CONNECTION_ID" "$BODY"; then
  bad "User C must not see B's notification"
else
  ok "User C cannot see B's notification"
fi

section "7. Accept request sends notification to original requester"

call PATCH "/connections/${CONNECTION_ID}/accept" "" -b "$JAR_B"
check "User B accepts request -> 200" 200 '"status":"accepted"'

call GET /notifications "" -b "$JAR_A"
check "Original requester receives acceptance notification -> 200" 200 '"type":"connection_accepted"'
check "Acceptance notification has expected message" 200 '"message":"Your connection request was accepted."'
check "Acceptance notification identifies accepter" 200 "\"displayName\":\"${NAME_B}\""

call GET /notifications/unread-count "" -b "$JAR_A"
check "Requester unread count -> 200" 200

A_UNREAD="$(get_unread_count)" || A_UNREAD="-1"
if [ "$A_UNREAD" = "1" ]; then
  ok "Acceptance notification increments requester's unread count"
else
  bad "Expected requester unread count 1, got $A_UNREAD"
fi

section "8. Rejection does not send acceptance notification"

call POST "/connections/${A_ID}" "" -b "$JAR_C"
check "User C sends request to A -> 201" 201 '"status":"pending"'

REJECT_CONNECTION_ID="$(get_connection_id)" || {
  echo "Could not extract rejection connection ID."
  exit 1
}

# Retrieve C's request notification from A and mark it read
# so it does not affect A's unread-count checks.
call GET /notifications "" -b "$JAR_A"
check "A receives C's connection request notification -> 200" 200 '"type":"connection_request"'

REJECT_NOTIFICATION_ID="$(get_notification_id "connection_request" "$REJECT_CONNECTION_ID")" || {
  echo "Could not extract C's request notification ID."
  exit 1
}

call PATCH "/notifications/${REJECT_NOTIFICATION_ID}/read" "" -b "$JAR_A"
check "A marks C's request notification as read -> 200" 200 '"isRead":true'

call PATCH "/connections/${REJECT_CONNECTION_ID}/reject" "" -b "$JAR_A"
check "User A rejects C's request -> 200" 200 '"status":"rejected"'

call GET /notifications "" -b "$JAR_C"
check "Rejected requester notification list -> 200" 200

if grep -qF '"type":"connection_accepted"' "$BODY"; then
  bad "Rejected request must not generate an acceptance notification"
else
  ok "Rejected request does not generate an acceptance notification"
fi

call GET /notifications/unread-count "" -b "$JAR_C"
check "Rejected requester unread count -> 200" 200

C_UNREAD="$(get_unread_count)" || C_UNREAD="-1"
if [ "$C_UNREAD" = "0" ]; then
  ok "Rejected requester has zero unread notifications"
else
  bad "Expected C unread count 0, got $C_UNREAD"
fi

echo
echo "Passed: $PASS    Failed: $FAIL"
echo
echo "Test accounts created:"
echo "  $EMAIL_A"
echo "  $EMAIL_B"
echo "  $EMAIL_C"
echo "Clean them up after testing if desired."

[ "$FAIL" -eq 0 ]
