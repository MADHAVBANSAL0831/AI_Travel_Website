import axios, { AxiosInstance } from "axios";

class DifyAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.DIFY_API_URL || "https://api.dify.ai/v1",
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
  }

  // Chat Completion (for conversational AI)
  async chat(params: {
    query: string;
    user: string;
    conversationId?: string;
    inputs?: Record<string, any>;
  }) {
    const response = await this.client.post("/chat-messages", {
      query: params.query,
      user: params.user,
      conversation_id: params.conversationId,
      inputs: params.inputs || {},
      response_mode: "blocking",
    });

    return response.data;
  }

  // Streaming Chat (for real-time responses)
  async chatStream(params: {
    query: string;
    user: string;
    conversationId?: string;
    inputs?: Record<string, any>;
    onMessage: (message: string) => void;
  }) {
    const response = await this.client.post(
      "/chat-messages",
      {
        query: params.query,
        user: params.user,
        conversation_id: params.conversationId,
        inputs: params.inputs || {},
        response_mode: "streaming",
      },
      {
        responseType: "stream",
      }
    );

    return response.data;
  }

  // Workflow Execution (for your Dify workflow)
  async runWorkflow(params: {
    inputs: Record<string, any>;
    user: string;
  }) {
    const response = await this.client.post("/workflows/run", {
      inputs: params.inputs,
      user: params.user,
      response_mode: "blocking",
    });

    return response.data;
  }

  // Get Conversation History
  async getConversations(userId: string, limit: number = 20) {
    const response = await this.client.get("/conversations", {
      params: {
        user: userId,
        limit,
      },
    });

    return response.data;
  }

  // Get Messages in a Conversation
  async getMessages(conversationId: string, userId: string, limit: number = 20) {
    const response = await this.client.get("/messages", {
      params: {
        conversation_id: conversationId,
        user: userId,
        limit,
      },
    });

    return response.data;
  }

  // Send Feedback
  async sendFeedback(messageId: string, rating: "like" | "dislike", userId: string) {
    const response = await this.client.post(`/messages/${messageId}/feedbacks`, {
      rating,
      user: userId,
    });

    return response.data;
  }
}

export const difyAPI = new DifyAPI();

