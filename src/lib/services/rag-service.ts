/**
 * RAG Service - Retrieval Augmented Generation
 *
 * Enhanced with:
 * - Hybrid search (vector + keyword)
 * - Multi-query retrieval
 * - Reranking support
 * - Better chunking
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Reranking API keys (use NVIDIA if available, fallback to Cohere)
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  filename: string;
  category: string;
}

export interface RAGDocument {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Generate embeddings using Gemini text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Split text into semantic chunks for embedding
 * Uses paragraph/section-based chunking with overlap
 */
export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first (double newline or headers)
  const paragraphs = text.split(/\n\n+|\n(?=#{1,3}\s)/).filter(p => p.trim());

  let currentChunk = "";
  let overlapText = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If adding this paragraph exceeds chunk size, save current chunk
    if ((currentChunk + "\n\n" + trimmed).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());

      // Create overlap from end of current chunk
      const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim());
      overlapText = sentences.slice(-2).join(". ").trim();

      // Start new chunk with overlap
      currentChunk = overlapText ? overlapText + "\n\n" + trimmed : trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Filter out very small chunks
  return chunks.filter(c => c.length > 50);
}

/**
 * Rerank results using NVIDIA NIM or Cohere for better relevance
 * Priority: NVIDIA > Cohere > No reranking
 */
