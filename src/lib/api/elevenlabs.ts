import axios, { AxiosInstance } from "axios";

class ElevenLabsAPI {
  private client: AxiosInstance;
  private voiceId: string;

  constructor() {
    this.client = axios.create({
      baseURL: "https://api.elevenlabs.io/v1",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
    });
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice
  }

  // Text to Speech
  async textToSpeech(params: {
    text: string;
    voiceId?: string;
    modelId?: string;
    voiceSettings?: {
      stability: number;
      similarity_boost: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  }) {
    const response = await this.client.post(
      `/text-to-speech/${params.voiceId || this.voiceId}`,
      {
        text: params.text,
        model_id: params.modelId || "eleven_monolingual_v1",
        voice_settings: params.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        responseType: "arraybuffer",
      }
    );

    return response.data;
  }

  // Text to Speech Streaming
  async textToSpeechStream(params: {
    text: string;
    voiceId?: string;
  }) {
    const response = await this.client.post(
      `/text-to-speech/${params.voiceId || this.voiceId}/stream`,
      {
        text: params.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        responseType: "stream",
      }
    );

    return response.data;
  }

  // Get Available Voices
  async getVoices() {
    const response = await this.client.get("/voices");
    return response.data;
  }

  // Get Voice Details
  async getVoice(voiceId: string) {
    const response = await this.client.get(`/voices/${voiceId}`);
    return response.data;
  }

  // Get User Subscription Info
  async getSubscription() {
    const response = await this.client.get("/user/subscription");
    return response.data;
  }

  // Get Character Usage
  async getUsage() {
    const response = await this.client.get("/user");
    return response.data;
  }
}

export const elevenLabsAPI = new ElevenLabsAPI();

