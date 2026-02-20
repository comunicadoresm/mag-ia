import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      supabase.from("user_narratives").select("narrative_text, is_completed").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_metrics").select("handle").eq("user_id", user_id).maybeSingle(),
    ]);

    const userName = profileRes.data?.name || "Usuário";
    const voiceDna = voiceRes.data?.voice_dna || "Não calibrado";
    const format = formatRes.data?.recommended_format || "mid_fi";
    const narrative = narrativeRes.data?.narrative_text || "Não definida";
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

    const model = agentConfig.model || "gpt-4o-mini";
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
    const userContext = `
DADOS DO USUÁRIO:
- Nome: ${userName}
- Handle: ${handle}
- DNA de Voz: ${typeof voiceDna === "object" ? JSON.stringify(voiceDna) : voiceDna}
- Formato Recomendado: ${format === "low_fi" ? "LOW-FI (simples, só roteiro + câmera)" : format === "mid_fi" ? "MID-FI (qualidade visual/sonora elevada, edição leve)" : "HI-FI (produção completa, edição elaborada)"}
- Narrativa Primária: ${narrative}
`;

    // ═══ ACTION: SUGGEST ═══
    if (action === "suggest") {
      const suggestPrompt = agentConfig.system_prompt + `

${userContext}

TAREFA: Com base nos dados acima, sugira UM tema de primeiro roteiro para este usuário.

Retorne APENAS um JSON válido (sem markdown, sem explicação) neste formato:
{
  "title": "Título do roteiro sugerido",
  "style": "storytelling_looping",
  "style_label": "Storytelling Looping",
  "format": "Falado p/ câmera",
  "duration": "60s",
  "justification": "Explicação curta (2-3 frases) de por que este roteiro é perfeito para este usuário."
}

REGRAS:
- O style deve ser um dos: storytelling_looping, analysis, arco_transformacao, escalada, narrativa_primaria, reenquadramento, vlog, desafio, serie
- O título deve ser provocativo e personalizado
- A justificativa deve mencionar o tom de voz e/ou a narrativa do usuário
- O formato deve ser adequado ao recommended_format
- A duração deve ser adequada ao formato (low_fi: 30-60s, mid_fi: 60-90s, hi_fi: 90-180s)
`;

      const response = await callLLM(provider, model, apiKey, suggestPrompt);
      const suggestionData = JSON.parse(response);

      return new Response(
        JSON.stringify({ suggestion: suggestionData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ ACTION: GENERATE ═══
    if (action === "generate" && suggestion) {
      const generatePrompt = agentConfig.system_prompt + `

${userContext}

ROTEIRO A GERAR:
- Título: ${suggestion.title}
- Estilo: ${suggestion.style_label}
- Formato: ${suggestion.format}
- Duração alvo: ${suggestion.duration}

TAREFA: Gere o roteiro COMPLETO no formato IDF (Início / Desenvolvimento / Final), escrito no tom de voz do usuário.

Retorne APENAS um JSON válido (sem markdown, sem explicação) neste formato:
{
  "title": "${suggestion.title}",
  "style": "${suggestion.style}",
  "script_content": {
    "inicio": {
      "title": "🎯 INÍCIO (Gancho)",
      "sections": [
        { "id": "hook", "label": "Gancho", "content": "O texto do gancho aqui" }
      ]
    },
    "desenvolvimento": {
      "title": "📚 DESENVOLVIMENTO",
      "sections": [
        { "id": "d1", "label": "Contexto", "content": "..." },
        { "id": "d2", "label": "Revelação", "content": "..." },
        { "id": "d3", "label": "Aprendizado", "content": "..." }
      ]
    },
    "final": {
      "title": "🎬 FINAL (CTA)",
      "sections": [
        { "id": "cta", "label": "Call-to-Action", "content": "..." }
      ]
    }
  }
}

REGRAS PARA O TEXTO:
- Use o DNA de Voz do usuário como referência para vocabulário, tom e ritmo
- Incorpore elementos da Narrativa Primária
- O texto deve parecer que o PRÓPRIO USUÁRIO escreveu
- Linguagem falada, não escrita
- Nada genérico — use detalhes específicos
- Cada seção deve ter 2-4 frases
`;

      const response = await callLLM(provider, model, apiKey, generatePrompt);
      const script = JSON.parse(response);

      // Save to user_scripts
      await supabase.from("user_scripts").insert({
        user_id,
        title: script.title,
        theme: suggestion.title,
        style: suggestion.style,
        format: suggestion.format === "Falado p/ câmera" ? "falado_camera" : "misto",
        status: "scripting",
        script_content: script.script_content,
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

// Helper: Call LLM
async function callLLM(
  provider: "anthropic" | "openai" | "google",
  model: string,
  apiKey: string,
  prompt: string
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: "", // prompt already includes full instructions
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: prompt }],
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
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
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
