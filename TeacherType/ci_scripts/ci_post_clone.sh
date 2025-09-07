#!/bin/sh
set -euxo pipefail

# Confirm Node (usually preinstalled on Xcode Cloud images)
node -v || true
npm -v  || true

# Build the web app and copy into ios/
# (Assumes package.json has "build" and Capacitor is installed)
npm ci
npm run build

# Copy the fresh dist/ into ios project
npx cap copy ios