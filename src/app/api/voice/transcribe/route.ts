import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.error("[STT API] No ElevenLabs API key configured");
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[STT API] Received audio file:", audioFile.name, "size:", audioFile.size);

    // Convert File to ArrayBuffer then to Blob for fetch
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Create form data for ElevenLabs
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("file", new Blob([audioBuffer], { type: audioFile.type }), audioFile.name || "audio.webm");
    elevenLabsFormData.append("model_id", "scribe_v1");

    console.log("[STT API] Calling ElevenLabs Scribe API...");
    
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenLabsFormData,
    });

    console.log("[STT API] ElevenLabs response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[STT API] ElevenLabs error:", errorText);
      return NextResponse.json({ error: "Transcription failed", details: errorText }, { status: response.status });
    }

    const result = await response.json();
    console.log("[STT API] Transcription result:", result);

    return NextResponse.json({ 
      text: result.text || "",
      language: result.language_code || "en"
    });

  } catch (error) {
    console.error("[STT API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

