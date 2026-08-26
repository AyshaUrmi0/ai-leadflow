"use server";

import { updateLeadStatusSchema } from "@/lib/validations/lead";
import { updateLeadStatus, getLeadById } from "@/lib/services/lead";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function updateLeadStatusAction(id: string, status: string) {
  // Authorization boundary check
  const session = await verifySession();
  if (!session.isAuth) {
    return {
      success: false,
      error: "Unauthorized: You must be logged in as an admin to perform this action.",
    };
  }

  const validationResult = updateLeadStatusSchema.safeParse({ id, status });

  if (!validationResult.success) {
    return {
      success: false,
      error: "Invalid status or ID.",
    };
  }

  const { id: leadId, status: validStatus } = validationResult.data;

  try {
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
      return {
        success: false,
        error: "Lead not found.",
      };
    }

    await updateLeadStatus(leadId, validStatus);
    revalidatePath("/admin/leads");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update lead status:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating status.",
    };
  }
}
