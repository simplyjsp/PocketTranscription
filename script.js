document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const clearButton = document.getElementById('clearButton');
    const timer = document.getElementById('timer');
    const transcription = document.getElementById('transcription');
    const downloadButton = document.getElementById('downloadButton');
    const languageDisplay = document.getElementById('languageDisplay');

    let recognition;
    let isRecording = false;
    let startTime;
    let timerInterval;
    let fullTranscript = '';
    let currentLanguage = '';
    let restartTimeout;

    const languages = {
        'es-ES': 'Spanish',
        'en-US': 'English',
        'ko-KR': 'Korean',
        'ja-JP': 'Japanese',
        'ru-RU': 'Russian',
        'zh-CN': 'Mandarin'
    };

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default to English

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    detectLanguage(finalTranscript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            fullTranscript += finalTranscript;
            transcription.value = fullTranscript + (interimTranscript ? ' ' + interimTranscript : '');
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
                restartRecognition();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (isRecording) {
                stopRecording();
                startRecording(); // Attempt to restart on error
            }
        };
    } else {
        recordButton.textContent = 'Speech Recognition Not Supported';
        recordButton.disabled = true;
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

    function startRecording() {
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.add('recording');
        languageDisplay.textContent = 'Detecting language...';
        recognition.start();
        startTime = Date.now();
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
        restartRecognition();
    }

    function stopRecording() {
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
        recognition.stop();
        clearInterval(timerInterval);
        clearTimeout(restartTimeout);
        downloadButton.disabled = !fullTranscript.trim();
    }

    function clearRecording() {
        stopRecording();
        fullTranscript = '';
        currentLanguage = '';
        transcription.value = '';
        timer.textContent = '00:00';
        languageDisplay.textContent = '';
        downloadButton.disabled = true;
    }

    function updateTimer() {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    }

    function restartRecognition() {
        clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
            if (isRecording) {
                recognition.stop();
                recognition.start();
                restartRecognition();
            }
        }, 240000); // Restart every 4 minutes
    }

    function downloadTranscription() {
        const text = fullTranscript.trim();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_${currentLanguage || 'unknown'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function detectLanguage(text) {
        const detectedLang = identifyLanguage(text);
        if (languages[detectedLang] && detectedLang !== currentLanguage) {
            currentLanguage = detectedLang;
            languageDisplay.textContent = `Detected Language: ${languages[currentLanguage]}`;
            recognition.lang = currentLanguage;
        }
    }

    function identifyLanguage(text) {
        const letterFrequencies = {
            'es-ES': {'e':12.53,'a':11.53,'o':8.69,'s':7.20,'r':6.87,'n':6.71,'i':6.25,'d':5.86,'l':4.97,'c':4.68,'t':4.63,'u':3.93,'m':3.15,'p':2.51,'b':1.42,'g':1.01,'v':0.90,'y':0.90,'q':0.88,'h':0.70,'f':0.69,'z':0.52,'j':0.44,'ñ':0.31,'x':0.22,'k':0.01,'w':0.01},
            'en-US': {'e':12.02,'t':9.10,'a':8.12,'o':7.68,'i':7.31,'n':6.95,'s':6.28,'r':6.02,'h':5.92,'d':4.32,'l':3.98,'u':2.88,'c':2.71,'m':2.61,'f':2.30,'y':2.11,'w':2.09,'g':2.03,'p':1.82,'b':1.49,'v':1.11,'k':0.69,'x':0.17,'q':0.11,'j':0.10,'z':0.07},
            'ru-RU': {'о':10.97,'е':8.45,'а':8.01,'и':7.35,'н':6.70,'т':6.26,'с':5.47,'р':4.73,'в':4.54,'л':4.40,'к':3.49,'м':3.21,'д':2.98,'п':2.81,'у':2.62,'я':2.01,'ы':1.90,'ь':1.74,'г':1.70,'з':1.65,'б':1.59,'ч':1.44,'й':1.21,'х':0.97,'ж':0.94,'ш':0.73,'ю':0.64,'ц':0.48,'щ':0.36,'э':0.32,'ф':0.26,'ъ':0.04,'ё':0.04}
        };

        const languageScores = {};
    
        for (const lang in letterFrequencies) {
            let score = 0;
            const freqs = letterFrequencies[lang];
            const total = text.length;
    
            for (const char of text.toLowerCase()) {
                if (freqs[char]) {
                    score += freqs[char];
                }
            }
    
            languageScores[lang] = score / total;
        }
    
        // Special handling for languages with unique scripts
        const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
        const japaneseChars = (text.match(/[\u3040-\u30FF]/g) || []).length;
        const chineseChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    
        if (koreanChars / text.length > 0.3) return 'ko-KR';
        if (japaneseChars / text.length > 0.3) return 'ja-JP';
        if (chineseChars / text.length > 0.3) return 'zh-CN';
    
        return Object.keys(languageScores).reduce((a, b) => languageScores[a] > languageScores[b] ? a : b);
    }
});
