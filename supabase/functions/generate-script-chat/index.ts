import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_HISTORY_MESSAGES = 20;

interface ChatMessage {
  role: "user" | "assistant";
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
  action: "start" | "chat";
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
  messages: ChatMessage[]
): Promise<string> {
  // Limit history
  const limitedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

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
        messages: limitedMessages.map((m) => ({ role: m.role, content: m.content })),
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
          ...limitedMessages.map((m) => ({ role: m.role, content: m.content })),
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
  const geminiMessages = limitedMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
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

function parseScriptContent(
  script: string,
  structure: ScriptStructure | undefined
): Record<string, string> | null {
  if (!structure) return null;

  const content: Record<string, string> = {};

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

  const hasContent = Object.values(content).some((v) => v && v.length > 0);
  if (!hasContent && structure.inicio?.sections?.[0]) {
    content[structure.inicio.sections[0].id] = script;
  }

  return content;
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

    const { action, script, structure, agent_id, messages }: GenerateScriptChatRequest = await req.json();
    console.log(`Script chat: action=${action}, user=${user.id}, agent=${agent_id}`);

    let agent = null;
    if (agent_id) {
      const { data, error } = await supabaseClient
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (!error) agent = data;
    }

    if (!agent?.api_key) {
      return new Response(
        JSON.stringify({ error: "Este agente não tem uma API Key configurada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CREDIT CONSUMPTION (uses agent's credit_cost) ===
    if (action !== "start") {
      const creditCost = agent.credit_cost || 1;

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
        user_id: user.id, type: "consumption", amount: -creditCost, source: "script_adjustment",
        balance_after: newPlan + newSub + newBonus,
        metadata: { agent_id },
      });
      console.log(`Credits consumed: ${creditCost} (agent cost), remaining: ${newPlan + newSub + newBonus}`);
    }
    // === END CREDIT CONSUMPTION ===

    const objectiveMap: Record<string, string> = {
      attraction: "Atração",
      connection: "Conexão",
      conversion: "Conversão",
      retention: "Retenção",
    };

    const styleMap: Record<string, string> = {
      storytelling_looping: "Storytelling em Loop",
      analysis: "Análise",
      tutorial: "Tutorial",
      list: "Lista",
      comparison: "Comparação",
    };

    const scriptContext = `
## CONTEXTO DO ROTEIRO
- Título: ${script.title}
- Tema: ${script.theme || "Geral"}
- Estilo: ${styleMap[script.style] || script.style}
- Formato: ${script.format || "Falado para câmera"}
- Objetivo: ${objectiveMap[script.objective || "attraction"] || script.objective}

## SUA TAREFA
Ajude a criar um roteiro para vídeo de redes sociais (Reels/TikTok).
Conduza uma conversa natural para coletar informações antes de escrever o roteiro.

### PERGUNTAS (uma por vez):
1. Qual é a mensagem principal?
2. Quem é seu público-alvo?
3. Algum gancho ou ideia inicial?
4. Qual CTA no final?

### IMPORTANTE:
- Faça UMA pergunta por vez
- Quando tiver informações suficientes, gere o roteiro com estrutura IDF:
  - ## 🎯 INÍCIO (Gancho)
  - ## 📚 DESENVOLVIMENTO (Conteúdo Principal)
  - ## 🎬 FINAL (Call-to-Action)`;

    const systemPrompt = agent.system_prompt + scriptContext;

    if (action === "start") {
      return new Response(
        JSON.stringify({
          message: `Olá! 👋 Vou te ajudar a criar o roteiro "${script.title}".\n\nPara criar um conteúdo incrível, preciso entender melhor o que você quer comunicar.\n\n**Qual é a mensagem principal ou ponto-chave que você quer passar nesse vídeo?**`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const provider = getProvider(agent.model);
    console.log(`Provider: ${provider}, model: ${agent.model}`);

    const aiResponse = await callAI(provider, agent.model, agent.api_key, systemPrompt, messages);

    let scriptContent = null;
    const hasScriptStructure =
      aiResponse.includes("## 🎯 INÍCIO") || aiResponse.includes("## 📚 DESENVOLVIMENTO");

    if (hasScriptStructure && structure) {
      scriptContent = parseScriptContent(aiResponse, structure);
    }

    return new Response(
      JSON.stringify({ message: aiResponse, script_content: scriptContent }),
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
