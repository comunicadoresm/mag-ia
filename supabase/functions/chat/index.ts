import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatRequest {
  conversation_id: string;
  message: string;
  agent_id: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Max messages to send to AI (last N messages)
const MAX_HISTORY_MESSAGES = 20;

// Determine provider based on model name
function getProvider(model: string): "anthropic" | "openai" | "google" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o1")) return "openai";
  if (model.startsWith("gemini")) return "google";
  return "anthropic"; // fallback
}

// Search for relevant knowledge from agent's documents
async function searchKnowledge(
  supabase: any,
  agentId: string,
  query: string
): Promise<string> {
  try {
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("agent_id", agentId)
      .limit(20);

    if (error || !chunks || chunks.length === 0) return "";

    const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

    const scoredChunks = chunks.map((chunk: { content: string }) => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 1;
      }
      return { content: chunk.content, score };
    });

    const relevantChunks = scoredChunks
      .filter((c: { score: number }) => c.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 5);

    if (relevantChunks.length === 0) {
      return chunks.slice(0, 3).map((c: { content: string }) => c.content).join("\n\n---\n\n");
    }

    return relevantChunks.map((chunk: { content: string }) => chunk.content).join("\n\n---\n\n");
  } catch (error) {
    console.error("Error searching knowledge:", error);
    return "";
  }
}

