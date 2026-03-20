import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { buildCoachPrompt } from './src/engine/coach-prompts';

const parseBody = async (req: { on: (ev: string, cb: (...args: unknown[]) => void) => void }): Promise<string> =>
  new Promise((resolveBody, rejectBody) => {
    let body = '';
    req.on('data', (chunk: unknown) => {
      body += String(chunk);
    });
    req.on('end', () => resolveBody(body));
    req.on('error', rejectBody);
  });

const createCoachHandler = (apiKey?: string) => {
  return async (req: any, res: any, next: () => void): Promise<void> => {
    if (typeof req.url !== 'string' || !req.url.startsWith('/api/coach')) {
      next();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }));
        return;
      }

      const rawBody = await parseBody(req);
      const context = JSON.parse(rawBody);
      const { system, user } = buildCoachPrompt(context);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 220,
          stream: true,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: errorText }));
        return;
      }

      if (!response.body) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Anthropic response had no body' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch {
            // Ignore non-JSON keepalive/control lines.
          }
        }
      }

      res.end();
    } catch (error: unknown) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown coach endpoint error',
        }),
      );
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const anthropicKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  return {
    plugins: [
      {
        name: 'coach-api-middleware',
        configureServer(server) {
          server.middlewares.use(createCoachHandler(anthropicKey));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createCoachHandler(anthropicKey));
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
