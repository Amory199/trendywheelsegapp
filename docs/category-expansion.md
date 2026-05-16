# Product category expansion — pending

User clarified TrendyWheels sells more than golf carts. From the marketing
collage they sent on 2026-05-16:

| Category     | Sub                 | What is it                                          |
| ------------ | ------------------- | --------------------------------------------------- |
| Hover boards | electric            | Self-balancing rideable boards                      |
| Scooters     | electric            | Stand-on e-scooters                                 |
| Buggies      | gasoline / electric | ATVs (quads)                                        |
| UTVs         | gasoline / electric | Side-by-sides ("great UTV" tier)                    |
| Jet skis     | gasoline            | Personal watercraft                                 |
| Golf carts   | electric / gasoline | 4-seater / 6-seater / LED party variants            |
| Service      | —                   | Customize / maintenance / rent for ALL of the above |

Plus the existing tagline "Ride & Vibe" for LED party carts.

## Schema changes needed

**`Vehicle.type` enum** — currently `4-seater / 6-seater / LED`. Extend or
split into a wider `vehicle_category` taxonomy:

```prisma
enum VehicleCategory {
  golf_cart_4
  golf_cart_6
  golf_cart_led
  hoverboard
  scooter
  buggy_atv
  utv
  jet_ski
}
```

Or — simpler and less invasive — add a `category` String field on Vehicle
(free-form, indexed) and let the seed populate it.

**`ProductCategory` enum** — currently `cart_new / cart_used / parts /
accessory`. Add per-vehicle equivalents:

```
hoverboard_new, hoverboard_used,
scooter_new, scooter_used,
atv_new, atv_used,
utv_new, utv_used,
jetski_new, jetski_used,
```

## Per-category hero MP4

User wants an attract-loop video per category on Buy + Rent screens.
Drop the MP4s in `/opt/stuff/` named like:

- `category-hoverboards.mp4`
- `category-scooters.mp4`
- `category-atvs.mp4`
- `category-utvs.mp4`
- `category-jetskis.mp4`
- `category-golfcarts.mp4`

Then we re-encode each to ~1.5 MB and store under `apps/customer/public/categories/`
and `apps/mobile/assets/categories/` and render as a banner at the top of
each category page.

## Mobile + web UI changes

- `/buy` and `/rent` get a horizontal pill row of category chips with
  the MP4 looping behind the active chip
- Filter chips already exist on web `/buy`; mobile needs the same plus the
  video hero
- Seed data needs new vehicle records (3+ per category) so each tab isn't empty

## Verification

- All 6 categories visible on Buy + Rent
- Each chip plays its hero MP4 when selected
- Filter switches the product grid without page reload
- Existing golf-cart inventory still shows under "Golf carts" category
- Admin can CRUD any category from /admin/more → Vehicles
