import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service.js";
import type { SearchPractitionersDto } from "./dto/search-practitioners.dto.js";
import { Prisma } from "@prisma/client";

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchPractitionersDto) {
    const { q, specialty, suburb, state, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.PractitionerWhereInput = {
      active: true,
      acceptsNewPatients: true,
      ...(specialty && {
        specialty: { contains: specialty, mode: "insensitive" },
      }),
      ...(q && {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { specialty: { contains: q, mode: "insensitive" } },
          { specialInterests: { has: q } },
        ],
      }),
      practice: {
        locations: {
          some: {
            ...(suburb && { suburb: { contains: suburb, mode: "insensitive" } }),
            ...(state && { state: { equals: state, mode: "insensitive" } }),
          },
        },
      },
    };

    const [total, practitioners] = await Promise.all([
      this.prisma.practitioner.count({ where }),
      this.prisma.practitioner.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          specialty: true,
          specialInterests: true,
          languages: true,
          telehealth: true,
          practice: {
            select: {
              name: true,
              phone: true,
              locations: {
                select: {
                  id: true,
                  name: true,
                  suburb: true,
                  state: true,
                  postcode: true,
                },
                take: 1,
              },
              appointmentTypes: {
                where: { onlineBookable: true },
                select: {
                  id: true,
                  name: true,
                  durationMinutes: true,
                  bookingMode: true,
                },
              },
            },
          },
          slots: {
            where: { startsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
            take: 1,
            select: { startsAt: true },
          },
        },
        orderBy: { lastName: "asc" },
      }),
    ]);

    return {
      data: practitioners,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { id },
      include: {
        practice: { include: { locations: true, appointmentTypes: { where: { onlineBookable: true } } } },
        slots: {
          where: { startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 20,
        },
      },
    });

    if (!practitioner) throw new NotFoundException("Practitioner not found");
    return practitioner;
  }
}
