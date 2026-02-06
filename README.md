# Yo-Hi Voice Assistant

A mobile voice assistant that listens for "yo" and responds to your questions using AI.

## Features

- 🎤 Always-on listening for wake word "yo"
- 💬 AI-powered responses using OpenRouter
- 🗣️ Text-to-speech responses
- 📱 Full Android mobile app
- 🔒 Requests microphone permission on first launch

## How It Works

1. App asks for microphone permission when you first open it
2. Tap "Start Listening" to begin
3. Say "yo" to activate the assistant
4. Assistant responds: "Hi! What do you want?"
5. Ask your question
6. Get AI-powered answer spoken back to you
7. Returns to listening for "yo" again

## Building the APK

### Method 1: GitHub Codespaces (Easiest)

1. Upload this entire folder to your GitHub repository
2. Open the repo in GitHub Codespaces
3. Run these commands:

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Add Android platform
npx cap add android

# Sync
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
```

Your APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 2: Local Build (Requires Setup)

**Prerequisites:**
- Node.js 18+
- Java JDK 21
- Android SDK
- Gradle

**Steps:**
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

## Configuration

The app comes pre-configured with:
- **App ID**: com.yohi.voiceassistant
- **App Name**: Yo-Hi Assistant
- **AI Model**: openai/gpt-oss-120b:free
- **API Key**: Already included

## Permissions

The app requires:
- Microphone permission (requested on first launch)
- Internet access (for AI API calls)

## Customization

To change the AI model or API key, edit `src/App.jsx`:

```javascript
const OPENROUTER_API_KEY = 'your-api-key';
const MODEL = 'your-preferred-model';
```

## Troubleshooting

**White screen on launch:**
- Make sure you granted microphone permission
- Check Android logcat for errors

**Assistant not responding:**
- Check internet connection
- Verify API key is valid
- Try saying "yo" clearly

**Build fails:**
- Ensure Java 21 is installed: `java -version`
- Check ANDROID_HOME is set
- Run `./gradlew clean` then rebuild

## Project Structure

```
yo-hi-voice-app/
├── src/
│   ├── App.jsx          # Main voice assistant logic
│   └── main.jsx         # React entry point
├── capacitor.config.ts  # Capacitor configuration
├── package.json         # Dependencies
├── vite.config.js       # Build configuration
└── index.html           # HTML template
```

## License

MIT
