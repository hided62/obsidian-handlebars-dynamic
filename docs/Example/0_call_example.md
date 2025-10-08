**call1**

>[!info]
> call1 is {{call1}}

call2 has {{length call2}} items and so on.

**call2**

{{#each call2}}
1. {{this}}
{{/each}}

**call3**

{{#each call3}}
{{#if (isObject this)}}

{{@key}} is an object and its contents are as follows.

{{#each this as |item|}}
  - {{@key}}: {{item}}
{{/each}}

{{else}}

{{@key}} is a simple value: {{this}}

{{/if}}
{{/each}}

**call4**

{{#with @root.call4.[1]}}
name: {{name}}
feature: {{feature}}
{{/with}}