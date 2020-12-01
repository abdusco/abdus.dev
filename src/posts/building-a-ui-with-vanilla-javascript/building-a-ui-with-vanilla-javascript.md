---
title: Building a UI with vanilla Javascript
description: A couple lines of Javascript and done.
tags:
  - javascript
  - post
date: 2020-07-01T00:00:00.000Z
---
# {{title}}

I enjoy building server-rendered apps. They're faster to build, more straightforward, and easy to get your head around.

One tool I keep reaching for is [Alpine JS][alpine], which is a tiny library that helps to build components on a server-rendered page with a Vue-like syntax. 

But it does not apply to all needs, or sometimes a couple of lines of vanilla JS is all the page ever needs. In those times, I write this utility function:


```js
/**
 * @param {string} name
 * @param {HTMLElement.prototype} props
 * @param {Array<HTMLElement|string>} children
 * @return HTMLElement
 */
function $h(name = 'div', props = {}, children = []) {
    const el = document.createElement(name);
    Object.assign(el, props);
    el.append(...children);
    return el;
}
```

and use it like so:

```js
const button = $h('button', {
    className: 'button',
    onclick: async (e) => alert('clicked'),
}, ['Download']);

document.body.append(button);
```

It resembles [Mithril's syntax][mithril], but it's not reactive as modern UI libraries.




[alpine]: https://github.com/alpinejs/alpine/
[mithril]: https://mithril.js.org/index.html#dom-elements