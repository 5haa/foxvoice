document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const recordBtn = document.getElementById('recordBtn');
    const recordIcon = document.getElementById('recordIcon');
    const recordText = document.getElementById('recordText');
    const recordingStatus = document.getElementById('recordingStatus');
    const transcriptDisplay = document.getElementById('transcriptDisplay');
    const userTranscript = document.getElementById('userTranscript');
    const audioContainer = document.getElementById('audioContainer');
    const audioPlayer = document.getElementById('audioPlayer');
    const aiResponseText = document.getElementById('aiResponseText');
    const statusMessage = document.getElementById('statusMessage');
    const errorMessage = document.getElementById('errorMessage');
    const speedInput = document.getElementById('speedInput');
    const speedValue = document.getElementById('speedValue');
    const historyList = document.getElementById('historyList');
    const customPrompt = document.getElementById('customPrompt');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const messageCount = document.getElementById('messageCount');

    // Conversation context
    let conversationHistory = [];
    
    // Default system prompt
    const defaultSystemPrompt = "You are a helpful voice assistant. You can see and remember our conversation history. Respond naturally and conversationally. Keep responses concise (2-3 sentences) since this is a voice conversation.";
    
    // Set default prompt if empty
    if (!customPrompt.value.trim()) {
        customPrompt.value = defaultSystemPrompt;
    }

    // Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;
    let isProcessing = false;
    let autoRestartEnabled = true;

    // Check browser support
    if (!SpeechRecognition) {
        showError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        recordBtn.disabled = true;
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = true;  // Continuous mode for real-time
        recognition.interimResults = true;  // Show interim results for faster feedback
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            isRecording = true;
            recordBtn.classList.add('recording');
            recordIcon.textContent = '🔴';
            recordText.textContent = 'Listening...';
            recordingStatus.classList.remove('hidden');
            transcriptDisplay.classList.add('hidden');
            hideMessages();
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            // Process all results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show interim results for real-time feedback
            if (interimTranscript) {
                userTranscript.textContent = interimTranscript;
                transcriptDisplay.classList.remove('hidden');
            }

            // Process final transcript immediately
            if (finalTranscript.trim() && !isProcessing) {
                const finalText = finalTranscript.trim();
                userTranscript.textContent = finalText;
                processVoiceInput(finalText);
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Auto-restart if no speech detected
                if (autoRestartEnabled && !isProcessing) {
                    setTimeout(() => {
                        if (!isProcessing) {
                            try {
                                recognition.start();
                            } catch (e) {
                                // Already started, ignore
                            }
                        }
                    }, 500);
                }
            } else if (event.error === 'not-allowed') {
                stopRecording();
                showError('Microphone access denied. Please allow microphone access.');
            } else if (event.error !== 'aborted') {
                // Only show error if not aborted (user stopped)
                console.error('Recognition error:', event.error);
            }
        };

        recognition.onend = function() {
            console.log('Recognition ended, isProcessing:', isProcessing, 'isRecording:', isRecording);
            
            // Only auto-restart if enabled, not processing (no AI audio playing), and still in recording mode
            if (autoRestartEnabled && !isProcessing && isRecording) {
                setTimeout(() => {
                    if (!isProcessing && autoRestartEnabled && isRecording) {
                        try {
                            recognition.start();
                            console.log('Auto-restarted recognition');
                        } catch (e) {
                            // Already started or error, ignore
                            console.log('Could not restart:', e.message);
                        }
                    }
                }, 100);
            } else if (!isRecording) {
                // User manually stopped
                recordBtn.classList.remove('recording');
                recordIcon.textContent = '🎤';
                recordText.textContent = 'Click to Start Conversation';
                recordingStatus.classList.add('hidden');
            }
        };
    }

    // Speed slider
    speedInput.addEventListener('input', function() {
        speedValue.textContent = parseFloat(this.value).toFixed(1);
    });

    // Record button click - toggle recording
    recordBtn.addEventListener('click', function() {
        if (!recognition) return;

        if (isRecording) {
            // Stop recording
            autoRestartEnabled = false;
            recognition.stop();
            isRecording = false;
            stopRecording();
        } else {
            // Start recording
            autoRestartEnabled = true;
            isRecording = true;
            try {
                recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                showError('Could not start recording. Please try again.');
                isRecording = false;
            }
        }
    });

    function stopRecording() {
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordIcon.textContent = '🎤';
        recordText.textContent = 'Click to Start Conversation';
        recordingStatus.classList.add('hidden');
    }

    async function processVoiceInput(transcript) {
        if (isProcessing) return; // Prevent multiple simultaneous requests
        
        isProcessing = true;
        
        // STOP listening to prevent feedback loop
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch (e) {
                // Already stopped, ignore
            }
        }
        
        showStatus('Processing...');
        audioContainer.classList.add('hidden');
        hideError();

        try {
            const startTime = Date.now();
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: transcript,
                    custom_prompt: customPrompt.value.trim() || defaultSystemPrompt,
                    conversation_history: conversationHistory,  // Send full conversation history
                    voice: document.getElementById('voiceSelect').value || 'heart',  // Default to heart
                    language: document.getElementById('languageSelect').value,
                    speed: parseFloat(speedInput.value)
                })
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to get response');
            }

            // Get ChatGPT response text and audio data
            const chatgptResponse = responseData.text || 'Response ready';
            const audioBase64 = responseData.audio;
            
            // Convert base64 to blob
            const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
            const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Set audio source
            audioPlayer.src = audioUrl;
            
            // Show audio container
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            showStatus(`Response ready in ${processingTime}s!`);
            audioContainer.classList.remove('hidden');
            
            // Display ChatGPT response text
            aiResponseText.textContent = chatgptResponse;
            
            // Add to conversation context
            conversationHistory.push({
                role: 'user',
                content: transcript
            });
            conversationHistory.push({
                role: 'assistant',
                content: chatgptResponse
            });
            
            // Update message count
            updateMessageCount();
            
            // Add to visual history
            addToHistory(transcript, chatgptResponse);

            // IMPORTANT: Stop recognition during AI speech to prevent feedback loop
            showStatus('AI is speaking... (mic paused)');
            
            // Play audio automatically
            audioPlayer.play().then(() => {
                console.log('Audio started playing, mic is paused');
            }).catch(err => {
                console.error('Auto-play prevented:', err);
                showStatus('Click play to hear the response');
                // If autoplay fails, allow manual restart
                isProcessing = false;
            });
            
            // Restart listening ONLY after audio finishes
            audioPlayer.onended = function() {
                console.log('Audio finished, restarting mic...');
                isProcessing = false;
                
                if (autoRestartEnabled && isRecording) {
                    setTimeout(() => {
                        if (autoRestartEnabled && isRecording) {
                            try {
                                recognition.start();
                                showStatus('Listening...');
                            } catch (e) {
                                console.error('Could not restart recognition:', e);
                            }
                        }
                    }, 500);  // Wait 500ms after audio ends before restarting
                } else {
                    hideStatus();
                }
            };
            
            // Handle if user manually pauses/stops audio
            audioPlayer.onpause = function() {
                if (!audioPlayer.ended) {
                    isProcessing = false;
                    hideStatus();
                }
            };

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred while processing your request');
            isProcessing = false;
            
            // Restart recognition if still in recording mode
            if (autoRestartEnabled && isRecording) {
                setTimeout(() => {
                    if (autoRestartEnabled && isRecording) {
                        try {
                            recognition.start();
                        } catch (e) {
                            // Already started, ignore
                        }
                    }
                }, 1000);
            }
        }
    }

    function addToHistory(userMessage, aiMessage) {
        const emptyMsg = historyList.querySelector('.empty-history');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-user">
                <strong>You:</strong> ${userMessage}
            </div>
            <div class="history-ai">
                <strong>AI:</strong> ${aiMessage}
            </div>
        `;
        historyList.insertBefore(historyItem, historyList.firstChild);
        
        // Keep only last 10 conversations
        const items = historyList.querySelectorAll('.history-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    function showStatus(message) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden');
    }

    function hideStatus() {
        statusMessage.classList.add('hidden');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function hideMessages() {
        hideStatus();
        hideError();
    }

    // Update message count
    function updateMessageCount() {
        const count = conversationHistory.length;
        messageCount.textContent = `(${count} message${count !== 1 ? 's' : ''})`;
    }

    // Clear conversation history
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('Clear all conversation history and start fresh?')) {
            conversationHistory = [];
            historyList.innerHTML = '<p class="empty-history">No conversation yet. Start by clicking the microphone!</p>';
            audioContainer.classList.add('hidden');
            updateMessageCount();
            showStatus('Conversation cleared. Starting fresh!');
            setTimeout(() => hideStatus(), 2000);
        }
    });

});
