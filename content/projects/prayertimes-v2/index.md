---
title: Prayer Times API v2
description: Fetch daily/monthly islamic prayer times, now more stable.
date: 2026-10-08
taxonomies:
  tags: [api]
---

<div class="prayertimes-logo">{{ embed_file(path="./mosque.svg") }}</div>

<style>
.prayertimes-logo {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
.prayertimes-logo svg {
    width: 100%;
    height: 100%;
    color: var(--c-accent);
}
</style>



I built [the first version of this API](@/projects/prayertimes/index.md) back in 2020, and it has been chugging along since then. 
However, it was based on scraping data from the [Presidency of Religious Affairs of Turkey][diyanet] website, which was not very stable, and I even have a cronjob that restarts the server because it kept breaking and I didn't have time to fix it.

I started working on a newer version this year that functions by calculating the times based on the location and date. The calculations are based on studies published by Diyanet. 
This also turns out to be how Diyanet's own app works under the hood (I reverse engineered it). If you use the same coordinates as the app, you will get the exact same times. Slightly different coordinates will give slightly different times, but I think it's acceptable.
It is also more stable and reliable than scraping the Diyanet website. 

I am using the city database from [GeoNames][geonames] that contains [the most populous 5000 cities][geonames_dump] to get the name + coordinates of a location, and then calculating the prayer times based on that.

It also has [a web UI][prayertimes_ui] that also works as a PWA, so you can install it on your phone. The API docs are available [here][prayertimes].

[diyanet]: https://namazvakitleri.diyanet.gov.tr/tr-TR
[prayertimes]: https://prayertimes.api.abdus.dev/api
[geonames]: https://www.geonames.org/
[geonames_dump]: https://download.geonames.org/export/dump/
[prayertimes_ui]: https://prayertimes.api.abdus.dev/

{{ gitea_repo(repo="abdus/prayertimes-go") }}
