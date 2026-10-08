---
title: Prayer Times API v2
description: Fetch daily/monthly islamic prayer times, now more stable.
date: 2026-10-08
taxonomies:
  tags: [api]
---

I built [the first version of this API](@/projects/prayertimes/index.md) back in 2020, and it has chugging along since then. 
However, it was based on scraping data from the [Presidency of Religious Affairs of Turkey][diyanet] website, which was not very stable, and I even have a cronjob that restarts the server because it kept breaking and I didn't have time to fix it.

Since then, I've been working on a new version that works by calculating the times based on the location and date, which turns out to be how Diyanet's own app works under the hood. It is much more stable and reliable. 
The only caveat is that if you can't get the exact coordinates of a location as the original app, you'll get slightly different times, which isn't too big of a deal in my opinion.

I am using the city database from [GeoNames][geonames] that contains [the most populous 5000 cities][geonames_dump] to get the name + coordinates of a location, and then calculating the prayer times based on that.

It also has a web UI that also works as a PWA, so you can install it on your phone. The API docs are available [here][prayertimes].

[diyanet]: https://namazvakitleri.diyanet.gov.tr/tr-TR
[prayertimes]: https://prayertimes.api.abdus.dev/api
[geonames]: https://www.geonames.org/
[geonames_dump]: https://download.geonames.org/export/dump/
