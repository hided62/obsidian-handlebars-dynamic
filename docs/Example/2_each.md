
**Simple**

{{#each A}}

  - {{this}}

{{else}}
No items to iterate.
{{/each}}

**Array with index**

{{#each A}}

 {{@index}}. {{this}}

{{else}}
No items to iterate.
{{/each}}

**Object iteration**

{{#each B}}
  - {{@key}}: {{this}}
{{/each}}

**Using `as`**

{{#each B as |val|}}
  - {{@key}}: {{val}}
{{/each}}