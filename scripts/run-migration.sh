#!/bin/bash

# Safe migration script for sort_order column
# This script runs the migration endpoint safely

set -e  # Exit on any error

echo "🚀 Starting sort_order migration..."

# Check if we're in production or development
if [ "$NODE_ENV" = "production" ]; then
    echo "📦 Production environment detected"
    URL="https://better-do-it.vercel.app/api/migrate-sort-order"
else
    echo "🔧 Development environment detected"
    URL="http://localhost:3000/api/migrate-sort-order"
fi

echo "🌐 Running migration at: $URL"

# Run the migration
RESPONSE=$(curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")

# Extract status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 Response (HTTP $HTTP_CODE):"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed with HTTP $HTTP_CODE"
    exit 1
fi
