---
importParams:
  A: 예제/a3_a
  B:
   Ba: 예제/a3_ba
   Bb: 예제/a3_bb
  Bmerge:
    - 예제/a3_ba
    - 예제/a3_bb
  C: 예제/a3_c
---

```yaml
{{#each this}}
{{#if this}}
{{@key}}: {{{toYaml this level=1}}}
{{/if}}
{{/each}}
```