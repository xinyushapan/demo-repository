# Six tactile sandplay environments

Current nature and animal backgrounds use the user's supplied images unchanged:
- `nature-user.png`: mountain forest, creek and bridge (2026-10-26).
- `animal-user.png`: sunset savanna with giraffe and lion (2026-10-26).
The original generated `nature.webp` and `animal.webp` are retained as earlier assets; the scene picker thumbnails remain unchanged. The descriptions below document the original generated set.

Created with the built-in image_gen tool. Style reference: core/static/core/images/cover-wide.png. These are image environments with interactive Canvas toys and procedural ambience, not navigable 3D geometry.

Shared art direction: Premium handcrafted miniature diorama; short plush/felt fibers, soft tactile sand, rounded clay details; restrained butter yellow, dusty coral, lilac, pale aqua, ivory and sage; soft bounce light and contact shadows. Elevated three-quarter front view, horizon in the upper third, wide 16:9. Fill frame with environment. Keep central 55% and lower middle open for interactive toys. Cover-wide.png is material/style reference only. No text, logos, UI, borders or large-eyed characters.

## nature.webp

A cozy forest creek valley: layered sage and mint felt hills, rounded plush evergreen trees, cream felt snowcaps far away, a narrow aqua stream winding along the LEFT edge with a tiny log bridge at far mid-left, small mushrooms and daisies around the perimeter, warm dappled morning light. The center and right foreground is a broad open pale sandy clearing.

## animal.webp

A welcoming animal-home savanna garden: velvety sage grass and warm cream sand, rounded acacia trees at the edges, small distant giraffe and lion made of soft plush at the back edge, a small reflective watering pool at far left, clusters of soft rocks and yellow flowers, peach morning sky, glowing warm sunshine. A broad open warm sandy clearing occupies the center and foreground.

## city.webp

A charming miniature toy town: pastel butter-yellow, dusty coral, sky-blue and lavender rounded buildings arranged along the distant BACK and SIDE edges, a tiny bakery, little school, rounded trees, a curved toy road hugging the far perimeter, bunting between distant houses and soft cotton clouds. Center and foreground is a large open cream play plaza with subtle pale paving, ample space for placing toys.

## ocean.webp

A magical peaceful underwater garden seen INSIDE the sea: luminous pale turquoise water with soft sunbeams from above, velvety lavender and coral-pink anemones and rounded seaweed only along the left and right edges, a few tiny distant soft toy fish near the top, rounded shell and pearl details, a broad open cream sandy seabed across center and foreground, tranquil and luminous, no dark deep-sea feeling.

## space.webp

A comforting dreamy starry campsite on a soft lavender moon: dusty violet and periwinkle sky with soft tiny glowing stars, a large pale peach ringed planet in the far sky, plush cotton nebula clouds, a tiny pastel toy rocket at the far RIGHT edge, rounded crystal pebbles only around the perimeter, a broad open lilac sand clearing occupying center and foreground, warm soft lantern-like light, safe and wondrous.

## free.webp

A dreamy free-play sand garden: layered warm vanilla and pale apricot plush sand dunes, subtle rippling fine-sand texture, a soft pastel rainbow arch far in the BACK between two distant dunes, cream cloud puffs, a few oversized soft geometric toy blocks at the outer left and right edges, tiny coral and lavender tufts around perimeter, a broad open cream sandy clearing in the center and foreground under warm gentle daylight.


## Background motion clean plate

`animal-motion-clean.png` was edited with the built-in image_gen tool from the user's `animal-user.png`.
Prompt: Remove only the giraffe and its ground shadow from the supplied low-poly savanna; seamlessly continue existing sky, mountains, bushes and ground behind it. Preserve the lion, trees, pool, rocks, flowers, colors, exact composition and style. No new objects. The original giraffe is cut from the unchanged user image and animated over only this local restoration area.

`scene-life.js` animates the original scene textures: wind in the trees/seaweed, walking giraffe, swimming original fish-toy textures, small city car, birds, shooting stars and gentle light. Motion is background-only and creates no recorded sandplay objects. Reduced-motion renders the original stationary backgrounds.
