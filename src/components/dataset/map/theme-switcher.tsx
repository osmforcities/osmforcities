"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import type { CategoricalTheme } from "@/lib/map-themes";

type RecentEditsTheme = {
  readonly id: "recent-edits";
  readonly type: "recent-edits";
};

type ThemeItem = CategoricalTheme | RecentEditsTheme;

const RECENT_EDITS_THEME: RecentEditsTheme = {
  id: "recent-edits",
  type: "recent-edits",
};

interface ThemeSwitcherProps {
  detectedThemes: CategoricalTheme[];
  activeTheme: CategoricalTheme | null;
  onChange: (theme: CategoricalTheme | null) => void;
}

export function ThemeSwitcher({
  detectedThemes,
  activeTheme,
  onChange,
}: ThemeSwitcherProps) {
  const t = useTranslations("DatasetMap");

  const themes: ThemeItem[] = useMemo(
    () => [...detectedThemes, RECENT_EDITS_THEME],
    [detectedThemes]
  );

  const activeItem: ThemeItem = activeTheme ?? RECENT_EDITS_THEME;
  const activeKey = activeTheme ? activeTheme.field : RECENT_EDITS_THEME.id;
  const activeIndex = themes.findIndex(
    (theme) => getKey(theme) === activeKey
  );

  const select = useCallback(
    (theme: ThemeItem) => {
      onChange(theme.type === "recent-edits" ? null : theme);
    },
    [onChange]
  );

  const handlePrev = useCallback(() => {
    const i = activeIndex <= 0 ? themes.length - 1 : activeIndex - 1;
    select(themes[i]);
  }, [activeIndex, themes, select]);

  const handleNext = useCallback(() => {
    const i = activeIndex >= themes.length - 1 ? 0 : activeIndex + 1;
    select(themes[i]);
  }, [activeIndex, themes, select]);

  const handleSelectionChange = useCallback(
    (key: React.Key | null) => {
      if (key === null) return;
      const found = themes.find((theme) => getKey(theme) === key);
      if (found) select(found);
    },
    [themes, select]
  );

  if (detectedThemes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
      <Button
        onPress={handlePrev}
        aria-label={t("previousTheme")}
        className="px-2 py-1.5 rounded-md text-gray-600 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
      >
        <ChevronLeft size={16} />
      </Button>

      <ComboBox
        items={themes}
        selectedKey={activeKey}
        onSelectionChange={handleSelectionChange}
        allowsEmptyCollection={false}
        menuTrigger="focus"
      >
        <Input
          value={labelFor(activeItem, t("recentEdits"))}
          aria-label={t("themeSelect")}
          readOnly
          className="px-3 py-1.5 text-sm font-medium text-gray-900 border-0 rounded-md focus:outline-none cursor-pointer w-32 truncate"
        />
        <Popover
          className="mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          style={{ width: "var(--trigger-width)" }}
        >
          <ListBox className="outline-none py-1">
            {(theme: ThemeItem) => (
              <ListBoxItem
                key={getKey(theme)}
                id={getKey(theme)}
                className="px-3 py-2 text-sm cursor-pointer data-[hovered]:bg-muted data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[focused]:outline-none rounded-md mx-1 my-0.5 transition-colors"
              >
                {labelFor(theme, t("recentEdits"))}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>

      <Button
        onPress={handleNext}
        aria-label={t("nextTheme")}
        className="px-2 py-1.5 rounded-md text-gray-600 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

function getKey(theme: ThemeItem): string {
  return theme.type === "recent-edits" ? theme.id : theme.field;
}

function labelFor(theme: ThemeItem, recentEditsLabel: string): string {
  return theme.type === "recent-edits" ? recentEditsLabel : theme.field;
}

ThemeSwitcher.displayName = "ThemeSwitcher";
