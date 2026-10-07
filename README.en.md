# CharCard Workshop · 角色卡工坊

English | [中文](README.md)

A [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) agent preset **and** its skill
set, for authoring SillyTavern character cards. It adds a fifth session mode,
**角色卡工坊** (`rolecard`), next to the shipped 标准 / PTC / 极简 / 创造 modes.

```
charcard-workshop/
├─ cordis.patch.yml    the preset declaration and its routing contract
├─ package.json        bundle manifest
├─ skills/             23 skill bundles — data only, runs no code
├─ NOTICE.md           provenance of every skill bundle
└─ LICENSE             MIT (covers this repository, not the skill bodies)
```

## What the mode is

It composes a session from the shipped `standard` preset — identical terminal,
filesystem, search, job, goal, plan-mode, compaction, delegation, workflow, web and todo
surface — plus a persona that routes card work to the right skill. **No tools are added
or removed**, so the mode is a lens rather than a different agent.

The persona and its routing contract are scoped to the preset, so they apply only in
sessions that select 角色卡工坊. Skill *discovery* is not preset-scoped, though:
`$DSH_HOME/skills` is the user-wide `user-dsh` root (rank 400), which the standard, PTC,
minimal and cordis modes all scan, so skills installed there appear in **every** session's
catalog. To keep a skill in this mode alone, put it in a root only this preset scans
(`customSkillDirs`, rank 300) rather than in `$DSH_HOME/skills`.

| Piece | Value |
|---|---|
| Bundle package | `charcard-workshop` |
| Preset id | `rolecard` |
| Display name | 角色卡工坊 |
| Roster order | 2 |
| Base capability | shipped `standard` preset |

## Install

Requires a DSH profile.

**1. Install the bundle.** Point `install_bundle` at this directory's absolute path:

```
plugin_manager action=install_bundle target="<absolute path to this directory>"
```

**2. Install the skills so the mode's catalog is populated.** DSH's
`dsh-skill-filesystem` scans `$DSH_HOME/skills` as its `user-dsh` root, and discovery is
**exactly one level deep** — it recognizes `<root>/<name>/SKILL.md` but not a nested
tree. So copy this repository's `skills/` *contents* into that root, not the repository
itself:

```bash
# bash
cp -r skills/* "$DSH_HOME/skills/"
```

```powershell
# PowerShell
Copy-Item -Path ".\skills\*" -Destination "$env:DSH_HOME\skills" -Recurse -Force
```

Cloning the repository *as a subdirectory* of `$DSH_HOME/skills` does not work — the
extra nesting level hides every skill.

**Alternative:** keep a checkout in place and point the preset at it instead, by giving
the `skill-filesystem` row a `customSkillDirs` entry in `cordis.patch.yml`:

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - C:\path\to\charcard-workshop\skills
```

Installing the skills is optional in the sense that the mode still composes without
them — its catalog is just thinner.

**3. Verify.** The mode appears in the session mode picker. Open a new session in it and
confirm the card skills are listed in the catalog.

## Two card frameworks, and why the distinction matters

`cordis.patch.yml` carries the routing contract. It separates two workflows that are
**not** interchangeable, because they package cards through completely different
machinery. Mixing them is the most likely way to get stuck.

### Framework A — content-first, self-contained project

For "从零做一张卡", "从小说改编", "改一下这张卡", "加个玩法 / MVU / 开场白".

```
tavern-design                  → cards/{Project}/design-spec.md, then STOPS for confirmation
tavern-cards                   → forge project: init → 创作规划.yaml → entries → MVU → EJS
                                 → configure → first messages → UI
