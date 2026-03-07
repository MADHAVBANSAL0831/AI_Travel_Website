"use client";
import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { Send, Mic, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void; onStop?: () => void; isLoading?: boolean; disabled?: boolean;
  placeholder?: string; lastAssistantMessage?: string; voiceMode?: boolean; onVoiceModeChange?: (enabled: boolean) => void; isVoiceEnabled?: boolean;
}

export function ChatInput({ onSendMessage, onStop, isLoading = false, disabled = false, placeholder = "Tell me about your travel plans...", lastAssistantMessage, voiceMode = false, onVoiceModeChange, isVoiceEnabled = true }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSpokenMessageRef = useRef<string>("");
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");
  const manualSendRef = useRef<boolean>(false); // Flag to prevent double-send
  const exitAfterSpeakingRef = useRef<boolean>(false); // Flag to exit voice mode after AI speaks
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Track current audio to prevent overlapping

  // Setup browser SpeechRecognition for live transcript display
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            interim += e.results[i][0].transcript;
          }
          liveTranscriptRef.current = interim;
          setTranscript(interim);
        };
        recognitionRef.current.onerror = () => {};
        recognitionRef.current.onend = () => {
          if (voiceMode && isListening && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        };
      }
    }
    return () => { if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {} };
  }, [voiceMode, isListening]);

  const stopRecording = useCallback(() => {
    if (silenceTimeoutRef.current) { clearTimeout(silenceTimeoutRef.current); silenceTimeoutRef.current = null; }
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Show immediate feedback
      setIsListening(true);
      setTranscript("Requesting microphone...");

      // Request audio with optimized settings for speech
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Lower sample rate = smaller files, still good for speech
        }
      });

      setTranscript(""); // Clear the "requesting" message
      streamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Use opus codec for better compression (smaller files = faster upload)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) { setIsListening(false); return; }

        setIsTranscribing(true);
        setTranscript("Transcribing...");

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.text?.trim()) {
            setTranscript(data.text);
            console.log('[Voice] ✅ Transcription complete:', data.text);
            // Don't auto-send - wait for user to click send button
          } else {
            setTranscript("");
          }
        } catch (err) {
          console.error("Transcription error:", err);
          setTranscript("");
        }
        finally {
          setIsTranscribing(false);
          setIsListening(false);
        }
      };

      mediaRecorder.start(100);
      // isListening already set to true at the beginning

      // Start browser speech recognition for live transcript display
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setTranscript("Listening..."); // Show immediate feedback
        } catch {}
      }

      let lastLogTime = 0;
      const checkSilence = () => {
        if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Log audio level every 500ms for debugging
        const now = Date.now();
        if (now - lastLogTime > 500) {
          console.log('[Voice] Audio level:', avg.toFixed(2));
          lastLogTime = now;
        }

        // Silence threshold: avg < 40 is considered silence
        // Background noise is typically 16-20, speaking is 40+
        if (avg < 40) {
          if (!silenceTimeoutRef.current) {
            console.log('[Voice] 🔇 Silence detected (avg:', avg.toFixed(2), '), starting 2s timeout...');
            silenceTimeoutRef.current = setTimeout(() => {
              console.log('[Voice] ⏱️ 2s silence timeout reached, stopping recording');
              stopRecording();
            }, 2000); // 2 seconds of silence
          }
        } else {
          // Sound detected, cancel silence timeout
          if (silenceTimeoutRef.current) {
            console.log('[Voice] 🔊 Sound detected (avg:', avg.toFixed(2), '), canceling silence timeout');
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
        if (mediaRecorderRef.current?.state === 'recording') requestAnimationFrame(checkSilence);
      };
      requestAnimationFrame(checkSilence);
    } catch (err) {
      console.error("Mic access error:", err);
      setIsListening(false);
      setTranscript("Microphone access denied");
      setTimeout(() => setTranscript(""), 2000);
    }
  }, [onSendMessage, stopRecording]);

  // Stop recording when AI starts speaking
  useEffect(() => {
    if (isSpeaking && isListening) {
      console.log('[Voice] 🔇 AI is speaking, stopping microphone');
      stopRecording();
    }
  }, [isSpeaking, isListening, stopRecording]);

  // No auto-restart of recording - user must click mic button again
  // This creates a one-shot voice input experience

  useEffect(() => {
    if (!voiceMode && isListening) stopRecording();
    return () => { if (!voiceMode) stopRecording(); };
  }, [voiceMode, isListening, stopRecording]);

  const speakText = useCallback(async (text: string) => {
    if (!text || typeof window === "undefined") return;

    // Stop any existing audio to prevent overlapping voices
    if (currentAudioRef.current) {
      console.log('[Voice] 🛑 Stopping previous audio to prevent overlap');
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Cancel any browser TTS
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Stop recording immediately when AI starts speaking
    if (isListening) {
      console.log('[Voice] Stopping recording because AI is about to speak');
      stopRecording();
    }

    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`[^`]+`/g, "").replace(/\n+/g, " ").slice(0, 500);
    setIsSpeaking(true);

    try {
      // Use streaming endpoint for lower latency - starts playing while still downloading
      const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice - consistent across all TTS calls
      console.log('[Voice] 🎵 Attempting ElevenLabs streaming TTS...');
      const res = await fetch("/api/voice/speak-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voiceId })
      });

      console.log('[Voice] ElevenLabs stream response:', res.status, res.statusText);

      if (res.ok && res.status !== 204 && res.body) {
        console.log('[Voice] ✅ Using ElevenLabs streaming TTS');
        // Create MediaSource for streaming playback
        const mediaSource = new MediaSource();
        const audio = new Audio();
        audio.src = URL.createObjectURL(mediaSource);
        currentAudioRef.current = audio; // Store reference to prevent overlapping

        mediaSource.addEventListener('sourceopen', async () => {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          const reader = res.body!.getReader();

          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              if (mediaSource.readyState === 'open') mediaSource.endOfStream();
              return;
            }
            // Wait for buffer to be ready before appending
            if (!sourceBuffer.updating) {
              sourceBuffer.appendBuffer(value);
            }
            await new Promise(resolve => {
              if (sourceBuffer.updating) {
                sourceBuffer.addEventListener('updateend', resolve, { once: true });
              } else resolve(undefined);
            });
            return pump();
          };

          pump().catch(console.error);
        });

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audio.src);
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audio.src);
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.error("[Voice] ❌ ElevenLabs streaming TTS failed:", e);
      // Fallback to regular endpoint with same voice ID
      try {
        console.log('[Voice] 🔄 Trying ElevenLabs regular endpoint...');
        const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice - consistent
        const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, voiceId }) });
        console.log('[Voice] ElevenLabs regular response:', res.status, res.statusText);

        if (res.ok && res.status !== 204) {
          console.log('[Voice] ✅ Using ElevenLabs regular TTS');
          const blob = await res.blob();
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            currentAudioRef.current = audio; // Store reference
            audio.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
              if (currentAudioRef.current === audio) currentAudioRef.current = null;
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
              if (currentAudioRef.current === audio) currentAudioRef.current = null;
            };
            await audio.play(); return;
          }
        }
      } catch (err) {
        console.error("[Voice] ❌ ElevenLabs regular TTS also failed:", err);
      }
    }

    // Browser fallback - use consistent female voice
    console.warn('[Voice] ⚠️ ElevenLabs unavailable, falling back to browser TTS');
    if ("speechSynthesis" in window) {
      console.log('[Voice] 🔊 Using browser TTS fallback');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.0;
      u.pitch = 1.0;

      // Try to find a consistent female English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) =>
        v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Karen"))
      ) || voices.find((v) => v.lang.startsWith("en-US")) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

      if (preferredVoice) {
        u.voice = preferredVoice;
        console.log('[Voice] 🎤 Using browser voice:', preferredVoice.name);
      }

      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    } else setIsSpeaking(false);
  }, [isListening, stopRecording]);

  useEffect(() => {
    // Only speak if we haven't already handled this message via streaming events
    if (voiceMode && isVoiceEnabled && lastAssistantMessage && lastAssistantMessage !== lastSpokenMessageRef.current && !isLoading && !isSpeaking && !isRemainingTextSpokenRef.current) {
      console.log('[Voice] 🔔 Regular useEffect triggered - speaking full message:', lastAssistantMessage);
      lastSpokenMessageRef.current = lastAssistantMessage;
      speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, voiceMode, isVoiceEnabled, isLoading, isSpeaking, speakText]);

  // Stop TTS when voice mode is disabled
  useEffect(() => {
    if (!voiceMode && isSpeaking) {
      console.log('[Voice] 🛑 Voice mode disabled, stopping TTS');
      window.speechSynthesis?.cancel();

      // Stop all audio elements
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      setIsSpeaking(false);
    }
  }, [voiceMode, isSpeaking]);

  // Track what we've already spoken and prevent duplicate speech
  const firstSentenceRef = useRef<string>("");
  const hasSpokenFirstSentenceRef = useRef<boolean>(false);
  const streamingCompleteHandledRef = useRef<boolean>(false);
  const speakingRemainingTextRef = useRef<boolean>(false); // Prevent double-speaking remaining text
  const isRemainingTextSpokenRef = useRef<boolean>(false); // Track if we've already spoken the remaining text

  // Listen for streaming TTS events - ONLY depend on voiceMode and isVoiceEnabled
  useEffect(() => {
    const handleFirstSentence = (e: CustomEvent<string>) => {
      // Just store the first sentence, but DON'T speak it yet
      // We'll wait for the full message to ensure consistent voice tone
      if (voiceMode && isVoiceEnabled && e.detail && !hasSpokenFirstSentenceRef.current) {
        console.log('[Voice] 📝 First sentence received (not speaking yet):', e.detail);
        hasSpokenFirstSentenceRef.current = true;
        firstSentenceRef.current = e.detail;
        speakingRemainingTextRef.current = false;
        isRemainingTextSpokenRef.current = false;
      }
    };

    const handleFullMessage = (e: CustomEvent<string>) => {
      if (voiceMode && isVoiceEnabled && e.detail && !streamingCompleteHandledRef.current) {
        console.log('[Voice] 📝 [FULL MESSAGE] Received complete message. Length:', e.detail.length);

        streamingCompleteHandledRef.current = true;

        // Mark the full message as spoken immediately to prevent the regular useEffect from triggering
        lastSpokenMessageRef.current = e.detail;
        isRemainingTextSpokenRef.current = true; // Prevent regular useEffect from triggering

        // Speak the FULL message in one go for consistent voice tone
        console.log('[Voice] 🎵 Speaking FULL MESSAGE (ensures consistent tone):', e.detail.slice(0, 100) + '...');
        speakText(e.detail);
      }
    };

    window.addEventListener("speakFirstSentence", handleFirstSentence as EventListener);
    window.addEventListener("streamingComplete", handleFullMessage as EventListener);

    return () => {
      window.removeEventListener("speakFirstSentence", handleFirstSentence as EventListener);
      window.removeEventListener("streamingComplete", handleFullMessage as EventListener);
    };
  }, [voiceMode, isVoiceEnabled, speakText]);

  // Monitor speaking state and exit voice mode when AI finishes speaking (if flag is set)
  useEffect(() => {
    if (exitAfterSpeakingRef.current && !isSpeaking && !isLoading) {
      console.log('[Voice] 🔄 AI finished speaking, exiting voice mode');
      exitAfterSpeakingRef.current = false;
      onVoiceModeChange?.(false);
    }
  }, [isSpeaking, isLoading, onVoiceModeChange]);

  // Function to stop all speech/audio
  const stopSpeaking = useCallback(() => {
    console.log('[Voice] 🛑 Stopping all speech');

    // Stop current audio reference
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Stop browser TTS
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Stop all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    setIsSpeaking(false);
  }, []);

  const toggleVoiceMode = useCallback(async () => {
    // Special case: If already in voice mode and AI is speaking, just stop speaking and go to listening
    if (voiceMode && isSpeaking) {
      console.log('[Voice] 🛑 Mic clicked while speaking - stopping speech and going to listening mode');
      stopSpeaking();
      // Always start recording to go back to listening mode (even if isListening is somehow true)
      setTranscript(""); // Clear any old transcript
      await startRecording();
      return; // Stay in voice mode
    }

    const n = !voiceMode;
    onVoiceModeChange?.(n);

    if (n) {
      // Entering voice mode
      if (lastAssistantMessage) lastSpokenMessageRef.current = lastAssistantMessage;
      // Reset streaming flags
      hasSpokenFirstSentenceRef.current = false;
      streamingCompleteHandledRef.current = false;
      firstSentenceRef.current = "";

      // Start recording immediately
      await startRecording();
    } else {
      // Exiting voice mode
      stopRecording();
      setTranscript("");

      // Stop all TTS when exiting voice mode
      if (isSpeaking) {
        stopSpeaking();
      }

      // Reset streaming flags
      hasSpokenFirstSentenceRef.current = false;
      streamingCompleteHandledRef.current = false;
      firstSentenceRef.current = "";
    }
  }, [voiceMode, onVoiceModeChange, isSpeaking, lastAssistantMessage, stopRecording, startRecording, stopSpeaking]);

  // Manual send function for voice mode
  const handleManualSend = useCallback(() => {
    if (transcript.trim()) {
      console.log('[Voice] 📤 Manual send:', transcript);
      // Reset streaming flags before sending new message
      hasSpokenFirstSentenceRef.current = false;
      streamingCompleteHandledRef.current = false;
      speakingRemainingTextRef.current = false;
      isRemainingTextSpokenRef.current = false;
      firstSentenceRef.current = "";
      stopRecording();
      onSendMessage(transcript.trim());
      setTranscript("");
      liveTranscriptRef.current = "";
      // Set flag to exit voice mode after AI finishes speaking
      exitAfterSpeakingRef.current = true;
      console.log('[Voice] ✅ Message sent, will exit voice mode after AI speaks');
    }
  }, [transcript, stopRecording, onSendMessage]);

  useEffect(() => { const t = textareaRef.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; } }, [inputValue]);
  useEffect(() => { if (!isLoading && textareaRef.current) textareaRef.current.focus(); }, [isLoading]);
  const handleSubmit = () => { if (!inputValue.trim() || isLoading || disabled) return; onSendMessage(inputValue.trim()); setInputValue(""); if (textareaRef.current) { textareaRef.current.style.height = "auto"; setTimeout(() => textareaRef.current?.focus(), 10); } };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };

  if (voiceMode) return (
    <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-3 md:px-4 py-2">
      <div className="max-w-3xl mx-auto"><div className={cn("relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200")}>
        <button type="button" className="p-2 md:p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl ml-0.5 md:ml-1 transition-all duration-200 self-center" title="Attach file (coming soon)" disabled><Paperclip className="h-4 w-4 md:h-5 md:w-5" /></button>
        <div className="flex-1 py-2 md:py-3 px-1 md:px-2 flex flex-col items-center justify-center gap-1">
          {isSpeaking ? <div className="flex items-end gap-0.5 md:gap-1 h-5 md:h-6">{[60,100,40,80,50,90,30].map((h,i)=><span key={i} className="w-0.5 md:w-1 bg-green-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{height:`${h}%`,animationDelay:`${i*100}ms`}}/>)}</div>
          : isLoading || isTranscribing ? <div className="flex items-center gap-1.5 md:gap-2">{[0,150,300].map((d,i)=><span key={i} className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay:`${d}ms`}}/>)}</div>
          : <div className="flex items-center gap-1 md:gap-1.5">{[0,100,200,300,400].map((d,i)=><span key={i} className="w-2 h-2 md:w-2.5 md:h-2.5 bg-blue-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{animationDelay:`${d}ms`}}/>)}</div>}
          <span className="text-[11px] md:text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] md:max-w-none">{transcript || (isSpeaking ? "Speaking..." : isLoading || isTranscribing ? "Thinking..." : isListening ? "Listening..." : "Ready")}</span>
        </div>
        <button type="button" onClick={toggleVoiceMode} className="p-2 md:p-3 rounded-xl transition-all duration-200 self-center bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700" title="Exit voice mode"><Mic className="h-4 w-4 md:h-5 md:w-5" /></button>
        <div className="p-1.5 md:p-2 self-center">
          <Button
            type="button"
            size="icon"
            onClick={isSpeaking ? stopSpeaking : handleManualSend}
            disabled={!isSpeaking && (!transcript || isLoading || isTranscribing)}
            className={cn(
              "rounded-xl h-9 w-9 md:h-10 md:w-10 transition-all duration-200",
              isSpeaking
                ? "bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white active:bg-red-900"
                : transcript && !isLoading && !isTranscribing
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400"
            )}
            title={isSpeaking ? "Stop speaking" : "Send message"}
          >
            {isSpeaking ? (
              <Square className="h-3.5 w-3.5 md:h-4 md:w-4 fill-current" />
            ) : (
              <Send className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>
        </div>
      </div><p className="text-center text-[11px] md:text-xs text-gray-400 dark:text-gray-500 mt-1.5 md:mt-2 px-2">TravelHub can make mistakes. Check important info before booking.</p></div>
    </div>
  );

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-3 md:px-4 py-2">
      <div className="max-w-3xl mx-auto"><div className={cn("relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200","focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:shadow-xl")}>
        <button type="button" className="p-2 md:p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl ml-0.5 md:ml-1 transition-all duration-200 self-center" title="Attach file (coming soon)" disabled><Paperclip className="h-4 w-4 md:h-5 md:w-5" /></button>
        <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} disabled={isLoading || disabled} rows={1} className={cn("flex-1 resize-none bg-transparent py-2 md:py-3 px-1.5 md:px-2 text-sm md:text-base text-gray-900 dark:text-gray-100","focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500","max-h-[200px] overflow-y-auto")} />
        <button type="button" onClick={toggleVoiceMode} disabled={isLoading} className="p-2 md:p-3 rounded-xl transition-all duration-200 self-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50" title="Enter voice mode"><Mic className="h-4 w-4 md:h-5 md:w-5" /></button>
        <div className="p-1.5 md:p-2 self-center">{isLoading ? <Button type="button" size="icon" onClick={onStop} className="rounded-xl h-9 w-9 md:h-10 md:w-10 bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white active:bg-red-900"><Square className="h-3.5 w-3.5 md:h-4 md:w-4 fill-current" /></Button>
          : <Button type="button" size="icon" className={cn("rounded-xl h-9 w-9 md:h-10 md:w-10 transition-all duration-200",inputValue.trim()?"bg-blue-600 hover:bg-blue-700 active:bg-blue-800":"bg-gray-200 dark:bg-gray-700 text-gray-400")} disabled={!inputValue.trim() || disabled} onClick={handleSubmit}><Send className="h-4 w-4 md:h-5 md:w-5" /></Button>}</div>
      </div><p className="text-center text-[11px] md:text-xs text-gray-400 dark:text-gray-500 mt-1.5 md:mt-2 px-2">TravelHub can make mistakes. Check important info before booking.</p></div>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
