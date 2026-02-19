import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id, score, feedback } = await req.json();

    // Get current voice profile
    const { data: profile } = await supabaseClient
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Voice profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const currentDna = profile.voice_dna as any;

    // Reprocess DNA with feedback
    const recalibrationPrompt = `DNA de voz atual: ${JSON.stringify(currentDna)}

O usuário deu nota ${score}/10 para o parágrafo gerado com este DNA.
Feedback do usuário: "${feedback || 'Não soou natural'}"

Transcrições originais:
Casual: "${profile.transcription_casual || 'N/A'}"
Profissional: "${profile.transcription_professional || 'N/A'}"
Posicionamento: "${profile.transcription_positioning || 'N/A'}"

Ajuste o DNA considerando o feedback. Retorne APENAS o JSON atualizado com a mesma estrutura.`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "Retorne APENAS JSON válido, sem markdown." },
          { role: "user", content: recalibrationPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error("AI API error");
    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content || "";

    let updatedDna: any;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      updatedDna = JSON.parse(jsonMatch?.[0] || rawResponse);
    } catch {
      updatedDna = currentDna; // Keep current if parse fails
    }

    // Update DNA and increment recalibrations
    await supabaseClient.from("voice_profiles").update({
      voice_dna: updatedDna,
      recalibrations_count: (profile.recalibrations_count || 0) + 1,
    }).eq("user_id", user_id);

    // Generate new validation paragraph
    const validationResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "Escreva no tom de voz descrito. Sem explicações." },
          { role: "user", content: `Com base neste DNA: ${JSON.stringify(updatedDna)}\n\nEscreva um parágrafo curto (3-4 frases) sobre empreendedorismo, no tom desta pessoa.` },
        ],
        max_tokens: 500,
      }),
    });

    const valData = await validationResponse.json();
    const validationParagraph = valData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ success: true, voice_dna: updatedDna, validation_paragraph: validationParagraph }),
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
