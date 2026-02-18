import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callOpenAI(systemPrompt: string, messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
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
      temperature,
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
    const { audio_urls } = body;
    // SECURITY: Always use the authenticated user's ID, never trust client-provided user_id
    const user_id = user.id;

    if (!audio_urls || typeof audio_urls !== "object") {
      return new Response(
        JSON.stringify({ error: "audio_urls required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that audio URLs belong to the authenticated user
    for (const [key, url] of Object.entries(audio_urls)) {
      const storagePath = extractStoragePath(url as string);
      if (!storagePath.startsWith(`${user_id}/`)) {
        return new Response(
          JSON.stringify({ error: `Unauthorized: audio ${key} does not belong to you` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    const analysisSystemPrompt = `Você é um linguista especializado em análise de padrões de comunicação oral.

Sua tarefa: analisar transcrições de áudio e extrair o DNA de Voz — o perfil linguístico único de uma pessoa.

REGRAS DE ANÁLISE:
- Analise APENAS o que está nas transcrições. Não invente padrões que não existem.
- Se um áudio estiver marcado como "Não disponível", ignore-o e baseie a análise nos áudios disponíveis.
- Para "frases_exemplo_*": extraia frases REAIS das transcrições, copiadas literalmente. Não invente.
- Para "expressoes_frequentes", "palavras_transicao" e "expressoes_enfase": extraia apenas palavras/expressões que REALMENTE aparecem nas transcrições.
- Compare os 3 contextos para identificar o que é CONSTANTE (DNA real) vs. o que muda por contexto (adaptação situacional).
- Para "evita": identifique padrões de linguagem que a pessoa claramente NÃO usa — estilos, registros ou formatos ausentes nos 3 áudios.
- Para "forma_impacto": identifique COMO a pessoa cria peso emocional — pela forma, não pelo conteúdo.
- Não invente uma personalidade genérica. Se os áudios forem curtos, retorne menos itens em vez de inventar.

RETORNE APENAS um JSON válido, sem markdown, sem explicações.`;

    const analysisUserPrompt = `Analise estas 3 transcrições da mesma pessoa:

ÁUDIO 1 — Tom casual (falando com amigo):
"""
${transcriptions.casual || "Não disponível"}
"""

ÁUDIO 2 — Tom profissional (falando com cliente/seguidor):
"""
${transcriptions.professional || "Não disponível"}
"""

ÁUDIO 3 — Tom de posicionamento (respondendo discordância):
"""
${transcriptions.positioning || "Não disponível"}
"""

Retorne o DNA de Voz neste schema JSON exato:

{
  "formalidade": <número de 1 a 10, onde 1=muito informal e 10=muito formal>,
  "ritmo": <"rapido" | "medio" | "lento" | "variavel">,
  "humor": <"ausente" | "sutil" | "moderado" | "frequente">,
  "dramatizacao": <"baixa" | "media" | "alta">,
  "assertividade": <"baixa" | "media" | "alta">,
  "vocabulario_nivel": <"simples" | "intermediario" | "avancado" | "misto">,
  "confronto_estilo": <"evita_conflito" | "diplomatico" | "firme_respeitoso" | "direto_incisivo">,
  "didatica": <"exemplos_concretos" | "usa_analogias" | "passo_a_passo" | "provocativo" | "misto">,
  "energia": "descrição curta combinando intensidade + estilo (ex: 'direta e provocadora', 'calma e firme', 'emocional e próxima', 'acelerada e intensa')",
  "forma_impacto": <"historias_curtas" | "frases_de_choque" | "comparacoes_simples" | "ironia" | "provocacao_direta" | "dados_e_fatos" | "misto">,
  "evita": [2 a 4 padrões de linguagem que a pessoa claramente NÃO usa — ex: "linguagem coach", "termos técnicos", "formalidade excessiva", "promessas exageradas"],
  "expressoes_frequentes": [3 a 5 expressões REAIS extraídas das transcrições],
  "palavras_transicao": [3 a 5 palavras de transição REAIS extraídas],
  "expressoes_enfase": [2 a 4 expressões de ênfase REAIS extraídas],
  "frases_exemplo_casual": [2 a 3 frases LITERAIS do áudio casual],
  "frases_exemplo_profissional": [2 a 3 frases LITERAIS do áudio profissional],
  "frases_exemplo_posicionamento": [2 a 3 frases LITERAIS do áudio de posicionamento],
  "resumo_tom": "Resumo de 2-3 linhas descrevendo o padrão geral de comunicação desta pessoa, destacando o que é constante nos 3 contextos"
}`;

    const dnaResponse = await callOpenAI(
      analysisSystemPrompt,
      [{ role: "user", content: analysisUserPrompt }],
      0.3
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
        didatica: "usa_analogias", energia: "equilibrada e neutra", forma_impacto: "misto",
        evita: [],
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
    const validationSystemPrompt = `Você é um ghostwriter. Sua tarefa é escrever EXATAMENTE como a pessoa descrita no DNA de Voz escreveria.

REGRAS:
- Use as expressões frequentes e palavras de transição do DNA.
- Mantenha o nível de formalidade, ritmo e energia descritos.
- EVITE os padrões listados em "evita" — se a pessoa evita "linguagem coach", não use esse registro.
- Use a "forma_impacto" para decidir como construir o peso emocional do texto.
- O texto deve soar como fala natural transcrita, não como texto escrito.
- Retorne APENAS o parágrafo, sem aspas, sem explicação, sem título.`;

    const validationUserPrompt = `DNA de Voz da pessoa:
${JSON.stringify(voiceDna, null, 2)}

Escreva um parágrafo curto (3-4 frases) sobre criar conteúdo nas redes sociais, como se ESTA PESSOA estivesse falando para um seguidor.
Use o vocabulário, ritmo, expressões e tom identificados no DNA. O parágrafo deve soar natural e reconhecível.`;

    const validationParagraph = await callOpenAI(
      validationSystemPrompt,
      [{ role: "user", content: validationUserPrompt }]
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
