# Gold Standard: Agent Definition

## Pattern
YAML frontmatter:
- name: lowercase-kebab-case
- description: with `<example>` blocks (positive + negative)
- model: opus (default for all agents)
- color: unique per agent
- tools: list of allowed tools (allowlist — blocks all unlisted tools including MCP)
- disallowedTools: list of blocked tools (blocklist — inherits all tools from main conversation except listed ones)

Body structure:
1. `<role>` block -- 3-5 line identity statement
2. `##` Sections -- responsibilities, methodology, protocols
3. Communication protocol table (if agent sends messages)
4. `<done_criteria>` block (if agent owns deliverables)
5. `<decision_policy>` block (if agent makes judgment calls)
6. `<output_rules>` block -- 5-10 concrete rules (P0/P1/P2 markers for agents with 5+ rules)

## Key rules
- Never start with "I" in role block
- Examples in description: 2-3 positive, 1 negative
- tools is an allowlist — agent cannot use unlisted tools. Use for agents that need strict control.
- disallowedTools is a blocklist — agent inherits everything except listed. Use for agents that need MCP access (Context7, Tavily, Exa, GitHub Grep, DeepWiki, CodeWiki).
- Pick ONE: tools OR disallowedTools, never both
- Read-only agents: block Edit, Write, Bash, NotebookEdit, ExitPlanMode, EnterPlanMode, EnterWorktree
- MCP tool-sniffing: agents should check tool availability before use, fall back gracefully
- Team member agents: do NOT block SendMessage, Task*, Team* tools
- output_rules close the file
- Section ordering: content sections -> done_criteria (if applicable) -> decision_policy (if applicable) -> output_rules (always last)
- done_criteria applies to agents that own deliverables (coder, risk-tester), NOT to advisory agents (reviewers, tech-lead) or FSM agents (supervisor)
- decision_policy applies to agents with ambiguous judgment calls (coder, tech-lead), NOT to agents with fixed playbooks (supervisor, reviewers)
- Use [P0]/[P1]/[P2] priority markers in output_rules for agents with 5+ rules: P0 = violation -> immediate escalation, P1 = blocks progress, P2 = best practice
- Reviewer agents include Step 0: Orientation (read CLAUDE.md, DECISIONS.md, .conventions/) before first review

## Reference
- `plugins/team/agents/supervisor.md` (canonical permanent agent)
- `plugins/team/agents/coder.md` (canonical temporary agent with done_criteria + decision_policy + P0/P1/P2)
- `plugins/think/agents/expert.md` (canonical read-only agent with disallowedTools for MCP access)
