# Home & Merry — SketchUp plugin

This plugin does **not** embed the Next.js app. It opens a small browser panel inside SketchUp and loads your live shop URL.

```
Website (Vercel / localhost)  ←── HtmlDialog ──→  Plugin (.rb)  ←──→  SketchUp
```

## Files

```
sketchup-plugin/
├── home_merry_loader.rb    # Extension registration
└── home_merry/
    ├── main.rb             # Opens UI::HtmlDialog with your shop URL
    ├── icon_small.png      # Optional 24×24 toolbar icon
    └── icon_large.png      # Optional 32×32 toolbar icon
```

## 1. Set your URL

Edit `home_merry/main.rb`:

```ruby
SHOP_URL = 'https://shophub-8eas.vercel.app'  # production
# SHOP_URL = 'http://localhost:3000'          # local Next.js only
```

Use **HTTPS** for anything you ship to others.

## 2. Dev install (your Mac)

1. Copy `home_merry_loader.rb` and the `home_merry/` folder into:

   `~/Library/Application Support/SketchUp 2026/SketchUp/Plugins`

   (Change `2026` to your SketchUp year.)

2. Quit SketchUp fully, then reopen it.
3. Menu: **Extensions → Home & Merry Shop** (or the toolbar button).

Ruby errors appear under **Window → Ruby Console**.

## 3. Package as `.rbz`

From this folder (`sketchup-plugin/`):

```bash
cd sketchup-plugin
zip -r home_merry.rbz home_merry_loader.rb home_merry
```

Open the zip and confirm the loader and `home_merry/` are at the **top level** (not nested in another folder).

## 4. Install on any SketchUp

1. **Extensions → Extension Manager → Install Extension**
2. Pick `home_merry.rbz`
3. Restart SketchUp

## Notes

- Deploy website changes as usual; users see them next time they open the panel.
- Login / payment redirects can fail inside the embedded window. From Ruby you can open the system browser with `UI.openURL('https://…/checkout')`.
- Keep the shop layout usable around **450px** width for the panel.
