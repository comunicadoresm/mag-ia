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

function getProvider(model: string): "anthropic" | "openai" | "google" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o1")) return "openai";
  if (model.startsWith("gemini")) return "google";
  return "anthropic";
}

async function callAI(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (provider === "anthropic") {
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
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", errorText);
      throw new Error("Erro na API Anthropic");
    }

    const data = await response.json();
    if (data.usage?.cache_read_input_tokens) {
      console.log(`Cache read: ${data.usage.cache_read_input_tokens} tokens`);
    }
    return data.content?.[0]?.text || "";
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, theme, style, format, objective, agent_id }: GenerateScriptRequest = await req.json();
    console.log(`Generate script: user=${user.id}, title="${title}", agent=${agent_id}`);

    let agent = null;
    if (agent_id) {
      const { data, error } = await supabaseClient
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (!error) agent = data;
    }

    // Resolve API key: use agent's own key first, then fallback to env secrets
    const agentModel = agent?.model || "claude-haiku-3-5-20241022";
    const provider = getProvider(agentModel);
    let resolvedApiKey = agent?.api_key;
    if (!resolvedApiKey) {
      if (provider === "anthropic") resolvedApiKey = Deno.env.get("ANTHROPIC_API_KEY") || null;
      else if (provider === "openai") resolvedApiKey = Deno.env.get("OPENAI_API_KEY") || null;
      else if (provider === "google") resolvedApiKey = Deno.env.get("GOOGLE_API_KEY") || null;
    }
    if (!resolvedApiKey) {
      return new Response(
        JSON.stringify({ error: "Este agente não tem uma API Key configurada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (agent) agent.api_key = resolvedApiKey;

    // === CREDIT CONSUMPTION (script_generation = 3 credits default) ===
    const creditCost = agent.credit_cost || 3;

    const { data: credits, error: creditsError } = await supabaseClient
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits", message: "Você não tem créditos configurados." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalBalance = (credits.plan_credits || 0) + (credits.subscription_credits || 0) + (credits.bonus_credits || 0);
    if (totalBalance < creditCost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits", message: "Seus créditos acabaram!",
          balance: { plan: credits.plan_credits, subscription: credits.subscription_credits, bonus: credits.bonus_credits, total: totalBalance },
          required: creditCost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remaining = creditCost;
    let newPlan = credits.plan_credits || 0;
    let newSub = credits.subscription_credits || 0;
    let newBonus = credits.bonus_credits || 0;

    if (remaining > 0 && newPlan > 0) { const d = Math.min(remaining, newPlan); newPlan -= d; remaining -= d; }
    if (remaining > 0 && newSub > 0) { const d = Math.min(remaining, newSub); newSub -= d; remaining -= d; }
    if (remaining > 0 && newBonus > 0) { const d = Math.min(remaining, newBonus); newBonus -= d; remaining -= d; }

    await supabaseClient.from("user_credits").update({ plan_credits: newPlan, subscription_credits: newSub, bonus_credits: newBonus }).eq("user_id", user.id);
    await supabaseClient.from("credit_transactions").insert({
      user_id: user.id, type: "consumption", amount: -creditCost, source: "script_generation",
      balance_after: newPlan + newSub + newBonus,
      metadata: { agent_id },
    });
    console.log(`Credits consumed: ${creditCost}, remaining: ${newPlan + newSub + newBonus}`);
    // === END CREDIT CONSUMPTION ===

    const objectiveMap: Record<string, string> = {
      attraction: "Atração (capturar atenção de novos seguidores)",
      connection: "Conexão (criar vínculo emocional com a audiência)",
      conversion: "Conversão (levar a audiência a uma ação específica)",
      retention: "Retenção (manter a audiência engajada)",
    };

    const styleMap: Record<string, string> = {
      storytelling_looping: "Storytelling em Loop",
      analysis: "Análise",
      tutorial: "Tutorial",
      list: "Lista",
      comparison: "Comparação",
    };

    const scriptInstructions = `

## TAREFA ATUAL: Criar um Roteiro de Vídeo

Você está sendo solicitado a criar um roteiro para vídeo de redes sociais (Reels/TikTok) seguindo a estrutura IDF:

### ESTRUTURA IDF:

#### INÍCIO (I) - Gancho
- Primeiro segundo é crucial: deve prender a atenção imediatamente
- Use perguntas provocativas, afirmações surpreendentes ou cenas intrigantes

#### DESENVOLVIMENTO (D) - Conteúdo Principal  
- Entregue valor real e concreto
- Mantenha ritmo dinâmico, sem enrolação

#### FINAL (F) - Call-to-Action
- Finalize com impacto
- Inclua CTA claro`;

    const systemPrompt = agent.system_prompt + scriptInstructions;

    // === INJECT VOICE DNA + NARRATIVE ===
    let enrichedSystemPrompt = systemPrompt;
    try {
      const { data: voiceProfile } = await supabaseClient
        .from("voice_profiles")
        .select("voice_dna, is_calibrated")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: narrative } = await supabaseClient
        .from("user_narratives")
        .select("narrative_text, expertise, ideal_client, transformation, differentials, is_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (voiceProfile?.voice_dna && voiceProfile?.is_calibrated) {
        const dna = voiceProfile.voice_dna as any;
        enrichedSystemPrompt += `\n\n## DNA DE VOZ DO USUÁRIO
Formalidade: ${dna.formalidade}/10 | Ritmo: ${dna.ritmo} | Humor: ${dna.humor}
Assertividade: ${dna.assertividade} | Energia: ${dna.energia}
Expressões frequentes: ${(dna.expressoes_frequentes || []).join(", ")}
Resumo do tom: ${dna.resumo_tom || ""}
IMPORTANTE: O roteiro DEVE soar como esta pessoa escreveria.`;
      }

      if (narrative?.is_completed && narrative?.narrative_text) {
        enrichedSystemPrompt += `\n\n## NARRATIVA MAGNÉTICA DO USUÁRIO
${narrative.narrative_text}
Expertise: ${narrative.expertise || ""}
Cliente ideal: ${narrative.ideal_client || ""}
Transformação: ${narrative.transformation || ""}`;
      }
    } catch (e) {
      console.error("Error fetching identity context:", e);
    }
    // === END IDENTITY INJECTION ===

    const userPrompt = `Crie um roteiro completo para um vídeo com as seguintes características:

**Título:** ${title}
**Tema:** ${theme || "Geral"}
**Estilo:** ${styleMap[style] || style}
**Formato:** ${format || "Falado para câmera"}
**Objetivo:** ${objectiveMap[objective || "attraction"] || objective}

Por favor, escreva o roteiro seguindo a estrutura IDF:

## 🎯 INÍCIO (Gancho)
[Gancho inicial]

## 📚 DESENVOLVIMENTO (Conteúdo Principal)
[Corpo do roteiro]

## 🎬 FINAL (Call-to-Action)
[Fechamento com CTA]

Lembre-se: o roteiro deve ser natural para falar, não para ler.`;

    console.log(`Provider: ${provider}, model: ${agentModel}`);

    const generatedScript = await callAI(provider, agentModel, agent.api_key, enrichedSystemPrompt, userPrompt);
    console.log(`Script generated, length: ${generatedScript.length}`);

    return new Response(
      JSON.stringify({ success: true, script: generatedScript }),
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
