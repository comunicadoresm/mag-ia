import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateScriptRequest {
  title: string;
  theme?: string;
  style: string;
  format?: string;
  objective?: string;
  agent_id?: string;
}

// Determine provider based on model name
function getProvider(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('openai/')) return 'openai';
  if (model.startsWith('claude') || model.startsWith('anthropic/')) return 'anthropic';
  if (model.startsWith('gemini') || model.startsWith('google/')) return 'google';
  return 'openai'; // default
}

// Call AI based on provider
async function callAI(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (provider === 'openai') {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      throw new Error("Erro na API OpenAI");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  if (provider === 'anthropic') {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", errorText);
      throw new Error("Erro na API Anthropic");
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }

  // Google Gemini
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", errorText);
    throw new Error("Erro na API Google Gemini");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, theme, style, format, objective, agent_id }: GenerateScriptRequest = await req.json();

    console.log(`Generating script for user ${user.id}: ${title}, agent: ${agent_id}`);

    // Get agent if provided
    let agent = null;
    if (agent_id) {
      const { data, error } = await supabaseClient
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (error) {
        console.error("Agent fetch error:", error);
      } else {
        agent = data;
      }
    }

    // Check if agent has API key
    if (!agent?.api_key) {
      return new Response(
        JSON.stringify({ error: "Este agente não tem uma API Key configurada. Configure no painel de administração." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map objective to Portuguese
    const objectiveMap: Record<string, string> = {
      attraction: "Atração (capturar atenção de novos seguidores)",
      connection: "Conexão (criar vínculo emocional com a audiência)",
      conversion: "Conversão (levar a audiência a uma ação específica)",
      retention: "Retenção (manter a audiência engajada)",
    };

    // Map style to description
    const styleMap: Record<string, string> = {
      storytelling_looping: "Storytelling em Loop - história que prende do início ao fim, com gancho que conecta o final ao início",
      analysis: "Análise - conteúdo educativo que analisa uma tendência, técnica ou fenômeno",
      tutorial: "Tutorial - passo a passo prático e objetivo",
      list: "Lista - formato de lista com pontos numerados ou tópicos",
      comparison: "Comparação - análise comparativa entre duas ou mais opções",
    };

    // Build the system prompt combining agent's prompt with script-specific instructions
    const scriptInstructions = `

## TAREFA ATUAL: Criar um Roteiro de Vídeo

Você está sendo solicitado a criar um roteiro para vídeo de redes sociais (Reels/TikTok) seguindo a estrutura IDF:

### ESTRUTURA IDF:

#### INÍCIO (I) - Gancho
- Primeiro segundo é crucial: deve prender a atenção imediatamente
- Use perguntas provocativas, afirmações surpreendentes ou cenas intrigantes
- Evite introduções genéricas como "Olá pessoal" ou "Hoje vou falar sobre"

#### DESENVOLVIMENTO (D) - Conteúdo Principal  
- Entregue valor real e concreto
- Mantenha ritmo dinâmico, sem enrolação
- Use transições naturais entre pontos
- Inclua exemplos práticos quando possível

#### FINAL (F) - Call-to-Action
- Finalize com impacto
- Inclua CTA claro (seguir, comentar, salvar, compartilhar)
- Pode conectar com o início para criar loop`;

    const systemPrompt = agent.system_prompt + scriptInstructions;

    const userPrompt = `Crie um roteiro completo para um vídeo com as seguintes características:

**Título:** ${title}
**Tema:** ${theme || "Geral"}
**Estilo:** ${styleMap[style] || style}
**Formato:** ${format || "Falado para câmera"}
**Objetivo:** ${objectiveMap[objective || "attraction"] || objective}

Por favor, escreva o roteiro seguindo a estrutura IDF, formatando claramente cada seção:

## 🎯 INÍCIO (Gancho)
[Escreva aqui o gancho inicial - máximo 2-3 frases que prendem atenção imediatamente]

## 📚 DESENVOLVIMENTO (Conteúdo Principal)
[Escreva aqui o corpo do roteiro - desenvolva o tema com exemplos práticos]

## 🎬 FINAL (Call-to-Action)
[Escreva aqui o fechamento com CTA claro]

Lembre-se: o roteiro deve ser natural para falar, não para ler. Use linguagem coloquial e envolvente.`;

    // Determine provider and call AI
    const provider = getProvider(agent.model);
    console.log(`Using agent ${agent.name}, provider: ${provider}, model: ${agent.model}`);

    const generatedScript = await callAI(
      provider,
      agent.model,
      agent.api_key,
      systemPrompt,
      userPrompt
    );

    console.log(`Script generated successfully, length: ${generatedScript.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        script: generatedScript,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
