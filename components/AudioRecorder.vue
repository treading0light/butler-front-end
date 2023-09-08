<template>
    <div>
        <button v-if="!isRecording" @click="startRecording">Start Recording</button>
        <button v-if="isRecording" @click="stopRecording">Stop Recording</button>
        <button @click="viewClips">View clips</button>
    </div>
</template>
  
<script setup>
    import { ref } from 'vue';
    import io from 'socket.io-client';

    // const { isRecording, startRecording, stopRecording } = useAudioProcessor()
    const isRecording = ref(false)

    

    const socket = io('http://127.0.0.1:5000');
    const mediaRecorder = ref(null);
    let audioChunks = []
    const audioClips = ref([]);

    const users = [
            {
                'name': 'tony',
                'lang': 'en'
            },
            {
                'name': 'guest',
                'lang': 'es'
            }
        ]

        const handleAudioChunk = ({audioFull, audioSamp, user}) => {
            socket.emit('audio_chunk', {"audio": audioFull, "sample": audioSamp, "user": user})
        }

        const start = () => {
            startRecording(handleAudioChunk, users[0]);
        }

        const startRecording = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.value = new MediaRecorder(stream);

            mediaRecorder.value.ondataavailable = event => {
                audioChunks.push(event.data);

                // When we have 1-second of audio data
                if (audioChunks.length === 1) {
                    const audioBlob = audioChunks[0];
                    audioChunks = [];

                    // Convert blob to Float32Array
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        let arrayBuffer = reader.result;

                        const byteLength = arrayBuffer.byteLength;
                        const adjustedByteLength = Math.floor(byteLength / 4) * 4;
                        if (byteLength !== adjustedByteLength) {
                            arrayBuffer = arrayBuffer.slice(0, adjustedByteLength);
                        }
                        const float32Array = new Float32Array(arrayBuffer);
                        const int16Array = float32ArrayToInt16Array(float32Array)
                        socket.emit('audio_chunk', {audio: float32Array, sample: int16Array, user: users[0]});
                    };
                    reader.readAsArrayBuffer(audioBlob);
                }
        };

            mediaRecorder.value.start(1000); // Emit data every 1 second
            isRecording.value = true;
        };

        const float32ArrayToInt16Array = (float32Array) => {
            const int16Array = new Int16Array(float32Array.length);
            for (let i = 0; i < float32Array.length; i++) {
            int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
            }
            return int16Array;
        };

    // const startRecording = async () => {
    //     isRecording.value = true
    //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    //     mediaRecorder.value = new MediaRecorder(stream);
    //     // console.log("mimetype: ",mediaRecorder.value.mimeType)

    //     mediaRecorder.value.ondataavailable = event => {
    //         console.log("audio chunk detected")
    //         socket.emit('audio_chunk', {"audio": event.data, "user": users[0]})
    //     }

    //     mediaRecorder.value.start(1000); // Record in 1-second chunks
    // };

    

    const stopRecording = () => {
    if (mediaRecorder.value) {
        mediaRecorder.value.stop();
        isRecording.value = false
        socket.emit('recording_stopped')
    }
    };

    const viewClips = () => {
        console.log(audioClips.value)
    }

    socket.on('request_users', () => {
        socket.emit('user_list', {'users': users})
    })

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    })

    socket.on('connect', () => {
        console.log('Connected to server');
    })

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server. Reason:', reason);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server on attempt:', attemptNumber);
    });

    socket.on('audio_clip', (audioBlob) => {
        // Convert the received Blob to an Object URL
        console.log("audio recieved!")
        const audioUrl = URL.createObjectURL(audioBlob);
        audioClips.value.push(audioUrl);
    });
</script>