#!/bin/bash
# Fenster & Sonnenschutz - Server Startskript

echo "=== Server wird gestartet ==="
source ~/.nvm/nvm.sh
nvm use 22
cd /home/leonp/sta-fenster-system/apps/web

# Beende alten Prozess auf Port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 1

echo "Server startet auf http://localhost:3000"
echo "Drücke STRG+C zum Beenden"
echo ""

npx next start
