import { NextRequest, NextResponse } from "next/server";
import { elevenLabsAPI } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      // Return empty audio for development
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // Call ElevenLabs API
    const audioData = await elevenLabsAPI.textToSpeech({
      text,
      voiceId,
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    });

    // Return audio as response
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioData.length.toString(),
      },
    });
  } catch (error) {
    console.error("Voice synthesis error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}

