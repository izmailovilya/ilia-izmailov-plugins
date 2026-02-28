# Arena

Expert debate arena — real experts argue organically and converge on optimal solutions for any domain.

## Installation

```bash
/plugin marketplace add izmailovilya/ilia-izmailov-plugins
/plugin install arena@ilia-izmailov-plugins
```

## Usage

```
/arena <question>
```

**Examples:**
```
/arena Should we use microservices or monolith for our SaaS?
/arena What's the best pricing strategy for a developer tool?
/arena How should we handle state management in our React app?
```

Works for **any domain**: engineering, product, strategy, business, science, philosophy.

## How It Works

### Phase 0: Expert Selection
- Analyzes your question (domain, type, stakes)
- Selects 3-5 **real experts** with published positions (books, articles, talks)
- Ensures diverse, **opposing** viewpoints — not an echo chamber
- Includes a **Devil's Advocate** with veto power
- Presents the panel for your review

### Phase 1: Reconnaissance
- Launches 2-4 researcher agents **in parallel**
- Code questions: project architecture, best practices, constraints
- Non-technical questions: data, expert opinions, case studies
- Researchers report findings and exit — they don't participate in debates

### Phase 2: Arena Launch
- Compiles research into a briefing packet
- Creates an Agent Team
- Launches **all experts simultaneously** with full context

### Phase 3: Organic Debates
Experts debate **directly with each other** (not through a moderator):

1. Each expert broadcasts their position + honest self-critique
2. Experts find weaknesses and **challenge each other directly**
3. Responses, counter-arguments, position changes happen organically
4. Devil's Advocate can raise a **VETO** if fundamental flaw found
5. **Live commentary** — moderator narrates key moments like a sports commentator

### Phase 4: Convergence
Debates end when 3+ experts send final positions, all go quiet, or 20 min timeout.

### Phase 5: Synthesis
Creates a final document with:
- Verdict and recommendation
- Debate chronicle (who challenged whom, who changed position)
- Arguments for and against
- Remaining disagreements
- Action plan

Saves to `docs/arena/YYYY-MM-DD-[topic].md`

## Structure

```
arena/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── arena/SKILL.md
├── agents/
│   ├── expert.md
│   └── researcher.md
└── README.md
```

## Key Design Principles

| Principle | Why |
|-----------|-----|
| **Real people** | Experts have actual published positions — not invented |
| **Intentional conflict** | Deliberately selects people who would disagree |
| **Direct communication** | Experts argue peer-to-peer, no telephone game |
| **Position change = strength** | Changing your mind when convinced is valued |
| **Devil's Advocate with veto** | Safety net against groupthink |
| **Live commentary** | Users see thinking evolve in real-time |

## When to Use

- Big architectural or strategic decisions
- Trade-offs with no obvious right answer
- Need diverse expert perspectives on a topic
- Want to stress-test an idea before committing
- Any question where smart people would genuinely disagree

## License

MIT
