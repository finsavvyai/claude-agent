#!/bin/bash

# 🚀 LUNA AGENTS - ONE-CLICK DEPLOY SCRIPT
# Run this to deploy Luna Agents in 60 seconds!

set -e

echo "🚀 LUNA AGENTS DEPLOYMENT"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "landing-page.html" ]; then
    echo "❌ Error: landing-page.html not found!"
    echo "Please run this script from the luna-agents/frontend directory"
    exit 1
fi

echo "✅ Landing page found!"
echo ""

# Try Surge first (fastest if logged in)
echo "Attempting Surge deployment..."
echo ""

if command -v surge &> /dev/null; then
    echo "Surge CLI found. Checking authentication..."

    if surge whoami &> /dev/null; then
        echo "✅ Already logged in to Surge!"
        echo "Deploying to luna-agents.surge.sh..."
        surge . luna-agents.surge.sh

        echo ""
        echo "🎉 SUCCESS! Luna Agents is LIVE!"
        echo "🌐 URL: https://luna-agents.surge.sh"
        echo ""
        echo "Next steps:"
        echo "1. Open https://luna-agents.surge.sh in browser"
        echo "2. Share on Twitter (template in COPY_PASTE_LAUNCH.md)"
        echo "3. DM 10 friends"
        echo "4. Track signups!"
        echo ""
        exit 0
    else
        echo "⚠️  Not logged in to Surge."
        echo "Please login first:"
        echo "  surge login"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
else
    echo "⚠️  Surge CLI not found."
    echo "Installing Surge..."
    npm install -g surge

    echo ""
    echo "✅ Surge installed!"
    echo "Please login:"
    echo "  surge login"
    echo ""
    echo "Then run this script again."
    exit 1
fi
