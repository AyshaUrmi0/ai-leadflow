import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations/lead";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "USER") {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to submit a consultation request.",
        },
        { status: 401 }
      );
    }

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

    const validationResult = leadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input.",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    await prisma.lead.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        serviceInterest: validatedData.serviceInterest,
        message: validatedData.message,
        consentGiven: validatedData.consentGiven,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unhandled error processing lead creation:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}