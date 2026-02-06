#!/bin/bash

echo "🚀 Yo-Hi Voice Assistant - Complete Build Script"
echo "================================================="
echo ""

set -e

# Get the workspace path (works both in Codespaces and locally)
WORKSPACE_PATH="${GITHUB_WORKSPACE:-$(pwd)}"
echo "Working in: $WORKSPACE_PATH"
echo ""

# Step 1: Install Java 21
echo "☕ Step 1: Installing Java JDK 21..."
sudo apt-get update -qq
sudo apt-get install -y openjdk-21-jdk wget unzip
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
echo "✅ Java installed: $(java -version 2>&1 | head -n 1)"
echo ""

# Step 2: Install Android SDK
echo "📱 Step 2: Installing Android SDK..."
mkdir -p ~/android-sdk
cd ~/android-sdk

if [ ! -f "commandlinetools-linux-9477386_latest.zip" ]; then
    echo "   Downloading Android command line tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
fi

if [ ! -d "cmdline-tools/latest" ]; then
    echo "   Setting up SDK..."
    unzip -q commandlinetools-linux-9477386_latest.zip
    mkdir -p cmdline-tools/latest
    mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
fi

export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "   Installing SDK components..."
yes | sdkmanager --licenses > /dev/null 2>&1
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1

echo "✅ Android SDK installed"
echo ""

# Step 3: Go to project directory
cd "$WORKSPACE_PATH"

# Step 4: Install dependencies
echo "📦 Step 3: Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 5: Build web app
echo "🏗️  Step 4: Building web application..."
npm run build
echo "✅ Web app built"
echo ""

# Step 6: Add Android platform
echo "🤖 Step 5: Adding Android platform..."
npx cap add android
echo "✅ Android platform added"
echo ""

# Step 7: Sync Capacitor
echo "🔄 Step 6: Syncing Capacitor..."
npx cap sync android
echo "✅ Capacitor synced"
echo ""

# Step 8: Build APK
echo "📲 Step 7: Building APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug

echo ""
echo "================================================="
echo "✅ BUILD COMPLETE!"
echo "================================================="
echo ""

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo "📱 APK Location: android/$APK_PATH"
    echo "📊 APK Size: $APK_SIZE"
    echo ""
    
    # Copy to project root for easy download
    cp "$APK_PATH" "$WORKSPACE_PATH/yo-hi-assistant.apk"
    echo "📋 Also copied to: yo-hi-assistant.apk (in project root)"
    echo ""
fi

echo "🎉 Next steps:"
echo "   1. Download 'yo-hi-assistant.apk'"
echo "   2. Transfer to your Android device"
echo "   3. Install the app"
echo "   4. Grant microphone permission when asked"
echo "   5. Say 'yo' to activate!"
echo ""
