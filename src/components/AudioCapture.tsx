'use client';

import React, { useState, useRef, useCallback } from 'react';

// Definicja propsów
interface AudioCaptureProps {
  isProcessing: boolean;
  onProcessingChange: (isProcessing: boolean) => void;
  onTranscriptionReceived: (transcript: string) => void;
}

// Dodajemy propsy do definicji komponentu
export default function AudioCapture({
  isProcessing,
  onProcessingChange,
  onTranscriptionReceived
}: AudioCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sendAudioToBackend = useCallback(async (audioBlob: Blob) => {
    // Używamy callbacku z propsów
    onProcessingChange(true);
    setError(null);
    console.log("Sending audio blob:", audioBlob);

    const formData = new FormData();
    const fileName = `audio-${Date.now()}.webm`;
    formData.append('audio', audioBlob, fileName);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Transcription API Error:', result);
        setError(`Transcription failed: ${result.error || 'Unknown server error'}. ${result.details || ''}`);
         // Błąd zostanie obsłużony w finally
      } else {
        // Używamy callbacku z propsów zamiast console.log
        console.log('Transcription successful, received text:', result.transcript);
        onTranscriptionReceived(result.transcript);
      }

    } catch (fetchError) {
      console.error('Error sending audio to backend:', fetchError);
       setError(`Network error: ${(fetchError as Error).message}`);
    } finally {
      // Używamy callbacku z propsów
      onProcessingChange(false);
    }
  }, [onProcessingChange, onTranscriptionReceived]); // Dodano zależności do useCallback

  const handleStartRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const supportedMimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];
        const selectedMimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type));
        
        if (!selectedMimeType) {
            setError("No suitable audio format supported by the browser (webm/ogg preferred).");
            return;
        }
        console.log("Using MIME type:", selectedMimeType);

        mediaRecorderRef.current = new MediaRecorder(stream, {
             mimeType: selectedMimeType
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstart = () => {
            setIsRecording(true);
            console.log('Recording started');
        };

        mediaRecorderRef.current.onstop = () => {
          setIsRecording(false);
          audioStreamRef.current?.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
          console.log('Recording stopped. Chunks collected:', audioChunksRef.current.length);

          if (audioChunksRef.current.length > 0) {
             const mimeType = mediaRecorderRef.current?.mimeType || selectedMimeType;
             const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
             sendAudioToBackend(audioBlob); // Wywołanie sendAudioToBackend obsłuży onProcessingChange
          } else {
            console.log("No audio chunks recorded.");
            // Jeśli nie ma chunków, przetwarzanie się nie rozpoczyna/kończy
          }
          audioChunksRef.current = [];
        };

        mediaRecorderRef.current.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            const recorderEvent = event as unknown as { error?: Error };
            setError(`MediaRecorder error: ${recorderEvent.error?.message || 'Unknown error'}`);
            setIsRecording(false);
             audioChunksRef.current = [];
        };

        const timeSliceMs = 3000;
        mediaRecorderRef.current.start(timeSliceMs);
        console.log(`Recording started with ${timeSliceMs}ms timeslice.`);

      } catch (err) {
        console.error('Error accessing microphone:', err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                 setError('Permission denied. Please allow microphone access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'){
                 setError('No microphone found. Please ensure a microphone is connected and enabled.');
            } else {
                 setError(`Error accessing microphone: ${err.message}`);
            }
        } else {
             setError('An unknown error occurred while accessing the microphone.');
        }
      }
    } else {
      setError('getUserMedia not supported on your browser!');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };


  return (
    <div className="p-4 border rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-xl font-semibold mb-4">Microphone Capture & Transcribe</h2>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      <div className="flex items-center space-x-4 mb-4">
        <button
          // Używamy prop isProcessing
          disabled={isProcessing}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`px-4 py-2 rounded ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
           {/* Używamy prop isProcessing */} 
          {isProcessing ? 'Processing...' : (isRecording ? 'Stop Recording' : 'Start Recording')}
        </button>
        {isRecording && (
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span>Recording...</span>
          </div>
        )}
         {/* Używamy prop isProcessing */} 
         {!isRecording && mediaRecorderRef.current && !isProcessing && (
             <span>Stopped. Press Start to record again.</span>
         )}
      </div>
       {/* Używamy prop isProcessing */} 
       {isProcessing && <p className="text-sm text-gray-500">Processing audio, please wait...</p>}
    </div>
  );
} 