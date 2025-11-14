# Voice Conversation Agent

A real-time voice conversation web application that uses ChatGPT for AI responses and Lemonfox.ai for text-to-speech conversion.

## Features

- 🎙️ **Real-time Voice Input** - Speak to the AI using your microphone (browser-based speech recognition)
- 🤖 **ChatGPT Integration** - Powered by OpenAI's GPT-3.5-turbo for intelligent responses
- 🧠 **Full Conversation Context** - AI remembers entire conversation history for contextual responses
- 🔊 **Voice Responses** - AI responses are converted to natural-sounding speech using Lemonfox.ai
- 🎭 **Custom System Prompts** - Configure the AI's personality and behavior
- 🎨 **Multiple Voice Options** - Choose from 8+ voices (Sarah, **Heart (default)**, Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- 🌍 **Language Support** - English (US) and English (UK)
- ⚡ **Adjustable Speed** - Control speech speed from 0.5x to 2.0x
- 📝 **Conversation History** - View your conversation history with message count
- 🗑️ **Clear Context** - Reset conversation and start fresh anytime
- 📱 **Responsive Design** - Works on desktop and mobile devices

## How It Works

1. **User speaks** → Browser captures audio using Web Speech API
2. **Speech-to-text** → Converts voice to text
3. **ChatGPT processing** → Text is sent to ChatGPT with **full conversation history** for context
4. **AI response** → ChatGPT generates a contextual response (remembers previous messages)
5. **Text-to-speech** → Response is converted to speech using Lemonfox.ai (with "heart" voice by default)
6. **Audio playback** → AI response is played automatically

### Conversation Context

The app maintains **full conversation context**, meaning:
- The AI remembers everything said in the current session
- You can ask follow-up questions naturally
- References to previous topics work seamlessly
- Example conversation:
  - You: "What's the capital of France?"
  - AI: "The capital of France is Paris."
  - You: "What's the population?" (AI knows you mean Paris)
  - AI: "Paris has a population of approximately 2.2 million people."

Use the **Clear button** to reset the conversation and start fresh.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

4. **Allow microphone access** when prompted (required for voice input)

## Usage

1. **Set Custom Prompt (Optional)**: A default prompt is provided, but you can customize it
   - Default: "You are a helpful voice assistant. You can see and remember our conversation history..."
   - Example: "You are a coding tutor. Explain concepts clearly and remember what we've discussed."
   - Example: "You are a fitness coach. Give concise advice and track our goals."

2. **Click the microphone button** to start the conversation

3. **Speak naturally** - The AI is listening continuously and will respond after you pause

4. **Continue the conversation** - Ask follow-up questions, reference previous topics
   - "What about..." 
   - "Can you explain that more?"
   - "What did I just ask you?"

5. The AI maintains **full context** of your conversation and responds accordingly

6. **Clear conversation** when you want to start a fresh topic (click the 🗑️ Clear button)

7. **Adjust settings** as needed:
   - Voice selection (Heart is default)
   - Language preference
   - Speech speed

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Limited speech recognition support
- **Safari**: Limited speech recognition support

**Note**: Speech recognition works best in Chrome or Edge browsers.

## How Feedback Loop Prevention Works

The app automatically prevents the microphone from hearing the AI's voice by:

1. **Pausing recognition** when you finish speaking
2. **Keeping mic paused** while AI generates response
3. **Keeping mic paused** while AI audio plays through speakers
4. **Auto-resuming** 500ms after AI finishes speaking
5. **Status indicator**: Shows "AI is speaking... (mic paused)" during playback

This prevents the continuous feedback loop where the AI would hear itself and keep responding to its own voice.

## API Configuration

The app uses:
- **OpenAI ChatGPT API** (GPT-3.5-turbo)
- **Lemonfox.ai TTS API** - $2.50 per 1,000,000 characters

API keys are configured in `app.py`. Make sure to keep them secure in production.

## Project Structure

```
foxvoice/
├── app.py                 # Flask backend with API endpoints
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Frontend HTML
└── static/
    ├── style.css         # Styling
    └── script.js        # Frontend JavaScript (speech recognition & API calls)
```

## License

MIT
