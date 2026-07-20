/** @typedef {'gallery' | 'model' | 'embed'} ProjectType */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {ProjectType} type
 * @property {string} folder
 * @property {number} slideCount
 * @property {string} caption
 * @property {string} [cover] - optional cover image path override
 * @property {boolean} [blankCover] - render empty tile/box cover
 * @property {string} [embedUrl] - for embed projects
 * @property {string} [modelSrc] - for future model projects
 */

/** @type {Project[]} */
export const PROJECTS = [
  {
    id: "experimente",
    name: "ARCHIVE",
    type: "gallery",
    folder: "experimente",
    slideCount: 21,
    caption:
      "<span class='caption-specs'>Archive<span class='spec-sep'>|</span>20xx<span class='spec-sep'>|</span></span>A sandbox for creative coding and visual curiosity. Ranging from interactive TouchDesigner jams to generative experiments, this is where I hunt for weird textures and unexpected aesthetics. It's a space to play, break algorithms, and embrace happy accidents, treating code like a messy material to see what strange visuals come out the other side.",
  },
  {
    id: "bitwusst",
    name: "BITWUSST?",
    type: "gallery",
    folder: "bitwusst",
    slideCount: 16,
    caption:
      "<span class='caption-specs'>Poster<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>BITWUSST? acts as an interface between scientific <a href='bilder/report_bitwusst.pdf' download style='cursor: none !important; color: inherit; text-decoration: underline;'>theory</a> and visual communication. Comprising a report and an accompanying poster, the project traces a spectrum of consciousness extending from atoms to algorithms. Grounded in Integrated Information Theory and Panpsychism, it investigates whether awareness is a fundamental property of matter itself or merely a result of complex processing. The work questions if feeling necessitates biological flesh, or if digital sensors can generate genuine presence. Ultimately, BITWUSST? encourages a quiet reflection on the nature of reality and Consciousness.",
  },
  {
    id: "fotografik",
    name: "BITGRAMM",
    type: "gallery",
    folder: "fotografik",
    slideCount: 14,
    caption:
      "<span class='caption-specs'>Print<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>Serving as a visual evolution of the BITWUSST? project, this work translates the initial theoretical inquiry into a more material outcome. Centered around a newspaper publication and a photogram series with analog studies of form. The imagery captures a spectrum of materials ranging from organic elements like leaves, grass, and seeds to synthetic artifacts like cables and generated neural networks. By treating both the botanical and the technical with the same darkroom process, the work creates a unified texture where nature and technology come together.",
  },
  {
    id: "layout2",
    name: "24 HOURS",
    type: "gallery",
    folder: "layout2",
    slideCount: 13,
    caption:
      "<span class='caption-specs'>Editorial<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>One day, one class, 12 stories. For the interdisciplinary project 24 Hours, I created a system that translates time into structure. Using a grid of 24 rows and 60 columns, representing every hour and minute. The grid dictates where the images are located, physically displacing and reorganizing the typography around them. It is a visual study of time, rhythm, and tension between content and form.",
  },
  {
    id: "london",
    name: "WILD LONDON",
    type: "gallery",
    folder: "london",
    slideCount: 26,
    caption:
      "<span class='caption-specs'>Editorial<span class='spec-sep'>|</span>2025<span class='spec-sep'>|</span></span>London is usually mapped by human needs, but for this collaborative publication, we shifted the narrative. Exploring the city through the senses of 88 different species, from the peregrine falcon surveying the Thames to the urban fox navigating by scent. The project challenges our anthropocentric view of the metropolis. Each student adopted the perspective of a specific animal, visualizing how landmarks become obstacles and streets become hunting grounds. The resulting book is a collective portrait of a hidden London, documenting the impossible but necessary attempt to see the city through eyes other than our own.",
  },
  {
    id: "musikplakat",
    name: "MASTER CONCERTS",
    type: "gallery",
    folder: "musikplakat",
    slideCount: 8,
    caption:
      "<span class='caption-specs'>Moving Poster<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>For this campaign, I used TouchDesigner to translate the concept of resonance into a graphic system. The typography is rendered as a dispersing point cloud, creating a visual noise that implies frequency and vibration. This aesthetic tries to capture the dynamic atmosphere of the concerts, providing a fluid identity for both the poster and the motion design.",
  },
  {
    id: "paris",
    name: "PERDUS",
    type: "gallery",
    folder: "paris",
    slideCount: 18,
    caption:
      "<span class='caption-specs'>Editorial<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>In a city where Baroque grandeur collides with social invisibility, PERDUS explores the rift between power and marginalization. Anchored at the Place des Victoires, the project weaves together street scans, historical context, and social critique into a dialogue. Working through absence rather than depiction, the publication is dedicated to those who remain unseen, present in the city, yet forgotten by it.",
  },
  {
    id: "prepress",
    name: "GREETINGS LUCERNE!",
    type: "gallery",
    folder: "prepress",
    slideCount: 8,
    caption:
      "<span class='caption-specs'>Postcard<span class='spec-sep'>|</span>2024<span class='spec-sep'>|</span></span>Bypassing the scenic Mount Pilatus and the Chapel Bridge, this work focuses on street philosopher Emil Manser. The goal was to capture the imperfect side of Lucerne on a Postcard. Using Python, I built a custom generator that reconstructed Manser's portrait from the text of his famous socialy critical street signs.",
  },
  {
    id: "entwicklung",
    name: "GARDEN SCISSORS",
    type: "gallery",
    folder: "entwicklung",
    slideCount: 7,
    caption:
      "<span class='caption-specs'>Object Study<span class='spec-sep'>|</span>2023<span class='spec-sep'>|</span></span>This project focuses on the analytical drawing and conceptual investigation of a given object. I studied the pruning shear's form, mechanics, surface structure, and materiality using perspectival drawings and print-based techniques. Visual experiments, technical tests, and material samples formed the basis for a physical model and impact studies on cardboard.",
  },
  {
    id: "tat",
    name: "TAT",
    type: "gallery",
    folder: "tat",
    slideCount: 5,
    caption:
      "<span class='caption-specs'>Latent Study<span class='spec-sep'>|</span>2026<span class='spec-sep'>|</span></span> A generative study using StreamDiffusion and TouchDesigner. The project utilizes my grandfather's archive of nature photography, ranging from fungi and trees to flowers as visual anchors. Crucially, each photo is paired with the unique poem he wrote for it, creating a dataset defined by deep personal connection. In the system, the translated text of each poem acts as the specific semantic driver for its paired image, steering the trajectory within the neural network. By manipulating the parameters live, the installation reveals this morphing process, a continuous latent walk that navigates the distance between the image of the plant and the emotional reality of the poem.",
  },
  {
    id: "ringwebsite",
    name: "ANELL",
    type: "gallery",
    folder: "ringwebsite",
    slideCount: 5,
    caption:
      "<span class='caption-specs'>Ring Project<span class='spec-sep'>|</span>2026<span class='spec-sep'>|</span></span>Focusing on the potential of discarded materials, <a href='https://anell.ch/' target='_blank' style='cursor: none !important; color: inherit; text-decoration: underline;'>anell.ch</a> turns antique silverware into wearable objects. Each ring is unique, retaining the scratches and stamps of its previous life. This is the yet unfinished online home for the upcycling project I run with my brother. The focus here isn't on branding, but on simple reuse, taking discarded silverspoons and giving them a second life.",
  },
  {
    id: "scans",
    name: "DIGITAL SCANS",
    type: "gallery",
    folder: "scans",
    slideCount: 18,
    caption:
      "<span class='caption-specs'>Scans<span class='spec-sep'>|</span>2025<span class='spec-sep'>|</span></span> Visual study of connection beetween a hand scanner and digital moving screens. Contains series of digital scansof the movie All About Lily Chou-Chou.",
  },
  {
    id: "glbviewer",
    name: "SCAN ARCHIVE",
    type: "gallery",
    folder: "glbviewer",
    slideCount: 3,
    cover: "bilder/glbviewer/1fill.mp4",
    slides: [
      "bilder/glbviewer/s1.webp",
      "bilder/glbviewer/s2.webp",
      "bilder/glbviewer/s3.webp",
    ],
    caption:
      "<span class='caption-specs'>SCAN ARCHIVE<span class='spec-sep'>|</span>Web Tool<span class='spec-sep'>|</span>2026<span class='spec-sep'>|</span></span>Collection of photogramic and lidar scans collected by me and my friends to explore and export images out of weird and unaccesable angles. Explore it at <a href='https://glb-viewer-ruby.vercel.app/' target='_blank' style='cursor: none !important; color: inherit; text-decoration: underline;'>glb-viewer-ruby.vercel.app</a>.",
  },
];

