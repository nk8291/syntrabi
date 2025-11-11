#!/bin/bash

# Test script for database connectors
# Usage: ./test_connectors.sh

set -e

API_URL="http://localhost:8000"
TOKEN=""

echo "=== Testing Syntrabi Database Connectors ==="
echo ""

# Step 1: Register user
echo "1. Registering test user..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_'$(date +%s)'@example.com",
    "password": "testpass123",
    "name": "Test User"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to register user"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ User registered, token obtained"
echo ""

# Step 2: Test PostgreSQL connection
echo "2. Testing PostgreSQL connection..."
RESPONSE=$(curl -s -X POST "$API_URL/api/datasets/connectors/test?connector_type=postgresql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "host": "postgres",
    "port": 5432,
    "database": "syntra",
    "username": "syntra",
    "password": "syntra123"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ PostgreSQL connection test PASSED"
else
  echo "❌ PostgreSQL connection test FAILED"
  echo "Response: $RESPONSE"
fi
echo ""

# Step 3: Get PostgreSQL schema
echo "3. Retrieving PostgreSQL schema..."
RESPONSE=$(curl -s -X POST "$API_URL/api/datasets/connectors/schema?connector_type=postgresql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "host": "postgres",
    "port": 5432,
    "database": "syntra",
    "username": "syntra",
    "password": "syntra123"
  }')

TABLE_COUNT=$(echo "$RESPONSE" | grep -o '"name":"[^"]*' | wc -l)

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅ Schema retrieval PASSED - Found $TABLE_COUNT tables"
else
  echo "❌ Schema retrieval FAILED"
  echo "Response: $RESPONSE"
fi
echo ""

# Step 4: Create workspace
echo "4. Creating test workspace..."
RESPONSE=$(curl -s -X POST "$API_URL/api/workspaces" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Workspace",
    "description": "Automated test workspace"
  }')

WORKSPACE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -n "$WORKSPACE_ID" ]; then
  echo "✅ Workspace created: $WORKSPACE_ID"
else
  echo "❌ Failed to create workspace"
  echo "Response: $RESPONSE"
fi
echo ""

# Step 5: Test CSV upload (if file exists)
if [ -f "test_sales.csv" ]; then
  echo "5. Testing CSV upload..."
  RESPONSE=$(curl -s -X POST "$API_URL/api/datasets/workspaces/$WORKSPACE_ID/datasets" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test_sales.csv" \
    -F "name=Test Sales Data" \
    -F "connector_type=csv")

  if echo "$RESPONSE" | grep -q '"id":"'; then
    echo "✅ CSV upload PASSED"
  else
    echo "⚠️  CSV upload may have issues"
    echo "Response: $RESPONSE"
  fi
else
  echo "5. ⚠️  test_sales.csv not found, skipping CSV test"
fi
echo ""

# Step 6: Get supported connectors
echo "6. Getting list of supported connectors..."
RESPONSE=$(curl -s "$API_URL/api/datasets/connectors/types" \
  -H "Authorization: Bearer $TOKEN")

CONNECTOR_COUNT=$(echo "$RESPONSE" | grep -o '"type":"[^"]*' | wc -l)
echo "✅ Found $CONNECTOR_COUNT supported connector types"
echo ""

echo "=== Test Summary ==="
echo "All critical tests completed!"
echo ""
echo "Your auth token for manual testing:"
echo "$TOKEN"
echo ""
echo "Your workspace ID:"
echo "$WORKSPACE_ID"
