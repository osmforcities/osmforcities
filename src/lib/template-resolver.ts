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

export function getTemplateUrlIdentifier(template: { id: string }): string {
  return template.id;
}

export function parseTemplateUrlIdentifier(urlIdentifier: string): string {
  return urlIdentifier;
}

export function isCuidIdentifier(identifier: string): boolean {
  return /^c[a-z0-9]{24}$/.test(identifier);
}

export function isSlugIdentifier(identifier: string): boolean {
  return /^[a-z]+(?:-[a-z]+)*$/.test(identifier);
}

export async function getAllTemplateIdentifiers() {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
    },
  });

  return templates.map((template) => ({
    id: template.id,
    urlIdentifier: getTemplateUrlIdentifier(template),
    name: template.name,
    category: template.category,
  }));
}
