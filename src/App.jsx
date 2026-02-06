import React, { useState, useEffect, useRef } from 'react';

const OPENROUTER_API_KEY = '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';
const MODEL = 'openai/gpt-oss-120b:free';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Request microphone permission on app start
    requestMicrophonePermission();
  }, []);

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const requestMicrophonePermission = async () => {
    try {
      setStatus('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setStatus('Permission granted! Tap "Start Listening" to begin.');
      addDebugLog('Microphone permission granted');
    } catch (error) {
      setStatus('Microphone permission denied. Please enable it in settings.');
      console.error('Permission error:', error);
      addDebugLog('Permission denied: ' + error.message);
    }
  };

  const speak = (text) => {
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = resolve;
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        resolve();
      };
      
      synthRef.current.speak(utterance);
    });
  };

  const callOpenRouter = async (userMessage) => {
    try {
      setStatus('Thinking...');
      addDebugLog('Calling AI with: ' + userMessage);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Yo-Hi Voice Assistant'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful voice assistant. Keep responses very concise and conversational, under 40 words. Speak naturally like you are talking to someone.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiResponse = data.choices[0].message.content;
        setResponse(aiResponse);
        addDebugLog('AI response: ' + aiResponse.substring(0, 50) + '...');
        setStatus('Speaking...');
        await speak(aiResponse);
        setStatus('Listening for "yo"...');
        return aiResponse;
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('OpenRouter error:', error);
      addDebugLog('API error: ' + error.message);
      const errorMsg = 'Sorry, I had trouble with that.';
      setResponse(errorMsg);
      await speak(errorMsg);
      setStatus('Listening for "yo"...');
      return null;
    }
  };

  const startContinuousListening = () => {
    if (!permissionGranted) {
      requestMicrophonePermission();
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatus('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      if (conversationMode) {
        setStatus('🎤 Listening for your question...');
        addDebugLog('Started listening for question');
      } else {
        setStatus('👂 Listening for "yo"...');
        addDebugLog('Started listening for wake word');
      }
    };

    recognition.onresult = async (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase().trim();
      const confidence = event.results[last][0].confidence;
      
      // Show what we're hearing in real-time
      if (!event.results[last].isFinal) {
        setTranscript(`Hearing: ${text}...`);
      }

      if (event.results[last].isFinal) {
        addDebugLog(`Final: "${text}" (confidence: ${confidence?.toFixed(2)})`);
        setTranscript(text);
        
        if (!conversationMode) {
          // Wake word detection - be very flexible
          const words = text.split(/\s+/);
          const hasWakeWord = words.some(word => {
            const clean = word.replace(/[^a-z]/g, '');
            return clean === 'yo' || 
                   clean === 'yeah' || 
                   clean === 'hey' ||
                   clean === 'yep' ||
                   clean.startsWith('yo');
          });
          
          // Also check if the whole phrase contains "yo" as a separate word
          const containsYo = text.match(/\byo\b/);
          
          if (hasWakeWord || containsYo) {
            addDebugLog('✓ Wake word detected!');
            setConversationMode(true);
            setStatus('✓ Activated! 🎤');
            recognition.stop();
            
            // Brief pause
            await new Promise(resolve => setTimeout(resolve, 400));
            
            setStatus('Speaking...');
            await speak('Hi! What do you want?');
            
            // Clear and prepare for question
            setTranscript('');
            setStatus('🎤 Ask your question now...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Restart in conversation mode
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                addDebugLog('Restart failed: ' + e.message);
              }
            }
          }
        } else {
          // In conversation mode - process the question
          if (text.length > 2) { // Ignore very short utterances
            addDebugLog('Processing question');
            recognition.stop();
            
            await callOpenRouter(text);
            
            // Return to wake word mode
            setTranscript('');
            setConversationMode(false);
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Restart in wake word mode
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                addDebugLog('Restart failed: ' + e.message);
              }
            }
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      addDebugLog('Error: ' + event.error);
      
      if (event.error === 'no-speech') {
        // No speech detected - just continue
        recognition.stop();
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              addDebugLog('Auto-restart failed');
            }
          }
        }, 1000);
      } else if (event.error === 'aborted') {
        // Normal - just restart
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              addDebugLog('Auto-restart failed');
            }
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      addDebugLog('Recognition ended');
      if (isListening && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          } catch (e) {
            addDebugLog('Auto-restart failed: ' + e.message);
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    addDebugLog('Stopping listening');
    setIsListening(false);
    setConversationMode(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    synthRef.current.cancel();
    setStatus('Stopped');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎤 Yo-Hi Assistant</h1>
        
        <div style={styles.statusContainer}>
          <div style={{
            ...styles.indicator,
            backgroundColor: isListening ? (conversationMode ? '#10b981' : '#3b82f6') : '#6b7280'
          }} />
          <p style={styles.status}>{status}</p>
        </div>

        {!permissionGranted && (
          <button onClick={requestMicrophonePermission} style={styles.permissionButton}>
            Grant Microphone Permission
          </button>
        )}

        <div style={styles.buttonContainer}>
          {!isListening ? (
            <button onClick={startContinuousListening} style={styles.startButton}>
              Start Listening
            </button>
          ) : (
            <button onClick={stopListening} style={styles.stopButton}>
              Stop Listening
            </button>
          )}
        </div>

        {transcript && (
          <div style={styles.transcriptBox}>
            <p style={styles.label}>You said:</p>
            <p style={styles.text}>{transcript}</p>
          </div>
        )}

        {response && (
          <div style={styles.responseBox}>
            <p style={styles.label}>Assistant:</p>
            <p style={styles.text}>{response}</p>
          </div>
        )}

        <div style={styles.debugBox}>
          <p style={styles.debugLabel}>Debug Log:</p>
          {debugLog.map((log, i) => (
            <p key={i} style={styles.debugText}>{log}</p>
          ))}
        </div>

        <div style={styles.instructions}>
          <p style={styles.instructionText}>📱 Say "yo" clearly to activate</p>
          <p style={styles.instructionText}>💬 Wait for "Hi! What do you want?"</p>
          <p style={styles.instructionText}>🗣️ Then ask your question</p>
          <p style={styles.instructionText}>🔁 Returns to listening after answer</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    gap: '10px'
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  status: {
    fontSize: '16px',
    color: '#374151',
    margin: 0,
    fontWeight: '500'
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  startButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  permissionButton: {
    width: '100%',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  transcriptBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px'
  },
  responseBox: {
    backgroundColor: '#dbeafe',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px'
  },
  debugBox: {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '20px',
    maxHeight: '120px',
    overflowY: 'auto',
    fontSize: '11px'
  },
  debugLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  debugText: {
    fontSize: '11px',
    color: '#78350f',
    margin: '2px 0',
    fontFamily: 'monospace'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  text: {
    fontSize: '16px',
    color: '#1f2937',
    margin: 0,
    lineHeight: '1.5'
  },
  instructions: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px',
    textAlign: 'center'
  },
  instructionText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '6px 0'
  }
};

export default App;
