export function scrollToSection(sectionId: string) {
  const section = document.querySelector(`[data-section="${sectionId}"]`);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}

