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
      // Request audio with optimized settings for speech
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Lower sample rate = smaller files, still good for speech
        }
      });
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
            onSendMessage(data.text.trim());
            setTimeout(() => setTranscript(""), 500);
          } else setTranscript("");
        } catch (err) { console.error("Transcription error:", err); setTranscript(""); }
        finally { setIsTranscribing(false); setIsListening(false); }
      };

      mediaRecorder.start(100);
      setIsListening(true);

      // Start browser speech recognition for live transcript display
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }

      const checkSilence = () => {
        if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (avg < 10) {
          if (!silenceTimeoutRef.current) silenceTimeoutRef.current = setTimeout(() => stopRecording(), 1200); // Reduced from 2s to 1.2s for faster response
        } else if (silenceTimeoutRef.current) { clearTimeout(silenceTimeoutRef.current); silenceTimeoutRef.current = null; }
        if (mediaRecorderRef.current?.state === 'recording') requestAnimationFrame(checkSilence);
      };
      requestAnimationFrame(checkSilence);
    } catch (err) { console.error("Mic access error:", err); setIsListening(false); }
  }, [onSendMessage, stopRecording]);

  useEffect(() => {
    if (voiceMode && !isListening && !isSpeaking && !isLoading && !isTranscribing) {
      const timer = setTimeout(() => startRecording(), 300);
      return () => clearTimeout(timer);
    }
  }, [voiceMode, isListening, isSpeaking, isLoading, isTranscribing, startRecording]);

  useEffect(() => {
    if (!voiceMode && isListening) stopRecording();
    return () => { if (!voiceMode) stopRecording(); };
  }, [voiceMode, isListening, stopRecording]);

  const speakText = useCallback(async (text: string) => {
    if (!text || typeof window === "undefined") return;
    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`[^`]+`/g, "").replace(/\n+/g, " ").slice(0, 500);
    setIsSpeaking(true);

    try {
      // Use streaming endpoint for lower latency - starts playing while still downloading
      const res = await fetch("/api/voice/speak-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean })
      });

      if (res.ok && res.status !== 204 && res.body) {
        // Create MediaSource for streaming playback
        const mediaSource = new MediaSource();
        const audio = new Audio();
        audio.src = URL.createObjectURL(mediaSource);

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

        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audio.src); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audio.src); };
        await audio.play();
        return;
      }
    } catch (e) {
      console.log("Streaming TTS failed, trying regular endpoint:", e);
      // Fallback to regular endpoint
      try {
        const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
        if (res.ok && res.status !== 204) {
          const blob = await res.blob();
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob); const audio = new Audio(url);
            audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
            audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
            await audio.play(); return;
          }
        }
      } catch { console.log("Regular TTS also failed"); }
    }

    // Browser fallback
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean); u.rate = 1.0; u.pitch = 1.0;
      const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) || window.speechSynthesis.getVoices()[0]; if (v) u.voice = v;
      u.onend = () => setIsSpeaking(false); u.onerror = () => setIsSpeaking(false); window.speechSynthesis.speak(u);
    } else setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (voiceMode && isVoiceEnabled && lastAssistantMessage && lastAssistantMessage !== lastSpokenMessageRef.current && !isLoading && !isSpeaking) {
      lastSpokenMessageRef.current = lastAssistantMessage; speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, voiceMode, isVoiceEnabled, isLoading, isSpeaking, speakText]);

  // Listen for first sentence event (for early TTS during streaming)
  useEffect(() => {
    const handleFirstSentence = (e: CustomEvent<string>) => {
      if (voiceMode && isVoiceEnabled && !isSpeaking && e.detail) {
        speakText(e.detail);
      }
    };
    window.addEventListener("speakFirstSentence", handleFirstSentence as EventListener);
    return () => window.removeEventListener("speakFirstSentence", handleFirstSentence as EventListener);
  }, [voiceMode, isVoiceEnabled, isSpeaking, speakText]);

  const toggleVoiceMode = useCallback(() => {
    const n = !voiceMode; onVoiceModeChange?.(n);
    if (n) { if (lastAssistantMessage) lastSpokenMessageRef.current = lastAssistantMessage; }
    else { stopRecording(); setTranscript(""); if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); } }
  }, [voiceMode, onVoiceModeChange, isSpeaking, lastAssistantMessage, stopRecording]);

  useEffect(() => { const t = textareaRef.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; } }, [inputValue]);
  useEffect(() => { if (!isLoading && textareaRef.current) textareaRef.current.focus(); }, [isLoading]);
  const handleSubmit = () => { if (!inputValue.trim() || isLoading || disabled) return; onSendMessage(inputValue.trim()); setInputValue(""); if (textareaRef.current) { textareaRef.current.style.height = "auto"; setTimeout(() => textareaRef.current?.focus(), 10); } };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };

  if (voiceMode) return (
    <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-2">
      <div className="max-w-3xl mx-auto"><div className={cn("relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200")}>
        <div className="flex-1 py-3 px-4 flex flex-col items-center justify-center gap-1">
          {isSpeaking ? <div className="flex items-end gap-1 h-6">{[60,100,40,80,50,90,30].map((h,i)=><span key={i} className="w-1 bg-green-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{height:`${h}%`,animationDelay:`${i*100}ms`}}/>)}</div>
          : isLoading || isTranscribing ? <div className="flex items-center gap-2">{[0,150,300].map((d,i)=><span key={i} className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay:`${d}ms`}}/>)}</div>
          : <div className="flex items-center gap-1.5">{[0,100,200,300,400].map((d,i)=><span key={i} className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{animationDelay:`${d}ms`}}/>)}</div>}
          <span className="text-xs text-gray-400 dark:text-gray-500">{transcript || (isSpeaking ? "Speaking..." : isLoading || isTranscribing ? "Thinking..." : isListening ? "Listening..." : "Ready")}</span>
        </div>
        <div className="p-2"><button type="button" onClick={toggleVoiceMode} className="p-3 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all duration-200" title="Exit voice mode"><Mic className="h-5 w-5" /></button></div>
      </div><p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">TravelHub can make mistakes. Check important info before booking.</p></div>
    </div>
  );

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-2">
      <div className="max-w-3xl mx-auto"><div className={cn("relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200","focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:shadow-xl")}>
        <button type="button" className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl ml-1 transition-all duration-200 self-center" title="Attach file (coming soon)" disabled><Paperclip className="h-5 w-5" /></button>
        <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} disabled={isLoading || disabled} rows={1} className={cn("flex-1 resize-none bg-transparent py-3 px-2 text-base text-gray-900 dark:text-gray-100","focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500","max-h-[200px] overflow-y-auto")} />
        <button type="button" onClick={toggleVoiceMode} disabled={isLoading} className="p-3 rounded-xl transition-all duration-200 self-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Enter voice mode"><Mic className="h-5 w-5" /></button>
        <div className="p-2 self-center">{isLoading ? <Button type="button" size="icon" onClick={onStop} className="rounded-xl h-10 w-10 bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white"><Square className="h-4 w-4 fill-current" /></Button>
          : <Button type="button" size="icon" className={cn("rounded-xl h-10 w-10 transition-all duration-200",inputValue.trim()?"bg-blue-600 hover:bg-blue-700":"bg-gray-200 dark:bg-gray-700 text-gray-400")} disabled={!inputValue.trim() || disabled} onClick={handleSubmit}><Send className="h-5 w-5" /></Button>}</div>
      </div><p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">TravelHub can make mistakes. Check important info before booking.</p></div>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
