import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callOpenAI(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error("Erro na API de IA");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function transcribeAudioFromStorage(
  supabaseClient: any,
  storagePath: string
): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not configured, skipping transcription");
    return "[Transcrição indisponível - API key não configurada]";
  }

  const { data: fileData, error: downloadError } = await supabaseClient.storage
    .from("voice-audios")
    .download(storagePath);

  if (downloadError || !fileData) {
    console.error("Failed to download audio from storage:", storagePath, downloadError?.message);
    return "";
  }

  console.log(`Audio downloaded from storage path: ${storagePath}, size: ${fileData.size} bytes`);

  // Detect file extension from path for proper naming
  const ext = storagePath.split('.').pop() || 'webm';
  const fileName = `audio.${ext}`;

  const formData = new FormData();
  formData.append("file", fileData, fileName);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    console.error("Whisper API error:", whisperResponse.status, errorText);
    return "[Erro na transcrição do áudio]";
  }

  const result = await whisperResponse.json();
  console.log(`Transcription complete: ${result.text?.substring(0, 100)}...`);
  return result.text || "";
}

function extractStoragePath(urlOrPath: string): string {
  const match = urlOrPath.match(/voice-audios\/(.+)$/);
  if (match) return match[1];
  return urlOrPath;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // === NARRATIVE CHAT MODE ===
    if (body.action === "narrative_chat") {
      const { messages, system_prompt } = body;
      const aiResponse = await callOpenAI(system_prompt, messages);
      return new Response(
        JSON.stringify({ message: aiResponse }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === VOICE DNA PROCESSING ===
    const { audio_urls, user_id } = body;

    if (!audio_urls || typeof audio_urls !== "object") {
      return new Response(
        JSON.stringify({ error: "audio_urls required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing voice DNA for user: ${user_id}`);

    // Step 1: Transcribe audios
    const transcriptions: Record<string, string> = {};
    for (const [key, url] of Object.entries(audio_urls)) {
      console.log(`Transcribing ${key}...`);
      const storagePath = extractStoragePath(url as string);
      transcriptions[key] = await transcribeAudioFromStorage(supabaseClient, storagePath);
    }

    // Step 2: Upsert voice profile with audio URLs and transcriptions
    const profileData: any = {
      user_id,
      audio_casual_url: audio_urls.casual || null,
      audio_professional_url: audio_urls.professional || null,
      audio_positioning_url: audio_urls.positioning || null,
      transcription_casual: transcriptions.casual || null,
      transcription_professional: transcriptions.professional || null,
      transcription_positioning: transcriptions.positioning || null,
    };

    await supabaseClient.from("voice_profiles").upsert(profileData, { onConflict: "user_id" });

    // Step 3: Analyze with AI to generate voice DNA
    const analysisPrompt = `Você é um especialista em análise linguística e comunicação.

Recebi 3 transcrições de áudio da mesma pessoa, cada uma em um contexto diferente:

ÁUDIO 1 — Falando com um amigo (tom casual):
"""
${transcriptions.casual || "Não gravado"}
"""

ÁUDIO 2 — Falando com um cliente/seguidor (tom profissional):
"""
${transcriptions.professional || "Não gravado"}
"""

ÁUDIO 3 — Respondendo alguém que discordou (tom de posicionamento):
"""
${transcriptions.positioning || "Não gravado"}
"""

Analise os áudios e extraia o DNA de Voz desta pessoa. Retorne APENAS um JSON válido:

{
  "formalidade": 5,
  "ritmo": "medio",
  "humor": "sutil",
  "dramatizacao": "media",
  "assertividade": "media",
  "vocabulario_nivel": "simples",
  "confronto_estilo": "firme_respeitoso",
  "didatica": "usa_analogias",
  "energia": "media",
  "expressoes_frequentes": ["exemplo"],
  "palavras_transicao": ["então", "aí"],
  "expressoes_enfase": ["o ponto é"],
  "frases_exemplo_casual": ["exemplo casual"],
  "frases_exemplo_profissional": ["exemplo profissional"],
  "frases_exemplo_posicionamento": ["exemplo posicionamento"],
  "resumo_tom": "Resumo de 2-3 linhas do tom geral"
}`;

    const dnaResponse = await callOpenAI(
      "Você é um analisador de comunicação. Retorne APENAS JSON válido, sem markdown.",
      [{ role: "user", content: analysisPrompt }]
    );

    let voiceDna: any;
    try {
      const jsonMatch = dnaResponse.match(/\{[\s\S]*\}/);
      voiceDna = JSON.parse(jsonMatch?.[0] || dnaResponse);
    } catch {
      console.error("Failed to parse DNA JSON:", dnaResponse);
      voiceDna = {
        formalidade: 5, ritmo: "medio", humor: "sutil", dramatizacao: "media",
        assertividade: "media", vocabulario_nivel: "simples", confronto_estilo: "firme_respeitoso",
        didatica: "usa_analogias", energia: "media",
        expressoes_frequentes: [], palavras_transicao: [], expressoes_enfase: [],
        frases_exemplo_casual: [], frases_exemplo_profissional: [], frases_exemplo_posicionamento: [],
        resumo_tom: "Tom de voz padrão - por favor recalibre para melhor resultado."
      };
    }

    // BUG 3 FIX: Save DNA but do NOT mark as calibrated — let frontend decide after user validation
    await supabaseClient.from("voice_profiles").update({
      voice_dna: voiceDna,
      is_calibrated: false,
      calibration_score: null,
    }).eq("user_id", user_id);

    // Step 4: Generate validation paragraph
    const validationPrompt = `Com base neste DNA de voz: ${JSON.stringify(voiceDna)}

Escreva um parágrafo curto (3-4 frases) sobre empreendedorismo digital, como se ESTA PESSOA tivesse escrito.
Use o vocabulário, ritmo, expressões e tom identificados. O parágrafo deve soar natural.`;

    const validationParagraph = await callOpenAI(
      "Escreva no tom de voz descrito. Sem explicações, apenas o parágrafo.",
      [{ role: "user", content: validationPrompt }]
    );

    return new Response(
      JSON.stringify({
        success: true,
        voice_dna: voiceDna,
        validation_paragraph: validationParagraph,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
