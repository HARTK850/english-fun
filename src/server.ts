import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI } from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());

app.post('/api/ai-plan', async (req, res) => {
  try {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      You are an elite AI English tutor.
      User Stats: ${JSON.stringify(req.body)}.
      Return ONLY a valid JSON object matching exactly this structure:
      {
        "aiFeedback": "String: Give an encouraging short sentence in Hebrew based on their stats",
        "newWords": [
          { "hebrew": "String", "english": "String" }
        ]
      }
      Provide 3 new challenging words. Do not output anything outside the JSON.
    `;

    const response = await ai.models.generateContent({
       model: 'gemini-3.1-flash',
       contents: prompt
    });

    let text = response.text || "{}";
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI Error: ' + String(err) });
  }
});

const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
