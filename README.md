# Handlebars Dynamic Template for Obsidian

## Overview

This is a plugin that allows you to use Handlebars templates in Obsidian.

You can check the syntax at <https://handlebarsjs.com/guide/>.

[Korean version(한국어 버전)](README.ko.md)

## How to Use

Suppose you have the following Handlebars template:

```md Template/test1.md
#### {{title}}

> [!{{t1}}]
> {{t2}}

Hello world!

{{#each alist}}
- {{this}}
{{/each}}
```

To use this, enter the following in Obsidian:

````md example.md

### Example

The code block below will be changed

```hb
tpl: test1
data:
  title: Main Title
  t1: For example
  t2: "**This** is also possible!"
  alist:
    - One
    - Two
    - Three
```

````

When you do this, the template will be applied as follows:

```md example.md(rendered)

### Example

The code block below will be changed

#### Main Title

> [!For example]
> **This** is also possible!

Hello world!

- One
- Two
- Three

```

Hope you find it useful.

### How to Write Templates

For instructions on how to write templates, please refer to [How to Write Templates](docs/method.md).
