class AudioChunkProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 44100; // Assuming a sample rate of 44100Hz
        this.bufferSize = 2 * this.sampleRate; // Buffer for 1 second
        this.overlapSize = Math.floor(this.sampleRate * 0.5); // Overlap by half a second
        this.buffer = new Float32Array(this.bufferSize + this.overlapSize); // Buffer with overlap
        this.bufferIndex = 0;
        this.active = true;
        this.port.onmessage = (event) => {
            if (event.data.command === 'stop') {
                this.active = false;
            }
        };
    }

    process(inputs, outputs) {
        if (!this.active) {
            return false;
        }

        try {
            const input = inputs[0][0]; // Mono input for simplicity

            for (let i = 0; i < input.length; i++) {
                this.buffer[this.bufferIndex++] = input[i];

                if (this.bufferIndex >= this.bufferSize) {
                    // Send the buffer with overlap to the main thread
                    this.port.postMessage(this.buffer.slice(0, this.bufferSize));
                    // Shift the overlap to the start of the buffer
                    this.buffer.copyWithin(0, this.bufferSize, this.bufferIndex);
                    this.bufferIndex = this.overlapSize;
                }
            }

            // Copy the input to the output to keep the audio flowing
            outputs[0][0].set(input);

        } catch (error) {
            // Post the error to the main thread
            this.port.postMessage({ error: error.message });
        }

        return true; // Keep the processor alive
    }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);