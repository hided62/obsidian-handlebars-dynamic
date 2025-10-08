# 옵시디안용 Dynamic Handlebars 템플릿

## 개요

옵시디안에서 Handlebars 템플릿을 사용할 수 있게 해주는 플러그인입니다.

문법은 <https://handlebarsjs.com/guide/> 에서 확인할 수 있습니다.

## 사용 방법

아래와 같이 Handlebars 템플릿이 있다고 가정합니다.

```md Template/test1.md
#### {{title}}

> [!{{t1}}]
> {{t2}}

Hello world!

{{#each alist}}
- {{this}}
{{/each}}
```

이를 사용하기 위해 옵시디안 내에서 다음과 같이 입력합니다.

````md example.md

### 예시

아래의 code block이 변경됨

```hb
tpl: test1
data:
  title: 큰제목
  t1: 예를 들면
  t2: "**이렇게**도 가능!"
  alist:
    - 하나
    - 둘
    - 셋
```

````

이렇게 할 경우 템플릿이 아래와 같이 적용될 것입니다.

```md example.md(rendered)

### 예시

아래의 code block이 변경됨

#### 큰제목

> [!예를 들면]
> **이렇게**도 가능!

Hello world!

- 하나
- 둘
- 셋

```

유용하게 활용할 수 있다면 좋겠습니다.

### 템플릿 작성법

[템플릿 작성법](docs/method.ko.md)을 참고해 주세요.
