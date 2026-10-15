# Vendored third-party asset manifest

Pinning record for every third-party browser asset the legacy dashboard loads from a CDN.
Playwright can route each upstream URL to the local copy below so baseline tests are deterministic and offline.

- Generated: 2026-10-15T00:08:57.574Z
- Files: 41
- Total bytes: 5653509

Paths are relative to `test/fixtures/vendor/`. All hashes are sha256 of the file **as stored locally**.

> Note: `basemap/glyphs/**/*.pbf` and `basemap/tiles/**/*.mvt` are stored **decompressed**. Upstream serves
> them with `Content-Encoding: gzip`; serve the local copies with `Content-Type: application/x-protobuf` and no encoding header.

| File | Bytes | sha256 | Upstream URL |
|------|-------|--------|--------------|
| `basemap/glyphs/Montserrat Medium Italic,Open Sans Italic,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/0-255.pbf` | 87348 | `7b9e888421dc773297eca4897802f90986f140205cef3b3d1a40e49e4eb1c909` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Medium%20Italic,Open%20Sans%20Italic,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/0-255.pbf (stored decompressed) |
| `basemap/glyphs/Montserrat Medium,Open Sans Bold,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/0-255.pbf` | 81323 | `a05dfcdeafa2d6354ef0d9729d9a94cb70c7d75bb91ea400e2278219d233c651` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Medium,Open%20Sans%20Bold,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/0-255.pbf (stored decompressed) |
| `basemap/glyphs/Montserrat Medium,Open Sans Bold,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/256-511.pbf` | 132274 | `a7b6447a9539b741b0b2edf0467f1820ab41596548aa3546939300e2c75d7f65` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Medium,Open%20Sans%20Bold,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/256-511.pbf (stored decompressed) |
| `basemap/glyphs/Montserrat Regular Italic,Open Sans Italic,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/0-255.pbf` | 78371 | `d491eea8c37214c4839a982b422945744ca25bb1225bda9b586f72761fae0595` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Regular%20Italic,Open%20Sans%20Italic,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/0-255.pbf (stored decompressed) |
| `basemap/glyphs/Montserrat Regular,Open Sans Regular,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/0-255.pbf` | 78724 | `9ae9149361e4cf66feecb6ef42177ad47b15ad0256e34f343bb28b7317e11793` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Regular,Open%20Sans%20Regular,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/0-255.pbf (stored decompressed) |
| `basemap/glyphs/Montserrat Regular,Open Sans Regular,Noto Sans Regular,HanWangHeiLight Regular,NanumBarunGothic Regular/256-511.pbf` | 130116 | `50949dc3b3575bb5930c8aa52646d91220e856e73fac715892ef1c87921cb8d4` | https://tiles.basemaps.cartocdn.com/fonts/Montserrat%20Regular,Open%20Sans%20Regular,Noto%20Sans%20Regular,HanWangHeiLight%20Regular,NanumBarunGothic%20Regular/256-511.pbf (stored decompressed) |
| `basemap/sprite/dark-matter.json` | 103 | `90687964a039c843f2705e2265251370ac0d8a1576f67b263cd23428f07a6ec6` | https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/sprite.json |
| `basemap/sprite/dark-matter.png` | 217 | `9e68cba832fb823e063b05c26382f3dcfd47ec38125eaab0d2810738ef11e8d8` | https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/sprite.png |
| `basemap/sprite/positron.json` | 103 | `90687964a039c843f2705e2265251370ac0d8a1576f67b263cd23428f07a6ec6` | https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/sprite.json |
| `basemap/sprite/positron.png` | 217 | `9e68cba832fb823e063b05c26382f3dcfd47ec38125eaab0d2810738ef11e8d8` | https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/sprite.png |
| `basemap/styles/dark-matter-nolabels.json` | 70916 | `c5f19f0ae0c0452ca6428e5ff40fb3f6f22739f0d91f8fcaf05bcec3e40172bc` | https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json |
| `basemap/styles/dark-matter.json` | 107100 | `18a6f43bdde992d3f13c8b6807546259382cc68f184fc2b787b94a70d35e1ff1` | https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json |
| `basemap/styles/positron.json` | 106761 | `8d327b02a4d567413118c4fad9f7bb33dd5d121b77b75bf5125ea5f33811b33c` | https://basemaps.cartocdn.com/gl/positron-gl-style/style.json |
| `basemap/tiles/0/0/0.mvt` | 73722 | `884ce9357cf9a3a953ae99ddb37b76ed1e52b573d357f5edb7f0719076b224bf` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/0/0/0.mvt (stored decompressed) |
| `basemap/tiles/1/0/0.mvt` | 177446 | `cd4039365262f9d7b1125f9f85fc3edc8e55cd9101c5cd2e7f16f4f3ab420e43` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/1/0/0.mvt (stored decompressed) |
| `basemap/tiles/1/0/1.mvt` | 171333 | `72da86a355e47536b1a4507da8e635b23da8ec9b5cbfb93afffeec159c3b44ac` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/1/0/1.mvt (stored decompressed) |
| `basemap/tiles/1/1/0.mvt` | 201291 | `3ecdcb8380d28eb27059ef7d3e6643118388091aec3cb6ee24eeb3f742952078` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/1/1/0.mvt (stored decompressed) |
| `basemap/tiles/1/1/1.mvt` | 173538 | `80458f216d2119fff1e952b9de43a9cec5bee6459f5995bf3f840d945be9a345` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/1/1/1.mvt (stored decompressed) |
| `basemap/tiles/2/1/1.mvt` | 557306 | `d02b150bced5ecc3ce14738098575fb48007d65d6288f7e8f9184c6cf27f247e` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/2/1/1.mvt (stored decompressed) |
| `basemap/tiles/2/1/2.mvt` | 543865 | `fa2b80ecdce2e7ac53abe77229a1d468ef3e77c007ff23231b8170768d498a18` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/2/1/2.mvt (stored decompressed) |
| `basemap/tiles/2/2/1.mvt` | 691249 | `d1b5a1649495546d2923d34122c08d70785621abd1597288b364d8010e506a52` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/2/2/1.mvt (stored decompressed) |
| `basemap/tiles/2/2/2.mvt` | 644028 | `014f5443bab6287452591661827bec3445becfe2d1d30ff76f431bbe75cc2ec5` | https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/2/2/2.mvt (stored decompressed) |
| `data/polymarket-events.json` | 4714 | `ed68185b300a3270449635b3291058edf7723aa6fe3e577b13f8b2e965f3b520` | SYNTHETIC (hand-written; schema mirrors https://gamma-api.polymarket.com/events) |
| `data/usgs-2.5-day.geojson` | 3572 | `9ac1955a2592408f2d795e9e52fbb566069154f542e1ad2d21b9c8e6fff771dd` | SYNTHETIC (hand-written; schema mirrors https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson) |
| `fonts/files/gyByhwUxId8gMEwRGFWfOw.woff2` | 7420 | `2317fa4bb293c9c0b110e18315d529235c47a0ddd3338cea3d8c7955e927899e` | https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwRGFWfOw.woff2 |
| `fonts/files/gyByhwUxId8gMEwSGFWfOw.woff2` | 16512 | `824f485b5d26e2f2da3c2b236132ece1bc8e4e43373452950bb0e40548b4313f` | https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwSGFWfOw.woff2 |
| `fonts/files/gyByhwUxId8gMEwTGFWfOw.woff2` | 8004 | `8fa40e5d248247735eb97a0bd593b8852440430600d6ba01364c31fe0abc1fe1` | https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwTGFWfOw.woff2 |
| `fonts/files/gyByhwUxId8gMEwYGFWfOw.woff2` | 15084 | `6894439694946a589d157ece003086960a6a4013d74a813dab7602efdb3d8c09` | https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwYGFWfOw.woff2 |
| `fonts/files/gyByhwUxId8gMEwcGFU.woff2` | 29400 | `19f9c92546aa300c312235e3125af1b81394d8db9a4bc4a425cd5b641d2d54e1` | https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFU.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFg08vz7ehw.woff2` | 5812 | `5bb66d8319ba1602bb2eb67dce8d79c2b4687be8ce183a0574433e949b3c60ad` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFg08vz7ehw.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFrMdmgPn.woff2` | 12940 | `4866787fc952dbdbd591d6923d67bc21c2d894b93f34ab69d0cdf25d47bfb2df` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrMdmgPn.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2` | 23128 | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFrgdmgPn.woff2` | 7696 | `d39b60889a94a527a7f73c7988a2d6efb6c081614aef683b0b386c02d74c2175` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrgdmgPn.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFrkdmgPn.woff2` | 14696 | `1a189eb997c3e2ece68373e387afaec9e8617424186c4b1ab3cff7c54ba6223b` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrkdmgPn.woff2 |
| `fonts/files/or3nQ6H-1_WfwkMZI_qYFrodmgPn.woff2` | 6176 | `cd8800999070b729e1cc0bf7a48da6c3ac096a044251171b9a7574b56d96d4b4` | https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrodmgPn.woff2 |
| `fonts/geist.css` | 12178 | `849ad66f52fce99435316197ee5e03499ec482d66476f6a3048ce38a9c581434` | https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap |
| `gsap-3.12.5/gsap.min.js` | 72214 | `28033e449a31ebcc396e5be8b13b63152bf03094288fb5867034321927bce087` | https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js |
| `hls-1.5.17/hls.min.js` | 413952 | `484054e8cd03d3f6d1781fb7f402bdc318d8a4c527f933a95c624e27cc9a9470` | https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js |
| `maplibre-gl-4.7.1/maplibre-gl.css` | 65534 | `576b085fdd9487a65a19215328c1e086c07ce5bf6da09b666b3806d3d008dae9` | https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css |
| `maplibre-gl-4.7.1/maplibre-gl.js` | 803086 | `be9633c4d870e26fb37f1cfe5c5a77181667114003ea16207ac7850d8da8add1` | https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js |
| `satellite-6.0.1/satellite.min.js` | 24040 | `6fd7487abb99bec37ea2c8d1f5739b59143a6130a00b0faa6c44dd44585aebbf` | https://cdnjs.cloudflare.com/ajax/libs/satellite.js/6.0.1/satellite.min.js |
