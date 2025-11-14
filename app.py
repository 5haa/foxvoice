from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import requests
import io
import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# API configuration from environment variables
LEMONFOX_API_KEY = os.getenv('LEMONFOX_API_KEY', '')
LEMONFOX_API_URL = "https://api.lemonfox.ai/v1/audio/speech"
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Validate API keys
if not LEMONFOX_API_KEY:
    print("Warning: LEMONFOX_API_KEY not set in environment variables")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not set in environment variables")

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '')
        voice = data.get('voice', 'sarah')
        language = data.get('language', 'en-us')
        response_format = data.get('response_format', 'mp3')
        speed = data.get('speed', 1.0)
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Make request to Lemonfox API
        headers = {
            "Authorization": f"Bearer {LEMONFOX_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": text,
            "voice": voice,
            "language": language,
            "response_format": response_format,
            "speed": speed
        }
        
        response = requests.post(LEMONFOX_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            # Return audio file
            audio_data = io.BytesIO(response.content)
            audio_data.seek(0)
            
            return send_file(
                audio_data,
                mimetype=f'audio/{response_format}',
                as_attachment=False,
                download_name=f'speech.{response_format}'
            )
        else:
            return jsonify({
                'error': f'API request failed: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voices', methods=['GET'])
def get_voices():
    # Common voices available in Lemonfox
    voices = [
        {'id': 'sarah', 'name': 'Sarah (Female)'},
        {'id': 'heart', 'name': 'Heart (Default)'},
        {'id': 'alloy', 'name': 'Alloy'},
        {'id': 'echo', 'name': 'Echo'},
        {'id': 'fable', 'name': 'Fable'},
        {'id': 'onyx', 'name': 'Onyx'},
        {'id': 'nova', 'name': 'Nova'},
        {'id': 'shimmer', 'name': 'Shimmer'},
    ]
    return jsonify(voices)

@app.route('/api/chat', methods=['POST'])
def chat_with_voice():
    """
    Endpoint for real-time voice conversation:
    1. Receives user text (from speech-to-text)
    2. Sends to ChatGPT with custom prompt
    3. Gets ChatGPT response
    4. Converts response to speech using Lemonfox
    5. Returns audio and text response
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        custom_prompt = data.get('custom_prompt', '')
        conversation_history = data.get('conversation_history', [])  # Get conversation history
        voice = data.get('voice', 'heart')  # Default to heart voice
        language = data.get('language', 'en-us')
        speed = data.get('speed', 1.0)
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        if not openai_client:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        # Prepare messages for ChatGPT with conversation context
        messages = []
        
        # Add system prompt if provided
        if custom_prompt:
            messages.append({
                "role": "system",
                "content": custom_prompt
            })
        
        # Add conversation history to maintain context
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Get response from ChatGPT with conversation context
        chat_response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=350,  # Slightly increased for context-aware responses
            temperature=0.7,
            stream=False
        )
        
        chatgpt_text = chat_response.choices[0].message.content
        
        # Convert ChatGPT response to speech using Lemonfox (optimized for speed)
        headers = {
            "Authorization": f"Bearer {LEMONFOX_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": chatgpt_text,
            "voice": voice,
            "language": language,
            "response_format": "mp3",
            "speed": speed
        }
        
        # Use timeout for faster failure detection
        tts_response = requests.post(LEMONFOX_API_URL, headers=headers, json=payload, timeout=10)
        
        if tts_response.status_code == 200:
            # Encode audio to base64 and return JSON with both audio and text
            audio_base64 = base64.b64encode(tts_response.content).decode('utf-8')
            
            return jsonify({
                'audio': audio_base64,
                'text': chatgpt_text,
                'format': 'mp3'
            })
        else:
            return jsonify({
                'error': f'TTS API request failed: {tts_response.status_code}',
                'details': tts_response.text,
                'chatgpt_response': chatgpt_text
            }), tts_response.status_code
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Railway requires binding to 0.0.0.0 and using PORT env variable
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

