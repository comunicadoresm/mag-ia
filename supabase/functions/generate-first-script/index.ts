import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

function getProvider(model: string): "anthropic" | "openai" | "google" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  if (model.startsWith("gemini")) return "google";
  return "openai";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, action, suggestion } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch user identity data
    const [profileRes, voiceRes, formatRes, narrativeRes, metricsRes] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", user_id).single(),
      supabase.from("voice_profiles").select("voice_dna, is_calibrated").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_format_profile").select("recommended_format, weekly_plan").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_narratives").select("narrative_text, is_completed, expertise, differentials, transformation, ideal_client").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_metrics").select("handle").eq("user_id", user_id).maybeSingle(),
    ]);

    const userName = profileRes.data?.name || "Usuário";
    const voiceDna = voiceRes.data?.voice_dna || "Não calibrado";
    const format = formatRes.data?.recommended_format || "mid_fi";
    const narrativeData = narrativeRes.data;
    const narrative = narrativeData?.narrative_text || "Não definida";
    const handle = metricsRes.data?.handle || "";

    // 2. Fetch agent config
    const { data: agentConfig } = await supabase
      .from("agents")
      .select("system_prompt, model, api_key")
      .eq("slug", "first-script-onboarding")
      .eq("is_active", true)
      .single();

    if (!agentConfig) {
      throw new Error('Agent config "first-script-onboarding" not found.');
    }

    const model = agentConfig.model || "claude-opus-4-20250514";
    const provider = getProvider(model);

    const apiKey =
      agentConfig.api_key ||
      (provider === "anthropic"
        ? Deno.env.get("ANTHROPIC_API_KEY")
        : provider === "openai"
          ? Deno.env.get("OPENAI_API_KEY")
          : Deno.env.get("GOOGLE_API_KEY"));

    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${provider}`);
    }

    // 3. Build user context
    const formatLabel = format === "low_fi"
      ? "LOW-FI (simples, só roteiro + câmera selfie, sem edição)"
      : format === "mid_fi"
        ? "MID-FI (produção média, cortes, legendas)"
        : "HI-FI (produção elaborada, B-roll, efeitos)";

    const userContext = `
DADOS DO ONBOARDING DO USUÁRIO:

### DNA de Voz:
${typeof voiceDna === "object" ? JSON.stringify(voiceDna, null, 2) : voiceDna}

### Formato Sustentável: ${formatLabel}

### Narrativa Primária:
${narrative}
${narrativeData?.expertise ? `- Expertise: ${narrativeData.expertise}` : ""}
${narrativeData?.differentials ? `- Diferenciais: ${narrativeData.differentials}` : ""}
${narrativeData?.transformation ? `- Transformação: ${narrativeData.transformation}` : ""}
${narrativeData?.ideal_client ? `- Cliente Ideal: ${narrativeData.ideal_client}` : ""}

### Informações do Perfil:
- Nome: ${userName}
- Handle: ${handle}
`;

    // ═══ ACTION: SUGGEST ═══
    if (action === "suggest") {
      const userMessage = `${userContext}

TAREFA: Com base nos dados do onboarding acima, execute a ETAPA 1 do seu fluxo — analise a identidade magnética e sugira UM tema de primeiro roteiro.

Retorne APENAS um JSON válido (sem markdown, sem explicação) neste formato:
{
  "title": "Título do roteiro sugerido (provocativo e personalizado)",
  "style": "storytelling-looping",
  "style_label": "Storytelling Looping",
  "format": "${format === "low_fi" ? "lo-fi" : format === "mid_fi" ? "mid-fi" : "high-fi"}",
  "duration": "${format === "low_fi" ? "45-60s" : format === "mid_fi" ? "60-75s" : "75-90s"}",
  "justification": "Explicação curta (2-3 frases) de por que este roteiro é perfeito para este usuário, conectando com expertise e formato."
}

REGRAS:
- O style deve ser EXATAMENTE: storytelling-looping
- A justificativa deve mencionar o tom de voz e/ou a narrativa do usuário
- O título deve começar pelo ERRO, não pela solução
- Tema universal que atrai quem NÃO conhece o usuário`;

      const response = await callLLM(provider, model, apiKey, agentConfig.system_prompt, userMessage);
      const suggestionData = JSON.parse(extractJSON(response));

      return new Response(
        JSON.stringify({ suggestion: suggestionData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ ACTION: GENERATE ═══
    if (action === "generate" && suggestion) {
      const userMessage = `${userContext}