tavern-ui                      → when the status bar is a frontend
```

Packaging belongs to `tavern-cards`, through its bundled offline CLI:

```
node <skills>/tavern-cards/scripts/tavern-cards-forge.mjs pack {project}
```

It writes `cards/{Project}/{Project}.png` when the card has an avatar, `.json` when it
does not, and a worldbook JSON for a standalone worldbook.

**`sillytavern-card-pipeline` must not be used in this framework.** It ships no build
engine — it discovers the target repository's own tooling, and a forge project has none.
Reaching for it here produces a "missing adapter boundary" report instead of a card.

### Framework B — data-driven engineering repository

Only when the user points at an existing card repository, asks about a watch build or a
component library or an adapter, or asks for a release/acceptance gate.

```
tavern-card-builder            → design and the runtime-dependency ledger
sillytavern-card-components    → decomposition, registry, recipes
sillytavern-card-pipeline      → validate by impact → compose → pack → embed → gate
sillytavern-runtime-debug      → evidence from a real SillyTavern session
```

Packaging goes through the project's own tools, discovered and verified first. If the
repository has no such tool, the correct answer is to report the missing adapter
boundary — never to improvise a command.

### Shared skills

Both frameworks route to these for their own concerns: `tavern-ui` /
`sillytavern-embedded-ui` (interfaces), `sillytavern-database-rolecards` (variables and
data), `sillytavern-api-reference` (exact signatures and version facts),
`sillytavern-render-regex-pipeline` (regex), `sillytavern-component-update` (single
components), `sillytavern-rolecard-performance` (budgets), `sillytavern-rolecard-security`
(injection and remote-load review), `sillytavern-media-live2d-runtime` (media),
`sillytavern-extension-dev` (extensions), `tavern-helper-frontend` (Tavern Helper
frontends), `rewrite-natural-prose` (prose), `code-quality-workflow` (architecture),
`orchestrate-project-blueprint` (vague wish → design), `rolecard-workshop-ops`
(publishing infrastructure), and `consult-tavernweave-library` (guide routing).

### Codex subagents do not exist here

These skills were authored for Codex and name subagents the Codex harness used to inject
— `check-agent`, `schema-agent`, `first-message-agent`, `conversion-agent`. DSH defines
no such agents. The preset persona instructs the model to do the work directly, or
delegate with the `subagent` tool and paste that skill's full instruction block into the
task string. Never stall waiting for an agent that will not appear, and never claim one
ran.

### How skills actually get invoked, and why they get missed

A DSH skill is invoked by **the model itself**. The harness does exactly two things: it injects
the skill catalog (each skill's `name` + `description`) as a `user/message`, and it exposes the
`skill` tool that returns a skill body by name. Nothing triggers a skill on your behalf, and
nothing re-reminds the model partway through a session.

Two practical consequences follow, and this preset handles both:

- **The catalog is published once, not per turn.** It lands at the start of the session, so the
  longer the conversation runs, the easier it is for the model to forget it while writing. The
  persona therefore states the routing contract as *the action you are about to take* rather than
  *a keyword the user must say*, and the `suffix` — the last block of the system prompt — carries
  an opening gate: load the matching skill before the first write/edit of a turn. Acting first and
  loading afterwards counts as a miss.
- **Catalog descriptions are truncated.** `dsh-tool-skill` defaults to
  `catalogDescriptionMaxLength: 500`. Ten of this set's 23 skills exceed 500 characters, and the
  cut lands exactly on the trailing disambiguation clause — `tavern-card-builder` loses
  `route those tasks to the focused TavernWeave skills`, and `sillytavern-card-pipeline` loses the
  whole `use sillytavern-card-components instead` sentence. This preset sets the cap to `1200`,
  which clears the longest description in the set (~930 characters), so every catalog line is whole.

### Bypass the model's judgement: name the skill with `/skill-name`

Whether routing happens comes down to the model's decision each turn. If you would rather not
gamble on that, write a slash command directly in your message: a standalone `/rewrite-natural-prose`
in the message body (whitespace or line-start/line-end on either side) makes DSH inject that skill's
full body into the turn itself, with no decision by the model. The name must match the catalog
exactly. This channel is unaffected by both problems above and is the hardest guarantee available.

## The skill bundles

23 bundles under `skills/`. Every one is a directory with a `SKILL.md` carrying `name`
and `description` frontmatter; DSH reads that frontmatter for the catalog and loads the
body only on demand.

| Group | Skills |
|---|---|
| 叙事设计 | `tavern-design` |
| 项目创建与条目创作 | `tavern-cards` |
| 前端界面开发 | `tavern-ui` |
| 酒馆助手前端界面 | `tavern-helper-frontend` |
| 卡体设计与工程路由 | `tavern-card-builder` |
| 拆卡与组件库 | `sillytavern-card-components`, `sillytavern-component-update` |
| 装配打包与发布闸门 | `sillytavern-card-pipeline` |
| 变量与数据 | `sillytavern-database-rolecards` |
| 接口与版本事实 | `sillytavern-api-reference` |
| 正则渲染管线 | `sillytavern-render-regex-pipeline` |
| 界面与交互 | `sillytavern-embedded-ui` |
| 真实运行时调试 | `sillytavern-runtime-debug` |
| 性能预算 | `sillytavern-rolecard-performance` |
| 安全审查 | `sillytavern-rolecard-security` |
| 媒体与 Live2D | `sillytavern-media-live2d-runtime` |
| 扩展开发 | `sillytavern-extension-dev` |
| 资料库检索 | `consult-tavernweave-library` |
| 构思收束 | `orchestrate-project-blueprint` |
| 文风精修 | `rewrite-natural-prose` |
| 架构审查 | `code-quality-workflow` |
| 工坊与发布基础设施 | `rolecard-workshop-ops` |
| 指导式教学 | `activate-tavernweave-soul` |

`tavern-cards` ships a 4.7 MB bundled CLI at `tavern-cards/scripts/tavern-cards-forge.mjs`.
It is one self-contained file, not an installed dependency.

## Edit and reinstall

`pnpm` links this directory into the profile, so the persona text is read from here.

A change to `cordis.patch.yml` only reloads during an installation that changes a
dependency row. Re-running `install_bundle` on an unchanged package fails with
`ambiguous-install`, and bumping `version` alone is not enough, because pnpm keeps the
identical `link:` spec. Remove and re-add instead:

```
plugin_manager action=remove_bundle  target=charcard-workshop
plugin_manager action=install_bundle target="<absolute path to this directory>"
```

Skill bodies need no reinstall — `skill-filesystem` watches its roots and re-reads the
file from disk on every load.

## License

MIT for this repository — see [LICENSE](LICENSE).

That covers the preset declaration and the documentation. It is **not** a grant over the
skill bodies under `skills/`, which remain the property of their authors. See
[NOTICE.md](NOTICE.md) for each bundle's provenance, the upstream acknowledgements, and
the list of skills deliberately excluded for licensing reasons.
