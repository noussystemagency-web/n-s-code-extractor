import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, css, structure, metadata, colors, fonts } = await req.json();

    const prompt = `Analyze this extracted web page and generate a detailed, optimized prompt for recreating it in Base44 (React + Tailwind CSS). 

PAGE METADATA:
- Title: ${metadata?.title || 'Unknown'}
- Framework: ${metadata?.framework || 'Unknown'}
- Size: ${metadata?.total_size || 'Unknown'}

DETECTED COLORS: ${(colors || []).slice(0, 20).join(', ')}

DETECTED FONTS: ${(fonts || []).join(', ')}

DOM STRUCTURE (first 50 elements):
${(structure || []).slice(0, 50).map(s => `<${s.tag} class="${s.classes}">`).join('\n')}

HTML SNIPPET (first 5000 chars):
${(html || '').substring(0, 5000)}

CSS SNIPPET (first 3000 chars):
${(css || '').substring(0, 3000)}

Generate a detailed prompt in Spanish that describes:
1. Overall layout structure (grid, flexbox, sidebar, etc.)
2. Main sections and components
3. Color scheme with hex codes
4. Typography and fonts
5. Interactive elements (buttons, forms, etc.)
6. Responsive behavior
7. Icons to use (lucide-react)
8. Specific Tailwind CSS classes suggestions

The prompt should be ready to paste into Base44 AI to recreate the page.
Format it clearly with sections and bullet points.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          prompt_text: { type: "string", description: "The generated prompt in Spanish" },
          components_detected: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          color_palette: {
            type: "array",
            items: {
              type: "object",
              properties: {
                color: { type: "string" },
                usage: { type: "string" }
              }
            }
          },
          layout_type: { type: "string" },
          complexity: { type: "string", enum: ["simple", "medium", "complex"] }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});