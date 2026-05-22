#!/bin/bash
# VeriBounty Devnet Deployment Script
# Run: bash deploy.sh

set -e

PROGRAM_ID="8xmwE6esqnwxKMGrdszEiBEKnA6PjZNSsh6ByKZxC8Za"
KEYPAIR="$HOME/.config/solana/id.json"

echo "═══════════════════════════════════════════"
echo "  VeriBounty – Solana Devnet Deployment"
echo "═══════════════════════════════════════════"
echo ""

# 1. Check keypair
if [ ! -f "$KEYPAIR" ]; then
  echo "❌ No keypair found. Creating one..."
  solana-keygen new -o "$KEYPAIR" --no-bip39-passphrase
fi

PUBKEY=$(solana-keygen pubkey "$KEYPAIR")
echo "📍 Wallet: $PUBKEY"

# 2. Set devnet
solana config set --url devnet > /dev/null
echo "🌐 Network: Solana Devnet"

# 3. Check balance
BALANCE=$(solana balance --lamports 2>/dev/null | awk '{print $1}')
echo "💰 Balance: $(solana balance 2>/dev/null)"

# Deploying the program requires ~3 SOL (for the program binary upload)
REQUIRED_LAMPORTS=3000000000
if [ "$BALANCE" -lt "$REQUIRED_LAMPORTS" ] 2>/dev/null; then
  echo ""
  echo "⚠️  You need at least 3 SOL to deploy."
  echo "   Attempting airdrop..."
  
  for i in 1 2 3 4 5; do
    solana airdrop 2 --url devnet 2>/dev/null && break
    echo "   Retrying in 15s (attempt $i/5)..."
    sleep 15
  done
  
  BALANCE=$(solana balance --lamports 2>/dev/null | awk '{print $1}')
  if [ "$BALANCE" -lt "$REQUIRED_LAMPORTS" ] 2>/dev/null; then
    echo ""
    echo "❌ Could not get enough SOL via airdrop (rate limited)."
    echo "   Please use the web faucet instead:"
    echo "   👉 https://faucet.solana.com"
    echo "   Paste your wallet: $PUBKEY"
    echo "   Request at least 5 SOL, then re-run this script."
    exit 1
  fi
fi

echo "💰 Current balance: $(solana balance)"

# 4. Build if needed
if [ ! -f "target/deploy/veri_bounty.so" ]; then
  echo ""
  echo "🔨 Building program..."
  anchor build
fi

echo ""
echo "🚀 Deploying to Devnet..."

# 5. Deploy
solana program deploy \
  --program-id "$PROGRAM_ID" \
  target/deploy/veri_bounty.so \
  --url devnet \
  2>&1

echo ""
echo "✅ Program deployed successfully!"
echo "   Program ID: $PROGRAM_ID"
echo "   Explorer:   https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "  1. Start backend:  cd backend && npm run dev"
echo "  2. Start frontend: cd app && npm run dev"
echo "  3. Connect Phantom wallet (set to Devnet)"
echo "  4. Get devnet SOL: https://faucet.solana.com"
