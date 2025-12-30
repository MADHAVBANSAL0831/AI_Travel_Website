-- Conversation Context Table
-- Stores the parsed context for each chat session (origin, destination, date, intent, etc.)

CREATE TABLE IF NOT EXISTS conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Travel context
  intent TEXT, -- 'flight', 'hotel', 'trip'
  origin TEXT,
  destination TEXT,
  departure_date DATE,
  return_date DATE,
  passengers INTEGER DEFAULT 1,
  
  -- Hotel context
  check_in DATE,
  check_out DATE,
  rooms INTEGER DEFAULT 1,
  
  -- Additional context as JSON for flexibility
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by chat_id
CREATE INDEX IF NOT EXISTS idx_conversation_context_chat_id ON conversation_context(chat_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_conversation_context_user_id ON conversation_context(user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_conversation_context_timestamp ON conversation_context;
CREATE TRIGGER update_conversation_context_timestamp
  BEFORE UPDATE ON conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_context_timestamp();

-- Enable Row Level Security
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can read own context" ON conversation_context;
DROP POLICY IF EXISTS "Users can insert own context" ON conversation_context;
DROP POLICY IF EXISTS "Users can update own context" ON conversation_context;
DROP POLICY IF EXISTS "Service role full access" ON conversation_context;

-- Policy: Users can read their own context
CREATE POLICY "Users can read own context" ON conversation_context
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can insert their own context
CREATE POLICY "Users can insert own context" ON conversation_context
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update their own context
CREATE POLICY "Users can update own context" ON conversation_context
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Service role can do everything (for API calls)
CREATE POLICY "Service role full access" ON conversation_context
  FOR ALL USING (true);

