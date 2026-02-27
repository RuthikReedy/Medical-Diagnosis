import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, imaging_type, body_region, patient_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const typeLabel =
      imaging_type === "xray"
        ? "X-Ray"
        : imaging_type === "ct"
          ? "CT Scan"
          : imaging_type === "mri"
            ? "MRI"
            : "Skin Photo";

    const systemPrompt = `You are an expert medical imaging AI assistant trained to analyze medical images including X-rays, CT scans, MRI scans, and dermatological photographs. You must analyze the provided image in extreme detail.

Your analysis must be returned as a JSON object with exactly these fields:
- disease_found: boolean (true if any disease/abnormality is detected, false if healthy)
- disease_name: string or null (name of the disease if found)
- disease_stage: string or null (stage/grade like "I", "II", "III", "IV", "Early", "Advanced" if applicable)
- analysis: object with these sub-fields:
  - summary: string (2-3 sentence overview of findings)
  - findings: string (detailed description of what you observe in the image - abnormalities, patterns, structures)
  - description: string (if disease found: detailed explanation of the disease, its pathology, how it presents in imaging)
  - symptoms: string (common symptoms associated with the findings)
  - recommendations: string (recommended next steps, further tests, treatment approaches)

Be thorough, clinical, and detailed. If the image quality is poor or not clearly medical, still provide your best analysis and note limitations. Always provide actionable recommendations.

IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks, just raw JSON.`;

    const userMessage = `Analyze this ${typeLabel} image${body_region ? ` of the ${body_region}` : ""} for patient "${patient_name}". Examine every detail of the image for any signs of disease, abnormality, or pathology. Determine if disease is present, identify it, stage it if applicable, and provide a comprehensive clinical analysis.`;

    // Build message with image
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          {
            type: "image_url",
            image_url: { url: image },
          },
        ],
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("No response from AI");

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: create structured response from raw text
      parsed = {
        disease_found: false,
        disease_name: null,
        disease_stage: null,
        analysis: {
          summary: content.slice(0, 200),
          findings: content,
          description: "",
          symptoms: "",
          recommendations: "Please consult with a specialist for detailed assessment.",
        },
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
