import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;

    console.log("[TTS API] Request received, text length:", text?.length);

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // Sarah voice (consistent with stream endpoint)

    // Check if ElevenLabs API key is configured
    if (!apiKey) {
      console.log("[TTS API] No API key configured, returning 204");
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }

    console.log("[TTS API] Calling ElevenLabs API with voice:", voiceId || defaultVoiceId);

    // Call ElevenLabs API directly
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || defaultVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 500), // Limit text length
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

    console.log("[TTS API] ElevenLabs response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS API] ElevenLabs error:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const audioData = await response.arrayBuffer();
    console.log("[TTS API] Audio data size:", audioData.byteLength);

    // Return audio as response
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[TTS API] Voice synthesis error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}

