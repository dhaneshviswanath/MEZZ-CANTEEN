#!/bin/bash

# Clear terminal screen
clear

echo "======================================================="
echo "         MEZZ CANTEEN PORTABLE WEB SYSTEM"
echo "======================================================="
echo ""
echo "Preparing application environment..."

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is NOT installed on this computer!"
    echo "Node.js is required to run Mezz Canteen offline."
    echo ""
    echo "Opening Node.js download site now..."
    open "https://nodejs.org/" || xdg-open "https://nodejs.org/"
    echo ""
    echo "Please download and install the 'LTS' version of Node.js."
    echo "Once installed, restart this script to run Mezz Canteen."
    echo "======================================================="
    read -p "Press Enter to exit..."
    exit 1
fi

# 2. Check dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] First-time setup detected. Downloading dependencies..."
    echo "(This will run only once and requires an internet connection)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install application dependencies."
        echo "Please ensure you are connected to the internet for the initial setup."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# 3. Build user interface if not built
if [ ! -d "dist" ]; then
    echo "[INFO] Compiling application assets..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Asset compilation failed."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# 4. Launch browser and run production server
echo ""
echo "======================================================="
echo "           SYSTEM LAUNCHED SUCCESSFULLY"
echo "======================================================="
echo ""
echo "  - App URL: http://localhost:3000"
echo "  - Data Storage: data/db.json"
echo ""
echo "Launching Mezz Canteen in your web browser..."
echo ""
echo "(Keep this terminal open while using the application)"
echo "======================================================="
echo ""

# Launch browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
else
    xdg-open "http://localhost:3000" &> /dev/null &
fi

# Run the app
npm run start
