# Seated couple artwork

Generated with the built-in imagegen tool, with `transparent_background: true`.

Reference: `couple-dry.jpg` (fictional adult characters, wardrobe, and photographic perspective).

## Final prompt

Use case: compositing / identity-preserve. Asset type: a single photorealistic transparent foreground layer for an animated seasonal landscape. Input image is a supporting identity, wardrobe, camera-height and natural-light reference, NOT a background to retain. Show the same fictional young adult South Asian couple, both mid-twenties: woman with long dark wavy hair, ivory knitted cardigan and rust midi skirt; man in olive overshirt, cream shirt and tan trousers. Change their pose: they sit very close side by side on one low broad weathered grey-brown stone ledge, viewed from behind and slightly to their right, peacefully looking out toward a distant valley to the left. The woman's head rests naturally on his shoulder, his arm rests loosely around her back. Quiet, understated attachment, anatomically accurate, natural weight and folds, fully visible seated bodies and shoes. A small amount of stone beneath their seated bodies provides convincing grounded contact and a low horizontal base. No standing figures, no walking, no umbrella. This single pose will remain identical across all seasons. Soft neutral overcast daylight, realistic skin and hair, natural photographic grain, no studio halo, no illustration. Landscape 3:2 canvas, couple and their seat centered with 8 percent clear padding, entire subject uncut. The stone has a restrained uneven natural silhouette rather than a rectangular cut. Keep outside the people and their small stone ledge completely TRANSPARENT with actual alpha, including gaps between arms and bodies. Remove ALL sky, trees, river, hills and grass. No text, no scenery, no opaque backdrop, no checkerboard baked into the image.

## Scene placement

The original people-free `love-dry.jpg`, `love-rain.jpg`, and `love-forest.jpg` remain the three seasonal backgrounds. `seated-couple.png` is a persistent RGBA layer, rather than three differently posed photographs. The WebGL renderer and CSS fallback share its position at 58.8% from the left, 54.5% from the top, and 19% of the landscape width. The renderer changes the subject's lighting continuously and applies a very small shoulder breathing displacement while keeping the lower edge planted.
