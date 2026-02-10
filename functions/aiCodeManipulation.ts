import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, html, css, js } = await req.json();

    let prompt = '';
    let responseSchema = {};

    if (operation === 'refactor') {
      prompt = `Eres un experto en desarrollo web. Refactoriza este código para que sea más limpio, mantenible y siga las mejores prácticas.

HTML:
${html || 'No proporcionado'}

CSS:
${css || 'No proporcionado'}

JS:
${js || 'No proporcionado'}

Instrucciones:
- Elimina código duplicado
- Mejora la estructura semántica del HTML
- Organiza el CSS por componentes
- Optimiza el JavaScript
- Mantén la funcionalidad exacta
- Añade comentarios explicativos`;

      responseSchema = {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML refactorizado' },
          css: { type: 'string', description: 'CSS refactorizado' },
          js: { type: 'string', description: 'JavaScript refactorizado' },
          changes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de cambios realizados'
          }
        }
      };
    } else if (operation === 'variations') {
      prompt = `Eres un diseñador web experto. Genera 3 variaciones del diseño CSS manteniendo la estructura HTML.

HTML:
${html || ''}

CSS Base:
${css || ''}

Genera 3 variaciones distintas:
1. "Modern Dark" - Tema oscuro moderno con gradientes
2. "Minimal Light" - Diseño minimalista y limpio
3. "Colorful Bold" - Colores vibrantes y atrevidos

Cada variación debe incluir:
- Paleta de colores completa
- Tipografía actualizada
- Espaciados y bordes
- Efectos hover y transiciones`;

      responseSchema = {
        type: 'object',
        properties: {
          variations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                css: { type: 'string' },
                colors: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      };
    } else if (operation === 'optimize') {
      prompt = `Eres un experto en performance y accesibilidad web. Analiza este código y proporciona sugerencias detalladas de optimización.

HTML:
${html || 'No proporcionado'}

CSS:
${css || 'No proporcionado'}

JS:
${js || 'No proporcionado'}

Proporciona sugerencias en estas categorías:
1. Performance (carga, rendering, tamaño)
2. Accesibilidad (ARIA, semántica, contraste)
3. SEO (meta tags, estructura)
4. Seguridad (XSS, validación)
5. Mejores prácticas (estándares, compatibilidad)`;

      responseSchema = {
        type: 'object',
        properties: {
          performance: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                code_example: { type: 'string' }
              }
            }
          },
          accessibility: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                code_example: { type: 'string' }
              }
            }
          },
          seo: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          },
          security: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          },
          best_practices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                suggestion: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          }
        }
      };
    } else {
      return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
    });

    return Response.json({
      success: true,
      data: result,
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});