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

  const result = await runDifferentialDiagnosisWorkflow(patientDescription);

  return Response.json(result);
}
