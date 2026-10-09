# Live URL inventory

Generated from `crawl.json` by `npm run crawl:summary`; do not edit by hand. `npm run crawl:summary -- --check` fails when this file and `crawl.json` disagree.

Crawled at 2026-10-09T06:18:19.546Z by pandora-site-crawl 1.0.0.

| Host              | URLs | From sitemaps | Link hop only |
| ----------------- | ---: | ------------: | ------------: |
| invetec.eu        | 2115 |          1914 |           201 |
| lenovo.invetec.eu | 2524 |          2232 |           292 |
| All hosts         | 4639 |          4146 |           493 |

## Sitemaps and robots.txt

`Entries` is what the file lists, `URLs taken` what the crawl took from it, `Records` the URLs in `crawl.json` whose `source` is that file. The generator refuses to write this file unless `URLs taken` equals `Records` for every file, so every sitemap URL has exactly one record.

### invetec.eu

robots.txt (`https://invetec.eu/robots.txt`): HTTP 200. `User-agent: *` disallows `/wp-admin/`, `/wp-includes/`, `/wp-content/plugins/`, `/wp-content/themes/`, `/wp-content/cache/`; allows `/wp-admin/admin-ajax.php`; Crawl-delay: (none). Sitemap lines: `https://invetec.eu/sitemap-index.xml`, `https://invetec.eu/sitemap-index-1.xml`, `https://invetec.eu/sitemap.xml`.

| Sitemap file                               | HTTP | Kind    | Entries | URLs taken | Records | Note                                                            |
| ------------------------------------------ | ---: | ------- | ------: | ---------: | ------: | --------------------------------------------------------------- |
| `https://invetec.eu/sitemap-index.xml`     |  404 | skipped |       0 |          - |       - | HTTP 404                                                        |
| `https://invetec.eu/sitemap-index-1.xml`   |  404 | skipped |       0 |          - |       - | HTTP 404                                                        |
| `https://invetec.eu/sitemap.xml`           |  200 | index   |       6 |          - |       - | redirected to https://invetec.eu/sitemap_index.xml              |
| `https://invetec.eu/wp-sitemap.xml`        |  301 | skipped |       0 |          - |       - | redirects to https://invetec.eu/sitemap_index.xml, already read |
| `https://invetec.eu/post-sitemap.xml`      |  200 | urlset  |     505 |        505 |     505 |                                                                 |
| `https://invetec.eu/page-sitemap.xml`      |  200 | urlset  |     192 |        192 |     192 |                                                                 |
| `https://invetec.eu/category-sitemap.xml`  |  200 | urlset  |      37 |         37 |      37 |                                                                 |
| `https://invetec.eu/post_tag-sitemap.xml`  |  200 | urlset  |    1000 |       1000 |    1000 |                                                                 |
| `https://invetec.eu/post_tag-sitemap2.xml` |  200 | urlset  |     177 |        177 |     177 |                                                                 |
| `https://invetec.eu/author-sitemap.xml`    |  200 | urlset  |       3 |          3 |       3 |                                                                 |

Duplicate sitemap entries: 0. Skipped entries: 0 with a query string, 0 on another host, 0 invalid.

### lenovo.invetec.eu

robots.txt (`https://lenovo.invetec.eu/robots.txt`): HTTP 200. `User-agent: *` disallows `/wp-content/uploads/wc-logs/`, `/wp-content/uploads/woocommerce_transient_files/`, `/wp-content/uploads/woocommerce_uploads/`, `/*?add-to-cart=`, `/*?*add-to-cart=`, `/wp-admin/`; allows `/wp-admin/admin-ajax.php`; Crawl-delay: (none). Sitemap lines: `https://lenovo.invetec.eu/wp-sitemap.xml`.

| Sitemap file                                                        | HTTP | Kind    | Entries | URLs taken | Records | Note     |
| ------------------------------------------------------------------- | ---: | ------- | ------: | ---------: | ------: | -------- |
| `https://lenovo.invetec.eu/wp-sitemap.xml`                          |  200 | index   |       7 |          - |       - |          |
| `https://lenovo.invetec.eu/sitemap_index.xml`                       |  404 | skipped |       0 |          - |       - | HTTP 404 |
| `https://lenovo.invetec.eu/wp-sitemap-posts-post-1.xml`             |  200 | urlset  |       1 |          1 |       1 |          |
| `https://lenovo.invetec.eu/wp-sitemap-posts-page-1.xml`             |  200 | urlset  |       6 |          6 |       6 |          |
| `https://lenovo.invetec.eu/wp-sitemap-posts-product-1.xml`          |  200 | urlset  |    1819 |       1819 |    1819 |          |
| `https://lenovo.invetec.eu/wp-sitemap-taxonomies-category-1.xml`    |  200 | urlset  |       1 |          1 |       1 |          |
| `https://lenovo.invetec.eu/wp-sitemap-taxonomies-product_cat-1.xml` |  200 | urlset  |     376 |        376 |     376 |          |
| `https://lenovo.invetec.eu/wp-sitemap-taxonomies-product_tag-1.xml` |  200 | urlset  |      28 |         28 |      28 |          |
| `https://lenovo.invetec.eu/wp-sitemap-users-1.xml`                  |  200 | urlset  |       1 |          1 |       1 |          |

Duplicate sitemap entries: 0. Skipped entries: 0 with a query string, 0 on another host, 0 invalid.

## URLs by host, language and page type

`lang` is the primary subtag of the final page's `<html lang>`, else the path language (`/en/`, `/it/`, `/sq/`; any other path is `el` on invetec.eu and has none on lenovo.invetec.eu). The page type comes from the sitemap file, else the URL pattern.

| Host              | Lang | home | page | post | category |  tag | author | product | product-category | product-tag | shop-system | other | Total |
| ----------------- | ---- | ---: | ---: | ---: | -------: | ---: | -----: | ------: | ---------------: | ----------: | ----------: | ----: | ----: |
| invetec.eu        | el   |    1 |   50 |  234 |       21 |  401 |      6 |       0 |                0 |           0 |           4 |    50 |   767 |
| invetec.eu        | en   |    0 |   52 |  131 |       17 |  349 |      3 |       0 |                0 |           0 |           0 |    47 |   599 |
| invetec.eu        | it   |    1 |   54 |  111 |       14 |  263 |      3 |       0 |                0 |           0 |           0 |    36 |   482 |
| invetec.eu        | sq   |    0 |   31 |   29 |       10 |  172 |      3 |       0 |                0 |           0 |           0 |    22 |   267 |
| invetec.eu        | all  |    2 |  187 |  505 |       62 | 1185 |     15 |       0 |                0 |           0 |           4 |   155 |  2115 |
| lenovo.invetec.eu | en   |    1 |    1 |    1 |        1 |    0 |      1 |    1819 |              626 |          63 |           4 |     7 |  2524 |
| lenovo.invetec.eu | all  |    1 |    1 |    1 |        1 |    0 |      1 |    1819 |              626 |          63 |           4 |     7 |  2524 |

## Status

| Host              | Final result | URLs | After a redirect |
| ----------------- | ------------ | ---: | ---------------: |
| invetec.eu        | HTTP 200     | 2088 |              118 |
| invetec.eu        | HTTP 404     |   27 |                3 |
| lenovo.invetec.eu | HTTP 200     | 2524 |                1 |

### Not 200 (27)

