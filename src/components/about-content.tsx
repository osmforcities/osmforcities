import { useTranslations } from "next-intl";
import MdxLayout from "@/components/mdx-layout";

const DEV_SEED_URL = "https://developmentseed.org";
const VITOR_GITHUB_URL = "https://github.com/vgeorge";

export default function AboutContent() {
  const t = useTranslations("AboutPage");

  return (
    <MdxLayout>
      <h1>{t("title")}</h1>
      <p>{t("description1")}</p>
      <p>{t("description2")}</p>
      <h2>{t("featuresTitle")}</h2>
      <ul>
        <li>{t("features.create")}</li>
        <li>{t("features.follow")}</li>
        <li>{t("features.activity")}</li>
      </ul>
      <h2>{t("projectTitle")}</h2>
      <p>
        {t("projectDescription1")}{" "}
        <a href={VITOR_GITHUB_URL} target="_blank" rel="noopener noreferrer">
          Vitor George
        </a>{" "}
        {t("projectDescription2")}{" "}
        <a href={DEV_SEED_URL} target="_blank" rel="noopener noreferrer">
          Development Seed
        </a>
        {t("projectDescription3")}
      </p>
      <p>{t("projectEvolution")}</p>
      <h2>{t("getInvolvedTitle")}</h2>
      <p>{t("getInvolvedDescription")}</p>
    </MdxLayout>
  );
}
