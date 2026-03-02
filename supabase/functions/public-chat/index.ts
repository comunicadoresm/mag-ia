import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getProvider(model: string): "anthropic" | "openai" | "google" {
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  if (model.startsWith("gemini-")) return "google";
  return "anthropic";
}

async function searchKnowledge(supabase: any, agentId: string, query: string): Promise<string> {
  try {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("agent_id", agentId)
      .limit(20);
    if (!chunks || chunks.length === 0) return "";
    const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const scored = chunks.map((c: { content: string }) => {
      const cl = c.content.toLowerCase();
      let score = 0;
      for (const w of queryWords) if (cl.includes(w)) score++;
      return { content: c.content, score };
    });
    const relevant = scored.filter((c: any) => c.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 5);
    if (relevant.length === 0) return chunks.slice(0, 3).map((c: any) => c.content).join("\n\n---\n\n");
    return relevant.map((c: any) => c.content).join("\n\n---\n\n");
  } catch { return ""; }
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, history: Message[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) throw new Error("Erro na API Anthropic");
  const data = await response.json();
  return data.content?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, history: Message[]): Promise<string> {
  const messages = [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))];
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
  });
  if (!response.ok) throw new Error("Erro na API OpenAI");
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, history: Message[]): Promise<string> {
  const contents = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { maxOutputTokens: 2048, temperature: 0.7 } }),
  });
  if (!response.ok) throw new Error("Erro na API Gemini");
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, message, agent_id, fingerprint } = await req.json();

    if (!session_id || !message || !agent_id || !fingerprint) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify agent is public
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .eq("is_public", true)
      .eq("is_active", true)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found or not public" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify session
    const { data: session, error: sessErr } = await supabase
      .from("public_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("fingerprint", fingerprint)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(session.expires_at) <= new Date()) {
      return new Response(JSON.stringify({ error: "session_expired", message: "Sessão expirada" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check lead
    if (!session.lead_id) {
      return new Response(JSON.stringify({ error: "No lead associated" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check message limit
    if (session.messages_used >= session.max_messages) {
      return new Response(JSON.stringify({ error: "limit_reached", message: "Limite de mensagens atingido", messages_remaining: 0, limit_reached: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    await supabase.from("public_messages").insert({ session_id, role: "user", content: message });

    // Get history (last 20 messages)
    const { data: historyData } = await supabase
      .from("public_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const history: Message[] = (historyData || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));

    // Build system prompt with knowledge
    let systemPrompt = agent.system_prompt;
    const knowledge = await searchKnowledge(supabase, agent_id, message);
    if (knowledge) {
      systemPrompt += `\n\n## Base de Conhecimento\n${knowledge}`;
    }

    // Resolve API key
    const provider = getProvider(agent.model || "claude-sonnet-4-20250514");
    let apiKey = agent.api_key;
    if (!apiKey) {
      if (provider === "anthropic") apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      else if (provider === "openai") apiKey = Deno.env.get("OPENAI_API_KEY");
      else if (provider === "google") apiKey = Deno.env.get("GOOGLE_API_KEY");
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured for this agent" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = agent.model || "claude-sonnet-4-20250514";
    let reply: string;

    if (provider === "anthropic") reply = await callAnthropic(apiKey, model, systemPrompt, history);
    else if (provider === "openai") reply = await callOpenAI(apiKey, model, systemPrompt, history);
    else reply = await callGemini(apiKey, model, systemPrompt, history);

    // Save assistant message
    await supabase.from("public_messages").insert({ session_id, role: "assistant", content: reply });

    // Increment messages_used
    const newCount = (session.messages_used || 0) + 1;
    await supabase.from("public_sessions").update({ messages_used: newCount }).eq("id", session_id);

    const messagesRemaining = session.max_messages - newCount;

    return new Response(JSON.stringify({
      reply,
      messages_remaining: messagesRemaining,
      limit_reached: messagesRemaining <= 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Public chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
