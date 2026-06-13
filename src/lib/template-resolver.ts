import { prisma } from "@/lib/db";

export type TemplateIdentifier = string;

export async function resolveTemplate(identifier: TemplateIdentifier) {
  const template = await prisma.template.findUnique({
    where: { id: identifier },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      overpassQuery: true,
      isActive: true,
      deprecatesAt: true,
    },
  });

  return template;
}

export function isValidTemplateIdentifier(identifier: string): boolean {
  const slugPattern = /^[a-z]+(?:-[a-z]+)*$/;
  const cuidPattern = /^c[a-z0-9]{24}$/;

  return slugPattern.test(identifier) || cuidPattern.test(identifier);
}

