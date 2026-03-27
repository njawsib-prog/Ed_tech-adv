#!/bin/bash

# API Connectivity Test Script
# This script checks if the backend API is accessible

echo "🔍 Checking API connectivity..."
echo ""

# Get API URL from .env.local or use default
if [ -f .env.local ]; then
  API_URL=$(grep NEXT_PUBLIC_API_URL .env.local | cut -d '=' -f2)
else
  API_URL="http://localhost:4000/api"
fi

echo "📍 API URL: $API_URL"
echo ""

# Test health endpoint
echo "🏥 Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/../health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend is running!"
  echo "Response: $BODY"
else
  echo "❌ Backend is not responding (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
  echo ""
  echo "💡 Make sure the backend server is running:"
  echo "   cd backend && npm run dev"
  exit 1
fi

echo ""
echo "🔐 Testing auth endpoints availability..."

# Check if auth endpoints are accessible (should get 404 or 405 for non-POST)
LOGIN_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/admin/login" 2>/dev/null)

if [ "$LOGIN_CHECK" != "000" ]; then
  echo "✅ Auth endpoints are accessible (HTTP $LOGIN_CHECK)"
else
  echo "❌ Cannot reach auth endpoints"
  echo "   This might indicate a network issue or incorrect API URL"
fi

echo ""
echo "📋 Summary:"
echo "   Frontend URL: http://localhost:3000"
echo "   API URL: $API_URL"
echo "   Backend Health: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "🎉 API is ready! You can now try logging in."
else
  echo "⚠️  Backend is not accessible. Please start the backend server."
fi
