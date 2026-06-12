import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformDataset } from "@/lib/dataset/transform";

export async function GET() {
  try {
    const headersList = await headers();
    const session = await auth();
    const user = session?.user || null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchedDatasets = await prisma.datasetWatch.findMany({
      where: {
        userId: user.id,
      },
      include: {
        dataset: {
          include: {
            template: {
              include: {
                category: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            area: true,
            _count: {
              select: { watchers: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Derive locale from Accept-Language header, preserving full tag (e.g., 'pt-BR', not 'pt')
    const acceptLanguage = headersList.get("accept-language") || "en";
    const locale = acceptLanguage.split(",")[0].split(";")[0].trim();

    const datasets = watchedDatasets.map((watch) =>
      transformDataset(watch.dataset, user, locale, { isWatched: true })
    );

    return NextResponse.json(datasets);
  } catch (error) {
    console.error("Error fetching watched datasets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
