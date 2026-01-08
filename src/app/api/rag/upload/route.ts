/**
 * RAG Document Upload API
 * 
 * Handles PDF, DOCX, and TXT file uploads
 * Extracts text, chunks, embeds, and stores in Supabase pgvector
 */

import { NextRequest, NextResponse } from "next/server";
import { storeDocument } from "@/lib/services/rag-service";

// Dynamic imports for PDF and DOCX parsing
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Extract text from different file types
 */
async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case "pdf":
      return await parsePDF(buffer);

    case "docx":
      return await parseDOCX(buffer);

    case "txt":
      return buffer.toString("utf-8");

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Get file type from mime type or extension
 */
function getFileType(filename: string, mimeType: string): string {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mimeType === "text/plain" || filename.endsWith(".txt")) {
    return "txt";
  }
  throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT files.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "personality";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Get file type
    const fileType = getFileType(file.name, file.type);

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const text = await extractText(buffer, fileType);

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from the file." },
        { status: 400 }
      );
    }

    // Store document with embeddings
    const documentId = await storeDocument(
      file.name,
      fileType,
      text,
      category
    );

    return NextResponse.json({
      success: true,
      documentId,
      filename: file.name,
      fileType,
      textLength: text.length,
      message: "Document uploaded and processed successfully!",
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

