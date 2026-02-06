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
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Request microphone permission on app start
    requestMicrophonePermission();
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      setStatus('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setStatus('Permission granted! Tap "Start Listening" to begin.');
    } catch (error) {
      setStatus('Microphone permission denied. Please enable it in settings.');
      console.error('Permission error:', error);
    }
  };

  const speak = (text) => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = resolve;
      synthRef.current.speak(utterance);
    });
  };

  const callOpenRouter = async (userMessage) => {
    try {
      setStatus('Thinking...');
      
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
              content: 'You are a helpful voice assistant. Keep responses concise and conversational, under 50 words.'
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
        setStatus('Speaking...');
        await speak(aiResponse);
        setStatus('Listening for "yo"...');
        return aiResponse;
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('OpenRouter error:', error);
      const errorMsg = 'Sorry, I had trouble connecting to my brain.';
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

    recognition.onstart = () => {
      setIsListening(true);
      if (conversationMode) {
        setStatus('Listening for your question...');
      } else {
        setStatus('Listening for "yo"...');
      }
    };

    recognition.onresult = async (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase().trim();
      setTranscript(text);

      if (event.results[last].isFinal) {
        if (!conversationMode && text.includes('yo')) {
          setConversationMode(true);
          setStatus('Speaking...');
          recognition.stop();
          await speak('Hi! What do you want?');
          setStatus('Listening for your question...');
          // Restart recognition in conversation mode
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 500);
        } else if (conversationMode) {
          recognition.stop();
          await callOpenRouter(text);
          setConversationMode(false);
          // Restart recognition in wake word mode
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 500);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'no-speech') {
        recognition.stop();
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Restart failed, will retry');
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    setConversationMode(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
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

        <div style={styles.instructions}>
          <p style={styles.instructionText}>📱 Say "yo" to activate</p>
          <p style={styles.instructionText}>💬 Ask your question</p>
          <p style={styles.instructionText}>🤖 Get AI-powered answers</p>
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
    margin: 0
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
    marginBottom: '20px'
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
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0'
  }
};

export default App;
