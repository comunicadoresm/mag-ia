-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for agent documents (admin only)
CREATE POLICY "Admins can upload agent documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'agent-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view agent documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'agent-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete agent documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'agent-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Table for agent documents metadata
CREATE TABLE public.agent_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, ready, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for document chunks with embeddings
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.agent_documents(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.agent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_documents
CREATE POLICY "Admins can manage agent documents" 
ON public.agent_documents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view agent documents" 
ON public.agent_documents 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS policies for document_chunks
CREATE POLICY "Admins can manage document chunks" 
ON public.document_chunks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view document chunks" 
ON public.document_chunks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION public.search_agent_knowledge(
  p_agent_id UUID,
  p_query_embedding vector(1536),
  p_match_count INTEGER DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.agent_id = p_agent_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_agent_documents_updated_at
BEFORE UPDATE ON public.agent_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();