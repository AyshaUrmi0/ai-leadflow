import { NextResponse } from "next/server";
import { getLeads } from "@/lib/services/lead";
import { adminLeadsQuerySchema } from "@/lib/validations/lead";

// TODO: Security Notice - Authentication and authorization boundaries must be added before production deployment.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };

    const validationResult = adminLeadsQuerySchema.safeParse(rawParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query parameters.",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status, search, page, limit, sortBy, sortOrder } = validationResult.data;

    const result = await getLeads({
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.leads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error in GET /api/admin/leads:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