async function rerankResults(
  query: string,
  documents: DocumentChunk[],
  topN: number = 5
): Promise<DocumentChunk[]> {
  if (documents.length === 0) {
    return [];
  }

  // Try NVIDIA NIM Reranker first
  if (NVIDIA_API_KEY) {
    try {
      console.log("🔄 Using NVIDIA NIM Reranker...");
      const response = await fetch("https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-3.2-nv-rerankqa-1b-v2/reranking", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/llama-3.2-nv-rerankqa-1b-v2",
          query: { text: query },
          passages: documents.map(d => ({ text: d.content })),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // NVIDIA returns rankings array with index and logit scores
        const rankings = data.rankings || [];
        return rankings.slice(0, topN).map((r: any) => ({
          ...documents[r.index],
          similarity: r.logit, // Use NVIDIA logit score
        }));
      } else {
        console.warn("NVIDIA reranking failed:", await response.text());
      }
    } catch (error) {
      console.error("NVIDIA reranking error:", error);
    }
  }

  // Fallback to Cohere Reranker
  if (COHERE_API_KEY) {
    try {
      console.log("🔄 Using Cohere Reranker...");
      const response = await fetch("https://api.cohere.ai/v1/rerank", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "rerank-english-v3.0",
          query,
          documents: documents.map(d => d.content),
          top_n: topN,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.results.map((r: any) => ({
          ...documents[r.index],
          similarity: r.relevance_score,
        }));
      } else {
        console.warn("Cohere reranking failed, using original order");
      }
    } catch (error) {
      console.error("Cohere reranking error:", error);
    }
  }

  // No reranking available - return sorted by similarity
  console.log("ℹ️ No reranker configured, using vector similarity order");
  return documents
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/**
 * Generate multiple search queries for better recall
 */
async function generateMultipleQueries(userQuery: string): Promise<string[]> {
  const queries = [userQuery]; // Always include original

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Generate 2 alternative search queries for finding relevant information. Original query: "${userQuery}"

Return only the queries, one per line. No numbering or explanations.`;

    const result = await model.generateContent(prompt);
    const alternatives = result.response.text().split("\n").filter(q => q.trim());

    return [...queries, ...alternatives.slice(0, 2)];
  } catch (error) {
    return queries; // Return just original on error
  }
}

/**
 * Store document and its embeddings
 */
export async function storeDocument(
  filename: string,
  fileType: string,
  content: string,
  category: string = "personality",
  userId?: string
): Promise<string> {
  const supabase = createServerSupabaseClient();
  
  // Create document record
  const { data: doc, error: docError } = await supabase
    .from("rag_documents")
    .insert({
      filename,
      file_type: fileType,
      file_size: content.length,
      content: content,
      category,
    })
    .select("id")
    .single();

  if (docError) throw new Error(`Failed to store document: ${docError.message}`);

  // Chunk the content
  const chunks = chunkText(content);
  
  // Generate embeddings and store chunks
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    
    const { error: chunkError } = await supabase
      .from("rag_chunks")
      .insert({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        embedding: embedding,
        metadata: { chunkIndex: i, totalChunks: chunks.length },
      });

    if (chunkError) {
      console.error(`Failed to store chunk ${i}:`, chunkError);
    }
  }

  return doc.id;
}

/**
 * Keyword search using PostgreSQL full-text search
 */
async function keywordSearch(
  query: string,
  category: string | null,
  limit: number
): Promise<DocumentChunk[]> {
  const supabase = createServerSupabaseClient();

  // Build search query - use websearch format for natural language
  let queryBuilder = supabase
    .from("rag_chunks")
    .select(`
      id,
      document_id,
      content,
      metadata,
      rag_documents!inner(filename, category, is_active)
    `)
    .textSearch("content", query.split(" ").join(" | "), {
      type: "websearch",
      config: "english",
    })
    .eq("rag_documents.is_active", true)
    .limit(limit);

  if (category) {
    queryBuilder = queryBuilder.eq("rag_documents.category", category);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Keyword search error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    similarity: 0.5, // Default score for keyword matches
    metadata: row.metadata,
    filename: row.rag_documents?.filename || "",
    category: row.rag_documents?.category || "",
  }));
}

/**
 * Search for similar content based on query
 * Enhanced with hybrid search (vector + keyword), multi-query, and reranking
 */
export async function searchSimilarContent(
  query: string,
  options: {
    category?: string;
    threshold?: number;
    limit?: number;
    useMultiQuery?: boolean;
    useReranking?: boolean;
    useHybridSearch?: boolean;
  } = {}
): Promise<DocumentChunk[]> {
  const {
    category,
    threshold = 0.5,
    limit = 5,
    useMultiQuery = false,
    useReranking = true,
    useHybridSearch = true,
  } = options;
  const supabase = createServerSupabaseClient();

  // Generate multiple queries for better recall (optional)
  const queries = useMultiQuery
    ? await generateMultipleQueries(query)
    : [query];

  console.log(`🔍 Searching with ${queries.length} queries, hybrid: ${useHybridSearch}`);

  // Collect results from all queries
  const allResults: DocumentChunk[] = [];
  const seenIds = new Set<string>();

  // Vector search for each query
  for (const q of queries) {
    const queryEmbedding = await generateEmbedding(q);

    const { data, error } = await supabase.rpc("search_similar_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit * 2, // Get more for reranking
      filter_category: category || null,
    });

    if (error) {
      console.error("Vector search error:", error);
      continue;
    }

    // Add unique results
    for (const row of data || []) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        allResults.push({
          id: row.id,
          documentId: row.document_id,
          content: row.content,
          similarity: row.similarity,
          metadata: row.metadata,
          filename: row.filename,
          category: row.category,
        });
      }
    }
  }

  console.log(`📚 Vector search found ${allResults.length} chunks`);

  // Hybrid search: Add keyword search results
  if (useHybridSearch) {
    try {
      const keywordResults = await keywordSearch(query, category || null, limit);
      console.log(`🔤 Keyword search found ${keywordResults.length} chunks`);

      for (const result of keywordResults) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.error("Keyword search failed:", error);
    }
  }

  console.log(`📚 Total unique chunks: ${allResults.length}`);

  // Rerank results if enabled and we have enough results
  if (useReranking && allResults.length > 1 && (NVIDIA_API_KEY || COHERE_API_KEY)) {
    console.log("🔄 Reranking results...");
    return await rerankResults(query, allResults, limit);
  }

  // Sort by similarity and return top results
  return allResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get personality context for the chatbot
 * Enhanced with hybrid search, multi-query retrieval, and reranking
 */
export async function getPersonalityContext(userQuery: string): Promise<string> {
  // First try personality category with all enhancements
  let chunks = await searchSimilarContent(userQuery, {
    category: "personality",
    threshold: 0.2, // Lower threshold for better recall
    limit: 5,
    useMultiQuery: true, // Generate alternative queries
    useReranking: true, // Rerank for better relevance
    useHybridSearch: true, // Combine vector + keyword search
  });

  // If no personality docs, try all categories
  if (chunks.length === 0) {
    console.log("No personality chunks found, trying all categories...");
    chunks = await searchSimilarContent(userQuery, {
      threshold: 0.2,
      limit: 5,
      useMultiQuery: true,
      useReranking: true,
      useHybridSearch: true,
    });
  }

  console.log(`Found ${chunks.length} RAG chunks for personality context`);

  if (chunks.length === 0) return "";

  // Include similarity scores in context for debugging
  const context = chunks
    .map(c => c.content)
    .join("\n\n---\n\n");

  return `
=== PERSONALITY CONTEXT ===
The following defines who you are and how you should behave:

${context}

IMPORTANT: Use this context to shape your personality, tone, and responses.
=== END PERSONALITY CONTEXT ===
`;
}

/**
 * List all documents
 */
export async function listDocuments(): Promise<RAGDocument[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("rag_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list documents:", error);
    return [];
  }

  return (data || []).map((doc: any) => ({
    id: doc.id,
    filename: doc.filename,
    fileType: doc.file_type,
    fileSize: doc.file_size,
    category: doc.category,
    isActive: doc.is_active,
    createdAt: doc.created_at,
  }));
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("rag_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("Failed to delete document:", error);
    return false;
  }

  return true;
}

/**
 * Toggle document active status
 */
export async function toggleDocumentStatus(documentId: string, isActive: boolean): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("rag_documents")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("Failed to update document:", error);
    return false;
  }

  return true;
}

