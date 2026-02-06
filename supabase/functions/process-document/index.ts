import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessDocumentRequest {
  document_id: string;
}

// Split text into chunks of approximately maxChars, trying to break at sentence boundaries
function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChars;
    
    if (end >= text.length) {
      chunks.push(text.slice(start).trim());
      break;
    }
    
    // Try to find a good break point (sentence end)
    const slice = text.slice(start, end);
    const lastPeriod = slice.lastIndexOf('. ');
    const lastNewline = slice.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);
    
    if (breakPoint > maxChars * 0.5) {
      end = start + breakPoint + 1;
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks.filter(c => c.length > 50); // Filter out very short chunks
}

// Extract text from different file types
async function extractText(fileContent: Uint8Array, fileType: string, fileName: string): Promise<string> {
  const textDecoder = new TextDecoder('utf-8');
  
  // Plain text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return textDecoder.decode(fileContent);
  }
  
  // For PDF and DOCX, we'll use a simple approach
  // In production, you'd want to use proper parsing libraries
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Simple PDF text extraction - looks for text between stream markers
    // This is a basic approach and won't work for all PDFs
    const text = textDecoder.decode(fileContent);
    
    // Try to extract readable text from PDF
    const extracted = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .match(/[\w\sÀ-ÿ.,!?;:'"()\-]+/g) // Match readable text
      ?.filter(s => s.trim().length > 10)
      ?.join(' ') || '';
    
    if (extracted.length < 100) {
      throw new Error('Não foi possível extrair texto do PDF. Tente converter para TXT.');
    }
    
    return extracted;
  }
  
  // DOCX is actually a ZIP file with XML content
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    // For DOCX, we'd need to unzip and parse XML
    // For now, we'll try to extract any readable text
    const text = textDecoder.decode(fileContent);
    const extracted = text
      .replace(/<[^>]+>/g, ' ') // Remove XML tags
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .match(/[\w\sÀ-ÿ.,!?;:'"()\-]+/g)
      ?.filter(s => s.trim().length > 5)
      ?.join(' ') || '';
    
    if (extracted.length < 100) {
      throw new Error('Não foi possível extrair texto do DOCX. Tente converter para TXT.');
    }
    
    return extracted;
  }
  
  throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { document_id }: ProcessDocumentRequest = await req.json();

    console.log(`Processing document: ${document_id}`);

    // Get document metadata
    const { data: document, error: docError } = await supabase
      .from("agent_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("agent_documents")
      .update({ status: "processing" })
      .eq("id", document_id);

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("agent-documents")
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error("Failed to download file");
      }

      // Extract text from file
      const fileContent = new Uint8Array(await fileData.arrayBuffer());
      const text = await extractText(fileContent, document.file_type, document.file_name);

      console.log(`Extracted ${text.length} characters from document`);

      // Split into chunks
      const chunks = chunkText(text);
      console.log(`Created ${chunks.length} chunks`);

      // Store chunks without embeddings (we'll use text search instead)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Storing chunk ${i + 1}/${chunks.length}`);

        // Insert chunk without embedding
        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert({
            document_id: document_id,
            agent_id: document.agent_id,
            content: chunk,
            chunk_index: i,
            // embedding is left null - we'll use text search instead
          });

        if (insertError) {
          console.error("Error inserting chunk:", insertError);
        }
      }

      // Update document status to ready
      await supabase
        .from("agent_documents")
        .update({ status: "ready" })
        .eq("id", document_id);

      console.log("Document processing complete");

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunks_created: chunks.length,
          text_length: text.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (processingError) {
      console.error("Processing error:", processingError);

      // Update document status to error
      await supabase
        .from("agent_documents")
        .update({ 
          status: "error",
          error_message: processingError instanceof Error ? processingError.message : "Unknown error"
        })
        .eq("id", document_id);

      return new Response(
        JSON.stringify({ error: processingError instanceof Error ? processingError.message : "Processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
