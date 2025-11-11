#!/bin/bash

# Load credentials from .env
export $(cat .env | grep -E '^TWITTER_' | xargs)

echo "🔐 Testing Twitter API Credentials..."
echo ""
echo "Using credentials:"
echo "  API Key: ${TWITTER_API_KEY:0:10}..."
echo "  Access Token: ${TWITTER_ACCESS_TOKEN:0:15}..."
echo ""

# Test tweet ID from the sample
TWEET_ID="1985284315282907143"
API_URL="https://api.twitter.com/2/tweets/${TWEET_ID}?tweet.fields=text"

echo "📡 Testing API call to: $API_URL"
echo ""

# Generate OAuth signature components
OAUTH_CONSUMER_KEY="$TWITTER_API_KEY"
OAUTH_TOKEN="$TWITTER_ACCESS_TOKEN"
OAUTH_SIGNATURE_METHOD="HMAC-SHA1"
OAUTH_TIMESTAMP=$(date +%s)
OAUTH_NONCE=$(openssl rand -base64 32 | tr -d '\n' | tr -d '=' | tr '+/' '-_')
OAUTH_VERSION="1.0"

# Create signature base string
PARAM_STRING="oauth_consumer_key=${OAUTH_CONSUMER_KEY}&oauth_nonce=${OAUTH_NONCE}&oauth_signature_method=${OAUTH_SIGNATURE_METHOD}&oauth_timestamp=${OAUTH_TIMESTAMP}&oauth_token=${OAUTH_TOKEN}&oauth_version=${OAUTH_VERSION}"

# Percent encode
ENCODED_URL=$(echo -n "$API_URL" | jq -sRr @uri)
ENCODED_PARAMS=$(echo -n "$PARAM_STRING" | jq -sRr @uri)

SIGNATURE_BASE="GET&${ENCODED_URL}&${ENCODED_PARAMS}"

# Create signing key
SIGNING_KEY="${TWITTER_API_SECRET_KEY}&${TWITTER_ACCESS_TOKEN_SECRET}"

# Generate signature
OAUTH_SIGNATURE=$(echo -n "$SIGNATURE_BASE" | openssl dgst -sha1 -hmac "$SIGNING_KEY" -binary | base64)

# Build auth header
AUTH_HEADER="OAuth oauth_consumer_key=\"${OAUTH_CONSUMER_KEY}\", oauth_nonce=\"${OAUTH_NONCE}\", oauth_signature=\"${OAUTH_SIGNATURE}\", oauth_signature_method=\"${OAUTH_SIGNATURE_METHOD}\", oauth_timestamp=\"${OAUTH_TIMESTAMP}\", oauth_token=\"${OAUTH_TOKEN}\", oauth_version=\"${OAUTH_VERSION}\""

echo "Making request..."
echo ""

# Make the request
curl -v \
  -H "Authorization: ${AUTH_HEADER}" \
  "$API_URL" 2>&1

echo ""
echo ""
echo "✅ Test complete!"
