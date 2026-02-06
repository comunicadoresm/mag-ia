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

// Search for relevant knowledge from agent's documents using simple text matching
async function searchKnowledge(
  supabase: any,
  agentId: string,
  query: string
): Promise<string> {
  try {
    // Get document chunks for this agent
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("agent_id", agentId)
      .limit(20);

    if (error) {
      console.error("Knowledge search error:", error);
      return "";
    }

    if (!chunks || chunks.length === 0) {
      return "";
    }

    // Simple relevance scoring - count matching words
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const scoredChunks = chunks.map((chunk: { content: string }) => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }
      
      return { content: chunk.content, score };
    });

    // Sort by score and take top 5 relevant chunks
    const relevantChunks = scoredChunks
      .filter((c: { score: number }) => c.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 5);

    if (relevantChunks.length === 0) {
      // If no relevant chunks, just return the first few chunks as general context
      return chunks.slice(0, 3).map((c: { content: string }) => c.content).join("\n\n---\n\n");
    }

    // Combine relevant chunks into context
    const context = relevantChunks
      .map((chunk: { content: string }) => chunk.content)
      .join("\n\n---\n\n");

    return context;
  } catch (error) {
    console.error("Error searching knowledge:", error);
    return "";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Create Supabase client with user's token
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

    const { conversation_id, agent_id }: ChatRequest = await req.json();

    console.log(`Processing chat for user ${user.id}, conversation ${conversation_id}`);

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      console.error("Conversation error:", convError);
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent with system prompt and api_key
    const { data: agent, error: agentError } = await supabaseClient
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      console.error("Agent error:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if agent has API key configured
    if (!agent.api_key) {
      console.error("Agent has no API key configured");
      return new Response(
        JSON.stringify({ error: "Este agente não tem uma API Key configurada. Configure no painel de administração." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation history
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Messages error:", messagesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array for AI
    const conversationHistory: Message[] = messagesData?.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })) || [];

    // Get the latest user message for knowledge search
    const latestUserMessage = conversationHistory
      .filter(m => m.role === "user")
      .pop()?.content || "";

    // Search for relevant knowledge from agent's documents
    let knowledgeContext = "";
    if (latestUserMessage) {
      knowledgeContext = await searchKnowledge(
        supabaseClient as any, 
        agent_id, 
        latestUserMessage
      );
    }

    // Build the system prompt with knowledge context
    let systemPrompt = agent.system_prompt;
    if (knowledgeContext) {
      systemPrompt = `${agent.system_prompt}

## Base de Conhecimento

Use as seguintes informações como contexto para responder às perguntas do usuário. Se a informação não estiver disponível no contexto, responda com base no seu conhecimento geral, mas indique quando estiver fazendo isso.

${knowledgeContext}`;
      console.log(`Added ${knowledgeContext.length} chars of knowledge context`);
    }

    console.log(`Sending ${conversationHistory.length} messages to AI with model: ${agent.model}`);

    // Determine provider based on model name
    const getProvider = (model: string): string => {
      if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('openai/')) return 'openai';
      if (model.startsWith('claude') || model.startsWith('anthropic/')) return 'anthropic';
      if (model.startsWith('gemini') || model.startsWith('google/')) return 'google';
      return 'openai'; // default
    };

    const provider = getProvider(agent.model);
    console.log(`Using provider: ${provider}, model: ${agent.model}`);

    // Build request based on provider
    let aiResponse: Response;
    let assistantMessage: string;
    let tokensUsed: number | null = null;

    if (provider === 'openai') {
      // OpenAI API
      aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agent.api_key}`,
        },
        body: JSON.stringify({
          model: agent.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("OpenAI API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro na API OpenAI. Verifique sua API Key." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
      tokensUsed = aiData.usage?.total_tokens || null;

    } else if (provider === 'anthropic') {
      // Anthropic API
      aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": agent.api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: conversationHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Anthropic API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro na API Anthropic. Verifique sua API Key e modelo configurado." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      assistantMessage = aiData.content?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
      tokensUsed = (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0);

    } else {
      // Google Gemini API
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${agent.api_key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            ...conversationHistory.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Gemini API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro na API Google Gemini. Verifique sua API Key." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      assistantMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
      tokensUsed = aiData.usageMetadata?.totalTokenCount || null;
    }

    console.log(`AI response received, tokens: ${tokensUsed}`);

    // Save assistant message to database
    const { error: insertError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id,
        role: "assistant",
        content: assistantMessage,
        tokens_used: tokensUsed,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      // Still return the response even if saving failed
    }

    // Update conversation metadata
    await supabaseClient
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 2, // user + assistant
      })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        tokens_used: tokensUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
