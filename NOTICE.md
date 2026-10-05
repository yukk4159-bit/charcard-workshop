# Provenance and attribution

Every skill bundle under `skills/` is third-party content collected from the authors
named below. `LICENSE` covers this repository's own structure and documentation; it is
**not** a grant over the skill bodies, which keep the terms of their origin.

## Bundled skills

| Skill bundle | Origin |
|---|---|
| `tavern-design`, `tavern-cards`, `tavern-ui` | [ai4rpg/tavern-cards](https://github.com/ai4rpg/tavern-cards) |
| `tavern-card-builder`, `tavern-helper-frontend`, `sillytavern-*` (14 bundles), `consult-tavernweave-library`, `orchestrate-project-blueprint`, `rewrite-natural-prose`, `code-quality-workflow`, `rolecard-workshop-ops`, `activate-tavernweave-soul` | TavernWeave skill set |

None of these bundles ships a `LICENSE` file or a `license` frontmatter field. They are
included on the repository owner's declaration that redistribution rights are held. If
you are not that owner and intend to republish, confirm your own right first.

## Upstream acknowledgements — ai4rpg/tavern-cards

Reproduced from that project's README:

> ## 致谢
>
> 角色相关创作的流程和思路参照 [sanmingyue](https://github.com/sanmingyue) 的写卡预设。
> 变量更新正则来源于 [StageDog](https://github.com/StageDog)。
>
> ## 许可
>
> 本项目仅供个人使用，二次修改需注明出处。

`tavern-cards/scripts/tavern-cards-forge.mjs` is that project's bundled offline
pack/unpack CLI, and `tavern-cards-forge` is also published separately at
[ai4rpg/tavern-cards-forge](https://github.com/ai4rpg/tavern-cards-forge).

## Deliberately excluded

Three skills present in the authoring environment were **removed** from this repository
because their terms forbid redistribution:

| Skill | Terms |
|---|---|
| `docx` | © 2025 Anthropic, PBC — all rights reserved |
| `pptx` | © 2025 Anthropic, PBC — all rights reserved |
| `xlsx` | © 2025 Anthropic, PBC — all rights reserved |

Their `LICENSE.txt` states that users may not "extract these materials from the
Services or retain copies of these materials outside the Services", "reproduce or copy
these materials", "create derivative works based on these materials", or "distribute,
sublicense, or transfer these materials to any third party". They are unrelated to
character-card authoring.

Several other skills from the same environment were excluded as off-topic rather than
for licensing reasons: `hatch-pet` (Apache-2.0), `claude-design` (MIT, © 2026 jiji262),
`goutoujunshi` (MIT, © 2026 powerycy), `format-thesis-docx` (MIT, © 2026 manbo),
`make-comic-strip`, `reflect-on-vibe-code-growth`, `codex`, `shadcn-tailwind-ui`,
`ui-ux-pro-max`. A downstream user who wants them can install them independently; if any
are added back, carry their `LICENSE` and `NOTICE` files along, as Apache-2.0 in
particular requires.
