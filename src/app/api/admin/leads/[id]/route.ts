import { NextResponse } from "next/server";
import { getLeadById, updateLeadStatus } from "@/lib/services/lead";
import { updateLeadStatusSchema } from "@/lib/validations/lead";

// TODO: Security Notice - Authentication and authorization boundaries must be added before production deployment.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input.",
          errors: { _errors: ["Malformed JSON request body."] },
        },
        { status: 400 }
      );
    }

    const rawPayload = typeof body === "object" && body !== null ? { ...body, id } : { id };

    const validationResult = updateLeadStatusSchema.safeParse(rawPayload);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status or ID.",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id: leadId, status: newStatus } = validationResult.data;

    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    const updatedLead = await updateLeadStatus(leadId, newStatus);

    return NextResponse.json(
      {
        success: true,
        message: "Lead status updated successfully.",
        data: updatedLead,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error in PATCH /api/admin/leads/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
