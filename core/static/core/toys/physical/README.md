# Physical flower references

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
