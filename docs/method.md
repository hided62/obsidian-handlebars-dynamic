# Handlebars Template Guide

## Overview

This document explains how to create Handlebars templates for users who have basic programming knowledge.

If you open this document inside Obsidian, you can preview the template-applied result side-by-side.

### Goals of the Handlebars templates

This plugin aims to provide the following:

1. When decorative elements are needed, provide templates so anyone can reuse them.
2. Hide complex HTML and other markup behind templates so content authors see a clean document.
3. When complex data is required, automatically use values stored in the configured `constants` folder.

### Basic syntax

Refer to the official Handlebars guide for basic syntax: <https://handlebarsjs.com/guide/expressions.html#basic-usage>

## Built-in helpers

The base Handlebars helpers available are minimal (`#if`, `#unless`, `#each`, `lookup`), so this plugin provides additional helpers.

As of version 1.0.0 the available helpers are listed below with examples.

Example templates are under the `Example` folder; to see how they are invoked, open the source view of this document.

### 1. `#if`, `#unless`

`#if` conditionally renders content. The truthiness rules are:

- Truthy:
  - true
  - numbers not equal to 0
  - non-empty strings
  - non-empty arrays
  - non-empty objects
- Falsy:
  - false
  - null
  - undefined
  - empty strings
  - empty arrays
  - empty objects

#### Usage

```md
{{#if condition}}
Content when true
{{else}}
Content when false
{{/if}}

{{#if condition}}
Content when true (else block omitted)
{{/if}}

{{#unless condition}}
Content when false
{{/unless}}
```

#### Example

```hb
tpl: Example/1_if
condition1: true
condition2: some text
```

### 2. `#each`

Iterates over arrays or objects.

#### Usage

```
{{#each list}}
  {{this}}
{{else}}
  No items.
{{/each}}
```

With index:

```
{{#each array}}
  {{@index}}. {{this}}
{{else}}
  No items.
{{/each}}
```

Over objects:

```
{{#each obj}}
  - {{@key}}: {{this}}
{{/each}}
```

Or using `as` to name values:

```
{{#each obj as |key,val|}}
  - {{key}}: {{val}}
{{/each}}
```

#### Example

```hb
tpl: Example/2_each
A:
  - value0
  - value1
  - value2
B:
  key1: value1
  key2: value2
  key3: value3
```

### 3. `#with`

`#with` sets a new `this` context. When the target is an object, its properties become directly accessible.

#### Example

```hb
tpl: Example/3_with

A:
  AA:
    ga: haha
    na: hoho
  BB:
    ga: hoho
B: hmm
```

### 4. Inline `if` helper

