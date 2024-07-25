document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const timer = document.getElementById('timer');
    const transcription = document.getElementById('transcription');
    const downloadButton = document.getElementById('downloadButton');
    const languageDisplay = document.createElement('div');
    languageDisplay.id = 'languageDisplay';
    document.querySelector('.glass-panel').insertBefore(languageDisplay, transcription);

    let recognition;
    let isRecording = false;
    let startTime;
    let timerInterval;
    let fullTranscript = '';
    let currentLanguage = '';

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
            transcription.value = fullTranscript + ' ' + interimTranscript;
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            stopRecording();
        };
    } else {
        recordButton.textContent = 'Speech Recognition Not Supported';
        recordButton.disabled = true;
    }

    recordButton.addEventListener('click', toggleRecording);
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
        transcription.value = '';
        fullTranscript = '';
        currentLanguage = '';
        languageDisplay.textContent = 'Detecting language...';
        recognition.start();
        startTime = Date.now();
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function stopRecording() {
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('recording');
        recognition.stop();
        clearInterval(timerInterval);
        downloadButton.disabled = !fullTranscript.trim();
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
        a.download = `transcription_${currentLanguage || 'unknown'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function detectLanguage(text) {
        const detectedLang = frankenstein(text);
        if (languages[detectedLang] && detectedLang !== currentLanguage) {
            currentLanguage = detectedLang;
            languageDisplay.textContent = `Detected Language: ${languages[currentLanguage]}`;
            recognition.lang = currentLanguage;
        }
    }

    // Frankenstein function for language detection
    function frankenstein(text) {
        const langs = Object.keys(languages);
        const langScores = langs.map(lang => ({
            lang,
            score: getLanguageScore(text, lang)
        }));
        return langScores.reduce((a, b) => a.score > b.score ? a : b).lang;
    }

    function getLanguageScore(text, lang) {
        const langPatterns = {
            'es-ES': /[áéíóúñ¿¡]/gi,
            'en-US': /\b(the|and|in|is|it)\b/gi,
            'ko-KR': /[\uAC00-\uD7AF]/g,
            'ja-JP': /[\u3040-\u30FF]/g,
            'ru-RU': /[\u0400-\u04FF]/g,
            'zh-CN': /[\u4E00-\u9FFF]/g
        };
        const pattern = langPatterns[lang];
        const matches = text.match(pattern);
        return matches ? matches.length : 0;
    }
});