// Call Anthropic with prompt caching
async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  knowledgeContext: string,
  history: Message[]
): Promise<{ text: string; tokens: number | null }> {
  // Build system with cache_control
  const systemBlocks: any[] = [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Build messages - knowledge context as first user message with caching
  const messages: any[] = [];

  if (knowledgeContext) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Contexto da base de conhecimento:\n${knowledgeContext}`,
          cache_control: { type: "ephemeral" },
        },
      ],
    });
    messages.push({
      role: "assistant",
      content: "Entendido, vou usar essas informações como contexto.",
    });
  }

  // Add conversation history (limited)
  messages.push(...history.map((m) => ({ role: m.role, content: m.content })));

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
      system: systemBlocks,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API error:", errorText);
    throw new Error("Erro na API Anthropic. Verifique sua API Key e modelo.");
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  // Log cache stats
  if (data.usage?.cache_creation_input_tokens || data.usage?.cache_read_input_tokens) {
    console.log(`Cache stats - created: ${data.usage?.cache_creation_input_tokens || 0}, read: ${data.usage?.cache_read_input_tokens || 0}`);
  }

  return { text, tokens };
}

// Call OpenAI
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  knowledgeContext: string,
  history: Message[]
): Promise<{ text: string; tokens: number | null }> {
  const messages: any[] = [{ role: "system", content: systemPrompt }];

  if (knowledgeContext) {
    messages.push({
      role: "user",
      content: `Contexto da base de conhecimento:\n${knowledgeContext}`,
    });
    messages.push({
      role: "assistant",
      content: "Entendido, vou usar essas informações como contexto.",
    });
  }

  messages.push(...history.map((m) => ({ role: m.role, content: m.content })));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error("Erro na API OpenAI. Verifique sua API Key.");
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.",
    tokens: data.usage?.total_tokens || null,
  };
}

// Call Google Gemini
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  knowledgeContext: string,
  history: Message[]
): Promise<{ text: string; tokens: number | null }> {
  const fullSystemPrompt = knowledgeContext
    ? `${systemPrompt}\n\n## Base de Conhecimento\n${knowledgeContext}`
    : systemPrompt;

  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: fullSystemPrompt }] },
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error("Erro na API Google Gemini. Verifique sua API Key.");
  }

  const data = await response.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.",
    tokens: data.usageMetadata?.totalTokenCount || null,
  };
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

    const { conversation_id, agent_id }: ChatRequest = await req.json();
    console.log(`Chat: user=${user.id}, conv=${conversation_id}`);

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent
    const { data: agent, error: agentError } = await supabaseClient
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CREDIT CONSUMPTION ===
    const billingType = agent.billing_type || "per_messages";
    const creditCost = agent.credit_cost || 1;
    const packageSize = agent.message_package_size || 5;

    let shouldCharge = true;
    // per_output: defer charging until after AI responds (handled below)
    let deferCharge = false;

    if (billingType === "per_output") {
      shouldCharge = false;
      deferCharge = true;
      console.log(`Billing type: per_output. Will charge after AI response if output is detected.`);
    } else if (billingType === "per_messages") {
      // Count user messages already in this conversation (BEFORE current one is inserted)
      const { count } = await supabaseClient
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversation_id)
        .eq("role", "user");

      // messageIndex = current message number (1-based)
      const messageIndex = (count || 0) + 1;
      // Charge on 1st message, then every packageSize messages after that (1, 6, 11, 16... for packageSize=5)
      const shouldChargeMessage = (messageIndex === 1) || ((messageIndex - 1) % packageSize === 0);
      if (!shouldChargeMessage) {
        shouldCharge = false;
        console.log(`Message ${messageIndex} - not a billing point (next at ${messageIndex + (packageSize - ((messageIndex - 1) % packageSize))}). Skipping charge.`);
      } else {
        console.log(`Message ${messageIndex} - billing point! Charging ${creditCost} credits.`);
      }
    }
    // per_messages (default): charge based on message count above

    if (shouldCharge) {
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
            error: "insufficient_credits",
            message: "Seus créditos acabaram!",
            balance: { plan: credits.plan_credits, subscription: credits.subscription_credits, bonus: credits.bonus_credits, total: totalBalance },
            required: creditCost,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Debit in priority order: plan → subscription → bonus
      let remaining = creditCost;
      let newPlan = credits.plan_credits || 0;
      let newSub = credits.subscription_credits || 0;
      let newBonus = credits.bonus_credits || 0;

      if (remaining > 0 && newPlan > 0) { const d = Math.min(remaining, newPlan); newPlan -= d; remaining -= d; }
      if (remaining > 0 && newSub > 0) { const d = Math.min(remaining, newSub); newSub -= d; remaining -= d; }
      if (remaining > 0 && newBonus > 0) { const d = Math.min(remaining, newBonus); newBonus -= d; remaining -= d; }

      await supabaseClient.from("user_credits").update({ plan_credits: newPlan, subscription_credits: newSub, bonus_credits: newBonus }).eq("user_id", user.id);
      await supabaseClient.from("credit_transactions").insert({
        user_id: user.id, type: "consumption", amount: -creditCost, source: "chat_messages",
        balance_after: newPlan + newSub + newBonus,
        metadata: { agent_id, conversation_id },
      });
      console.log(`Credits consumed: ${creditCost}, remaining: ${newPlan + newSub + newBonus}`);
    }
    // === END CREDIT CONSUMPTION ===

    // Determine provider from model name
    const provider = getProvider(agent.model || "claude-haiku-3-5-20241022");

    // Resolve API key: use agent's own key first, then fallback to env secrets
    let resolvedApiKey = agent.api_key;
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
    // Override agent.api_key with resolved key for downstream calls
    agent.api_key = resolvedApiKey;

    // Get conversation history — LIMITED to last N messages
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse to chronological order
    const conversationHistory: Message[] = (messagesData || [])
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Search knowledge base
    const latestUserMessage = conversationHistory
      .filter((m) => m.role === "user")
      .pop()?.content || "";

    let knowledgeContext = "";
    if (latestUserMessage) {
      knowledgeContext = await searchKnowledge(supabaseClient, agent_id, latestUserMessage);
    }

    // Build system prompt
    let systemPrompt = agent.system_prompt;
    if (knowledgeContext) {
      systemPrompt = `${agent.system_prompt}\n\n## Base de Conhecimento\nUse as seguintes informações como contexto para responder às perguntas do usuário.\n\n${knowledgeContext}`;
    }

    // === INJECT VOICE DNA + NARRATIVE ===
    try {
      const { data: voiceProfile } = await supabaseClient
        .from("voice_profiles")
        .select("voice_dna, is_calibrated")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: narrative } = await supabaseClient
        .from("user_narratives")
        .select("narrative_text, expertise, ideal_client, transformation, differentials, market_criticism, concrete_results, is_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (voiceProfile?.voice_dna && voiceProfile?.is_calibrated) {
        const dna = voiceProfile.voice_dna as any;
        systemPrompt += `\n\n## DNA DE VOZ DO USUÁRIO (USE PARA ADAPTAR SUA LINGUAGEM)
Formalidade: ${dna.formalidade}/10 | Ritmo: ${dna.ritmo} | Humor: ${dna.humor}
Assertividade: ${dna.assertividade} | Energia: ${dna.energia}
Expressões frequentes: ${(dna.expressoes_frequentes || []).join(", ")}
Palavras de transição: ${(dna.palavras_transicao || []).join(", ")}
Resumo do tom: ${dna.resumo_tom || ""}
IMPORTANTE: Adapte suas respostas para soar como esta pessoa escreveria/falaria.`;
      }

      if (narrative?.is_completed && narrative?.narrative_text) {
        systemPrompt += `\n\n## NARRATIVA MAGNÉTICA DO USUÁRIO
${narrative.narrative_text}
Expertise: ${narrative.expertise || ""}
Cliente ideal: ${narrative.ideal_client || ""}
Transformação: ${narrative.transformation || ""}
Diferenciais: ${narrative.differentials || ""}
Use estas informações para contextualizar respostas e roteiros.`;
      }
    } catch (e) {
      console.error("Error fetching identity context:", e);
    }
    // === END IDENTITY INJECTION ===

    let result: { text: string; tokens: number | null };

    if (provider === "anthropic") {
      // For Anthropic, pass knowledge separately for caching
      result = await callAnthropic(agent.api_key, agent.model, agent.system_prompt, knowledgeContext, conversationHistory);
    } else if (provider === "openai") {
      result = await callOpenAI(agent.api_key, agent.model, systemPrompt, knowledgeContext, conversationHistory);
    } else {
      result = await callGemini(agent.api_key, agent.model, systemPrompt, knowledgeContext, conversationHistory);
    }

    console.log(`AI response: ${result.tokens} tokens`);

    // === DEFERRED per_output BILLING ===
    let creditsConsumed = 0;
    if (deferCharge) {
      // Detect structured output - check for script markers with or without markdown formatting
      const normalizedText = result.text.replace(/\*\*/g, "").replace(/##\s*/g, "");
      const hasOutputStructure =
        normalizedText.includes("🎯 INÍCIO") || normalizedText.includes("📚 DESENVOLVIMENTO") ||
        normalizedText.includes("🎬 ROTEIRO FINAL") || normalizedText.includes("📍 DESENVOLVIMENTO") ||
        normalizedText.includes("✅ FECHAMENTO");

      if (hasOutputStructure) {
        console.log(`Output detected in per_output mode. Charging ${creditCost} credits.`);
        const { data: deferCredits } = await supabaseClient
          .from("user_credits")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (deferCredits) {
          const deferTotal = (deferCredits.plan_credits || 0) + (deferCredits.subscription_credits || 0) + (deferCredits.bonus_credits || 0);
          if (deferTotal >= creditCost) {
            let rem = creditCost;
            let nP = deferCredits.plan_credits || 0;
            let nS = deferCredits.subscription_credits || 0;
            let nB = deferCredits.bonus_credits || 0;
            if (rem > 0 && nP > 0) { const d = Math.min(rem, nP); nP -= d; rem -= d; }
            if (rem > 0 && nS > 0) { const d = Math.min(rem, nS); nS -= d; rem -= d; }
            if (rem > 0 && nB > 0) { const d = Math.min(rem, nB); nB -= d; rem -= d; }
            await supabaseClient.from("user_credits").update({ plan_credits: nP, subscription_credits: nS, bonus_credits: nB }).eq("user_id", user.id);
            await supabaseClient.from("credit_transactions").insert({
              user_id: user.id, type: "consumption", amount: -creditCost, source: "chat_output",
              balance_after: nP + nS + nB,
              metadata: { agent_id, conversation_id },
            });
            creditsConsumed = creditCost;
            console.log(`per_output credits consumed: ${creditCost}, remaining: ${nP + nS + nB}`);
          }
        }
      } else {
        console.log(`No output structure detected in per_output mode. No charge.`);
      }
    }
    // === END DEFERRED BILLING ===

    // Save assistant message
    await supabaseClient.from("messages").insert({
      conversation_id,
      role: "assistant",
      content: result.text,
      tokens_used: result.tokens,
    });

    // Update conversation metadata
    await supabaseClient
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 2,
      })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: result.text,
        tokens_used: result.tokens,
        credits_consumed: creditsConsumed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
