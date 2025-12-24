import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentSlide, editPrompt, presentationTopic, audienceType } = req.body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Failed to regenerate slide');
    }

    const data = await response.json();
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!contentText) {
      throw new Error('No content received from Gemini');
    }

    // Clean and extract JSON
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

    return res.status(200).json({ slide });
  } catch (error: unknown) {
    console.error('Error in regenerate-slide:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return res.status(500).json({ error: message });
  }
}
