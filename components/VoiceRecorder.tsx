// components/VoiceRecorder.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Volume2, Loader2, Check, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onTextExtracted: (text: string) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds, default 600 (10 minutes)
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

interface DictationResult {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  transcript_text?: string;
  error?: string;
}

export default function VoiceRecorder({ 
  onTextExtracted, 
  disabled = false, 
  maxDuration = 600 
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingState.audioUrl) URL.revokeObjectURL(recordingState.audioUrl);
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
    } catch (err) {
      setPermissionGranted(false);
      setError('Microphone permission is required for voice recording.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      // Set up audio context for monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' 
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
        }));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }));

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPaused: true }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      setRecordingState(prev => ({ ...prev, isPaused: false }));
      
      // Resume timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          return { ...prev, duration: newDuration };
        });
      }, 1000);
    }
  };

  const processRecording = async () => {
    if (!recordingState.audioBlob) return;

    setProcessing(true);
    setError(null);

    try {
      // Upload and transcribe
      const formData = new FormData();
      formData.append('audio', recordingState.audioBlob, 'recording.webm');
      formData.append('durationSec', recordingState.duration.toString());
      formData.append('vendor', 'openai');

      const response = await fetch('/api/dictations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process recording');
      }

      const result = await response.json();
      const dictationId = result.id;

      // Poll for completion
      await pollForCompletion(dictationId);

    } catch (err: any) {
      setError(err.message || 'Failed to process recording');
    } finally {
      setProcessing(false);
    }
  };

  const pollForCompletion = async (dictationId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        throw new Error('Processing timeout - please try again');
      }

      attempts++;

      try {
        const response = await fetch(`/api/dictations/${dictationId}`);
        const data: DictationResult = await response.json();

        if (data.status === 'done') {
          if (data.transcript_text) {
            setTranscriptResult(data.transcript_text);
            onTextExtracted(data.transcript_text);
          } else {
            throw new Error('No text was transcribed from the recording');
          }
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Transcription failed');
        } else {
          // Still processing, wait and try again
          await new Promise(resolve => setTimeout(resolve, 5000));
          return poll();
        }
      } catch (err) {
        throw err;
      }
    };

    return poll();
  };

  const clearRecording = () => {
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
    
    setTranscriptResult(null);
    setError(null);
  };

  if (permissionGranted === false) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Microphone Access Required</h3>
            <p className="text-sm text-red-700 mt-1">
              Voice recording requires microphone permission. Please enable microphone access and refresh the page.
            </p>
            <button
              onClick={checkMicrophonePermission}
              className="mt-3 btn btn-sm bg-red-600 text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="panel p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Status Display */}
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatTime(recordingState.duration)}
            </div>
            <div className="text-sm text-slate-600">
              {recordingState.isRecording 
                ? recordingState.isPaused ? 'Paused' : 'Recording...'
                : 'Ready to record'
              }
            </div>
            {maxDuration && (
              <div className="text-xs text-slate-500 mt-1">
                Max duration: {formatTime(maxDuration)}
              </div>
            )}
          </div>

          {/* Main Record Button */}
          {!recordingState.isRecording && !recordingState.audioBlob && (
            <button
              onClick={startRecording}
              disabled={disabled || processing}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-full flex items-center justify-center transition-colors"
            >
              <Mic className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Recording Controls */}
          {recordingState.isRecording && (
            <div className="flex items-center gap-3">
              {recordingState.isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center"
                >
                  <Play className="w-6 h-6 text-white ml-1" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="w-12 h-12 bg-yellow-600 hover:bg-yellow-700 rounded-full flex items-center justify-center"
                >
                  <Pause className="w-6 h-6 text-white" />
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center"
              >
                <Square className="w-6 h-6 text-white" />
              </button>
            </div>
          )}

          {/* Recording Complete - Show Audio Player and Process Button */}
          {recordingState.audioBlob && !processing && !transcriptResult && (
            <div className="flex flex-col items-center space-y-4">
              <audio
                ref={audioRef}
                src={recordingState.audioUrl || undefined}
                controls
                className="w-full max-w-md"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={processRecording}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Process Recording
                </button>
                
                <button
                  onClick={clearRecording}
                  className="btn flex items-center gap-2"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {processing && (
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing recording...</span>
            </div>
          )}

          {/* Success State */}
          {transcriptResult && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Recording processed successfully!</span>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Transcribed Text:</h4>
                <p className="text-sm text-green-700 whitespace-pre-wrap">
                  {transcriptResult.substring(0, 200)}
                  {transcriptResult.length > 200 && '...'}
                </p>
                {transcriptResult.length > 200 && (
                  <p className="text-xs text-green-600 mt-1">
                    Full text added to input area ({transcriptResult.length} characters)
                  </p>
                )}
              </div>
              
              <button
                onClick={clearRecording}
                className="btn w-full"
              >
                Record Another
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="panel p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Recording Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Voice Recording Tips:</p>
        <ul className="space-y-1">
          <li>• Speak clearly and at a normal pace</li>
          <li>• Record in a quiet environment when possible</li>
          <li>• Maximum recording length: {formatTime(maxDuration)}</li>
          <li>• Recording will be processed using OpenAI Whisper for high accuracy</li>
          <li>• Audio files are temporarily stored and deleted after processing</li>
        </ul>
      </div>
    </div>
  );
}
