---
importParams:
  A: Example/a3_a
  B:
   Ba: Example/a3_ba
   Bb: Example/a3_bb
  Bmerge:
    - Example/a3_ba
    - Example/a3_bb
  C: Example/a3_c
---

```yaml
{{#each this}}
{{#if this}}
{{@key}}: {{{toYaml this level=1}}}
{{/if}}
{{/each}}
```