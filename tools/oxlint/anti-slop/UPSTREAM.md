# Vendored anti-slop

Source repository: unknown. The Cursor skill `install-anti-slop` that supplied these files has no git metadata, so there is no recoverable upstream commit.

Pristine snapshot: the 38 files copied from that skill's `assets/anti-slop` on 2026-11-10, before this record was added. Their combined sha256, over sorted paths and bytes separated by NUL, is `2f6d136c73ba654da1e41ad5aa11d46fadaa6cc0b9550f3d436a8a5efcc24e07`.

Installed paths:

- `tools/oxlint/anti-slop/index.ts` — generic plugin, registered as `anti-slop`
- `tools/oxlint/anti-slop/effect/index.ts` — not registered. This repository has no direct `effect` dependency.

Intentional deviations:

- `anti-slop/no-runtime-typeof` is `error` with `{ "allowInTypeGuards": true }`. Table cells and series values are already `string | number` or `number | null`; `typeof` stays inside `isNumber`, the one predicate that splits that union. A number cell can be `NaN`, so a numeric comparison is not the same check.
- The Effect plugin stays unregistered.

The nested `vendor/eslint-stylistic/UPSTREAM.md` records that file's own source.
