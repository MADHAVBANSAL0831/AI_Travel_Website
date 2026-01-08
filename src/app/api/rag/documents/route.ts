/**
 * RAG Documents API
 * 
 * List all documents in the RAG system
 */

import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/services/rag-service";

export async function GET() {
  try {
    const documents = await listDocuments();
    
    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });

  } catch (error) {
    console.error("Failed to list documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

