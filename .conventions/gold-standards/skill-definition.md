# Gold Standard: Skill Definition

## Pattern
YAML frontmatter:
- name: lowercase-kebab-case
- description: one-line purpose
- allowed-tools: list of tools Lead can use
- argument-hint: usage pattern
- model: opus

Body structure:
1. `#` Title with pipeline description
2. `## Philosophy` section
3. `## Arguments` section
4. `## Phases` (numbered, with steps)
5. `## Stuck Protocol` table
6. `## Key Rules` list

## Key rules
- Skills define orchestration, not implementation
- Skill file is the Lead's brain -- it orchestrates, never codes
- Use tables for event contracts and protocol matrices
- Phases use numbered steps with concrete agent spawn patterns

## Reference
- `plugins/team/skills/build/SKILL.md` (canonical multi-phase skill)
