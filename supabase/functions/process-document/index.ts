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
    const lastPeriod = slice.lastIndexOf(". ");
    const lastNewline = slice.lastIndexOf("\n");
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > maxChars * 0.5) {
      end = start + breakPoint + 1;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 50); // Filter out very short chunks
}

// Extract text from different file types
async function extractText(
  fileContent: Uint8Array,
  fileType: string,
  fileName: string
): Promise<string> {
  const textDecoder = new TextDecoder("utf-8");

  // Plain text files
  if (
    fileType === "text/plain" ||
    fileType === "text/markdown" ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    return textDecoder.decode(fileContent);
  }

  // For PDF — basic text extraction
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const text = textDecoder.decode(fileContent);

    // Try to extract readable text from PDF
    const extracted =
      text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ") // Remove non-printable control chars (keep \t \n \r)
        .match(/[\w\sÀ-ÿ.,!?;:'"()\-\/\\@#$%&*+=\[\]{}]+/g)
        ?.filter((s) => s.trim().length > 10)
        ?.join(" ") || "";

    if (extracted.length < 100) {
      throw new Error(
        "Não foi possível extrair texto do PDF. Tente converter para TXT ou use um PDF com texto (não escaneado)."
      );
    }

    return extracted;
  }

  // DOCX — extract readable text from XML
  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const text = textDecoder.decode(fileContent);
    const extracted =
      text
        .replace(/<[^>]+>/g, " ") // Remove XML tags
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .match(/[\w\sÀ-ÿ.,!?;:'"()\-]+/g)
        ?.filter((s) => s.trim().length > 5)
        ?.join(" ") || "";

    if (extracted.length < 100) {
      throw new Error(
        "Não foi possível extrair texto do DOCX. Tente converter para TXT."
      );
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role for all DB/storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Use anon key + user token to validate JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service client
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError.message);
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { document_id }: ProcessDocumentRequest = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing document: ${document_id} by admin: ${user.id}`);

    // Get document metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from("agent_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError?.message);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabaseAdmin
      .from("agent_documents")
      .update({ status: "processing" })
      .eq("id", document_id);

    try {
      console.log(`Downloading file: ${document.file_path}`);

      // Download file from storage using service role
      const { data: fileData, error: downloadError } =
        await supabaseAdmin.storage
          .from("agent-documents")
          .download(document.file_path);

      if (downloadError || !fileData) {
        console.error("Download error:", downloadError?.message);
        throw new Error(
          `Falha ao baixar o arquivo: ${downloadError?.message || "unknown error"}`
        );
      }

      // Extract text from file
      const fileContent = new Uint8Array(await fileData.arrayBuffer());
      console.log(`File downloaded: ${fileContent.length} bytes`);

      const text = await extractText(
        fileContent,
        document.file_type,
        document.file_name
      );
      console.log(`Extracted ${text.length} characters from document`);

      // Delete old chunks for this document (in case of reprocessing)
      await supabaseAdmin
        .from("document_chunks")
        .delete()
        .eq("document_id", document_id);

      // Split into chunks
      const chunks = chunkText(text);
      console.log(`Created ${chunks.length} chunks`);

      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const { error: insertError } = await supabaseAdmin
          .from("document_chunks")
          .insert({
            document_id: document_id,
            agent_id: document.agent_id,
            content: chunk,
            chunk_index: i,
          });

        if (insertError) {
          console.error(`Error inserting chunk ${i}:`, insertError.message);
        }
      }

      // Update document status to ready
      await supabaseAdmin
        .from("agent_documents")
        .update({ status: "ready", error_message: null })
        .eq("id", document_id);

      console.log("Document processing complete");

      return new Response(
        JSON.stringify({
          success: true,
          chunks_created: chunks.length,
          text_length: text.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      console.error("Processing error:", processingError);

      const errorMsg =
        processingError instanceof Error
          ? processingError.message
          : "Unknown error";

      // Update document status to error
      await supabaseAdmin
        .from("agent_documents")
        .update({
          status: "error",
          error_message: errorMsg,
        })
        .eq("id", document_id);

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
