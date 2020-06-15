---
title: Prayer Times API
description: Fetch daily/monthly islamic prayer times
date: 2020-01-20
tags:
    - api
    - project
---

# {{ title }}

This API lets you fetch daily prayer times from [Presidency of Religious Affairs of Turkey][diyanet] 
(Diyanet İşleri Başkanlığı) in a nice, clean format. 
You can use it to find a location with available prayer times info, 
then query the schedule of that month's prayer times.   

I've created this API to prepare for a web app I'll be building soon. 
I am planning to structure it as a progressive web app that can be easily installed 
and even planning to add push notifications to let user know of upcoming prayers.

Swagger documentation for the API is reachable at [prayertimes.api.abdus.dev/docs][prayertimes]  

## Usage

1. Find a location first by narrowing down country > city > region to get a location id. 
  Or search by country / state / city name: 
  
  ```bash
  curl "https://prayertimes.api.abdus.dev/api/diyanet/search?q=istanbul"
  ```
  
  You'll get a list of locations:
  
  ```json
  [
    ...
    {
      "id": 9541,
      "country": "TÜRKİYE",
      "city": "İSTANBUL",
      "region": "İSTANBUL"
    },
    {
      "id": 9547,
      "country": "TÜRKİYE",
      "city": "İSTANBUL",
      "region": "ŞİLE"
    }
  ]
  ``` 

2. Using the location `id` fetch the schedule of prayer times

```bash
curl "https://prayertimes.api.abdus.dev/api/diyanet/prayertimes?location_id=9541"
``` 

you'll get a json like this:

```json
[
  {
    "date": "2020-01-21T00:00:00",
    "fajr": "06:48",
    "sun": "08:17",
    "dhuhr": "13:20",
    "asr": "15:50",
    "maghrib": "18:13",
    "isha": "19:37"
  },
  {
    "date": "2020-01-22T00:00:00",
    "fajr": "06:47",
    "sun": "08:17",
    "dhuhr": "13:20",
    "asr": "15:51",
    "maghrib": "18:14",
    "isha": "19:38"
  },
  ...
]
```




[prayertimes]: https://prayertimes.api.abdus.dev/docs
[diyanet]: https://namazvakitleri.diyanet.gov.tr/en-US
