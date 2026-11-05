# SAVE SLOT — implementation

Eight user references downloaded and visually inspected: six-state shelf/open sequence, insertion/play/pause/completion, return sequence, mobile layouts, six original covers and clean console.

Core vertical slice: MOSS SIGNAL shelf -> selected box -> hinged flap -> cartridge clears box -> console slot -> actual Canvas2D exploration -> pause/completion -> reverse packing -> shelf. Then five concept worlds using the same console.

Art: warm console plastic, navy ink, cobalt actions, restrained terracotta. Pixel headings, readable body. Shared beveled objects and gentle contact shadows. No full-screen noise/glitch. Real cover artwork from user sheet; proper back/spine/labels generated deterministically as textures, not a screenshot of UI.

Scene contract: coordinates and one reversible normalized stage progress drive box, flap, cartridge and console; selection movement is damped from current pose. Cartridge clears flap opening before horizontal travel. Actions use desired state rather than queued independent timers. All collection changes are paused while an active scene is packing.

Validation: unit tests for collision, activation, uniqueness, win/restart and serialization. Browser flows all worlds, playback, return, interruptions, history, keyboard/touch, EN/RU, reduced motion, model failure. Record complete demo, capture desktop/mobile. Inspect actual WebGL output and frame intervals, report conditions.
