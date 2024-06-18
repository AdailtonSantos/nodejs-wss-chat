let seconds = 0;
let secondsAudioPaused;
let timerInterval;
const buttonActionsAudioRecord = document.querySelectorAll('.actionAudioRecord')
const buttonActionsTextRecord = document.querySelectorAll('.actionTextRecord')
const timerElement = document.getElementById('timer')
const startRecording = document.getElementById('startRecording')

function startTimer() {
    seconds = 0

    Array.from(buttonActionsAudioRecord).map((button) => {
        button.style.display = 'block';
    });

    Array.from(buttonActionsTextRecord).map((button) => {
        button.style.display = 'none';
    });

    timerElement.innerHTML = '00:00'
    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.innerHTML = `${padNumber(minutes)}:${padNumber(remainingSeconds)}`;
    }, 1000);
}

function padNumber(number) {
    return (number < 10) ? `0${number}` : `${number}`;
}

function pauseTimer() {
    secondsAudioPaused = seconds
    console.log(secondsAudioPaused)
    clearInterval(timerInterval);
}

function resumeTimer() {
    seconds = secondsAudioPaused
    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.innerHTML = `${padNumber(minutes)}:${padNumber(remainingSeconds)}`;
    }, 1000); // Atualiza a cada segundo (1000 milissegundos)
}


var audioRecorder = {

    start: function () {
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            console.log('Erro de navegador')
            return Promise.reject(new Error('Seu navegador não suporta a esta função.'));

        } else {
            console.log('Gravando')
            startTimer()
            return navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {

                    audioRecorder.streamBeingCaptured = stream;

                    audioRecorder.mediaRecorder = new MediaRecorder(stream);

                    audioRecorder.audioBlobs = [];

                    audioRecorder.mediaRecorder.addEventListener("dataavailable", event => {
                        audioRecorder.audioBlobs.push(event.data);
                    });

                    audioRecorder.mediaRecorder.start();
                })
        }
    },

    pause: function () {
        if (audioRecorder.mediaRecorder.state === "recording") {
            pauseTimer()
            audioRecorder.mediaRecorder.pause();
        } else if (audioRecorder.mediaRecorder.state === "paused") {
            resumeTimer()
            audioRecorder.mediaRecorder.resume();
        }
    },

    stop: function (agentRoom) {
        //return a promise that would return the blob or URL of the recording
        return new Promise(resolve => {
            //save audio type to pass to set the Blob type
            let mimeType = audioRecorder.mediaRecorder.mimeType;

            //listen to the stop event in order to create & return a single Blob object
            audioRecorder.mediaRecorder.addEventListener("stop", () => {
                //create a single blob object, as we might have gathered a few Blob objects that needs to be joined as one
                let audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType });
                const formData = new FormData();
                const fileName = new Date().getTime()
                formData.append('audio', audioBlob, fileName);
                formData.append('agentRoom', agentRoom);

                fetch('/saveAttachment', {
                    method: 'POST',
                    body: formData,
                })
                    .catch(error => {
                        console.error(error);
                    });

                resolve(audioBlob);

            });
            audioRecorder.cancel();
        });
    },
    cancel: function () {
        audioRecorder.mediaRecorder.stop();

        audioRecorder.stopStream();

        audioRecorder.resetRecordingProperties();

        Array.from(buttonActionsAudioRecord).map((button) => {
            button.style.display = 'none';
        });

        Array.from(buttonActionsTextRecord).map((button) => {
            button.style.display = 'block';
        });
        timerElement.innerHTML = ''
        clearInterval(timerInterval);

        
    },
    stopStream: function () {
        audioRecorder.streamBeingCaptured.getTracks()
            .forEach(track => track.stop());
    },
    resetRecordingProperties: function () {
        audioRecorder.mediaRecorder = null;
        audioRecorder.streamBeingCaptured = null;

    }
}

function startAudioRecording() {

    audioRecorder.start()
        .then(() => {
            console.log("Recording Audio...")
        })
        .catch(error => {

            if (error.message.includes("Seu navegador não suporta a esta função..")) {
                alert("Seu navegador não suporta a esta função, use um navegador como o Google Chrome ou Firefox.");
            }
        });
}