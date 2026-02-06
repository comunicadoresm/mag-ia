import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ScriptSection {
  id: string;
  label: string;
  placeholder?: string;
}

interface ScriptStructure {
  inicio: { title: string; sections: ScriptSection[] };
  desenvolvimento: { title: string; sections: ScriptSection[] };
  final: { title: string; sections: ScriptSection[] };
}

interface GenerateScriptChatRequest {
  action: 'start' | 'chat';
  script: {
    title: string;
    theme?: string;
    style: string;
    format?: string;
    objective?: string;
  };
  structure?: ScriptStructure;
  agent_id?: string;
  messages: ChatMessage[];
}

// Determine provider based on model name
function getProvider(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('openai/')) return 'openai';
  if (model.startsWith('claude') || model.startsWith('anthropic/')) return 'anthropic';
  if (model.startsWith('gemini') || model.startsWith('google/')) return 'google';
  return 'openai';
}

// Call AI based on provider
async function callAI(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  if (provider === 'openai') {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
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
        messages: messages.map(m => ({ role: m.role, content: m.content })),
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
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiMessages,
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

// Parse generated script into structure sections
function parseScriptContent(
  script: string,
  structure: ScriptStructure | undefined
): Record<string, string> | null {
  if (!structure) return null;

  const content: Record<string, string> = {};

  // Try to parse IDF sections from the generated script
  const inicioMatch = script.match(/## 🎯 INÍCIO.*?\n([\s\S]*?)(?=## 📚|$)/i);
  const desenvolviMatch = script.match(/## 📚 DESENVOLVIMENTO.*?\n([\s\S]*?)(?=## 🎬|$)/i);
  const finalMatch = script.match(/## 🎬 FINAL.*?\n([\s\S]*?)$/i);

  if (inicioMatch?.[1] && structure.inicio?.sections?.[0]) {
    content[structure.inicio.sections[0].id] = inicioMatch[1].trim();
  }
  if (desenvolviMatch?.[1] && structure.desenvolvimento?.sections?.[0]) {
    content[structure.desenvolvimento.sections[0].id] = desenvolviMatch[1].trim();
  }
  if (finalMatch?.[1] && structure.final?.sections?.[0]) {
    content[structure.final.sections[0].id] = finalMatch[1].trim();
  }

  // Check if we got any content
  const hasContent = Object.values(content).some(v => v && v.length > 0);
  if (!hasContent) {
    // Put full response in first section as fallback
    if (structure.inicio?.sections?.[0]) {
      content[structure.inicio.sections[0].id] = script;
    }
  }

  return content;
}

// Check if AI response indicates script generation
function shouldGenerateScript(messages: ChatMessage[], response: string): boolean {
  // Generate after enough context is collected (3+ exchanges) 
  // and response contains script structure markers
  const hasEnoughContext = messages.length >= 4;
  const hasScriptMarkers = 
    response.includes('## 🎯 INÍCIO') || 
    response.includes('## 📚 DESENVOLVIMENTO') ||
    response.includes('GANCHO:') ||
    response.includes('DESENVOLVIMENTO:');
  
  return hasEnoughContext || hasScriptMarkers;
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

    const { action, script, structure, agent_id, messages }: GenerateScriptChatRequest = await req.json();

    console.log(`Chat action: ${action}, user: ${user.id}, agent: ${agent_id}`);

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
      storytelling_looping: "Storytelling em Loop",
      analysis: "Análise",
      tutorial: "Tutorial",
      list: "Lista",
      comparison: "Comparação",
    };

    // Build the system prompt for conversational script creation
    const scriptContext = `
## CONTEXTO DO ROTEIRO
- Título: ${script.title}
- Tema: ${script.theme || "Geral"}
- Estilo: ${styleMap[script.style] || script.style}
- Formato: ${script.format || "Falado para câmera"}
- Objetivo: ${objectiveMap[script.objective || "attraction"] || script.objective}

## SUA TAREFA
Você está ajudando a criar um roteiro para vídeo de redes sociais (Reels/TikTok).
Conduza uma conversa natural para coletar as informações necessárias antes de escrever o roteiro.

### PERGUNTAS QUE VOCÊ DEVE FAZER (uma por vez):
1. Qual é a mensagem principal ou ponto-chave que você quer passar?
2. Quem é seu público-alvo?
3. Você tem algum gancho ou ideia inicial para o começo do vídeo?
4. Qual é o CTA (chamada para ação) que você quer no final?

### IMPORTANTE:
- Faça UMA pergunta por vez
- Seja conversacional e amigável
- Quando tiver informações suficientes (após 3-4 trocas), gere o roteiro completo
- Use a estrutura IDF ao gerar o roteiro final:
  - ## 🎯 INÍCIO (Gancho)
  - ## 📚 DESENVOLVIMENTO (Conteúdo Principal)
  - ## 🎬 FINAL (Call-to-Action)`;

    const systemPrompt = agent.system_prompt + scriptContext;

    // Handle start action - just send welcome
    if (action === 'start') {
      const welcomeMessage = `Olá! 👋 Vou te ajudar a criar o roteiro "${script.title}".

Para criar um conteúdo incrível, preciso entender melhor o que você quer comunicar.

**Qual é a mensagem principal ou ponto-chave que você quer passar nesse vídeo?**`;

      return new Response(
        JSON.stringify({ message: welcomeMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle chat action
    const provider = getProvider(agent.model);
    console.log(`Using agent ${agent.name}, provider: ${provider}, model: ${agent.model}`);

    const aiResponse = await callAI(
      provider,
      agent.model,
      agent.api_key,
      systemPrompt,
      messages
    );

    console.log(`AI response length: ${aiResponse.length}`);

    // Check if this response contains a complete script
    const hasScriptStructure = 
      aiResponse.includes('## 🎯 INÍCIO') || 
      aiResponse.includes('## 📚 DESENVOLVIMENTO');

    let scriptContent = null;
    if (hasScriptStructure && structure) {
      scriptContent = parseScriptContent(aiResponse, structure);
    }

    return new Response(
      JSON.stringify({
        message: aiResponse,
        script_content: scriptContent,
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
