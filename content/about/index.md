---
title: About Me
template: single.html
extra:
  fancy_title: true
---

Hey,
My name is Abdussamet Koçak. I'm a developer based in Stuttgart, focusing mainly on web, but I also like writing scripts to automate anything and everything. I work as a backend web developer at refurbed.

I enjoy films, photography and nerding out on science and technology. I love learning new languages and cultures. Tatsächlich lerne ich seit Jahren gerne Deutsch. Über den Jahren, die ich in Deutschland verbracht habe, wurde mir klar dass die deutsche Sprache nicht so leicht zu beherrschen ist, aber ich liebe die Herausforderung.

You can react out to me about anything at [hey@abdus.dev](mailto:hey@abdus.dev).

<link rel="stylesheet" href="about.css">

<figure class="portrait-effect">
  <div class="portrait-effect__image is-loading">
    <img src="abdus_dark.resized.jpg" alt="Me, from a couple of years ago" width="720" height="480">
    <canvas class="portrait-effect__canvas" aria-hidden="true"></canvas>
  </div>
  <noscript><span class="portrait-effect__no-script" hidden></span></noscript>
</figure>

<script src="{{ get_url(path='dither.js', cachebust=true) }}"
        data-color-paper="{{ config.extra.palette.paper }}"
        data-color-ink="{{ config.extra.palette.ink }}"
        data-color-dark-paper="{{ config.extra.palette.dark_paper }}"
        data-color-dark-ink="{{ config.extra.palette.dark_ink }}"
        defer></script>
