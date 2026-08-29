import { prisma } from "@/lib/prisma";
import { recordActivityLog } from "@/lib/services/activity";
import { LeadActivityType, type LeadStatus, type Prisma } from "@prisma/client";

export interface GetLeadsParams {
  status?: LeadStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "name" | "email" | "status";
  sortOrder?: "asc" | "desc";
}

export async function getLeads(params?: GetLeadsParams) {
  const {
    status,
    search,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params || {};

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));

  const whereClause: Prisma.LeadWhereInput = {};

  if (status) {
    whereClause.status = status;
  }

  if (search && search.trim() !== "") {
    const query = search.trim();
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        serviceInterest: true,
        message: true,
        consentGiven: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    leads,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

export async function getLeadById(id: string) {
  return await prisma.lead.findUnique({
    where: { id },
  });
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  actorId?: string
) {
  const existingLead = await prisma.lead.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existingLead) {
    throw new Error("Lead not found");
  }

  if (existingLead.status === status) {
    return await prisma.lead.findUnique({ where: { id } });
  }

  return await prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id },
      data: { status },
    });

    if (actorId) {
      await recordActivityLog(
        {
          leadId: id,
          actorId,
          type: LeadActivityType.STATUS_CHANGE,
          details: {
            from: existingLead.status,
            to: status,
          },
        },
        tx
      );
    }

    return updatedLead;
  });
}
