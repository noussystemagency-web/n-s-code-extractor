import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, css, componentName = 'ExtractedComponent' } = await req.json();

    const prompt = `Convert the following HTML/CSS code into a React + Tailwind CSS component for Base44.

HTML:
\`\`\`html
${(html || '').substring(0, 10000)}
\`\`\`

CSS:
\`\`\`css
${(css || '').substring(0, 5000)}
\`\`\`

Requirements:
1. Create a React functional component named "${componentName}"
2. Convert inline styles and CSS classes to Tailwind CSS classes
3. Extract reusable sub-components if needed (name them appropriately)
4. Use lucide-react for icons (map similar icons)
5. Use shadcn/ui components where appropriate (@/components/ui/*)
6. Make it fully responsive
7. Add proper TypeScript-style prop types in JSDoc comments
8. Keep state management simple with useState
9. Export as default

Return a JSON object with:
{
  "main_component": "string - the main component code",
  "sub_components": ["array of sub-component codes if any"],
  "imports": ["array of import statements needed"],
  "usage_example": "string - example of how to use the component"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          main_component: { type: "string" },
          sub_components: { type: "array", items: { type: "string" } },
          imports: { type: "array", items: { type: "string" } },
          usage_example: { type: "string" },
          component_name: { type: "string" },
          description: { type: "string" }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});