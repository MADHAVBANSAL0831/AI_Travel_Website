"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  lastAssistantMessage?: string;
  isLoading?: boolean;
  autoSpeak?: boolean;
}

export function VoiceChat({
  onTranscript,
  lastAssistantMessage,
  isLoading = false,
  autoSpeak = true,
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenMessageRef = useRef<string>("");

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;

          setTranscript(transcriptText);

          if (result.isFinal) {
            onTranscript(transcriptText);
            setTranscript("");
            setIsListening(false);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          // Ignore "aborted" errors - they happen during normal operation
          if (event.error === "aborted" || event.error === "no-speech") {
            console.log("Speech recognition ended:", event.error);
            setIsListening(false);
            return;
          }
          console.error("Speech recognition error:", event.error);
          setError(`Speech error: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError("Speech recognition not supported in this browser");
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors on cleanup
        }
      }
    };
  }, [onTranscript]);

  // Speak text using browser's built-in speech synthesis (fallback) or ElevenLabs
  const speakText = useCallback(async (text: string) => {
    if (!text) return;

    console.log("speakText called with:", text.slice(0, 50));

    // Clean text for speech (remove markdown, etc.)
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`[^`]+`/g, "")
      .replace(/\n+/g, " ")
      .slice(0, 500); // Limit length

    setIsSpeaking(true);

    // Try ElevenLabs first, fallback to browser speech
    try {
      console.log("Calling /api/voice/speak...");
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      console.log("API response status:", response.status);

      if (response.ok && response.status !== 204) {
        const audioBlob = await response.blob();
        console.log("Audio blob size:", audioBlob.size);

        if (audioBlob.size > 0) {
          const audioUrl = URL.createObjectURL(audioBlob);

          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => {
            console.log("Audio playback ended");
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = (e) => {
            console.error("Audio playback error:", e);
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            // Fallback to browser speech
            useBrowserSpeech(cleanText);
          };
          await audioRef.current.play();
          console.log("Audio playing...");
          return;
        }
      }

      // Fallback to browser speech synthesis
      console.log("Falling back to browser speech synthesis");
      useBrowserSpeech(cleanText);
    } catch (err) {
      console.error("TTS error, using browser fallback:", err);
      useBrowserSpeech(cleanText);
    }
  }, []);

  // Browser's built-in speech synthesis
  const useBrowserSpeech = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to get a good English voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Female")
      ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        console.log("Browser speech ended");
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        console.error("Browser speech error");
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      console.log("Browser speech started");
    } else {
      setIsSpeaking(false);
    }
  }, []);

  // Auto-speak assistant messages using ElevenLabs
  useEffect(() => {
    console.log("VoiceChat useEffect triggered:", {
      autoSpeak,
      isVoiceEnabled,
      hasMessage: !!lastAssistantMessage,
      messagePreview: lastAssistantMessage?.slice(0, 30),
      lastSpoken: lastSpokenMessageRef.current?.slice(0, 30),
      isNewMessage: lastAssistantMessage !== lastSpokenMessageRef.current,
      isLoading,
      isSpeaking,
    });

    if (
      autoSpeak &&
      isVoiceEnabled &&
      lastAssistantMessage &&
      lastAssistantMessage !== lastSpokenMessageRef.current &&
      !isLoading &&
      !isSpeaking
    ) {
      console.log("✓ All conditions met, calling speakText");
      lastSpokenMessageRef.current = lastAssistantMessage;
      speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, autoSpeak, isVoiceEnabled, isLoading, isSpeaking, speakText]);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      // Stop any ongoing speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsSpeaking(false);
      }

      setError(null);
      setTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setError("Failed to start microphone");
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    if (isVoiceEnabled) {
      stopSpeaking();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  }, [isVoiceEnabled, stopSpeaking]);

  return (
    <div className="flex items-center gap-2">
      {/* Transcript Display */}
      {transcript && (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-700 dark:text-blue-300">
            <span className="animate-pulse">🎤</span> {transcript}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-500 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Microphone Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isLoading}
        className={`p-2.5 rounded-xl transition-all duration-200 ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Speaker Button */}
      <button
        onClick={isSpeaking ? stopSpeaking : toggleVoice}
        className={`p-2.5 rounded-xl transition-all duration-200 ${
          isSpeaking
            ? "bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/30"
            : isVoiceEnabled
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
        }`}
        title={isSpeaking ? "Stop speaking" : isVoiceEnabled ? "Voice enabled" : "Voice disabled"}
      >
        {isSpeaking ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isVoiceEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