In addition to block `#if`, an inline `if` helper is provided for concise conditional selection (like Excel's IF).

```
{{if condition trueValue falseValue}}
```

#### Example

```hb
tpl: Example/4_inlineif
condition1: 0
true1: 0 is true
false1: 0 is false

condition2: content
true2: content exists
false2: no content
```

### 5. `asArray`, `asObject`

If the target is already an array/object it remains unchanged; otherwise it converts.

`(asArray value)`

```
{{#each (asArray content)}}
  - {{this}}
{{/each}}
```

`(asObject value defaultKey)`

```
{{#with (asObject content "title")}}
  - {{title}}
{{/with}}
```

### 6. Type checks: `isString`, `isNumber`, `isObject`, `isArray`

Helpers to check data types.

### 7. `isEmpty`

Checks if an object or array is empty.

### 8. `length`

Returns length for strings, arrays, and objects.

### 9. `eq`, `neq`

Equality helpers for primitive values.

### 10. Comparison: `lt`, `lte`, `gt`, `gte`

Numeric comparison helpers.

### 11. Deep equality: `deepEq`, `deepNeq`

Use for deep comparison of arrays/objects.

### 12. `not`

Logical NOT: `(not value)`

### 13. `and`, `or`

`(and v1 v2 v3)` returns the last value if all truthy or `false` if any falsy.
`(or v1 v2 v3)` returns the first truthy value or `false` if all falsy.

Example:

```
{{#with (and "a" "b" "c")}}
{{this}}
{{/with}}

{{#with (or 0 123)}}
{{this}}
{{/with}}
```

Outputs:

```
c

123
```

### 14. `notNull`

Returns the first non-null value among arguments.

### 15. `keyExists`

Checks whether an object has a key: `(keyExists key object)`

### 16. `contains`

Checks if an array/object contains a value: `(contains array value)`

### 17. `indexOf`

Returns the key/index of a value in an array/object: `(indexOf value array)`

### 18. `noSpace`

Removes spaces: `{{noSpace "a b c"}}` => `abc`

### 19. `concat`

Concatenate strings: `{{concat "A" "B"}}` => `AB`

### 20. `repeatText`

`{{repeatText "*" n}}`

### 21. `join`

`{{join (makeArray "A" "B") ","}}`

### 22. Arithmetic: `add`, `sub`, `mul`, `div`, `divInt`, `mod`, `pow`

Operations expect numbers.

### 23. `avg`, `max`, `min`

Numerical helpers.

### 24. `floor`, `ceil`, `round`, `abs`

Numeric rounding helpers.

### 25. `numberFormat`

Format numbers with fraction digit options.

`(numberFormat value minFractionDigits=n maxFractionDigits=m)`

### 26. `range`

Generates numeric arrays similar to Python's range.

`(range end)` generates `[0, 1, 2, ..., end-1]`

`(range start end)` generates `[start, start+1, ..., end-1]`

`(range start end step)` generates `[start, start+step, start+2*step, ..., <end]`

### 27. `slice`

Slice strings or arrays.

`(slice target start end)`

`(slice target start)`

### 28. `merge`

Merge arrays or objects.

### 29. `toYaml`

`{{{toYaml value level=n}}}`

`{{{toYaml value level=n prefix="> "}}}`

`{{{toYaml value level=n indent=number}}}`

Useful for debugging and especially helpful when nesting templates. Example:

`````md
{{#each list}}
```hb
tpl: Example/a5_nested_component
name: {{{toYaml name level=1}}}
feature: {{{toYaml feature level=1}}}
```
{{/each}}
`````

-Use `prefix` when placing within callouts.

`````md
> [!info]
{{#each list}}
> ```hb
> tpl: Example/a5_nested_component
{{{toYaml this prefix="> "}}}
> ```
>
{{/each}}
`````

### 30. `toJson`, `fromJson`

JSON helpers.

### 31. `set`

`{{~set target key1=value1 key2=value2~}}`

Adds properties to the specified target scope.

For example, given the following YAML:

```yaml
A:
  Foo: bar
  C: D
```

and executing:

`{{~set A E=12 Hello="World!"~}}`

the result will be:

```yaml
A:
  Foo: bar
  C: D
  E: 12
  Hello: World!
```

This helper is commonly used together with `this` or `@root`.

### 32. `push`, `pop`

Array push/pop helpers.

### 33. `makeObject`

Create objects from key/value pairs.

`(makeObject key1=val1 key2=val2 ...)`

`(makeObject key1 val1 key2 val2 ...)`

### 34. `makeArray`

Create arrays.

`(makeArray val1 val2 val3 ...)`

### 35. `ignore`

`{{~ignore (call)~}}` to call a helper without outputting it.

### 36. `del`

Delete a key from an object or an index from an array.

`{{~del target keyOrIndex~}}`

### 37. `getEnv`

Read environment settings: `{{~getEnv key~}}`

### 38. `replace`

Replace all occurrences in text.

### 39. `escapeTemplate`

Escape template characters to avoid collisions with `{` `}`.

### 40. `regexp`

Convert string to RegExp object for use with replace/split/contains.

`{{regexp pattern}}`
`{{regexp pattern flags="regexp_flags"}}`


### 41. `purifyName`

Sanitize names by replacing special characters. Notable rules:

- Roman numerals Ⅰ~Ⅹ -> 1~10
- `·` -> `_`
- `-_()` are preserved
- Consecutive spaces -> single space

---

## Special syntax

### A1. Additional params

Provide frontmatter YAML in the template document and use those values as parameters.

#### Example

```hb
tpl: Example/a1_param
name: John Doe
```

### A2. `prefix`

Set `prefix` in frontmatter to prepend text to the output (useful for callouts).

#### Example

```hb
tpl: Example/a2_prefix
describe: Example of prefix
```

### A3. `importParams`

Import frontmatter from other markdown files using paths defined in `constants`. Supports objects and arrays and can be nested.

#### Example

```hb
tpl: Example/a3_importParams
title: Name
```

### A4. Fence (pence) escape

Wrap complex template blocks with 4+ backticks to avoid Obsidian preview issues.

### A5. Nested templates

You can call another hb template from inside a template.

#### Example

```hb
tpl: Example/a5_nested
list:
  - name: Admiral Yi
    feature: General
  - name: Hong Gil-dong
    feature: Outlaw
```
