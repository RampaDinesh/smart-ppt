import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, slideCount, audienceType, mode, sampleAnalysis } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const audienceInstructions = {
      student: "Use simple language, focus on key concepts and definitions that would appear in exams.",
      teacher: "Include comprehensive details, teaching points, and discussion topics.",
      professional: "Use industry terminology, focus on practical applications and insights.",
      general: "Keep content accessible and engaging for a broad audience.",
    };

    let systemPrompt = `You are an expert presentation creator. Generate a structured PowerPoint presentation.
    
Rules:
- Each slide should have a clear title and 3-5 bullet points
- Keep bullet points concise (under 15 words each)
- Focus on key information that's easy to remember
- Structure: Title slide info, then content slides, ending with a conclusion
- ${audienceInstructions[audienceType as keyof typeof audienceInstructions] || audienceInstructions.general}`;

    if (mode === 'sample' && sampleAnalysis) {
      systemPrompt += `\n\nMatch this structure from the sample:
- ${sampleAnalysis.slideCount} slides
- ${sampleAnalysis.averageBulletsPerSlide} bullets per slide
- Bullet length around ${sampleAnalysis.averageBulletLength} words`;
    }

    const userPrompt = `Create a ${slideCount}-slide presentation about: "${topic}"

Return ONLY valid JSON in this exact format:
{
  "title": "Presentation Title",
  "slides": [
    {"title": "Slide Title", "bullets": ["Point 1", "Point 2", "Point 3"]}
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    const contentText = data.choices[0].message.content;
    
    // Clean and extract JSON from response
    let jsonString = contentText;
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', contentText);
      throw new Error('Invalid response format');
    }
    
    // Clean the JSON string - remove trailing commas before } or ]
    let cleanedJson = jsonMatch[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    let content;
    try {
      content = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw JSON:', cleanedJson);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-ppt-content:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
