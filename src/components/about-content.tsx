import { useTranslations } from "next-intl";
import MdxLayout from "@/components/mdx-layout";

const DEV_SEED_URL = "https://developmentseed.org";
const VITOR_GITHUB_URL = "https://github.com/vgeorge";
const RUBEN_GITHUB_URL = "https://github.com/Rub21";
const JUNIOR_GITHUB_URL = "https://github.com/yunica";
const MARC_GITHUB_URL = "https://github.com/kamicut";

export default function AboutContent() {
  const t = useTranslations("AboutPage");

  return (
    <MdxLayout>
      <h1>{t("title")}</h1>
      <p>
        {t.rich("description1", {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <p>
        {t("projectDescription1")}{" "}
        <a href={VITOR_GITHUB_URL} target="_blank" rel="noopener noreferrer">
          Vitor George
        </a>
        {t("projectDescription2")}
      </p>
      <h2>{t("getInvolvedTitle")}</h2>
      <p>{t("getInvolvedDescription")}</p>
      <h2>{t("acknowledgmentsTitle")}</h2>
      <ul>
        <li>
          <a href={DEV_SEED_URL} target="_blank" rel="noopener noreferrer">
            Development Seed
          </a>
        </li>
        <li>
          <a href={JUNIOR_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            Junior Flores
          </a>
        </li>
        <li>
          <a href={MARC_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            Marc Farra
          </a>
        </li>
        <li>
          <a href={RUBEN_GITHUB_URL} target="_blank" rel="noopener noreferrer">
            Ruben Mendoza
          </a>
        </li>
      </ul>
    </MdxLayout>
  );
}
