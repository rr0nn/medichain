import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";

type DifferentialDiagnosisRequest = {
  patientDescription?: string;
};

export async function POST(req: Request) {
  let body: DifferentialDiagnosisRequest;

  try {
    body = (await req.json()) as DifferentialDiagnosisRequest;
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const patientDescription = body.patientDescription?.trim();

  if (!patientDescription) {
    return Response.json(
      { error: "patientDescription is required" },
      { status: 400 }
    );
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(enc.encode(JSON.stringify(data) + "\n"));

      try {
        const result = await runDifferentialDiagnosisWorkflow(
          patientDescription,
          send
        );
        send({ type: "result", ...result });
      } catch (e) {
        send({ type: "error", message: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
