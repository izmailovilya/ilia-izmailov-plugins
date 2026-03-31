# Convention File Examples

Reference examples showing the expected format and quality level for each type of convention file. Use these as templates when generating conventions for a project.

## Gold Standard Examples

### Example: api-endpoint.ts

```typescript
// Gold Standard: tRPC API endpoint with input validation and error handling
// Pay attention to: Zod schema, consistent error shape, permission check before logic

export const settingsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(z.object({
      theme: z.enum(["light", "dark"]).optional(),
      language: z.string().min(2).max(5).optional(),
      notifications: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.settings.update({
        where: { userId: ctx.session.user.id },
        data: input,
      });
      return { settings };
    }),

  get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.settings.findUnique({
        where: { userId: ctx.session.user.id },
      });
    }),
});
```

### Example: form-component.tsx

```tsx
// Gold Standard: Form with validation, loading state, and error display
// Pay attention to: react-hook-form + zod, disabled state during submit, toast on success

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

type FormData = z.infer<typeof schema>;

export function ProfileForm({ defaultValues }: { defaultValues: FormData }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const updateProfile = api.profile.update.useMutation({
    onSuccess: () => toast.success("Profile updated"),
    onError: (err) => toast.error(err.message),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

### Example: custom-hook.ts

```typescript
// Gold Standard: Custom data-fetching hook with loading/error states
// Pay attention to: single responsibility, return shape consistency, jsdoc

/** Fetches and manages the current user's notification preferences */
export function useNotificationPrefs() {
  const query = api.notifications.getPrefs.useQuery();
  const mutation = api.notifications.updatePrefs.useMutation({
    onSuccess: () => query.refetch(),
  });

  return {
    prefs: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
```

## Anti-Pattern Examples

### Example: avoid-inline-styles.md

```markdown
# Avoid Inline Styles

Use design system tokens instead of hardcoded values.

## BAD

​```tsx
<div style={{ padding: "16px", color: "#333", fontSize: "14px" }}>
  <span style={{ fontWeight: "bold", marginBottom: "8px" }}>Title</span>
</div>
​```

## GOOD

​```tsx
<div className="p-4 text-foreground text-sm">
  <span className="font-bold mb-2">Title</span>
</div>
​```

**Why:** Inline styles bypass the design system, making it impossible to maintain
consistent spacing, colors, and typography across the app. They also can't
respond to theme changes (dark mode).
```

### Example: avoid-raw-sql.md

```markdown
# Avoid Raw SQL Queries

Use Prisma ORM for all database operations.

## BAD

​```typescript
const users = await db.$queryRaw`SELECT * FROM users WHERE role = ${role}`;
​```

## GOOD

​```typescript
const users = await db.user.findMany({ where: { role } });
​```

**Why:** Raw queries bypass Prisma's type safety and are prone to SQL injection
if parameters aren't properly escaped. The ORM handles both.
```

## Checks Examples

### Example: naming.md

```markdown
# Naming Conventions

## Files
- Components: `PascalCase.tsx` — e.g. `UserProfile.tsx`, `SettingsForm.tsx`
- Hooks: `camelCase.ts` starting with `use` — e.g. `useAuth.ts`, `useSettings.ts`
- Utils: `kebab-case.ts` — e.g. `format-date.ts`, `parse-query.ts`
- API routes: `kebab-case.ts` — e.g. `user-settings.ts`

Regex: `^[A-Z][a-zA-Z]+\.tsx$` (components), `^use[A-Z][a-zA-Z]+\.ts$` (hooks)

## Functions & Variables
- Functions: `camelCase` — `getUserById`, `formatCurrency`
- Constants: `UPPER_SNAKE_CASE` — `MAX_RETRIES`, `DEFAULT_THEME`
- Boolean vars: prefix with `is/has/should` — `isLoading`, `hasPermission`

## Database
- Tables: `snake_case` singular — `user`, `order_item`
- Columns: `snake_case` — `created_at`, `user_id`
```

### Example: imports.md

```markdown
# Import Conventions

## Order
1. External packages (`react`, `next`, `zod`)
2. Internal aliases (`@/components`, `@/lib`, `@/server`)
3. Relative imports (`./`, `../`)

## Rules
- UI components: import from `@/components/ui/` (design system wrappers)
- NEVER import directly from `node_modules` UI libraries — use wrapped versions
- API client: `import { api } from "@/trpc/react"` (client) or `@/trpc/server` (server)
- Database: `import { db } from "@/server/db"` — never create new PrismaClient instances

## Forbidden
- `import * as` — always use named imports
- Circular imports between feature modules
- Server imports in client components (`@/server/*` in files without `"use server"`)
```
