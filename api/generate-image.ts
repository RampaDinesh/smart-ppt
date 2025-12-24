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
    const { slideTitle, slideBullets, presentationTopic } = req.body;

    if (!slideTitle) {
      throw new Error('Slide title is required');
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Use Gemini to generate a detailed image description, then use a placeholder
    // Note: Gemini 1.5 Flash doesn't generate images directly
    // For now, we'll skip image generation and return success without an image
    // Users can integrate with a proper image generation API (DALL-E, Stability AI, etc.) later

    console.log('Image generation requested for:', slideTitle);
    
    // Return success without image - image generation requires a separate API
    return res.status(200).json({ 
      success: true,
      imageUrl: null,
      message: 'Image generation skipped - integrate with image API for this feature'
    });

  } catch (error: unknown) {
    console.error('Error in generate-image:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return res.status(500).json({ 
      error: message,
      success: false
    });
  }
}
