#!/bin/bash
set -e

# Change directory to the project root
cd "$(dirname "$0")/.."

echo "🚀 Starting local QA pipeline..."

echo "📦 Installing/verifying dependencies..."
npm install

echo "🧹 Running linter..."
npm run lint

echo "🧪 Running unit tests..."
npx vitest run

echo "✅ Local QA checks passed successfully!"
exit 0
