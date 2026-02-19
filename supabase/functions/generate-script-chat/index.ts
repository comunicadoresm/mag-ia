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
  is_from_template?: boolean;
  messages: ChatMessage[];
}

function getProvider(model: string): "anthropic" | "openai" | "google" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  if (model.startsWith("gemini")) return "google";
  return "anthropic";
}

const AI_TIMEOUT_MS = 55_000; // 55 seconds timeout for AI calls

async function callAI(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  // Limit history
  const limitedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      signal: controller.signal,
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
      signal: controller.signal,
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
      signal: controller.signal,
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
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("A IA demorou demais para responder. Tente novamente com uma mensagem mais curta.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

    const { action, script, structure, agent_id, is_from_template, messages }: GenerateScriptChatRequest = await req.json();
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

    // === CREDIT CONSUMPTION: charged when script is generated ===
    // Determine credit cost from agent config
    const creditCost = agent.credit_cost ?? 3;
    console.log(`Script chat: agent credit_cost=${creditCost}`);

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

    let systemPrompt: string;

    // === INJECT VOICE DNA + NARRATIVE ===
    let identityContext = "";
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
        identityContext += `\n\n## DNA DE VOZ DO USUÁRIO
Formalidade: ${dna.formalidade}/10 | Ritmo: ${dna.ritmo} | Humor: ${dna.humor}
Assertividade: ${dna.assertividade} | Energia: ${dna.energia}
Expressões frequentes: ${(dna.expressoes_frequentes || []).join(", ")}
Resumo do tom: ${dna.resumo_tom || ""}
IMPORTANTE: O roteiro DEVE soar como esta pessoa escreveria.`;
      }

      if (narrative?.is_completed && narrative?.narrative_text) {
        identityContext += `\n\n## NARRATIVA MAGNÉTICA DO USUÁRIO
${narrative.narrative_text}
Expertise: ${narrative.expertise || ""}
Cliente ideal: ${narrative.ideal_client || ""}
Transformação: ${narrative.transformation || ""}`;
      }
    } catch (e) {
      console.error("Error fetching identity context:", e);
    }
    // === END IDENTITY INJECTION ===

    if (is_from_template) {
      // === TEMPLATE-BASED CARD: heavy template context ===
      let templateStructureStr = "";
      if (structure) {
        const parts: string[] = [];
        if (structure.inicio) {
          parts.push(`## ${structure.inicio.title}`);
          structure.inicio.sections.forEach((s) => {
            parts.push(`- ${s.label}: ${s.placeholder || "[a preencher]"}`);
          });
        }
        if (structure.desenvolvimento) {
          parts.push(`## ${structure.desenvolvimento.title}`);
          structure.desenvolvimento.sections.forEach((s) => {
            parts.push(`- ${s.label}: ${s.placeholder || "[a preencher]"}`);
          });
        }
        if (structure.final) {
          parts.push(`## ${structure.final.title}`);
          structure.final.sections.forEach((s) => {
            parts.push(`- ${s.label}: ${s.placeholder || "[a preencher]"}`);
          });
        }
        templateStructureStr = parts.join("\n");
      }

      const scriptContext = `

## CONTEXTO DO TEMPLATE SELECIONADO

Título: ${script.title}
Tema: ${script.theme || "Geral"}
Estilo: ${styleMap[script.style] || script.style}
Formato: ${script.format || "Falado para câmera"}
Objetivo: ${objectiveMap[script.objective || "attraction"] || script.objective}

## ESTRUTURA DO TEMPLATE

${templateStructureStr || "Estrutura IDF padrão (INÍCIO, DESENVOLVIMENTO, FINAL)"}

---

## INSTRUÇÕES DE COMPORTAMENTO NO MODO TEMPLATE

### 1. RECONHECIMENTO DO TEMPLATE

Ao receber um template, você deve:
- **Analisar a estrutura** do template (quantos blocos tem, o que cada bloco pede)
- **Mapear cada bloco do template** para a estrutura IDF que você já domina
- **Identificar quais informações são necessárias** para preencher os campos variáveis do template (tudo que estiver entre [COLCHETES] ou que exija input do usuário)

### 2. ABERTURA (ADAPTADA)

Cumprimente com a mesma energia de sempre, mas contextualize o template:
- Mencione o nome do template selecionado
- Descreva brevemente o que o template faz
- Diga que vai precisar de algumas informações para personalizar

### 3. COLETA DE INFORMAÇÕES (ADAPTADA AO TEMPLATE)

Em vez de seguir perguntas fixas, **analise o template e gere perguntas específicas** para preencher os campos variáveis.

**Regras da coleta:**
- **UMA pergunta por vez**
- **Pergunte apenas o que o template precisa** — não repita perguntas cujas respostas já estão no contexto
- **Mínimo de 3, máximo de 5 perguntas** — ajuste conforme a complexidade do template
- **Mantenha seu tom** — exemplos contextualizados, provocações, energia

### 4. GERAÇÃO DO ROTEIRO

Após coletar as informações:
- **Siga a estrutura exata do template** como esqueleto (respeite os blocos, a ordem, o tipo de conteúdo que cada bloco pede)
- **Aplique todas as regras do prompt central**: storytelling looping, linguagem de conversa, tensão antes da revelação, cores de intenção, dicas de gravação
- **Preencha os campos variáveis** [COLCHETES] com o conteúdo coletado nas respostas do usuário
- **Mantenha a estrutura IDF** mesmo que o template use nomenclatura diferente:
  - INÍCIO do template → INÍCIO (Gancho + Suspensão) do IDF
  - DESENVOLVIMENTO do template → DESENVOLVIMENTO (Contexto + Revelação + Valor) do IDF
  - FINAL do template → FECHAMENTO (CTA) do IDF

### 5. FORMATO DE ENTREGA

Use este formato:

🎬 ROTEIRO FINAL – PRONTO PARA GRAVAR

📍 Tipo: [objetivo] | Padrão: [conforme template] | Duração: ~XX segundos

---

## 🎯 INÍCIO (Gancho)
[conteúdo seguindo o template]

## 📚 DESENVOLVIMENTO (Conteúdo Principal)
[conteúdo seguindo o template]

## 🎬 FINAL (Call-to-Action)
[conteúdo seguindo o template]

---

💡 DICAS DE GRAVAÇÃO:
[dicas contextualizadas]

### 6. REGRAS ABSOLUTAS

- Não ignore o template — ele é o esqueleto, respeite
- Não mude o tom, identidade ou regras do prompt central
- Não entregue o roteiro sem coletar informações antes
- Não invente blocos que o template não tem
- Mantenha cores de intenção e dicas de gravação
- Pergunte se quer ajustar após entrega`;

      systemPrompt = agent.system_prompt + scriptContext + identityContext;
    } else {
      // === FREE CARD: agent cru + minimal script context ===
      const freeCardContext = `

## CONTEXTO DO ROTEIRO

O usuário está criando um roteiro do zero com as seguintes informações:
- Título: ${script.title}
- Tema: ${script.theme || "Livre"}
- Estilo: ${styleMap[script.style] || script.style}
- Formato: ${script.format || "Falado para câmera"}
- Objetivo: ${objectiveMap[script.objective || "attraction"] || script.objective}

## INSTRUÇÕES

Você está no modo de criação livre. Converse naturalmente com o usuário para entender o que ele quer comunicar. Faça perguntas abertas, uma por vez, para coletar informações.

Quando tiver informações suficientes, gere o roteiro no formato:

## 🎯 INÍCIO (Gancho)
[gancho que prende atenção]

## 📚 DESENVOLVIMENTO (Conteúdo Principal)
[desenvolvimento do tema]

## 🎬 FINAL (Call-to-Action)
[fechamento com CTA]

Após entregar, pergunte se quer ajustar algo.`;

      systemPrompt = agent.system_prompt + freeCardContext + identityContext;
    }

    if (action === "start") {
      const provider = getProvider(agent.model);
      const openingPrompt = is_from_template
        ? `O usuário selecionou o template "${script.title}" no Kanban. Faça sua abertura contextualizada ao template seguindo as instruções do modo template.`
        : `O usuário criou um roteiro do zero chamado "${script.title}". Cumprimente-o de forma natural e pergunte sobre o que ele quer comunicar nesse vídeo para você ajudá-lo a criar o roteiro.`;
      const openingResponse = await callAI(provider, agent.model, agent.api_key, systemPrompt, [
        { role: "user", content: openingPrompt }
      ]);

      return new Response(
        JSON.stringify({ message: openingResponse }),
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

    // === CONSUME CREDITS when a script/adjustment is detected ===
    let creditsConsumed = 0;
    if (hasScriptStructure) {
      try {
        // Determine if adjustment or generation
        const isAdjustment = messages.length > 2; // If there's prior conversation, likely an adjustment
        const consumeAction = isAdjustment ? 'script_adjustment' : 'script_generation';
        
        // Call consume-credits internally
        const consumeResponse = await fetch(
          `${supabaseUrl}/functions/v1/consume-credits`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
            },
            body: JSON.stringify({
              action: consumeAction,
              metadata: { agent_id: agent_id, mode: isAdjustment ? 'adjustment' : 'generation' },
            }),
          }
        );

        const consumeData = await consumeResponse.json();
        if (!consumeResponse.ok) {
          // Return error with credit info so frontend can show upsell
          return new Response(
            JSON.stringify({
              error: 'insufficient_credits',
              message: consumeData?.message || 'Seus créditos acabaram!',
              balance: consumeData?.balance,
              script_content: scriptContent,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        creditsConsumed = consumeData?.credits_consumed || 0;
        console.log(`Credits consumed: ${creditsConsumed}`);
      } catch (creditErr) {
        console.error('Error consuming credits:', creditErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: aiResponse,
        script_content: scriptContent,
        credits_consumed: creditsConsumed,
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
