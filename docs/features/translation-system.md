# Translation System Documentation

## Overview

This project uses [next-intl](https://next-intl.com/) for internationalization (i18n). The translation system supports multiple languages and provides a structured approach to managing translations across the application.

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - Español
- **Portuguese (pt-BR)** - Português Brasileiro

## File Structure

```
messages/
├── en.json          # English translations (source)
├── es.json          # Spanish translations
├── pt-BR.json       # Portuguese (Brazil) translations
└── en.d.json.ts     # TypeScript definitions
```

### ⚠️ Important: Reading Translation Files

**Never use `tail` or `head` commands when reading translation files!**

Translation files are JSON objects where keys can appear anywhere in the file. Using `tail` or `head` will only show you a portion of the file and you might miss important keys or see incomplete JSON structure.

**✅ Correct approach:**

```bash
# Use grep to search for specific keys
grep -n "availableDatasets" messages/en.json

# Or read the entire file
cat messages/en.json
```

**❌ Avoid:**

```bash
# Don't use tail/head - you'll miss keys!
tail -20 messages/en.json
head -10 messages/en.json
```

## Translation Keys Structure

Translations are organized by feature/page sections:

```json
{
  "AreaPage": {
    "availableDatasets": "Available Datasets",
    "chooseDatasetDescription": "Choose a dataset to explore data for this area",
    "noDatasetsAvailable": "No datasets available",
    "noDatasetsDescription": "There are currently no datasets available for this area...",
    "moreTags": "+{count} more",
    "idLabel": "ID: ",
    "viewOnOpenStreetMap": "View on OpenStreetMap →"
  },
  "Navigation": {
    "home": "Home",
    "myDatasets": "My Datasets",
    "public": "Public"
  }
}
```

## Usage Patterns

### Server Components

Use `getTranslations` for server-side components:

```tsx
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("AreaPage");
  
  return (
    <div>
      <h1>{t("availableDatasets")}</h1>
      <p>{t("chooseDatasetDescription")}</p>
    </div>
  );
}
```

### Client Components

Use `useTranslations` for client-side components:

```tsx
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("AreaPage");
  
  return (
    <div>
      <h2>{t("availableDatasets")}</h2>
      <p>{t("chooseDatasetDescription")}</p>
    </div>
  );
}
```

### Multiple Translation Namespaces

When you need translations from multiple sections:

```tsx
export default async function MyPage() {
  const t = await getTranslations("AreaPage");
  const navT = await getTranslations("Navigation");
  
  return (
    <div>
      <h1>{navT("home")}</h1>
      <p>{t("availableDatasets")}</p>
    </div>
  );
}
```

### Interpolation

For dynamic content, use interpolation:

```tsx
// Translation key: "moreTags": "+{count} more"
<span>{t("moreTags", { count: template.tags.length - 3 })}</span>
```

## Adding New Translations

### 1. Add to English (Source)

First, add the new key to `messages/en.json`:

```json
{
  "AreaPage": {
    "newFeature": "New Feature Description"
  }
}
```

### 2. Add to Other Languages

Add the same key to all other language files:

**Spanish (`messages/es.json`):**

```json
{
  "AreaPage": {
    "newFeature": "Descripción de Nueva Característica"
  }
}
```

**Portuguese (`messages/pt-BR.json`):**

```json
{
  "AreaPage": {
    "newFeature": "Descrição da Nova Funcionalidade"
  }
}
```

### 3. Use in Components

```tsx
const t = useTranslations("AreaPage");
return <p>{t("newFeature")}</p>;
```

## Translation Guidelines

### Key Naming Conventions

- Use **camelCase** for keys
- Use **descriptive names** that indicate the content
- Group related keys under the same section
- Use **consistent terminology** across the app

**Good examples:**

- `availableDatasets`
- `chooseDatasetDescription`
- `noDatasetsAvailable`
- `viewOnOpenStreetMap`

**Avoid:**

- `text1`, `label2` (not descriptive)
- `available_datasets` (use camelCase)
- `Available Datasets` (keys should be lowercase)

### Content Guidelines

- **Keep translations concise** but clear
- **Maintain consistency** in tone and terminology
- **Consider cultural context** for different languages
- **Use proper punctuation** and capitalization
- **Test with longer text** to ensure UI doesn't break

### Section Organization

Organize translations by feature/page:

- `AreaPage` - Area page specific content
- `Navigation` - Navigation and menu items
- `Common` - Shared UI elements
- `DatasetList` - Dataset listing components
- `AuthForm` - Authentication forms

## Validation and Quality Assurance

### Automated Checks

Run the translation checker to ensure consistency:

```bash
# Check for missing or invalid translations
pnpm i18n:check

# Auto-fix issues when possible
pnpm i18n:check:fix
```

### Manual Testing

1. **Switch languages** in the app to verify translations
2. **Check text length** - ensure translations fit in UI
3. **Verify context** - translations should make sense in context
4. **Test interpolation** - dynamic content should work correctly

### Common Issues

**Missing Keys:**

- Error: Translation key not found
- Solution: Add the key to all language files

**Invalid Interpolation:**

- Error: Missing interpolation parameter
- Solution: Ensure all `{param}` placeholders have values

**Inconsistent Structure:**

- Error: Different structure between language files
- Solution: Keep all language files synchronized

## Best Practices

### 1. Always Use Translation Keys

❌ **Don't hardcode text:**

```tsx
<h1>Available Datasets</h1>
```

✅ **Use translation keys:**

```tsx
<h1>{t("availableDatasets")}</h1>
```

### 2. Plan Translation Keys Early

When designing new features, consider:

- What text needs translation?
- How should keys be organized?
- What interpolation might be needed?

### 3. Test All Languages

Before releasing features:

- Test with all supported languages
- Verify UI layout works with longer/shorter text
- Check that all interactive elements work

### 4. Keep Translations Synchronized

- Always update all language files together
- Use the same key structure across languages
- Run `pnpm i18n:check` before committing

## Troubleshooting

### Translation Not Showing

1. Check if the key exists in the language file
2. Verify the namespace is correct (`AreaPage`, `Navigation`, etc.)
3. Ensure you're using the right hook (`getTranslations` vs `useTranslations`)

### Interpolation Not Working

1. Verify the key has `{param}` placeholders
2. Check that you're passing the parameter: `t("key", { param: value })`
3. Ensure parameter names match exactly

### CI/CD Failures

If the i18n check fails in CI:

1. Run `pnpm i18n:check` locally
2. Fix any missing or invalid translations
3. Commit the fixes

## Contributing

When adding new features:

1. **Identify all text** that needs translation
2. **Add keys to English** first (source of truth)
3. **Add translations** to all other languages
4. **Update components** to use translation keys
5. **Test thoroughly** with all languages
6. **Run i18n check** before committing

## Resources

- [next-intl Documentation](https://next-intl.com/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/) (for interpolation)
- [Translation Best Practices](https://next-intl.com/docs/usage/messages)
