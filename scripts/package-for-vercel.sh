#!/bin/bash
# Package CryptoTrader Pro for Vercel deployment
# Output: /home/z/my-project/download/crypto-trader-pro.zip

set -e

echo "📦 Packaging CryptoTrader Pro for Vercel deployment..."

# Clean previous build
rm -rf /tmp/crypto-trader-pro
mkdir -p /tmp/crypto-trader-pro

# Copy source files (exclude heavy/generated dirs)
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.zscripts' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='*.tar' \
  --exclude='download/chart-test.png' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='prisma/*.db' \
  --exclude='prisma/*.db-journal' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  /home/z/my-project/ /tmp/crypto-trader-pro/

# Verify key files exist
echo ""
echo "📋 Verifying key files..."
for f in package.json next.config.ts tsconfig.json src/app/page.tsx src/app/layout.tsx; do
  if [ -f "/tmp/crypto-trader-pro/$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ MISSING: $f"
    exit 1
  fi
done

# Count files
FILE_COUNT=$(find /tmp/crypto-trader-pro -type f | wc -l)
SIZE=$(du -sh /tmp/crypto-trader-pro | cut -f1)

echo ""
echo "📊 Package stats:"
echo "  Files: $FILE_COUNT"
echo "  Size: $SIZE"

# Create ZIP
echo ""
echo "🗜️ Creating ZIP file..."
cd /tmp
rm -f /home/z/my-project/download/crypto-trader-pro.zip
zip -r /home/z/my-project/download/crypto-trader-pro.zip crypto-trader-pro/ \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -x "*/.zscripts/*" \
  -x "*/.git/*" \
  -q

echo ""
echo "✅ ZIP created: /home/z/my-project/download/crypto-trader-pro.zip"

# Show final size
ZIP_SIZE=$(du -sh /home/z/my-project/download/crypto-trader-pro.zip | cut -f1)
echo "📦 ZIP size: $ZIP_SIZE"

# List download dir
echo ""
echo "📁 Download directory:"
ls -lh /home/z/my-project/download/
