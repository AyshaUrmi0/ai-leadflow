import http from "node:http";
import { leadIntelligenceSchema } from "../src/lib/validations/intelligence";

// Local stand-in for the Gemini API. The app reaches it through GOOGLE_GEMINI_BASE_URL,
// so E2E runs need no real API key.
// Passed by playwright.config.ts, which owns the port.
const GEMINI_STUB_PORT = Number(process.argv[2]);
const HEALTH_PATH = "/health";
const GENERATE_PATH_SUFFIX = ":generateContent";

// Parsed at startup so the stub can never return a payload the app would reject.
const STUB_INTELLIGENCE = leadIntelligenceSchema.parse({
  summary: "Patient asked about cosmetic veneers and wants a weekend consultation.",
  keyObservations: ["Interested in veneers.", "Prefers weekend appointments."],
  suggestedNextAction: {
    title: "Confirm weekend consultation",
    description: "Call the patient to confirm a weekend slot and veneer options.",
    recommendedTiming: "IMMEDIATE",
    suggestedDueDateDaysFromNow: 1,
  },
  urgency: "HIGH",
});

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === HEALTH_PATH) {
    res.writeHead(200).end("ok");
    return;
  }

  if (req.method === "POST" && req.url?.includes(GENERATE_PATH_SUFFIX)) {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          candidates: [
            {
              content: { role: "model", parts: [{ text: JSON.stringify(STUB_INTELLIGENCE) }] },
              finishReason: "STOP",
            },
          ],
        }),
      );
    });
    return;
  }

  res.writeHead(404).end();
});

server.listen(GEMINI_STUB_PORT, "127.0.0.1", () => {
  console.log(`Gemini stub listening on http://127.0.0.1:${GEMINI_STUB_PORT}`);
});
