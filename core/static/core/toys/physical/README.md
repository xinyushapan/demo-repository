# Physical toy references

These three photographs were supplied by the project team and map to the
existing `flower` toy. JPEGs contain only a close crop of the supplied object;
they are not generated illustrations. Browser canvas preprocessing respected
the original EXIF orientation and re-encoded the crops without source metadata.

Normalized crops of the original, orientation-corrected photographs:

| View | x | y | width | height |
| --- | --- | --- | --- | --- |
| front | .250 | .185 | .500 | .470 |
| left | .185 | .250 | .430 | .470 |
| right | .260 | .225 | .390 | .430 |

The local detector checks a yellow centre surrounded by red lobes and a green
base below, then compares an 8 × 8 colour-layout descriptor with all three
sample views, including mirrored layouts. This is a calibrated appearance
detector for this toy, not a trained general-purpose flower classifier.

`physical-flower-worker.js` runs this detector independently of the slower
OpenCV catalog worker. Tracking requires two fresh detections from the same
channel and expires an unseen physical flower after 1.8 seconds. Camera stream
epochs discard results captured before a reconnect. The scene and companion
receive the existing `flower` identifier; camera images stay in the browser
while using local recognition mode.

Validation performed in Edge:

- Three views × widths 55/100/165 pixels × rotations −16°/0°/16° × brightness
  .65/1/1.25: 81/81 positive detections in synthetic camera frames.
- Blank, single red/yellow/green shapes, red/yellow/green stripes, and a
  traffic-light arrangement: no physical-flower detection.
- Full OpenCV worker: three views, two simultaneous flowers, blank and
  traffic-light frames; the latter can still trigger unrelated legacy catalog
  classes, which is not a validation of other toy categories.
- Software-camera integration: initial flower confirmation in about 960 ms
  in the test run, stable identity while moving, and removal after leaving
  the frame. Timing depends on hardware and browser load.

These checks use the supplied photos and software-generated video frames.
The actual clay object still needs a live webcam check under the team's
lighting. Keep the yellow centre, red petals and green base visible; rear views,
heavy occlusion and extreme lighting are not covered by these samples.

## Clay tree

Four additional team photographs map to the existing `tree` toy. They show
the same dark green and pale mint clay-ball crown, brown trunk and brown base
from the front, back, side and the newly supplied upright front angle. The
normalized source crops are:

| View | x | y | width | height |
| --- | --- | --- | --- | --- |
| front | .230 | .165 | .600 | .575 |
| back | .140 | .028 | .650 | .570 |
| side | .250 | .072 | .600 | .590 |
| upright | .065 | .230 | .750 | .680 |

`physical-tree.js` requires a connected, nonrectangular crown containing both
green shades, with a smaller brown trunk/base below it. It compares the same
8 × 8 colour-layout descriptor against the four real sample views, including
mirrors. `physical-vision.js` contains the shared component and descriptor
operations; the flower detector's classification and matching rules are unchanged.

The existing `physical-flower-worker.js` now runs both physical-toy detectors
and reports which toy types it owns. The general OpenCV channel suppresses
these types while the fast channel is available, so it does not create duplicate
flowers or trees. Both detectors remain in the general worker as a fallback.
Raw camera frames are processed locally; adding these samples does not upload
camera images or call an external recognition API.

Tree validation in Edge:

- Four tree views × 27 size/angle/brightness combinations: 108/108 positives,
  with no flower detections. Flower regression: 81/81 positives, with no tree
  detections.
- Blank, plain green, two-tone crown without a trunk, rectangular green/brown
  blocks and an upside-down brown/green arrangement: no physical-toy detections.
- One flower and one tree in the same frame: one of each from the fast worker.
- Node tests cover calibration, smaller objects, two trees and incomplete shapes.
- Software-camera integration: both toys enter the digital scene, the moving
  tree keeps its identity, and removing either toy leaves the other in place.
  The full OpenCV result did not create duplicates. This cold, loaded test run
  took 29.1 seconds to first confirmation and 4.0 seconds for one general
  OpenCV frame; the independent physical worker continued updating meanwhile.
  These timings are hardware/load-dependent, not a latency guarantee.

The upright reference extends view coverage without lowering the detection
threshold or removing the crown/trunk checks. Both workers fetch manifest
version 3 (seven physical references in total); their URL versions are bumped
so refreshing does not reuse an earlier worker initialization.

These are appearance-based checks of these particular clay objects, not a
general tree classifier. Live webcam use still needs checking under the team's
lighting. Keep the dark/pale green crown and brown base visible and leave some
space between objects; major occlusion and unrepresented viewpoints are not
covered.

## Clay volcano

The team's supplied orange-lava/brown-mountain photograph maps to the existing
`volcano` toy and its corpus identifier `nature_volcano`. The orientation-corrected
source crop is x=.240, y=.200, width=.600, height=.570, re-encoded as a 480 × 608
JPEG without original EXIF metadata. It is a real photo, not a generated asset.

`physical-volcano.js` checks connected orange/brown regions, orange above brown,
and a silhouette that widens from upper to middle to lower bands. It then
compares the colour-layout descriptor with the supplied reference (and mirror).
It runs in both workers. Manifest version 4 contains eight physical references;
worker URL versions are updated so a refresh loads the new detector and photo.

Validation: the supplied volcano view at widths 55/100/165 pixels, rotations
−16°/0°/16° and brightness .65/1/1.25 passed 27/27 composite-frame checks without
flower/tree detections. The existing four tree views and three flower views
passed their 108/108 and 81/81 photo checks without volcano detections. Node
tests cover two volcanoes, smaller objects, missing brown material, plain
orange/brown blocks and reversed colour ordering.

Software-camera integration used the original uncropped volcano photo rather
than the training crop: one volcano and one flower entered the scene, the
volcano kept its identity while moving, and removing either left the other
intact. Both workers initialized (8 physical references / 71 total references),
with no page errors. First scene confirmation took 18.7 seconds in this cold
test run, including initial reference loading; timing depends on load/hardware.

Only one volcano viewpoint is supplied. These are photo/synthetic-video checks;
actual webcam accuracy has not been established. In particular, the team reports
the tree remains unreliable on their real camera despite passing photo tests;
those results must not be treated as proof of live-camera performance.
