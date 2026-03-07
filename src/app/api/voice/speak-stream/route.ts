import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

    if (!apiKey) {
      return new Response(null, { status: 204 });
    }

    // Use streaming endpoint for lower latency
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || defaultVoiceId}/stream?optimize_streaming_latency=2&output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: "eleven_multilingual_v2", // Most advanced, emotionally-aware model
          voice_settings: {
            stability: 0.4, // 0.4 = natural expressiveness (recommended for multilingual v2)
            similarity_boost: 0.9, // 0.9 = high similarity with natural variation
            style: 0.3, // 0.3 = moderate expressiveness for human-like speech
            use_speaker_boost: true, // Enhances voice clarity and quality
          },
          language_code: "en", // Explicitly set English for better pronunciation
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS Stream] ElevenLabs error:", errorText);
      return new Response(JSON.stringify({ error: "TTS failed" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the audio response directly to client
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TTS Stream] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

