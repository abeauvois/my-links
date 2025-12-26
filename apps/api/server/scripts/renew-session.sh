#!/bin/bash
# renew-session.sh - Renew platform API session
# Usage: ./renew-session.sh [email] [password]
# Or: bun run api:renew-session

API_URL="${PLATFORM_API_URL:-http://localhost:3000}"
SESSION_FILE="$HOME/.platform-cli/session.json"
COOKIES_FILE="$HOME/.platform-cli/cookies.txt"

# Default credentials (override with arguments or env vars)
EMAIL="${1:-${PLATFORM_EMAIL:-test@example.com}}"
PASSWORD="${2:-${PLATFORM_EMAIL_PASSWORD:-password123}}"

# Create config directory if needed
mkdir -p "$(dirname "$SESSION_FILE")"

# Sign in and capture both cookies and response
echo "Signing in as $EMAIL..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIES_FILE" \
  -D -)

# Extract session token from Set-Cookie header
SESSION_TOKEN=$(echo "$RESPONSE" | grep -i 'set-cookie.*better-auth.session_token' | \
  sed 's/.*better-auth.session_token=\([^;]*\).*/\1/')

if [ -z "$SESSION_TOKEN" ]; then
  echo "Failed to get session token. Check credentials."
  exit 1
fi

# Extract user info from response body
USER_ID=$(echo "$RESPONSE" | tail -1 | jq -r '.user.id // empty')
USER_EMAIL=$(echo "$RESPONSE" | tail -1 | jq -r '.user.email // empty')

# Save session to JSON file (CLI format)
cat > "$SESSION_FILE" << EOF
{
  "sessionToken": "$SESSION_TOKEN",
  "userId": "$USER_ID",
  "email": "$USER_EMAIL"
}
EOF

echo "Session renewed successfully!"
echo "  Session file: $SESSION_FILE"
echo "  Cookies file: $COOKIES_FILE"

# Test the session
echo ""
echo "Testing session..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/bookmarks" -b "$COOKIES_FILE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Session is valid!"
else
  echo "Warning: Session test returned HTTP $HTTP_CODE"
fi
