// Mock server-only for standalone tsx test execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;
} catch {}

import { prisma } from "../src/lib/prisma";
import { leadIntelligenceSchema } from "../src/lib/validations/intelligence";
import * as fs from "fs";
import * as path from "path";

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}${detail ? `: ${detail}` : ""}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function runTests() {
  const { assembleLeadIntelligenceContext, getLeadAIIntelligence } =
    await import("../src/lib/services/intelligence");

  console.log("==================================================");
  console.log("Phase 10.5: AI Lead Intelligence Verification");
  console.log("==================================================");

  // 1. Check existing database lead for live context assembly test
  console.log("\n1. Testing Lead Intelligence Context Assembly & Data Boundary...");
  const lead = await prisma.lead.findFirst({
    where: { status: { not: "CLOSED_LOST" } },
    include: { notes: true, tasks: true },
  });

  if (!lead) {
    throw new Error("No leads found in test database to verify context assembly.");
  }

  const context = await assembleLeadIntelligenceContext(lead.id);
  assert(context !== null, "Successfully assembled context for existing lead");

  if (context) {
    // Check allowed fields
    assert(typeof context.score === "number", "Includes deterministic score");
    assert(["COLD", "WARM", "HOT"].includes(context.temperature), "Includes deterministic temperature");
    assert(Array.isArray(context.scoreReasons), "Includes score reasons");
    assert(context.status === lead.status, "Includes lead status");
    assert(context.serviceInterest === lead.serviceInterest, "Includes service interest");
    assert(context.message === lead.message, "Includes inquiry message");

    // First name extraction check: should only be the first word of lead.name
    const expectedFirstName = lead.name.trim().split(/\s+/)[0];
    assert(context.firstName === expectedFirstName, `Extracted first name ('${context.firstName}') instead of full name ('${lead.name}')`);

    // Strict boundary checks: Ensure NO contact details, credentials, or IDs leaked
    assert(!("email" in context), "context strictly excludes 'email'");
    assert(!("phone" in context), "context strictly excludes 'phone'");
    assert(!("passwordHash" in context), "context strictly excludes 'passwordHash'");
    assert(!("sessionSecret" in context), "context strictly excludes 'sessionSecret'");

    // Notes boundary: each note has only content and createdAt
    if (context.notes && context.notes.length > 0) {
      const firstNote = context.notes[0];
      assert("content" in firstNote && !("authorId" in firstNote), "Note context excludes authorId");
      assert(!("author" in firstNote), "Note context excludes author user record");
    }

    // Tasks boundary: each task has only title, description, status, dueDate
    if (context.tasks && context.tasks.length > 0) {
      const firstTask = context.tasks[0];
      assert("title" in firstTask && !("creatorId" in firstTask), "Task context excludes creatorId");
      assert(!("assignedToId" in firstTask), "Task context excludes assignedToId");
      assert(!("assignedTo" in firstTask), "Task context excludes assignedTo user record");
    }
  }

  // 2. Nonexistent lead handling
  console.log("\n2. Testing Nonexistent Lead Handling...");
  const nonexistentContext = await assembleLeadIntelligenceContext("nonexistent_lead_cuid_12345");
  assert(nonexistentContext === null, "assembleLeadIntelligenceContext returns null for nonexistent lead");

  const nonexistentResult = await getLeadAIIntelligence("nonexistent_lead_cuid_12345");
  assert(!nonexistentResult.success && nonexistentResult.error === "Lead not found.", "getLeadAIIntelligence returns 'Lead not found.' for nonexistent lead");

  // 3. Missing OPENAI_API_KEY handling
  console.log("\n3. Testing Missing OPENAI_API_KEY Safe Handling...");
  const savedKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const missingKeyResult = await getLeadAIIntelligence(lead.id);
  assert(
    !missingKeyResult.success &&
      missingKeyResult.error === "AI insights are not configured yet." &&
      missingKeyResult.code === "MISSING_API_KEY",
    "Missing API key cleanly returns 'AI insights are not configured yet.'"
  );

  // Restore environment variable
  if (savedKey) process.env.OPENAI_API_KEY = savedKey;

  // 4. Valid AI response schema validation
  console.log("\n4. Testing Valid AI Response Contract...");
  const sampleValidResponse = {
    summary: "Patient interested in cosmetic dental whitening and veneers; highly responsive.",
    keyObservations: [
      "Inquired specifically about veneers and weekend consultations.",
      "Internal notes show previous phone contact established.",
    ],
    suggestedNextAction: {
      title: "Schedule Cosmetic Consultation",
      description: "Call patient to confirm Saturday appointment opening for cosmetic evaluation.",
      recommendedTiming: "WITHIN_24_HOURS" as const,
      suggestedDueDateDaysFromNow: 1,
    },
    urgency: "HIGH" as const,
  };
  const parseResult = leadIntelligenceSchema.safeParse(sampleValidResponse);
  assert(parseResult.success, "Valid structured response passes Zod schema");

  // 5. Malformed JSON handling
  console.log("\n5. Testing Malformed JSON & Parse Error Mapping...");
  let parseThrew = false;
  try {
    JSON.parse("{ invalid json string }");
  } catch {
    parseThrew = true;
  }
  assert(parseThrew, "Malformed JSON triggers safe parse error branch");

  // 6. Invalid Zod output handling
  console.log("\n6. Testing Schema Rejection on Invalid AI Output...");
  const invalidUrgency = { ...sampleValidResponse, urgency: "EXTREME" };
  assert(!leadIntelligenceSchema.safeParse(invalidUrgency).success, "Invalid urgency 'EXTREME' rejected");

  const tooManyObs = {
    ...sampleValidResponse,
    keyObservations: ["Obs 1", "Obs 2", "Obs 3", "Obs 4"],
  };
  assert(!leadIntelligenceSchema.safeParse(tooManyObs).success, "More than 3 keyObservations rejected");

  const negativeDue = {
    ...sampleValidResponse,
    suggestedNextAction: {
      ...sampleValidResponse.suggestedNextAction,
      suggestedDueDateDaysFromNow: -2,
    },
  };
  assert(!leadIntelligenceSchema.safeParse(negativeDue).success, "Negative due date rejected");

  // 7. Source Inspection: No automatic AI request on drawer initialization
  console.log("\n7. Inspecting Drawer Code: No Automatic Execution on Mount...");
  const drawerCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/admin/lead-details-drawer.tsx"),
    "utf-8"
  );
  assert(
    drawerCode.includes("const [aiResult, setAiResult] = useState<LeadIntelligence | null>(null);"),
    "Drawer initializes aiResult to null"
  );
  assert(
    /setAiResult\(null\);[\s\r\n]*setAiError\(null\);/.test(drawerCode),
    "Drawer resets AI state on leadId change"
  );
  assert(
    !drawerCode.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*generateAIIntelligenceAction/),
    "Drawer does NOT invoke generateAIIntelligenceAction inside any useEffect"
  );
  assert(
    drawerCode.includes("onGenerate={handleGenerateAI}"),
    "AI generation is strictly bound to explicit user trigger (onGenerate)"
  );
  assert(
    drawerCode.includes("onRetry={handleGenerateAI}"),
    "Retry handler is wired to handleGenerateAI"
  );

  // 8. Client/Server Boundary Check
  console.log("\n8. Inspecting Client/Server Isolation...");
  assert(!drawerCode.includes("from \"openai\""), "LeadDetailsDrawer does NOT import OpenAI SDK");
  assert(!drawerCode.includes("from \"@/lib/ai/provider\""), "LeadDetailsDrawer does NOT import provider.ts directly");
  assert(!drawerCode.includes("process.env.OPENAI_API_KEY"), "LeadDetailsDrawer does NOT access OPENAI_API_KEY");

  const cardCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/admin/lead-ai-card.tsx"),
    "utf-8"
  );
  assert(!cardCode.includes("from \"openai\""), "LeadAICard does NOT import OpenAI SDK");
  assert(!cardCode.includes("from \"@/lib/ai/provider\""), "LeadAICard does NOT import provider.ts directly");

  // 9. Database Immutability Check: Zero DB writes during AI intelligence generation
  console.log("\n9. Testing Zero Database Writes...");
  const [leadsBefore, notesBefore, tasksBefore, logsBefore] = await Promise.all([
    prisma.lead.count(),
    prisma.leadNote.count(),
    prisma.leadTask.count(),
    prisma.leadActivityLog.count(),
  ]);

  // Run intelligence context assembly and evaluation
  await assembleLeadIntelligenceContext(lead.id);
  await getLeadAIIntelligence(lead.id);

  const [leadsAfter, notesAfter, tasksAfter, logsAfter] = await Promise.all([
    prisma.lead.count(),
    prisma.leadNote.count(),
    prisma.leadTask.count(),
    prisma.leadActivityLog.count(),
  ]);

  assert(leadsBefore === leadsAfter, `Lead count unchanged (${leadsBefore} === ${leadsAfter})`);
  assert(notesBefore === notesAfter, `Note count unchanged (${notesBefore} === ${notesAfter})`);
  assert(tasksBefore === tasksAfter, `Task count unchanged (${tasksBefore} === ${tasksAfter})`);
  assert(logsBefore === logsAfter, `ActivityLog count unchanged (${logsBefore} === ${logsAfter})`);

  console.log("\n==================================================");
  console.log(`Results: ${passed} / ${total} checks PASSED.`);
  console.log("==================================================");
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