- `https://invetec.eu/%ce%b5%cf%86%cf%8c%cf%81%ce%bf%cf%85-%ce%b6%cf%89%ce%ae%cf%82-%ce%b5%ce%b3%ce%b3%cf%8d%ce%b7%cf%83%ce%b7-%cf%83%ce%b5-%cf%8c%ce%bb%ce%b1-%cf%84%ce%b1-%cf%83%cf%85%cf%83%cf%84%ce%ae%ce%bc%ce%b1%cf%84/giati-oi-pistopoiiseis-einai-aparaitites-stin-aftokinitoviomixania.html`: HTTP 404 (`link`)
- `https://invetec.eu/b2b/pandora-tools-manuals-2/`: HTTP 404 (`link`)
- `https://invetec.eu/boat-and-fishing-show-2023/`: HTTP 404 (`link`)
- `https://invetec.eu/el/%CF%8C%CF%81%CE%BF%CE%B9-%CF%87%CF%81%CE%AE%CF%83%CE%B7%CF%82/`: HTTP 404 (`link`)
- `https://invetec.eu/en/home-page/`: HTTP 404 (`link`)
- `https://invetec.eu/en/home-page/camper-protection/camper-accessories/`: HTTP 404 (`link`)
- `https://invetec.eu/en/map-en`: HTTP 404 (`link`)
- `https://invetec.eu/en/pandora-car-alarms/`: HTTP 404 (`link`)
- `https://invetec.eu/en/pandora-tracer-6/`: HTTP 404 (`link`)
- `https://invetec.eu/en/pandora-truck-4/`: HTTP 404 (`link`)
- `https://invetec.eu/it/allarmi-per-auto-pandora/`: HTTP 404 (`link`)
- `https://invetec.eu/it/auto/`: HTTP 404, after 301 → `https://invetec.eu/it/allarmi-per-auto-pandora/` (`link`)
- `https://invetec.eu/it/infotainment-camperplay-android-camper-it/`: HTTP 404 (`link`)
- `https://invetec.eu/it/pandora-elite-2/`: HTTP 404 (`link`)
- `https://invetec.eu/it/pandora-tracer-7/`: HTTP 404 (`link`)
- `https://invetec.eu/it/pandora-truck-3/`: HTTP 404 (`link`)
- `https://invetec.eu/it/per-il-camion/`: HTTP 404 (`link`)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-gr/`: HTTP 404, after 301 → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-gr/` (`link`)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-it/`: HTTP 404, after 301 → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-it/` (`link`)
- `https://invetec.eu/it/truck/`: HTTP 404 (`link`)
- `https://invetec.eu/it/vehicle-fleet/`: HTTP 404 (`link`)
- `https://invetec.eu/pandora-moto-evo-2/`: HTTP 404 (`link`)
- `https://invetec.eu/pandora-tracer-4/`: HTTP 404 (`link`)
- `https://invetec.eu/sq/alarmet-e-makinave-pandora/`: HTTP 404 (`link`)
- `https://invetec.eu/sq/mbrojtje-per-kamionin/`: HTTP 404 (`link`)
- `https://invetec.eu/sq/pandora-truck-5/`: HTTP 404 (`link`)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85-pandora/`: HTTP 404 (`link`)

### Redirect loops and stopped redirects (0)

None.

### Redirects (122)

Redirect statuses per hop, then the final result. Chains: 1 hop 114, 2 hops 5, 3 hops 3.

- `https://invetec.eu/%CE%B5%CF%80%CE%B9%CE%BA%CE%BF%CE%B9%CE%BD%CF%89%CE%BD%CE%AF%CE%B1` → `https://invetec.eu/%CE%B5%CF%80%CE%B9%CE%BA%CE%BF%CE%B9%CE%BD%CF%89%CE%BD%CE%AF%CE%B1/` (301; HTTP 200)
- `https://invetec.eu/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/` → `https://invetec.eu/vehicle-alarm-systems/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/` (301; HTTP 200)
- `https://invetec.eu/%ce%b3%ce%b9%ce%b1-%cf%84%ce%bf-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` → `https://invetec.eu/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` (301; HTTP 200)
- `https://invetec.eu/%ce%b7-pandora-%ce%b1%ce%bd%ce%b1%ce%b2%ce%b1%ce%b8%ce%bc%ce%af%ce%b6%ce%b5%ce%b9-%cf%84%ce%bf-%cf%84racking-%ce%b1%cf%80%cf%8c-gps-%cf%83%ce%b5-gnss/` → `https://invetec.eu/%ce%b7-pandora-%ce%b1%ce%bd%ce%b1%ce%b2%ce%b1%ce%b8%ce%bc%ce%af%ce%b6%ce%b5%ce%b9-%cf%84%ce%bf%ce%bd-%ce%b5%ce%bd%cf%84%ce%bf%cf%80%ce%b9%cf%83%ce%bc%cf%8c%cf%82-%cf%83%ce%b5-gnss/` (301; HTTP 200)
- `https://invetec.eu/about-us-gr` → `https://invetec.eu/about-us-gr/` (301; HTTP 200)
- `https://invetec.eu/al/pandora-camper-pro-v2-al/` → `https://invetec.eu/sq/pandora-camper-pro-v2-al/` (301; HTTP 200)
- `https://invetec.eu/al/pandora-camper-v3-al/` → `https://invetec.eu/sq/pandora-camper-v3-al/` (301; HTTP 200)
- `https://invetec.eu/alarm/eco2move` → `https://invetec.eu/eco2move/` (301; HTTP 200)
- `https://invetec.eu/contact/` → `https://invetec.eu/en/contact/` (301; HTTP 200)
- `https://invetec.eu/contatta/` → `https://invetec.eu/it/contatta/` (301; HTTP 200)
- `https://invetec.eu/en/about-us-al/` → `https://invetec.eu/sq/about-us-al/` (301; HTTP 200)
- `https://invetec.eu/en/canbus-cruise-control-en/` → `https://invetec.eu/en/lindgaard-pedersen-canbus-cruise-control-en/` (301; HTTP 200)
- `https://invetec.eu/en/car-protection/pandora-car-accessories/` → `https://invetec.eu/en/products-car-accessories-pandora-en/` (301; HTTP 200)
- `https://invetec.eu/en/get-15-discount-at-il-salone-del-camper-2025-parma-en/` → `https://invetec.eu/en/pandora-at-il-salone-del-camper-2025-b2c-en/` (301; HTTP 200)
- `https://invetec.eu/en/home-page/camper-protection/` → `https://invetec.eu/en/homepage-en/camper-protection/` (301; HTTP 200)
- `https://invetec.eu/en/keetec-blade-en` → `https://invetec.eu/en/keetec-blade-en/` (301; HTTP 200)
- `https://invetec.eu/en/large-scale-update-for-pandora-systems-3/` → `https://invetec.eu/it/aggiornamento-estensivo-per-i-sistemi-pandora/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-at-il-salone-del-camper-parma-2025-en/` → `https://invetec.eu/en/pandora-il-salone-del-camper-parma-2025-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-camper-v3-gr/` → `https://invetec.eu/pandora-camper-v3-gr/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-camper-v3-it/` → `https://invetec.eu/it/pandora-camper-v3-it/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-elite-v3-al/` → `https://invetec.eu/sq/pandora-elite-v3-al/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-elite-v3-gr/` → `https://invetec.eu/pandora-elite-v3-gr/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-immo-6/` → `https://invetec.eu/en/pandora-immo-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-marine-3/` → `https://invetec.eu/en/pandora-marine-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-ecomode//` → `https://invetec.eu/en/pandora-moto-ecomode/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-eu-4/` → `https://invetec.eu/en/pandora-moto-evo-v2-en/` (301, 301, 301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-evo-2/` → `https://invetec.eu/en/pandora-moto-evo-v2-en/` (301, 301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-evo-en/` → `https://invetec.eu/en/pandora-moto-evo-v2-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-evo-v2-gr/` → `https://invetec.eu/pandora-moto-evo-v2-gr/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-moto-v2-en` → `https://invetec.eu/en/pandora-moto-v2-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-al` → `https://invetec.eu/sq/pandora-smart-pro-v4-fd-al/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-en` → `https://invetec.eu/en/pandora-smart-pro-v4-fd-en/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-gr` → `https://invetec.eu/pandora-smart-pro-v4-fd-gr/` (301; HTTP 200)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-it` → `https://invetec.eu/it/pandora-smart-pro-v4-fd-it/` (301; HTTP 200)
- `https://invetec.eu/en/parental-control/` → `https://invetec.eu/en/new-driver-speed-control-protect/` (301; HTTP 200)
- `https://invetec.eu/en/products-camper-accessories-pandora-gr/` → `https://invetec.eu/products-camper-accessories-pandora-gr/` (301; HTTP 200)
- `https://invetec.eu/en/products-camper-accessories-pandora-it/` → `https://invetec.eu/it/products-camper-accessories-pandora-it/` (301; HTTP 200)
- `https://invetec.eu/en/products-camper-protection-al/` → `https://invetec.eu/sq/products-camper-protection-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-camper-protection-gr/` → `https://invetec.eu/products-camper-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/en/products-car-protection-al/` → `https://invetec.eu/sq/products-car-protection-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-car-protection-gr/` → `https://invetec.eu/products-car-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/en/products-fleet-protection-al/` → `https://invetec.eu/sq/products-fleet-protection-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-fleet-protection-gr/` → `https://invetec.eu/products-fleet-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/en/products-marine-accessories-pandora-al/` → `https://invetec.eu/sq/products-marine-accessories-pandora-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-marine-accessories-pandora-it/` → `https://invetec.eu/it/products-marine-accessories-pandora-it/` (301; HTTP 200)
- `https://invetec.eu/en/products-marine-protection-al/` → `https://invetec.eu/sq/products-marine-protection-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-marine-protection-gr/` → `https://invetec.eu/products-marine-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/en/products-moto-accessories-pandora-it/` → `https://invetec.eu/it/products-moto-accessories-pandora-it/` (301; HTTP 200)
- `https://invetec.eu/en/products-moto-protection-al/` → `https://invetec.eu/sq/products-moto-protection-al/` (301; HTTP 200)
- `https://invetec.eu/en/products-moto-protection-gr/` → `https://invetec.eu/products-moto-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/en/refund-policy` → `https://invetec.eu/en/refund-policy/` (301; HTTP 200)
- `https://invetec.eu/en/terms-conditions` → `https://invetec.eu/en/terms-conditions-and-privacy/` (301; HTTP 200)
- `https://invetec.eu/get-15-discount-at-il-salone-del-camper-2025-parma-gr/` → `https://invetec.eu/pandora-at-il-salone-del-camper-2025-b2c-gr/` (301; HTTP 200)
- `https://invetec.eu/introducing-the-new-flagship-keyfob-pandora-commander-2/` → `https://invetec.eu/en/introducing-the-new-flagship-keyfob-pandora-commander-2/` (301; HTTP 200)
- `https://invetec.eu/introducing-the-new-flagship-keyfob-pandora-commander-3/` → `https://invetec.eu/it/introducing-the-new-flagship-keyfob-pandora-commander-3/` (301; HTTP 200)
- `https://invetec.eu/it/` → `https://invetec.eu/it/homepage-it/` (301; HTTP 200)
- `https://invetec.eu/it/about-us-it` → `https://invetec.eu/it/about-us-it/` (301; HTTP 200)
- `https://invetec.eu/it/auto/` → `https://invetec.eu/it/allarmi-per-auto-pandora/` (301; HTTP 404)
- `https://invetec.eu/it/camper` → `https://invetec.eu/en/camper-3/` (301; HTTP 200)
- `https://invetec.eu/it/camper-accessories/` → `https://invetec.eu/en/homepage-en/camper-protection/camper-accessories/` (301; HTTP 200)
- `https://invetec.eu/it/infotainment-carplay-android-auto-universal/` → `https://invetec.eu/it/infotainment-car-carplay-android-auto-universal-it/` (301; HTTP 200)
- `https://invetec.eu/it/marine/` → `https://invetec.eu/marine-exterior-sound-system/` (301; HTTP 200)
- `https://invetec.eu/it/moto/` → `https://invetec.eu/it/motodays-2025-pandora-it/` (301; HTTP 200)
- `https://invetec.eu/it/notizia/` → `https://invetec.eu/it/notizia-2/` (301; HTTP 200)
- `https://invetec.eu/it/ottieni-15-sconto-al-salone-del-camper-2025-parma-it/` → `https://invetec.eu/it/pandora-at-il-salone-del-camper-2025-b2c-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-at-il-salone-del-camper-parma-2025-it/` → `https://invetec.eu/it/pandora-il-salone-del-camper-parma-2025-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-finder-3/` → `https://invetec.eu/en/pandora-finder-3/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-immo-5/` → `https://invetec.eu/it/pandora-immo-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-marine-2/` → `https://invetec.eu/it/pandora-marine-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-moto-eu-3/` → `https://invetec.eu/it/pandora-moto-evo-v2-it/` (301, 301, 301; HTTP 200)
- `https://invetec.eu/it/pandora-moto-evo-it/` → `https://invetec.eu/it/pandora-moto-evo-v2-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-moto-evo/` → `https://invetec.eu/it/pandora-moto-evo-v2-it/` (301, 301; HTTP 200)
- `https://invetec.eu/it/pandora-moto-v2-it` → `https://invetec.eu/it/pandora-moto-v2-it/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-smart-pro-v4-fd-en/` → `https://invetec.eu/en/pandora-smart-pro-v4-fd-en/` (301; HTTP 200)
- `https://invetec.eu/it/pandora-smart-pro-v4-fd-gr/` → `https://invetec.eu/pandora-smart-pro-v4-fd-gr/` (301; HTTP 200)
- `https://invetec.eu/it/products-camper-protection-gr/` → `https://invetec.eu/products-camper-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/it/products-car-accessories-pandora-al/` → `https://invetec.eu/sq/products-car-accessories-pandora-al/` (301; HTTP 200)
- `https://invetec.eu/it/products-fleet-protection-gr/` → `https://invetec.eu/products-fleet-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/it/products-marine-protection-gr/` → `https://invetec.eu/products-marine-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/it/products-moto-accessories-pandora-gr/` → `https://invetec.eu/products-moto-accessories-pandora-gr/` (301; HTTP 200)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-gr/` → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-gr/` (301; HTTP 404)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-it/` → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-it/` (301; HTTP 404)
- `https://invetec.eu/it/protezione-auto/` → `https://invetec.eu/it/products-car-protection-it/` (301, 301; HTTP 200)
- `https://invetec.eu/it/warranty-activation-infotainment-it` → `https://invetec.eu/it/warranty-activation-infotainment-it/` (301; HTTP 200)
- `https://invetec.eu/keetec-blade/` → `https://invetec.eu/keetec-blade-gr/` (301; HTTP 200)
- `https://invetec.eu/large-scale-update-for-pandora-systems-2/` → `https://invetec.eu/en/large-scale-update-for-pandora-systems-2/` (301; HTTP 200)
- `https://invetec.eu/large-scale-update-for-pandora-systems-3/` → `https://invetec.eu/it/aggiornamento-estensivo-per-i-sistemi-pandora/` (301; HTTP 200)
- `https://invetec.eu/lindgaard-pedersen-canbus-cruise-control-en/` → `https://invetec.eu/en/lindgaard-pedersen-canbus-cruise-control-en/` (301; HTTP 200)
- `https://invetec.eu/lp-cruise-control/` → `https://invetec.eu/lindgaard-pedersen-canbus-cruise-control-gr/` (301; HTTP 200)
- `https://invetec.eu/major-software-update-for-modern-pandora-systems-2//` → `https://invetec.eu/major-software-update-for-modern-pandora-systems-2/` (301; HTTP 200)
- `https://invetec.eu/new-tester-pandora-alt-307-2/` → `https://invetec.eu/en/new-tester-pandora-alt-307-2/` (301; HTTP 200)
- `https://invetec.eu/new-tester-pandora-alt-307-3/` → `https://invetec.eu/it/new-tester-pandora-alt-307-3/` (301; HTTP 200)
- `https://invetec.eu/pandora-at-il-salone-del-camper-parma-2025-gr/` → `https://invetec.eu/pandora-il-salone-del-camper-parma-2025-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-camper-pro-v2-en` → `https://invetec.eu/en/pandora-camper-pro-v2-en/` (301; HTTP 200)
- `https://invetec.eu/pandora-camper-pro-v2-gr` → `https://invetec.eu/pandora-camper-pro-v2-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-camper-pro-v2-it` → `https://invetec.eu/it/pandora-camper-pro-v2-it/` (301; HTTP 200)
- `https://invetec.eu/pandora-camper-v3-it` → `https://invetec.eu/it/pandora-camper-v3-it/` (301; HTTP 200)
- `https://invetec.eu/pandora-elite/` → `https://invetec.eu/sq/pandora-elite-v3-al/` (301; HTTP 200)
- `https://invetec.eu/pandora-immo-4/` → `https://invetec.eu/pandora-immo-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-marine/` → `https://invetec.eu/pandora-marine-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-moto-eu-2/` → `https://invetec.eu/pandora-moto-evo-v2-gr/` (301, 301, 301; HTTP 200)
- `https://invetec.eu/pandora-moto-evo-gr/` → `https://invetec.eu/pandora-moto-evo-v2-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-moto-v2-gr` → `https://invetec.eu/pandora-moto-v2-gr/` (301; HTTP 200)
- `https://invetec.eu/pandora-smart-moto-evo/` → `https://invetec.eu/pandora-moto-evo-v2-gr/` (301, 301; HTTP 200)
- `https://invetec.eu/pandora-smart-v4-it/` → `https://invetec.eu/it/pandora-smart-v4-it/` (301; HTTP 200)
- `https://invetec.eu/remote-start-vag-group-%ce%ba%cf%85%ce%ba%ce%bb%ce%bf%cf%86%cf%8c%cf%81%ce%b7%cf%83%ce%b5/` → `https://invetec.eu/remote-start/` (301; HTTP 200)
- `https://invetec.eu/shopping/` → `https://invetec.eu/` (301; HTTP 200)
- `https://invetec.eu/sq/get-15-discount-at-il-salone-del-camper-2025-parma-al/` → `https://invetec.eu/sq/pandora-at-il-salone-del-camper-2025-b2c-al/` (301; HTTP 200)
- `https://invetec.eu/sq/keetec/` → `https://invetec.eu/sq/keetec-blade-al/` (301; HTTP 200)
- `https://invetec.eu/sq/pandora-at-il-salone-del-camper-parma-2025-al/` → `https://invetec.eu/sq/pandora-il-salone-del-camper-parma-2025-al/` (301; HTTP 200)
- `https://invetec.eu/sq/pandora-immo-7/` → `https://invetec.eu/sq/pandora-immo-al/` (301; HTTP 200)
- `https://invetec.eu/sq/pandora-marine-4/` → `https://invetec.eu/sq/pandora-marine-al/` (301; HTTP 200)
- `https://invetec.eu/sq/pandora-moto-evo-3/` → `https://invetec.eu/sq/pandora-moto-evo-v2-al/` (301, 301; HTTP 200)
- `https://invetec.eu/sq/pandora-moto-evo-al/` → `https://invetec.eu/sq/pandora-moto-evo-v2-al/` (301; HTTP 200)
- `https://invetec.eu/sq/pandora-moto-v2-al` → `https://invetec.eu/sq/pandora-moto-v2-al/` (301; HTTP 200)
- `https://invetec.eu/sq/products-marine-accessories-pandora-gr/` → `https://invetec.eu/products-marine-accessories-pandora-gr/` (301; HTTP 200)
- `https://invetec.eu/sq/products-moto-accessories-pandora-al` → `https://invetec.eu/sq/products-moto-accessories-pandora-al/` (301; HTTP 200)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/` → `https://invetec.eu/products-car-protection-gr/` (301; HTTP 200)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85-pandora/` → `https://invetec.eu/products-car-accessories-pandora-gr/` (301; HTTP 200)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%ce%b9%ce%ba%ce%bb%ce%ad%cf%84%ce%b1%cf%82-pandora/` → `https://invetec.eu/vehicle-alarm-systems/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%ce%b9%ce%ba%ce%bb%ce%ad%cf%84%ce%b1%cf%82-pandora/` (301; HTTP 200)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` → `https://invetec.eu/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` (301; HTTP 200)
- `https://lenovo.invetec.eu/checkout/` → `https://lenovo.invetec.eu/cart/` (302; HTTP 200)

## noindex pages (29)

`<meta name="robots">` of the final page, per host (none: no tag, or the body was not read because the page did not answer 200 HTML):

| Host              | Robots meta                                                                      | URLs |
| ----------------- | -------------------------------------------------------------------------------- | ---: |
| invetec.eu        | (none)                                                                           |   27 |
| invetec.eu        | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`   | 2053 |
| invetec.eu        | `index, nofollow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` |    2 |
| invetec.eu        | `max-image-preview:large`                                                        |    7 |
| invetec.eu        | `noindex, follow`                                                                |   24 |
| invetec.eu        | `noindex, nofollow`                                                              |    2 |
| lenovo.invetec.eu | `max-image-preview:large`                                                        | 2520 |
| lenovo.invetec.eu | `max-image-preview:large, noindex, follow`                                       |    4 |

- `https://invetec.eu/%cf%80%ce%bf%ce%bb%ce%b9%cf%84%ce%b9%ce%ba%ce%ae-%ce%b5%cf%80%ce%b9%cf%83%cf%84%cf%81%ce%bf%cf%86%cf%8e%ce%bd/`: `noindex, follow` (el, other)
- `https://invetec.eu/%cf%8c%cf%81%ce%bf%ce%b9-%cf%80%cf%81%ce%bf%ce%b0%cf%80%ce%bf%ce%b8%ce%ad%cf%83%ce%b5%ce%b9%cf%82-%cf%87%cf%81%ce%ae%cf%83%ce%b7%cf%82-%ce%b9%cf%83%cf%84%ce%bf%cf%83%ce%b5%ce%bb%ce%af%ce%b4/`: `noindex, follow` (el, other)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%ce%bc%ce%bf%cf%84%ce%bf/`: `noindex, follow` (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%80%cf%81%ce%bf%cf%83%cf%84%ce%b1%cf%83%ce%af%ce%b1-%cf%86%ce%bf%cf%81%cf%84%ce%b7%ce%b3%ce%bf%cf%8d/`: `noindex, follow` (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%83%ce%ba%ce%ac%cf%86%ce%bf%cf%82/`: `noindex, follow` (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%83%cf%84%cf%8c%ce%bb%ce%bf%cf%82/`: `noindex, follow` (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf/`: `noindex, follow` (el, category)
- `https://invetec.eu/en/about-us-en/`: `noindex, follow` (en, other)
- `https://invetec.eu/en/category/protection-en/`: `noindex, follow` (en, category)
- `https://invetec.eu/en/category/protection-en/camper-protection/`: `noindex, follow` (en, category)
- `https://invetec.eu/en/category/protection-en/gps-trackers-eng/`: `noindex, follow` (en, category)
- `https://invetec.eu/en/category/protection-en/marine-protection/`: `noindex, follow` (en, category)
- `https://invetec.eu/en/category/protection-en/moto-protection-en/`: `noindex, follow` (en, category)
- `https://invetec.eu/en/fortin-evo-all-chr5-2/`: `noindex, follow` (en, other)
- `https://invetec.eu/en/fortin-evo-all-vw1-2/`: `noindex, follow` (en, other)
- `https://invetec.eu/en/fortin-evoall-toy13/`: `noindex, follow` (en, other)
- `https://invetec.eu/en/fortin-evoall-vw3/`: `noindex, follow` (en, other)
- `https://invetec.eu/en/privacy-policy/`: `noindex, nofollow` (en, other)
- `https://invetec.eu/fortin-evo-all-uni/`: `noindex, follow` (el, other)
- `https://invetec.eu/it/category/prodotti/della-moto/`: `noindex, follow` (it, category)
- `https://invetec.eu/it/category/prodotti/localizzatori-gps/`: `noindex, follow` (it, category)
- `https://invetec.eu/it/category/prodotti/protezione-camper/`: `noindex, follow` (it, category)
- `https://invetec.eu/it/informazioni-su-invetec/`: `noindex, follow` (it, other)
- `https://invetec.eu/sq/category/produkte/`: `noindex, follow` (sq, category)
- `https://invetec.eu/sq/category/produkte/makines/`: `noindex, follow` (sq, category)
- `https://invetec.eu/sq/politika-e-privatesise/`: `noindex, nofollow` (sq, other)
- `https://lenovo.invetec.eu/cart/`: `max-image-preview:large, noindex, follow` (en, shop-system)
- `https://lenovo.invetec.eu/my-account/`: `max-image-preview:large, noindex, follow` (en, shop-system)
- `https://lenovo.invetec.eu/my-account/lost-password/`: `max-image-preview:large, noindex, follow` (en, other)

### URLs that redirect to a noindex page (1)

- `https://lenovo.invetec.eu/checkout/` → `https://lenovo.invetec.eu/cart/`: `max-image-preview:large, noindex, follow`

## hreflang coverage of Greek pages

Greek pages: invetec.eu URLs with `lang` `el` that answered 200 without a redirect. A sibling is an `hreflang` link of the page to another language (`x-default` is not counted).

| Page type   | Greek pages |  en |  it |  sq | All three | None |
| ----------- | ----------: | --: | --: | --: | --------: | ---: |
| home        |           1 |   1 |   1 |   1 |         1 |    0 |
| page        |          47 |  32 |  32 |  26 |        25 |   12 |
| post        |         227 |  65 |  54 |  22 |        18 |  159 |
| category    |          21 |  13 |  10 |  10 |         9 |    8 |
| tag         |         401 | 101 |  56 |  17 |         7 |  260 |
| author      |           6 |   3 |   3 |   3 |         3 |    3 |
| shop-system |           4 |   0 |   0 |   0 |         0 |    4 |
| other       |          12 |  10 |   6 |   4 |         1 |    1 |
| all         |         719 | 225 | 162 |  83 |        64 |  447 |

## Orphans found by the link hop

Same-host page links on sitemap pages that no sitemap lists, each fetched once (`source: "link"`; their own links were not followed). Page links are counted once per page that has them; skipped links are counted, not listed.

| Host              | Pages scanned | Page links | Link-only URLs | Skipped: asset | query | other host | other | robots |
| ----------------- | ------------: | ---------: | -------------: | -------------: | ----: | ---------: | ----: | -----: |
| invetec.eu        |          1914 |      88952 |            201 |            235 |     0 |      12434 |    46 |      0 |
| lenovo.invetec.eu |          2232 |       5777 |            292 |           3633 |  1564 |      44203 |     0 |      0 |

### invetec.eu (201)

- `https://invetec.eu/%CE%B5%CF%80%CE%B9%CE%BA%CE%BF%CE%B9%CE%BD%CF%89%CE%BD%CE%AF%CE%B1`: HTTP 200 → `https://invetec.eu/%CE%B5%CF%80%CE%B9%CE%BA%CE%BF%CE%B9%CE%BD%CF%89%CE%BD%CE%AF%CE%B1/` (el, other)
- `https://invetec.eu/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/`: HTTP 200 → `https://invetec.eu/vehicle-alarm-systems/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/` (el, other)
- `https://invetec.eu/%ce%b3%ce%b9%ce%b1-%cf%84%ce%bf-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/`: HTTP 200 → `https://invetec.eu/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` (el, other)
- `https://invetec.eu/%ce%b5%cf%86%cf%8c%cf%81%ce%bf%cf%85-%ce%b6%cf%89%ce%ae%cf%82-%ce%b5%ce%b3%ce%b3%cf%8d%ce%b7%cf%83%ce%b7-%cf%83%ce%b5-%cf%8c%ce%bb%ce%b1-%cf%84%ce%b1-%cf%83%cf%85%cf%83%cf%84%ce%ae%ce%bc%ce%b1%cf%84/giati-oi-pistopoiiseis-einai-aparaitites-stin-aftokinitoviomixania.html`: HTTP 404 (el, other)
- `https://invetec.eu/%ce%b7-pandora-%ce%b1%ce%bd%ce%b1%ce%b2%ce%b1%ce%b8%ce%bc%ce%af%ce%b6%ce%b5%ce%b9-%cf%84%ce%bf-%cf%84racking-%ce%b1%cf%80%cf%8c-gps-%cf%83%ce%b5-gnss/`: HTTP 200 → `https://invetec.eu/%ce%b7-pandora-%ce%b1%ce%bd%ce%b1%ce%b2%ce%b1%ce%b8%ce%bc%ce%af%ce%b6%ce%b5%ce%b9-%cf%84%ce%bf%ce%bd-%ce%b5%ce%bd%cf%84%ce%bf%cf%80%ce%b9%cf%83%ce%bc%cf%8c%cf%82-%cf%83%ce%b5-gnss/` (el, other)
- `https://invetec.eu/%cf%80%ce%bf%ce%bb%ce%b9%cf%84%ce%b9%ce%ba%ce%ae-%ce%b5%cf%80%ce%b9%cf%83%cf%84%cf%81%ce%bf%cf%86%cf%8e%ce%bd/`: HTTP 200 (el, other)
- `https://invetec.eu/%cf%8c%cf%81%ce%bf%ce%b9-%cf%80%cf%81%ce%bf%ce%b0%cf%80%ce%bf%ce%b8%ce%ad%cf%83%ce%b5%ce%b9%cf%82-%cf%87%cf%81%ce%ae%cf%83%ce%b7%cf%82-%ce%b9%cf%83%cf%84%ce%bf%cf%83%ce%b5%ce%bb%ce%af%ce%b4/`: HTTP 200 (el, other)
- `https://invetec.eu/about-us-gr`: HTTP 200 → `https://invetec.eu/about-us-gr/` (el, other)
- `https://invetec.eu/al/pandora-camper-pro-v2-al/`: HTTP 200 → `https://invetec.eu/sq/pandora-camper-pro-v2-al/` (sq, other)
- `https://invetec.eu/al/pandora-camper-v3-al/`: HTTP 200 → `https://invetec.eu/sq/pandora-camper-v3-al/` (sq, other)
- `https://invetec.eu/alarm/eco2move`: HTTP 200 → `https://invetec.eu/eco2move/` (el, other)
- `https://invetec.eu/author/admin_496dsjcf/page/2/`: HTTP 200 (el, author)
- `https://invetec.eu/author/invetec/page/2/`: HTTP 200 (el, author)
- `https://invetec.eu/author/italianmafia/page/2/`: HTTP 200 (el, author)
- `https://invetec.eu/b2b/`: HTTP 200 (en, other)
- `https://invetec.eu/b2b/el/%cf%83%ce%b7%ce%bc%ce%b1%ce%bd%cf%84%ce%b9%ce%ba%ce%ae-%ce%b5%ce%bd%ce%b7%ce%bc%ce%ad%cf%81%cf%89%cf%83%ce%b7-%ce%bb%ce%bf%ce%b3%ce%b9%cf%83%ce%bc%ce%b9%ce%ba%ce%bf%cf%8d-%ce%b3%ce%b9%ce%b1-%cf%84/`: HTTP 200 (el, other)
- `https://invetec.eu/b2b/el/%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%cf%8c%cf%82-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%cf%8c%cf%82-%ce%bc-2/`: HTTP 200 (el, other)
- `https://invetec.eu/b2b/el/keetec-manuals-2/`: HTTP 200 (el, other)
- `https://invetec.eu/b2b/el/pandora-tools-manuals/`: HTTP 200 (el, other)
- `https://invetec.eu/b2b/it/auto-moto-allarme-invetec/`: HTTP 200 (it, other)
- `https://invetec.eu/b2b/it/pandora-specialist-it/`: HTTP 200 (it, other)
- `https://invetec.eu/b2b/pandora-tools-manuals-2/`: HTTP 404 (el, other)
- `https://invetec.eu/boat-and-fishing-show-2023/`: HTTP 404 (el, other)
- `https://invetec.eu/category/%ce%bd%ce%ad%ce%b1/page/2/`: HTTP 200 (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%ce%bc%ce%bf%cf%84%ce%bf/`: HTTP 200 (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%80%cf%81%ce%bf%cf%83%cf%84%ce%b1%cf%83%ce%af%ce%b1-%cf%86%ce%bf%cf%81%cf%84%ce%b7%ce%b3%ce%bf%cf%8d/`: HTTP 200 (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%83%ce%ba%ce%ac%cf%86%ce%bf%cf%82/`: HTTP 200 (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%83%cf%84%cf%8c%ce%bb%ce%bf%cf%82/`: HTTP 200 (el, category)
- `https://invetec.eu/category/%cf%80%cf%81%ce%bf%cf%8a%cf%8c%ce%bd%cf%84%ce%b1/%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf/`: HTTP 200 (el, category)
- `https://invetec.eu/category/remote-start-gr-fortin/remote-start-all-gr/page/2/`: HTTP 200 (el, category)
- `https://invetec.eu/category/tech-gr/page/2/`: HTTP 200 (el, category)
- `https://invetec.eu/contact/`: HTTP 200 → `https://invetec.eu/en/contact/` (en, other)
- `https://invetec.eu/contatta/`: HTTP 200 → `https://invetec.eu/it/contatta/` (it, other)
- `https://invetec.eu/el/%CF%8C%CF%81%CE%BF%CE%B9-%CF%87%CF%81%CE%AE%CF%83%CE%B7%CF%82/`: HTTP 404 (el, other)
- `https://invetec.eu/en/about-us-al/`: HTTP 200 → `https://invetec.eu/sq/about-us-al/` (sq, other)
- `https://invetec.eu/en/about-us-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/advanced-marine-security-system-invetec-pandora-europe-engineers-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/author/admin_496dsjcf/`: HTTP 200 (en, author)
- `https://invetec.eu/en/author/invetec/`: HTTP 200 (en, author)
- `https://invetec.eu/en/author/italianmafia/`: HTTP 200 (en, author)
- `https://invetec.eu/en/canbus-cruise-control-en/`: HTTP 200 → `https://invetec.eu/en/lindgaard-pedersen-canbus-cruise-control-en/` (en, other)
- `https://invetec.eu/en/category/news/page/2/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/protection-en/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/protection-en/camper-protection/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/protection-en/gps-trackers-eng/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/protection-en/marine-protection/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/protection-en/moto-protection-en/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/remote-start-en-fortin/page/2/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/remote-start-en-fortin/remote-start-all-en/page/2/`: HTTP 200 (en, category)
- `https://invetec.eu/en/category/technologies/page/2/`: HTTP 200 (en, category)
- `https://invetec.eu/en/discovering-the-advantages-of-can-fd-technology-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/fortin-evo-all-chr5-2/`: HTTP 200 (en, other)
- `https://invetec.eu/en/fortin-evo-all-vw1-2/`: HTTP 200 (en, other)
- `https://invetec.eu/en/fortin-evoall-toy13/`: HTTP 200 (en, other)
- `https://invetec.eu/en/fortin-evoall-vw3/`: HTTP 200 (en, other)
- `https://invetec.eu/en/g-net-cwc-dashdam-lte-stick-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/g-net-d-force-s1-dashcam-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/g-net-d-force-s1-truck-dashcam-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/home-page/`: HTTP 404 (en, other)
- `https://invetec.eu/en/home-page/camper-protection/`: HTTP 200 → `https://invetec.eu/en/homepage-en/camper-protection/` (en, other)
- `https://invetec.eu/en/home-page/camper-protection/camper-accessories/`: HTTP 404 (en, other)
- `https://invetec.eu/en/invetec-pandora-vehicle-antitheft-security-koinonia-ora-mega-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/keetec-blade-en`: HTTP 200 → `https://invetec.eu/en/keetec-blade-en/` (en, other)
- `https://invetec.eu/en/large-scale-update-for-pandora-systems-3/`: HTTP 200 → `https://invetec.eu/it/aggiornamento-estensivo-per-i-sistemi-pandora/` (it, other)
- `https://invetec.eu/en/map-en`: HTTP 404 (en, other)
- `https://invetec.eu/en/pandora-camper-v3-gr/`: HTTP 200 → `https://invetec.eu/pandora-camper-v3-gr/` (el, other)
- `https://invetec.eu/en/pandora-camper-v3-it/`: HTTP 200 → `https://invetec.eu/it/pandora-camper-v3-it/` (it, other)
- `https://invetec.eu/en/pandora-car-alarms/`: HTTP 404 (en, other)
- `https://invetec.eu/en/pandora-elite-v3-al/`: HTTP 200 → `https://invetec.eu/sq/pandora-elite-v3-al/` (sq, other)
- `https://invetec.eu/en/pandora-elite-v3-gr/`: HTTP 200 → `https://invetec.eu/pandora-elite-v3-gr/` (el, other)
- `https://invetec.eu/en/pandora-finder-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-light-pro-v2-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-light-v3-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-marine-3/`: HTTP 200 → `https://invetec.eu/en/pandora-marine-en/` (en, other)
- `https://invetec.eu/en/pandora-marine-en-2/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-moto-ecomode//`: HTTP 200 → `https://invetec.eu/en/pandora-moto-ecomode/` (en, other)
- `https://invetec.eu/en/pandora-moto-eu-4/`: HTTP 200 → `https://invetec.eu/en/pandora-moto-evo-v2-en/` (en, other)
- `https://invetec.eu/en/pandora-moto-evo-2/`: HTTP 200 → `https://invetec.eu/en/pandora-moto-evo-v2-en/` (en, other)
- `https://invetec.eu/en/pandora-moto-evo-upgrade-first-can-bus-motorcycle-alarm-system-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-moto-evo-v2-gr/`: HTTP 200 → `https://invetec.eu/pandora-moto-evo-v2-gr/` (el, other)
- `https://invetec.eu/en/pandora-moto-v2-en`: HTTP 200 → `https://invetec.eu/en/pandora-moto-v2-en/` (en, other)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-al`: HTTP 200 → `https://invetec.eu/sq/pandora-smart-pro-v4-fd-al/` (sq, other)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-can-bus-fd-technology-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-en`: HTTP 200 → `https://invetec.eu/en/pandora-smart-pro-v4-fd-en/` (en, other)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-gr`: HTTP 200 → `https://invetec.eu/pandora-smart-pro-v4-fd-gr/` (el, other)
- `https://invetec.eu/en/pandora-smart-pro-v4-fd-it`: HTTP 200 → `https://invetec.eu/it/pandora-smart-pro-v4-fd-it/` (it, other)
- `https://invetec.eu/en/pandora-systems-comparison-table-en/`: HTTP 200 (en, other)
- `https://invetec.eu/en/pandora-tracer-6/`: HTTP 404 (en, other)
- `https://invetec.eu/en/pandora-truck-4/`: HTTP 404 (en, other)
- `https://invetec.eu/en/privacy-policy/`: HTTP 200 (en, other)
- `https://invetec.eu/en/products-camper-accessories-pandora-gr/`: HTTP 200 → `https://invetec.eu/products-camper-accessories-pandora-gr/` (el, other)
- `https://invetec.eu/en/products-camper-accessories-pandora-it/`: HTTP 200 → `https://invetec.eu/it/products-camper-accessories-pandora-it/` (it, other)
- `https://invetec.eu/en/products-camper-protection-al/`: HTTP 200 → `https://invetec.eu/sq/products-camper-protection-al/` (sq, other)
- `https://invetec.eu/en/products-camper-protection-gr/`: HTTP 200 → `https://invetec.eu/products-camper-protection-gr/` (el, other)
- `https://invetec.eu/en/products-car-protection-al/`: HTTP 200 → `https://invetec.eu/sq/products-car-protection-al/` (sq, other)
- `https://invetec.eu/en/products-car-protection-gr/`: HTTP 200 → `https://invetec.eu/products-car-protection-gr/` (el, other)
- `https://invetec.eu/en/products-fleet-protection-al/`: HTTP 200 → `https://invetec.eu/sq/products-fleet-protection-al/` (sq, other)
- `https://invetec.eu/en/products-fleet-protection-gr/`: HTTP 200 → `https://invetec.eu/products-fleet-protection-gr/` (el, other)
- `https://invetec.eu/en/products-marine-accessories-pandora-al/`: HTTP 200 → `https://invetec.eu/sq/products-marine-accessories-pandora-al/` (sq, other)
- `https://invetec.eu/en/products-marine-accessories-pandora-it/`: HTTP 200 → `https://invetec.eu/it/products-marine-accessories-pandora-it/` (it, other)
- `https://invetec.eu/en/products-marine-protection-al/`: HTTP 200 → `https://invetec.eu/sq/products-marine-protection-al/` (sq, other)
- `https://invetec.eu/en/products-marine-protection-gr/`: HTTP 200 → `https://invetec.eu/products-marine-protection-gr/` (el, other)
- `https://invetec.eu/en/products-moto-accessories-pandora-it/`: HTTP 200 → `https://invetec.eu/it/products-moto-accessories-pandora-it/` (it, other)
- `https://invetec.eu/en/products-moto-protection-al/`: HTTP 200 → `https://invetec.eu/sq/products-moto-protection-al/` (sq, other)
- `https://invetec.eu/en/products-moto-protection-gr/`: HTTP 200 → `https://invetec.eu/products-moto-protection-gr/` (el, other)
- `https://invetec.eu/en/refund-policy`: HTTP 200 → `https://invetec.eu/en/refund-policy/` (en, other)
- `https://invetec.eu/en/tag/vehicle-security/page/2/`: HTTP 200 (en, tag)
- `https://invetec.eu/en/terms-conditions`: HTTP 200 → `https://invetec.eu/en/terms-conditions-and-privacy/` (en, other)
- `https://invetec.eu/fortin-evo-all-uni/`: HTTP 200 (el, other)
- `https://invetec.eu/g-net-d-force-2c-dashcam-gr/`: HTTP 200 (el, other)
- `https://invetec.eu/g-net-d-force-s1-truck-dashcam-gr/`: HTTP 200 (el, other)
- `https://invetec.eu/g-net-g-onq-gr-2/`: HTTP 200 (el, other)
- `https://invetec.eu/gnet-mvr-g1-pro-dashcam-gr/`: HTTP 200 (el, other)
- `https://invetec.eu/introducing-the-new-flagship-keyfob-pandora-commander-2/`: HTTP 200 → `https://invetec.eu/en/introducing-the-new-flagship-keyfob-pandora-commander-2/` (en, other)
- `https://invetec.eu/introducing-the-new-flagship-keyfob-pandora-commander-3/`: HTTP 200 → `https://invetec.eu/it/introducing-the-new-flagship-keyfob-pandora-commander-3/` (it, other)
- `https://invetec.eu/it/`: HTTP 200 → `https://invetec.eu/it/homepage-it/` (it, home)
- `https://invetec.eu/it/about-us-it`: HTTP 200 → `https://invetec.eu/it/about-us-it/` (it, other)
- `https://invetec.eu/it/allarmi-per-auto-pandora/`: HTTP 404 (it, other)
- `https://invetec.eu/it/author/admin_496dsjcf/`: HTTP 200 (it, author)
- `https://invetec.eu/it/author/invetec/`: HTTP 200 (it, author)
- `https://invetec.eu/it/author/italianmafia/`: HTTP 200 (it, author)
- `https://invetec.eu/it/auto/`: HTTP 404 → `https://invetec.eu/it/allarmi-per-auto-pandora/` (it, other)
- `https://invetec.eu/it/camper`: HTTP 200 → `https://invetec.eu/en/camper-3/` (en, other)
- `https://invetec.eu/it/camper-accessories/`: HTTP 200 → `https://invetec.eu/en/homepage-en/camper-protection/camper-accessories/` (en, other)
- `https://invetec.eu/it/category/notizie-it/page/2/`: HTTP 200 (it, category)
- `https://invetec.eu/it/category/prodotti/della-moto/`: HTTP 200 (it, category)
- `https://invetec.eu/it/category/prodotti/localizzatori-gps/`: HTTP 200 (it, category)
- `https://invetec.eu/it/category/prodotti/protezione-camper/`: HTTP 200 (it, category)
- `https://invetec.eu/it/category/remote-start-it-fortin/page/2/`: HTTP 200 (it, category)
- `https://invetec.eu/it/category/tecnologie/page/2/`: HTTP 200 (it, category)
- `https://invetec.eu/it/informazioni-su-invetec/`: HTTP 200 (it, other)
- `https://invetec.eu/it/infotainment-camperplay-android-camper-it/`: HTTP 404 (it, other)
- `https://invetec.eu/it/infotainment-carplay-android-auto-universal/`: HTTP 200 → `https://invetec.eu/it/infotainment-car-carplay-android-auto-universal-it/` (it, other)
- `https://invetec.eu/it/marine/`: HTTP 200 → `https://invetec.eu/marine-exterior-sound-system/` (el, other)
- `https://invetec.eu/it/moto/`: HTTP 200 → `https://invetec.eu/it/motodays-2025-pandora-it/` (it, other)
- `https://invetec.eu/it/notizia/`: HTTP 200 → `https://invetec.eu/it/notizia-2/` (it, other)
- `https://invetec.eu/it/pandora-elite-2/`: HTTP 404 (it, other)
- `https://invetec.eu/it/pandora-finder-3/`: HTTP 200 → `https://invetec.eu/en/pandora-finder-3/` (en, other)
- `https://invetec.eu/it/pandora-marine-2/`: HTTP 200 → `https://invetec.eu/it/pandora-marine-it/` (it, other)
- `https://invetec.eu/it/pandora-moto-eu-3/`: HTTP 200 → `https://invetec.eu/it/pandora-moto-evo-v2-it/` (it, other)
- `https://invetec.eu/it/pandora-moto-evo/`: HTTP 200 → `https://invetec.eu/it/pandora-moto-evo-v2-it/` (it, other)
- `https://invetec.eu/it/pandora-moto-v2-it`: HTTP 200 → `https://invetec.eu/it/pandora-moto-v2-it/` (it, other)
- `https://invetec.eu/it/pandora-smart-pro-v4-fd-en/`: HTTP 200 → `https://invetec.eu/en/pandora-smart-pro-v4-fd-en/` (en, other)
- `https://invetec.eu/it/pandora-smart-pro-v4-fd-gr/`: HTTP 200 → `https://invetec.eu/pandora-smart-pro-v4-fd-gr/` (el, other)
- `https://invetec.eu/it/pandora-tracer-7/`: HTTP 404 (it, other)
- `https://invetec.eu/it/pandora-truck-3/`: HTTP 404 (it, other)
- `https://invetec.eu/it/per-il-camion/`: HTTP 404 (it, other)
- `https://invetec.eu/it/products-camper-protection-gr/`: HTTP 200 → `https://invetec.eu/products-camper-protection-gr/` (el, other)
- `https://invetec.eu/it/products-car-accessories-pandora-al/`: HTTP 200 → `https://invetec.eu/sq/products-car-accessories-pandora-al/` (sq, other)
- `https://invetec.eu/it/products-fleet-protection-gr/`: HTTP 200 → `https://invetec.eu/products-fleet-protection-gr/` (el, other)
- `https://invetec.eu/it/products-marine-protection-gr/`: HTTP 200 → `https://invetec.eu/products-marine-protection-gr/` (el, other)
- `https://invetec.eu/it/products-moto-accessories-pandora-gr/`: HTTP 200 → `https://invetec.eu/products-moto-accessories-pandora-gr/` (el, other)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-gr/`: HTTP 404 → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-gr/` (it, other)
- `https://invetec.eu/it/products-moto-protection-it/https://invetec.eu/it/products-moto-protection-it/`: HTTP 404 → `https://invetec.eu/it/products-moto-protection-it/https:/invetec.eu/it/products-moto-protection-it/` (it, other)
- `https://invetec.eu/it/tag/invetec-it/page/2/`: HTTP 200 (it, tag)
- `https://invetec.eu/it/tag/pandora-it/page/2/`: HTTP 200 (it, tag)
- `https://invetec.eu/it/truck/`: HTTP 404 (it, other)
- `https://invetec.eu/it/vehicle-fleet/`: HTTP 404 (it, other)
- `https://invetec.eu/it/warranty-activation-infotainment-it`: HTTP 200 → `https://invetec.eu/it/warranty-activation-infotainment-it/` (it, other)
- `https://invetec.eu/large-scale-update-for-pandora-systems-2/`: HTTP 200 → `https://invetec.eu/en/large-scale-update-for-pandora-systems-2/` (en, other)
- `https://invetec.eu/large-scale-update-for-pandora-systems-3/`: HTTP 200 → `https://invetec.eu/it/aggiornamento-estensivo-per-i-sistemi-pandora/` (it, other)
- `https://invetec.eu/lindgaard-pedersen-canbus-cruise-control-en/`: HTTP 200 → `https://invetec.eu/en/lindgaard-pedersen-canbus-cruise-control-en/` (en, other)
- `https://invetec.eu/major-software-update-for-modern-pandora-systems-2//`: HTTP 200 → `https://invetec.eu/major-software-update-for-modern-pandora-systems-2/` (el, other)
- `https://invetec.eu/new-tester-pandora-alt-307-2/`: HTTP 200 → `https://invetec.eu/en/new-tester-pandora-alt-307-2/` (en, other)
- `https://invetec.eu/new-tester-pandora-alt-307-3/`: HTTP 200 → `https://invetec.eu/it/new-tester-pandora-alt-307-3/` (it, other)
- `https://invetec.eu/pandora-camper-pro-v2-en`: HTTP 200 → `https://invetec.eu/en/pandora-camper-pro-v2-en/` (en, other)
- `https://invetec.eu/pandora-camper-pro-v2-gr`: HTTP 200 → `https://invetec.eu/pandora-camper-pro-v2-gr/` (el, other)
- `https://invetec.eu/pandora-camper-pro-v2-it`: HTTP 200 → `https://invetec.eu/it/pandora-camper-pro-v2-it/` (it, other)
- `https://invetec.eu/pandora-camper-v3-it`: HTTP 200 → `https://invetec.eu/it/pandora-camper-v3-it/` (it, other)
- `https://invetec.eu/pandora-elite/`: HTTP 200 → `https://invetec.eu/sq/pandora-elite-v3-al/` (sq, other)
- `https://invetec.eu/pandora-marine/`: HTTP 200 → `https://invetec.eu/pandora-marine-gr/` (el, other)
- `https://invetec.eu/pandora-moto-eu-2/`: HTTP 200 → `https://invetec.eu/pandora-moto-evo-v2-gr/` (el, other)
- `https://invetec.eu/pandora-moto-evo-2/`: HTTP 404 (el, other)
- `https://invetec.eu/pandora-moto-v2-gr`: HTTP 200 → `https://invetec.eu/pandora-moto-v2-gr/` (el, other)
- `https://invetec.eu/pandora-smart-moto-evo/`: HTTP 200 → `https://invetec.eu/pandora-moto-evo-v2-gr/` (el, other)
- `https://invetec.eu/pandora-smart-v4-it/`: HTTP 200 → `https://invetec.eu/it/pandora-smart-v4-it/` (it, other)
- `https://invetec.eu/pandora-systems-comparison-table-gr/`: HTTP 200 (el, other)
- `https://invetec.eu/pandora-tracer-4/`: HTTP 404 (el, other)
- `https://invetec.eu/sq/alarmet-e-makinave-pandora/`: HTTP 404 (sq, other)
- `https://invetec.eu/sq/author/admin_496dsjcf/`: HTTP 200 (sq, author)
- `https://invetec.eu/sq/author/invetec/`: HTTP 200 (sq, author)
- `https://invetec.eu/sq/author/italianmafia/`: HTTP 200 (sq, author)
- `https://invetec.eu/sq/category/produkte/`: HTTP 200 (sq, category)
- `https://invetec.eu/sq/category/produkte/makines/`: HTTP 200 (sq, category)
- `https://invetec.eu/sq/gnet-mvr-g1-pro-dashcam-al/`: HTTP 200 (sq, other)
- `https://invetec.eu/sq/mbrojtje-per-kamionin/`: HTTP 404 (sq, other)
- `https://invetec.eu/sq/pandora-marine-4/`: HTTP 200 → `https://invetec.eu/sq/pandora-marine-al/` (sq, other)
- `https://invetec.eu/sq/pandora-moto-evo-3/`: HTTP 200 → `https://invetec.eu/sq/pandora-moto-evo-v2-al/` (sq, other)
- `https://invetec.eu/sq/pandora-moto-v2-al`: HTTP 200 → `https://invetec.eu/sq/pandora-moto-v2-al/` (sq, other)
- `https://invetec.eu/sq/pandora-truck-5/`: HTTP 404 (sq, other)
- `https://invetec.eu/sq/politika-e-privatesise/`: HTTP 200 (sq, other)
- `https://invetec.eu/sq/products-marine-accessories-pandora-gr/`: HTTP 200 → `https://invetec.eu/products-marine-accessories-pandora-gr/` (el, other)
- `https://invetec.eu/sq/products-moto-accessories-pandora-al`: HTTP 200 → `https://invetec.eu/sq/products-moto-accessories-pandora-al/` (sq, other)
- `https://invetec.eu/tag/%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%cf%8c%cf%82-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/page/2/`: HTTP 200 (el, tag)
- `https://invetec.eu/tag/alarm-system/page/2/`: HTTP 200 (el, tag)
- `https://invetec.eu/tag/gps/page/2/`: HTTP 200 (el, tag)
- `https://invetec.eu/tag/invetec/page/2/`: HTTP 200 (el, tag)
- `https://invetec.eu/tag/pandora/page/2/`: HTTP 200 (el, tag)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%ce%b9%ce%ba%ce%bb%ce%ad%cf%84%ce%b1%cf%82-pandora/`: HTTP 200 → `https://invetec.eu/vehicle-alarm-systems/%ce%b3%ce%b9%ce%b1-%cf%84%ce%b7-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%cf%85%ce%ba%ce%bb%ce%ad%cf%84%ce%b1/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%ce%bc%ce%bf%cf%84%ce%bf%cf%83%ce%b9%ce%ba%ce%bb%ce%ad%cf%84%ce%b1%cf%82-pandora/` (el, other)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/`: HTTP 200 → `https://invetec.eu/%ce%b1%ce%be%ce%b5%cf%83%ce%bf%cf%85%ce%ac%cf%81-%cf%84%cf%81%ce%bf%cf%87%cf%8c%cf%83%cf%80%ce%b9%cf%84%ce%bf%cf%85-pandora/` (el, other)
- `https://invetec.eu/top-%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85/%cf%83%cf%85%ce%bd%ce%b1%ce%b3%ce%b5%cf%81%ce%bc%ce%bf%ce%af-%ce%b1%cf%85%cf%84%ce%bf%ce%ba%ce%b9%ce%bd%ce%ae%cf%84%ce%bf%cf%85-pandora/`: HTTP 404 (el, other)

### lenovo.invetec.eu (292)

- `https://lenovo.invetec.eu/my-account/lost-password/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/product-category/multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/oem-2-dinmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/oem-2-dinmultimedia/mitsubishi-oem-2-dinmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/oem-2-dinmultimedia/mitsubishi-oem-2-dinmultimedia/colt-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/oem-2-dinmultimedia/mitsubishi-oem-2-dinmultimedia/colt-mod-2004-2008multimedia/oem-colt-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/2-dinmultimedia/oem-2-dinmultimedia/mitsubishi-oem-2-dinmultimedia/colt-mod-2004-2008multimedia/oem-colt-mod-2004-2008multimedia/ford-oem-colt-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/oem-159-mod-2004-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/oem-159-mod-2004-2011multimedia/alfa-romeo-oem-159-mod-2004-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/oem-159-mod-2004-2011multimedia/alfa-romeo-oem-159-mod-2004-2011multimedia/brera-mod-2005-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/oem-159-mod-2004-2011multimedia/alfa-romeo-oem-159-mod-2004-2011multimedia/brera-mod-2005-2010multimedia/oem-brera-mod-2005-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeo/159-mod-2004-2011multimedia/oem-159-mod-2004-2011multimedia/alfa-romeo-oem-159-mod-2004-2011multimedia/brera-mod-2005-2010multimedia/oem-brera-mod-2005-2010multimedia/alfa-romeo-oem-brera-mod-2005-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/oem-alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/oem-alfa-romeomultimedia/mercedes-oem-alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/oem-alfa-romeomultimedia/mercedes-oem-alfa-romeomultimedia/cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/oem-alfa-romeomultimedia/mercedes-oem-alfa-romeomultimedia/cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/oem-cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/alfa-romeomultimedia/oem-alfa-romeomultimedia/mercedes-oem-alfa-romeomultimedia/cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/oem-cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/mercedes-oem-cls-w219-mod-2003-2010multimedia-mercedes-oem-alfa-romeomultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/audi/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/audi/a4-mod-2002-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/audi/a4-mod-2002-2008multimedia/oem-a4-mod-2002-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/audi/a4-mod-2002-2008multimedia/oem-a4-mod-2002-2008multimedia/seat-oem-a4-mod-2002-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/series-5-e39-mod-1997-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/series-5-e39-mod-1997-2005multimedia/oem-series-5-e39-mod-1997-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/series-5-e39-mod-1997-2005multimedia/oem-series-5-e39-mod-1997-2005multimedia/bmw-oem-series-5-e39-mod-1997-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/x5-e70-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/x5-e70-mod-2006-2013multimedia/oem-x5-e70-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/bmw/x5-e70-mod-2006-2013multimedia/oem-x5-e70-mod-2006-2013multimedia/bmw-oem-x5-e70-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/chevrolet/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/chrysler/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/citroen/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/citroen/berlingo-mod-2008-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/citroen/berlingo-mod-2008-2019multimedia/oem-berlingo-mod-2008-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/citroen/berlingo-mod-2008-2019multimedia/oem-berlingo-mod-2008-2019multimedia/peugeot-oem-berlingo-mod-2008-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/dacia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/daihatsu/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/dodge/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/fullback-mod-2016/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/fullback-mod-2016/multimedia-fullback-mod-2016/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/fullback-mod-2016/multimedia-fullback-mod-2016/oem-multimedia-fullback-mod-2016/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/fullback-mod-2016/multimedia-fullback-mod-2016/oem-multimedia-fullback-mod-2016/mitsubishi-oem-multimedia-fullback-mod-2016/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/sedici-mod-2005/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/sedici-mod-2005/multimedia-sedici-mod-2005/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/sedici-mod-2005/multimedia-sedici-mod-2005/oem-multimedia-sedici-mod-2005/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/fiat/sedici-mod-2005/multimedia-sedici-mod-2005/oem-multimedia-sedici-mod-2005/suzuki-oem-multimedia-sedici-mod-2005/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/c-max-mod-2011/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/c-max-mod-2011/multimedia-c-max-mod-2011/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/c-max-mod-2011/multimedia-c-max-mod-2011/oem-multimedia-c-max-mod-2011/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/c-max-mod-2011/multimedia-c-max-mod-2011/oem-multimedia-c-max-mod-2011/ford-oem-multimedia-c-max-mod-2011/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/edge-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/edge-mod-2015/multimedia-edge-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/edge-mod-2015/multimedia-edge-mod-2015/oem-multimedia-edge-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/edge-mod-2015/multimedia-edge-mod-2015/oem-multimedia-edge-mod-2015/ford-oem-multimedia-edge-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2004-2008multimedia/oem-focus-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2004-2008multimedia/oem-focus-mod-2004-2008multimedia/ford-oem-focus-mod-2004-2008multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2011-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2011-2015multimedia/oem-focus-mod-2011-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ford-oem-multimedia/focus-mod-2011-2015multimedia/oem-focus-mod-2011-2015multimedia/ford-oem-focus-mod-2011-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/honda/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hummer/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hyundai/page/2/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hyundai/page/3/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hyundai/page/4/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hyundai/page/5/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/hyundai/page/6/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/isuzu/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/iveco/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/jeep/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/jeep/compass-mod-2006-2016multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/jeep/compass-mod-2006-2016multimedia/oem-compass-mod-2006-2016multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/jeep/compass-mod-2006-2016multimedia/oem-compass-mod-2006-2016multimedia/jeep-oem-compass-mod-2006-2016multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/kia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/land-rover/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/land-rover/discovery-3-mod-2004-2009multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/land-rover/discovery-3-mod-2004-2009multimedia/oem-discovery-3-mod-2004-2009multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/land-rover/discovery-3-mod-2004-2009multimedia/oem-discovery-3-mod-2004-2009multimedia/land-rover-oem-discovery-3-mod-2004-2009multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/lexus/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-6-mod-2002-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-6-mod-2002-2005multimedia/oem-mazda-6-mod-2002-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-6-mod-2002-2005multimedia/oem-mazda-6-mod-2002-2005multimedia/mazda-oem-mazda-6-mod-2002-2005multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-bt-50-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-bt-50-mod-2006-2011multimedia/oem-mazda-bt-50-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mazda/mazda-bt-50-mod-2006-2011multimedia/oem-mazda-bt-50-mod-2006-2011multimedia/ford-oem-mazda-bt-50-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/c-w203-mod-1999-2004multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/c-w203-mod-1999-2004multimedia/oem-c-w203-mod-1999-2004multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/c-w203-mod-1999-2004multimedia/oem-c-w203-mod-1999-2004multimedia/mercedes-oem-c-w203-mod-1999-2004multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/cls-w219-mod-2003-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/cls-w219-mod-2003-2010multimedia/oem-cls-w219-mod-2003-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/cls-w219-mod-2003-2010multimedia/oem-cls-w219-mod-2003-2010multimedia/mercedes-oem-cls-w219-mod-2003-2010multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x164-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x164-mod-2007-2012multimedia/oem-gl-x164-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x164-mod-2007-2012multimedia/oem-gl-x164-mod-2007-2012multimedia/mercedes-oem-gl-x164-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x166-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x166-mod-2013/multimedia-gl-x166-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x166-mod-2013/multimedia-gl-x166-mod-2013/oem-multimedia-gl-x166-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mercedes-oem-multimedia/gl-x166-mod-2013/multimedia-gl-x166-mod-2013/oem-multimedia-gl-x166-mod-2013/mercedes-oem-multimedia-gl-x166-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mg/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mini/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/mitsubishi/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/oem-primastar-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/oem-primastar-mod-2001-2014multimedia/renault-oem-primastar-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/oem-primastar-mod-2001-2014multimedia/renault-oem-primastar-mod-2001-2014multimedia/trafic-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/oem-primastar-mod-2001-2014multimedia/renault-oem-primastar-mod-2001-2014multimedia/trafic-mod-2001-2014multimedia/oem-trafic-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/primastar-mod-2001-2014multimedia/oem-primastar-mod-2001-2014multimedia/renault-oem-primastar-mod-2001-2014multimedia/trafic-mod-2001-2014multimedia/oem-trafic-mod-2001-2014multimedia/opel-oem-trafic-mod-2001-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/qashqai-j11-mod-2014-2021multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/qashqai-j11-mod-2014-2021multimedia/oem-qashqai-j11-mod-2014-2021multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/nissan/qashqai-j11-mod-2014-2021multimedia/oem-qashqai-j11-mod-2014-2021multimedia/nissan-oem-qashqai-j11-mod-2014-2021multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/adam-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/adam-mod-2013/multimedia-adam-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/adam-mod-2013/multimedia-adam-mod-2013/oem-multimedia-adam-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/adam-mod-2013/multimedia-adam-mod-2013/oem-multimedia-adam-mod-2013/opel-oem-multimedia-adam-mod-2013/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2012-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2012-2015multimedia/oem-combo-mod-2012-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2012-2015multimedia/oem-combo-mod-2012-2015multimedia/fiat-oem-combo-mod-2012-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2015-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2015-2018multimedia/oem-combo-mod-2015-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/combo-mod-2015-2018multimedia/oem-combo-mod-2015-2018multimedia/fiat-oem-combo-mod-2015-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/crossland-x-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/crossland-x-mod-2017/multimedia-crossland-x-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/crossland-x-mod-2017/multimedia-crossland-x-mod-2017/oem-multimedia-crossland-x-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/opel/crossland-x-mod-2017/multimedia-crossland-x-mod-2017/oem-multimedia-crossland-x-mod-2017/opel-oem-multimedia-crossland-x-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/2/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/3/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/4/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/81/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/82/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/page/83/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/oem-107-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/oem-107-mod-2005-2014multimedia/toyota-oem-107-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/oem-107-mod-2005-2014multimedia/toyota-oem-107-mod-2005-2014multimedia/aygo-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/oem-107-mod-2005-2014multimedia/toyota-oem-107-mod-2005-2014multimedia/aygo-mod-2005-2014multimedia/oem-aygo-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/107-mod-2005-2014multimedia/oem-107-mod-2005-2014multimedia/toyota-oem-107-mod-2005-2014multimedia/aygo-mod-2005-2014multimedia/oem-aygo-mod-2005-2014multimedia/citroen-oem-aygo-mod-2005-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/3008-mod-2016-2024multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/3008-mod-2016-2024multimedia/oem-3008-mod-2016-2024multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/3008-mod-2016-2024multimedia/oem-3008-mod-2016-2024multimedia/peugeot-oem-3008-mod-2016-2024multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/308-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/308-mod-2007-2012multimedia/oem-308-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/308-mod-2007-2012multimedia/oem-308-mod-2007-2012multimedia/peugeot-oem-308-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/citroen-oem-4007-mod-2007-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/citroen-oem-4007-mod-2007-2012multimedia/c-crosser-mod-2007/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/citroen-oem-4007-mod-2007-2012multimedia/c-crosser-mod-2007/multimedia-c-crosser-mod-2007/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/citroen-oem-4007-mod-2007-2012multimedia/c-crosser-mod-2007/multimedia-c-crosser-mod-2007/oem-multimedia-c-crosser-mod-2007/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4007-mod-2007-2012multimedia/oem-4007-mod-2007-2012multimedia/citroen-oem-4007-mod-2007-2012multimedia/c-crosser-mod-2007/multimedia-c-crosser-mod-2007/oem-multimedia-c-crosser-mod-2007/mitsubishi-oem-multimedia-c-crosser-mod-2007/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/oem-4008-mod-2012-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/oem-4008-mod-2012-2018multimedia/mitsubishi-oem-4008-mod-2012-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/oem-4008-mod-2012-2018multimedia/mitsubishi-oem-4008-mod-2012-2018multimedia/asx-mod-2009-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/oem-4008-mod-2012-2018multimedia/mitsubishi-oem-4008-mod-2012-2018multimedia/asx-mod-2009-2014multimedia/oem-asx-mod-2009-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/4008-mod-2012-2018multimedia/oem-4008-mod-2012-2018multimedia/mitsubishi-oem-4008-mod-2012-2018multimedia/asx-mod-2009-2014multimedia/oem-asx-mod-2009-2014multimedia/mitsubishi-oem-asx-mod-2009-2014multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/oem-boxer-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/oem-boxer-mod-2006-2011multimedia/fiat-oem-boxer-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/oem-boxer-mod-2006-2011multimedia/fiat-oem-boxer-mod-2006-2011multimedia/ducato-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/oem-boxer-mod-2006-2011multimedia/fiat-oem-boxer-mod-2006-2011multimedia/ducato-mod-2006-2011multimedia/oem-ducato-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/peugeot/boxer-mod-2006-2011multimedia/oem-boxer-mod-2006-2011multimedia/fiat-oem-boxer-mod-2006-2011multimedia/ducato-mod-2006-2011multimedia/oem-ducato-mod-2006-2011multimedia/citroen-oem-ducato-mod-2006-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/porsche/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/captur-mod-2019-2025multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/captur-mod-2019-2025multimedia/oem-captur-mod-2019-2025multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/captur-mod-2019-2025multimedia/oem-captur-mod-2019-2025multimedia/renault-oem-captur-mod-2019-2025multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/oem-master-mod-2010-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/oem-master-mod-2010-2019multimedia/opel-oem-master-mod-2010-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/oem-master-mod-2010-2019multimedia/opel-oem-master-mod-2010-2019multimedia/movano-mod-2011-2020multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/oem-master-mod-2010-2019multimedia/opel-oem-master-mod-2010-2019multimedia/movano-mod-2011-2020multimedia/oem-movano-mod-2011-2020multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renault/master-mod-2010-2019multimedia/oem-master-mod-2010-2019multimedia/opel-oem-master-mod-2010-2019multimedia/movano-mod-2011-2020multimedia/oem-movano-mod-2011-2020multimedia/nissan-oem-movano-mod-2011-2020multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renaultmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renaultmultimedia/oem-renaultmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renaultmultimedia/oem-renaultmultimedia/seatmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/renaultmultimedia/oem-renaultmultimedia/seatmultimedia/oem-seatmultimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/toyota-rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/toyota-rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/rhd-rav4-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/toyota-rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/rhd-rav4-mod-2019/multimedia-rhd-rav4-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/rhd-cyprus-uk/toyota-rhd-cyprus-uk/rhd-corolla-mod-2019/multimedia-rhd-corolla-mod-2019/oem-multimedia-rhd-corolla-mod-2019/rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/toyota-rhd-cyprus-uk-oem-multimedia-rhd-corolla-mod-2019/rhd-rav4-mod-2019/multimedia-rhd-rav4-mod-2019/oem-multimedia-rhd-rav4-mod-2019/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/seat/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/seat/ibiza-mod-2008-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/seat/ibiza-mod-2008-2012multimedia/oem-ibiza-mod-2008-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/seat/ibiza-mod-2008-2012multimedia/oem-ibiza-mod-2008-2012multimedia/seat-oem-ibiza-mod-2008-2012multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/skoda/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/skoda/karoq-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/skoda/karoq-mod-2017/multimedia-karoq-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/skoda/karoq-mod-2017/multimedia-karoq-mod-2017/oem-multimedia-karoq-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/skoda/karoq-mod-2017/multimedia-karoq-mod-2017/oem-multimedia-karoq-mod-2017/skoda-oem-multimedia-karoq-mod-2017/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/smart/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/smart/smart-forfour-mod-2004-2007multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/smart/smart-forfour-mod-2004-2007multimedia/oem-smart-forfour-mod-2004-2007multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/smart/smart-forfour-mod-2004-2007multimedia/oem-smart-forfour-mod-2004-2007multimedia/smart-oem-smart-forfour-mod-2004-2007multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/ssangyong/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/subaru/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/subaru/brz-mod-2012/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/subaru/brz-mod-2012/multimedia-brz-mod-2012/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/subaru/brz-mod-2012/multimedia-brz-mod-2012/oem-multimedia-brz-mod-2012/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/subaru/brz-mod-2012/multimedia-brz-mod-2012/oem-multimedia-brz-mod-2012/toyota-oem-multimedia-brz-mod-2012/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/suzuki/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/suzuki/grand-vitara-mod-2005-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/suzuki/grand-vitara-mod-2005-2015multimedia/oem-grand-vitara-mod-2005-2015multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/toyota-oem-multimedia-auris-mod-2015/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/toyota-oem-multimedia-auris-mod-2015/aygo-x-mod-2022/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/toyota-oem-multimedia-auris-mod-2015/aygo-x-mod-2022/multimedia-aygo-x-mod-2022/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/toyota-oem-multimedia-auris-mod-2015/aygo-x-mod-2022/multimedia-aygo-x-mod-2022/oem-multimedia-aygo-x-mod-2022/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/auris-mod-2015/multimedia-auris-mod-2015/oem-multimedia-auris-mod-2015/toyota-oem-multimedia-auris-mod-2015/aygo-x-mod-2022/multimedia-aygo-x-mod-2022/oem-multimedia-aygo-x-mod-2022/toyota-oem-multimedia-aygo-x-mod-2022/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/hilux-mod-2005-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/hilux-mod-2005-2011multimedia/oem-hilux-mod-2005-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/toyota/hilux-mod-2005-2011multimedia/oem-hilux-mod-2005-2011multimedia/toyota-oem-hilux-mod-2005-2011multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/c30-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/c30-mod-2006-2013multimedia/oem-c30-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/c30-mod-2006-2013multimedia/oem-c30-mod-2006-2013multimedia/volvo-oem-c30-mod-2006-2013multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/oem-s60-mod-2010-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/oem-s60-mod-2010-2018multimedia/volvo-oem-s60-mod-2010-2018multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/oem-s60-mod-2010-2018multimedia/volvo-oem-s60-mod-2010-2018multimedia/v40-mod-2011-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/oem-s60-mod-2010-2018multimedia/volvo-oem-s60-mod-2010-2018multimedia/v40-mod-2011-2019multimedia/oem-v40-mod-2011-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/volvo/s60-mod-2010-2018multimedia/oem-s60-mod-2010-2018multimedia/volvo-oem-s60-mod-2010-2018multimedia/v40-mod-2011-2019multimedia/oem-v40-mod-2011-2019multimedia/volvo-oem-v40-mod-2011-2019multimedia/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/vw/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/vw/eos-mod-2006/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/vw/eos-mod-2006/multimedia-eos-mod-2006/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/vw/eos-mod-2006/multimedia-eos-mod-2006/oem-multimedia-eos-mod-2006/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/multimedia/oem-multimedia/vw/eos-mod-2006/multimedia-eos-mod-2006/oem-multimedia-eos-mod-2006/vw-oem-multimedia-eos-mod-2006/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/2/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/29/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/3/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/30/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/31/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-category/uncategorized/page/4/`: HTTP 200 (en, product-category)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/6/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/7/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-10in/page/8/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-7in/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/26/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/27/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/28/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxf7-9in/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/6/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/7/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-10in/page/8/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/26/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/27/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/28/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/bxk20-9in/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/33/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/34/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/35/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lenovo-lve/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lvg13/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lvg14/page/2/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lvg14/page/3/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/product-tag/lvg14/page/4/`: HTTP 200 (en, product-tag)
- `https://lenovo.invetec.eu/shop/page/112/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/shop/page/113/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/shop/page/114/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/shop/page/2/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/shop/page/3/`: HTTP 200 (en, other)
- `https://lenovo.invetec.eu/shop/page/4/`: HTTP 200 (en, other)

## Open item 5: language trees on invetec.eu

Pages are URLs that answered 200 without a redirect. A tree is the path prefix (`/en/`, `/it/`, `/sq/`, else the root); `<html lang>` is read from each page.

**Answer:** invetec.eu serves 4 language trees: root `/` (`<html lang="el">` on 719 of 722 pages), `/en/` (`<html lang="en-US">` on 565 of 565 pages), `/it/` (`<html lang="it-IT">` on 441 of 441 pages), `/sq/` (`<html lang="sq">` on 242 of 242 pages).

| Tree     | Pages | `<html lang>` values           |
| -------- | ----: | ------------------------------ |
| root `/` |   722 | `el` 719, `it-IT` 2, `en-GB` 1 |
| `/en/`   |   565 | `en-US` 565                    |
| `/it/`   |   441 | `it-IT` 441                    |
| `/sq/`   |   242 | `sq` 242                       |

### Pages whose `<html lang>` does not match their tree (3)

- `https://invetec.eu/b2b/`: tree root `/`, `<html lang>` `en-GB` (other)
- `https://invetec.eu/b2b/it/auto-moto-allarme-invetec/`: tree root `/`, `<html lang>` `it-IT` (other)
- `https://invetec.eu/b2b/it/pandora-specialist-it/`: tree root `/`, `<html lang>` `it-IT` (other)

### lenovo.invetec.eu

For comparison (its paths have no root language): 2523 pages.

| Tree                   | Pages | `<html lang>` values |
| ---------------------- | ----: | -------------------- |
| `/it/`                 |  1819 | `en-US` 1819         |
| root `/` (no language) |   704 | `en-US` 704          |

## Open item 6: URL groups with no planned new home

The roadmap's content model (section 4) has products (16 systems), accessories, 8 posts, FAQ, installers and one site-copy global per page group; L1 Infotainment (Italian only) is outside the build scope. Apart from posts (the model holds 8, against the count below), none of the groups below has a page type in that model. "Final 200": URLs that end in a 200, after any redirects; "200, no redirect": pages of their own. This section maps no URL to a new page: Phase 7 decides.

| Group                                             | Page types                                                           | URLs | Final 200 | 200, no redirect | Languages (`lang`)             |
| ------------------------------------------------- | -------------------------------------------------------------------- | ---: | --------: | ---------------: | ------------------------------ |
| lenovo.invetec.eu product pages                   | product                                                              | 1819 |      1819 |             1819 | en 1819                        |
| lenovo.invetec.eu product categories              | product-category                                                     |  626 |       626 |              626 | en 626                         |
| lenovo.invetec.eu product tags                    | product-tag                                                          |   63 |        63 |               63 | en 63                          |
| lenovo.invetec.eu other URLs                      | author 1, category 1, home 1, other 7, page 1, post 1, shop-system 4 |   16 |        16 |               15 | en 16                          |
| invetec.eu posts (the content model holds 8)      | post                                                                 |  505 |       505 |              485 | el 234, en 131, it 111, sq 29  |
| invetec.eu tag archives                           | tag                                                                  | 1185 |      1185 |             1185 | el 401, en 349, it 263, sq 172 |
| invetec.eu category archives                      | category                                                             |   62 |        62 |               62 | el 21, en 17, it 14, sq 10     |
| invetec.eu author archives                        | author                                                               |   15 |        15 |               15 | el 6, en 3, it 3, sq 3         |
| invetec.eu shop, cart, checkout and account pages | shop-system                                                          |    4 |         4 |                4 | el 4                           |

Not grouped: 155 URLs of invetec.eu have page type `other` (155 of them link-only, listed under Orphans); the crawl cannot tell whether they have a new home. Not in the table either: home 2, page 187 (page types of invetec.eu, counted under "URLs by host, language and page type").

### URLs whose path mentions infotainment (9)

The roadmap names `/it/infotainment-car-carplay-android-auto-universal-it/` as an example of an old URL with no new home.

- `https://invetec.eu/it/infotainment-camper-carplay-android-auto-universal-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)
- `https://invetec.eu/it/infotainment-camperplay-android-camper-it/`: HTTP 404 (it, other, `link`)
- `https://invetec.eu/it/infotainment-car-carplay-android-auto-universal-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)
- `https://invetec.eu/it/infotainment-carplay-android-auto-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)
- `https://invetec.eu/it/infotainment-carplay-android-auto-universal/`: HTTP 200 (it, other, `link`)
- `https://invetec.eu/it/infotainment-moto-carplay-android-auto-universal-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)
- `https://invetec.eu/it/multimedia-infotainment-android-auto-apple-carplay-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)
- `https://invetec.eu/it/warranty-activation-infotainment-it`: HTTP 200 (it, other, `link`)
- `https://invetec.eu/it/warranty-activation-infotainment-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)

## `_redirects` rule limit (for Phase 7)

4639 crawled URLs (invetec.eu 2115, lenovo.invetec.eu 2524) against the Cloudflare Pages `_redirects` limit of 2000 static and 100 dynamic rules (roadmap section 1): one static rule per crawled URL is above the static limit. Flagged for Phase 7; no decision here.
