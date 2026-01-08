-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store uploaded documents (PDF, DOCX, TXT)
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt'
  file_size INTEGER,
  original_content TEXT, -- Store original extracted text
  category TEXT DEFAULT 'personality', -- 'personality', 'knowledge', 'faq'
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store document chunks with embeddings
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini text-embedding-004 produces 768-dim vectors
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx 
ON rag_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for filtering by document
CREATE INDEX IF NOT EXISTS rag_chunks_document_idx ON rag_chunks(document_id);

-- Index for active documents
CREATE INDEX IF NOT EXISTS rag_documents_active_idx ON rag_documents(is_active);

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  filename TEXT,
  category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata,
    d.filename,
    d.category
  FROM rag_chunks c
  JOIN rag_documents d ON c.document_id = d.id
  WHERE d.is_active = true
    AND (filter_category IS NULL OR d.category = filter_category)
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RLS Policies
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read documents
CREATE POLICY "Allow read access to rag_documents" ON rag_documents
  FOR SELECT USING (true);

-- Allow admins to manage documents (you can customize this)
CREATE POLICY "Allow insert for authenticated users" ON rag_documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for document owners" ON rag_documents
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Allow delete for document owners" ON rag_documents
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Chunks inherit document permissions
CREATE POLICY "Allow read access to rag_chunks" ON rag_chunks
  FOR SELECT USING (true);

CREATE POLICY "Allow insert to rag_chunks" ON rag_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rag_documents 
      WHERE id = document_id AND uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Allow delete to rag_chunks" ON rag_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rag_documents 
      WHERE id = document_id AND uploaded_by = auth.uid()
    )
  );

