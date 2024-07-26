document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const clearButton = document.getElementById('clearButton');
    const timer = document.getElementById('timer');
    const transcription = document.getElementById('transcription');
    const downloadButton = document.getElementById('downloadButton');
    const debugInfo = document.getElementById('debugInfo');

    let recognition;
    let isRecording = false;
    let startTime;
    let timerInterval;
    let fullTranscript = '';
    let lastProcessedIndex = 0;

    function updateDebugInfo(message) {
        debugInfo.textContent += message + '\n';
        console.log(message);
    }

    function initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            recognition = new SpeechRecognition();
        } else {
            updateDebugInfo('Speech recognition not supported in this browser.');
            recordButton.textContent = 'Speech Recognition Not Supported';
            recordButton.disabled = true;
            return false;
        }

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            updateDebugInfo('Speech recognition started');
        };

        recognition.onresult = (event) => {
            updateDebugInfo('Received recognition result');
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = lastProcessedIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    lastProcessedIndex = i + 1;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            fullTranscript += finalTranscript;
            transcription.value = fullTranscript + ' ' + interimTranscript;
        };

        recognition.onend = () => {
            updateDebugInfo('Speech recognition ended');
            if (isRecording) {
                updateDebugInfo('Attempting to restart recognition');
                recognition.start();
            }
        };

        recognition.onerror = (event) => {
            updateDebugInfo('Speech recognition error: ' + event.error);
            if (isRecording) {
                stopRecording();
                startRecording(); // Attempt to restart on error
            }
        };

        return true;
    }

    if (!initializeSpeechRecognition()) {
        return; // Exit if speech recognition is not supported
    }

    recordButton.addEventListener('click', toggleRecording);
    clearButton.addEventListener('click', clearRecording);
    downloadButton.addEventListener('click', downloadTranscription);

    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    async function startRecording() {
        try {
            // Request microphone permission explicitly
            await navigator.mediaDevices.getUserMedia({ audio: true });
            updateDebugInfo('Microphone permission granted');

            isRecording = true;
            recordButton.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            recognition.start();
            startTime = Date.now();
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            lastProcessedIndex = 0;
        } catch (err) {
            updateDebugInfo('Error accessing microphone: ' + err.message);
        }
    }

    function stopRecording() {
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
        recognition.stop();
        clearInterval(timerInterval);
        downloadButton.disabled = !fullTranscript.trim();
    }

    function clearRecording() {
        stopRecording();
        fullTranscript = '';
        transcription.value = '';
        timer.textContent = '00:00';
        downloadButton.disabled = true;
        lastProcessedIndex = 0;
        debugInfo.textContent = '';
    }

    function updateTimer() {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    }

    function downloadTranscription() {
        const text = fullTranscript.trim();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcription.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