/** @param {Project} project */
export function getCoverPath(project) {
  if (project.cover) return project.cover;
  return `bilder/${project.folder}/${project.folder}cover.webp`;
}

/** Lightweight trail thumb for mobile (~800px). Falls back to full cover path. */
/** @param {Project} project */
export function getMobileCoverPath(project) {
  const cover = getCoverPath(project);
  // Video covers: use a still thumb on mobile trail
  if (/\.(mp4|webm|mov)$/i.test(cover)) {
    return `bilder/${project.folder}/${project.folder}cover-sm.webp`;
  }
  if (project.cover) {
    return project.cover.replace(/(\.[^.]+)$/, "-sm$1");
  }
  return `bilder/${project.folder}/${project.folder}cover-sm.webp`;
}

export function isVideoPath(src) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(src || "");
}

/** Mobile-optimized sibling, e.g. 1fill.mp4 → 1fill-mobile.mp4 */
export function getMobileVideoPath(src) {
  if (!isVideoPath(src)) return src;
  if (/-mobile\.(mp4|webm|mov)(\?|$)/i.test(src)) return src;
  return src.replace(/(\.(mp4|webm|mov))(\?|$)/i, "-mobile$1$3");
}

/** @param {Project} project */
export function buildGallery(project) {
  if (project.type === "embed") {
    if (project.blankCover) return [];
    return [getCoverPath(project)];
  }
  const gallery = [getCoverPath(project)];
  if (Array.isArray(project.slides) && project.slides.length) {
    gallery.push(...project.slides);
  } else {
    for (let j = 1; j <= project.slideCount; j++) {
      gallery.push(`bilder/${project.folder}/${j}.webp`);
    }
  }
  return gallery;
}

export const GALLERIES = PROJECTS.map(buildGallery);