ROTEIRO A GERAR:
- Título: ${suggestion.title}
- Estilo: Storytelling Looping
- Formato: ${suggestion.format}
- Duração alvo: ${suggestion.duration}
- Justificativa: ${suggestion.justification}

TAREFA: Execute a ETAPA 4 do seu fluxo — gere o roteiro COMPLETO seguindo a estrutura IDF adaptada para Looping, com as cores de intenção e dicas de gravação. Use o DNA de Voz do usuário como referência de tom.

Retorne APENAS um JSON válido (sem markdown, sem explicação) neste formato:
{
  "title": "${suggestion.title}",
  "style": "storytelling-looping",
  "script_content": {
    "inicio": {
      "title": "🎯 INÍCIO (Gancho + Suspensão)",
      "sections": [
        { "id": "hook", "label": "🟠 Abertura com Tensão Real", "content": "O texto do gancho aqui" },
        { "id": "suspensao", "label": "🟡 Suspensão Intencional", "content": "Texto da suspensão (Mas antes...)" }
      ]
    },
    "desenvolvimento": {
      "title": "📖 DESENVOLVIMENTO (Contexto + Revelação + Valor)",
      "sections": [
        { "id": "contexto", "label": "🔵 Contexto Crível", "content": "Situação concreta com detalhes da narrativa do usuário" },
        { "id": "revelacao", "label": "🟠 Revelação do Mecanismo", "content": "O erro/problema revelado, conectado à expertise" },
        { "id": "meta", "label": "🟢 Quebra Meta-Narrativa", "content": "Frase que amplifica o impacto (opcional em low-fi)" },
        { "id": "regra", "label": "🔵 Regra Prática", "content": "Insight direto e aplicável" }
      ]
    },
    "final": {
      "title": "✅ FECHAMENTO (CTA)",
      "sections": [
        { "id": "cta", "label": "🟡 CTA de Atração", "content": "Convite para seguir" }
      ]
    }
  }
}

REGRAS PARA O TEXTO:
- Use o DNA de Voz do aluno como referência — o roteiro deve parecer que o PRÓPRIO USUÁRIO escreveu
- Incorpore elementos da Narrativa Primária no contexto crível e na revelação
- Linguagem falada, não escrita — conversa real
- Nada genérico — use detalhes específicos do nicho do usuário
- Adapte a complexidade ao formato sustentável (${suggestion.format})
- NÃO inclua explicações sobre o roteiro, apenas o conteúdo
- Verifique o checklist de personalização (Seção 8) antes de entregar`;

      const response = await callLLM(provider, model, apiKey, agentConfig.system_prompt, userMessage);
      const script = JSON.parse(extractJSON(response));

      // Convert nested script_content to flat Record<string, string> for Kanban
      const flatContent: Record<string, string> = {};
      const parts = ['inicio', 'desenvolvimento', 'final'] as const;
      for (const part of parts) {
        const sections = script.script_content?.[part]?.sections || [];
        for (const section of sections) {
          if (section.id && section.content) {
            flatContent[section.id] = section.content;
          }
        }
      }

      const kanbanFormat = suggestion.format || 'mid-fi';

      // Save to user_scripts in flat format
      await supabase.from("user_scripts").insert({
        user_id,
        title: script.title,
        theme: suggestion.title,
        style: suggestion.style || "storytelling-looping",
        format: kanbanFormat,
        objective: 'atração',
        status: "scripting",
        script_content: flatContent,
      });

      return new Response(
        JSON.stringify({ script }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (err) {
    console.error("generate-first-script error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Call LLM — separates system prompt from user message for proper caching
async function callLLM(
  provider: "anthropic" | "openai" | "google",
  model: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", errText);
      throw new Error("Erro na API Anthropic");
    }

    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", errText);
      throw new Error("Erro na API OpenAI");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Google Gemini
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }] },
        ],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", errText);
    throw new Error("Erro na API Google Gemini");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
