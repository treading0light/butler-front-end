RIGHT BEFORE CHANGE

export default function useAudioProcessor() {
  let audioContext;
  if (process.client) { // Ensure AudioContext is initialized only on the client side
    audioContext = new AudioContext();
  }

  let processorNode = null;
  let source = null;

  const isRecording = ref(false);

  const startRecording = async (onAudioChunk, user) => {
    if (audioContext.state === 'suspended') { // Ensure AudioContext is in the right state
      await audioContext.resume();
    }

    try {
      await audioContext.audioWorklet.addModule('/audioProcessor.js');
    } catch (error) {
        console.error('Error loading audio worklet module:', error);
        return; // Exit the function if there's an error
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        source = audioContext.createMediaStreamSource(stream);
        processorNode = new AudioWorkletNode(audioContext, 'audio-chunk-processor');

        processorNode.port.onmessage = event => {
          if (event.data.error) {
            console.error("Error in AudioWorkletProcessor:", event.data.error);
          } else {
            console.log("message!")
            const float32Buffer = event.data;
            const int16Buffer = float32ArrayToInt16Array(float32Buffer);
            onAudioChunk({ audioFull: float32Buffer, audioSamp: int16Buffer, user: user });
          }
         
        };

        source.connect(processorNode);
        processorNode.connect(audioContext.destination);
        isRecording.value = true;
      })
      .catch(error => {
        console.error('Error accessing the microphone:', error);
      });
  };

  const stopRecording = () => {
    if (source) {
      source.disconnect();
      source.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (processorNode) {
      processorNode.port.postMessage({ command: 'stop' });
      processorNode.disconnect();
    }
    isRecording.value = false;
  };

  const float32ArrayToInt16Array = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.min(1, float32Array[i]) * 0x7FFF;
    }
    return int16Array;
  };

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}