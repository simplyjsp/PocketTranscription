console.log("Script starting...");

try {
  const { useState, useRef, useEffect } = React;
  const { Mic, StopCircle, Download, Check, AlertCircle, Lock, Shield } = lucideReact;

  console.log("React and lucide successfully loaded");

  const VoiceTranscriber = () => {
    console.log("VoiceTranscriber component rendering");
    const [isRecording, setIsRecording] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState('');
    const [isSecureContext, setIsSecureContext] = useState(false);
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
      setIsSecureContext(window.isSecureContext);
    }, []);

    useEffect(() => {
      if (isRecording) {
        timerRef.current = setInterval(() => {
          setTimer(prevTimer => prevTimer + 1);
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }

      return () => clearInterval(timerRef.current);
    }, [isRecording]);

    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
      setError('');
      if (!isSecureContext) {
        setError("This feature requires a secure context (HTTPS). Please ensure you're using a secure connection.");
        return;
      }
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error("Your browser doesn't support speech recognition. Please try a different browser.");
        }
        
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setTranscript(prevTranscript => prevTranscript + finalTranscript + ' ' + interimTranscript);
        };

        recognitionRef.current.onerror = (event) => {
          setError(`Error occurred in recognition: ${event.error}`);
        }

        recognitionRef.current.start();
        setIsRecording(true);
        setIsDone(false);
        setTimer(0);
      } catch (err) {
        setError(`${err.name}: ${err.message}`);
      }
    };

    const stopRecording = () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    };

    const finishRecording = () => {
      stopRecording();
      setIsDone(true);
    };

    const downloadTranscription = () => {
      const element = document.createElement('a');
      const file = new Blob([transcript], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'transcription.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    };

    return (
      <div className="container">
        <div className="card">
          <h1 className="card-title">Privacy-Focused Voice Transcriber</h1>
          <div className="card-content">
            <div className="alert info">
              <Shield />
              <div>
                <h2>Privacy Notice</h2>
                <p>All processing occurs on your device. No data is sent to or stored on any server. Transcriptions are temporary and will be lost if not downloaded.</p>
              </div>
            </div>
            {!isSecureContext && (
              <div className="alert warning">
                <Lock />
                <div>
                  <h2>Secure Context Required</h2>
                  <p>This feature requires a secure connection (HTTPS). Please ensure you're accessing this app via a secure URL.</p>
                </div>
              </div>
            )}
            {error && (
              <div className="alert error">
                <AlertCircle />
                <div>
                  <h2>Error</h2>
                  <p>{error}</p>
                </div>
              </div>
            )}
            <div className="button-group">
              {!isRecording && !isDone ? (
                <button onClick={startRecording} className="btn primary">
                  <Mic /> Start Recording
                </button>
              ) : isRecording ? (
                <>
                  <button onClick={stopRecording} className="btn warning">
                    <StopCircle /> Pause Recording
                  </button>
                  <button onClick={finishRecording} className="btn success">
                    <Check /> Done Recording
                  </button>
                </>
              ) : (
                <button onClick={startRecording} className="btn primary">
                  <Mic /> Record Again
                </button>
              )}
            </div>
            {isRecording && (
              <div className="timer">
                Recording... {formatTime(timer)}
              </div>
            )}
            <textarea
              value={transcript}
              readOnly
              className="transcript"
              placeholder="Transcription will appear here..."
            />
          </div>
          <div className="card-footer">
            <button
              onClick={downloadTranscription}
              disabled={!transcript}
              className="btn primary"
            >
              <Download /> Download Transcription
            </button>
          </div>
        </div>
      </div>
    );
  };

  console.log("Rendering VoiceTranscriber component");
  ReactDOM.render(<VoiceTranscriber />, document.getElementById('root'));
  console.log("Render complete");
} catch (error) {
  console.error("An error occurred:", error);
  document.getElementById('root').innerHTML = `<h1>Error</h1><p>${error.message}</p>`;
}
