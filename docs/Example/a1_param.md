---
settingExample:
  explore: false
  earlyStart: true
---
{{#if (and name (isString name))}}
{{#if (lookup settingExample name)}}

{{name}} is supported.

{{else}}

{{name}} is not supported.

{{/if}}
{{else}}

Name is not set or not a string.

{{/if}}