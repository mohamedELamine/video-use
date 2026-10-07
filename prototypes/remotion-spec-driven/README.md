# PROTOTYPE: spec-driven Remotion render (#11)

Throwaway. It renders the Sooq Pro launch reel from `video-spec.sooq-pro.json` + `brands/sooq-pro/brand.json` + `brands/sooq-pro/alignment.json`. The findings are in [NOTES.md](NOTES.md).

```sh
npm run setup      # links public/reels to the Sooq Pro reels-assets, installs deps if missing
npm run timeline   # resolved timeline, validation, drift against the shipped cuts
npm run render     # out/spec-film.mp4
```

`setup` reads the media from `$REELS`, which defaults to `~/Local Sites/soqpro/marketing/reels-assets`.
