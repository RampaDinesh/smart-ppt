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
    const { currentSlide, editPrompt, presentationTopic, audienceType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const audienceInstructions: Record<string, string> = {
      student: "Use simple language, focus on key concepts and definitions that would appear in exams.",
      teacher: "Include comprehensive details, teaching points, and discussion topics.",
      professional: "Use industry terminology, focus on practical applications and insights.",
      general: "Keep content accessible and engaging for a broad audience.",
    };

    const systemPrompt = `You are an expert presentation creator. You need to regenerate a single slide based on user feedback.

Rules:
- Keep the slide title relevant to the content
- Generate 3-5 bullet points
- Keep bullet points concise (under 15 words each)
- ${audienceInstructions[audienceType] || audienceInstructions.general}
- Apply the user's requested changes while keeping the content relevant to the overall topic`;

    const userPrompt = `The presentation is about: "${presentationTopic}"

Current slide content:
Title: ${currentSlide.title}
Bullets:
${currentSlide.bullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}

User's requested changes: "${editPrompt}"

Return ONLY valid JSON in this exact format:
{
  "title": "New Slide Title",
  "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"]
}`;

    console.log('Regenerating slide with prompt:', editPrompt);

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
      throw new Error('Failed to regenerate slide');
    }

    const data = await response.json();
    const contentText = data.choices[0].message.content;
    
    // Clean and extract JSON from response
    let jsonString = contentText;
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', contentText);
      throw new Error('Invalid response format');
    }
    
    let cleanedJson = jsonMatch[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    let slide;
    try {
      slide = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw JSON:', cleanedJson);
      throw new Error('Failed to parse AI response');
    }

    console.log('Successfully regenerated slide:', slide.title);

    return new Response(JSON.stringify({ slide }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in regenerate-slide:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
