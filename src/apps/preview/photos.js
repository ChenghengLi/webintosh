// Demo library for Preview — real photos from picsum.photos (fixed seeds), with the
// CSS gradients kept behind each <img> as the loading / offline fallback.
// w/h are the natural pixel size of each photo, also used for the zoom math and
// the markup canvas backing store.
export const PHOTOS = [
  {
    id: 1, name: 'Big Sur Sunset.png', seed: 'sunset-11', w: 1400, h: 900,
    dims: '4032 × 3024', size: '4.2 MB',
    gradient: 'linear-gradient(160deg,#ff9a56,#ff5e8a)',
  },
  {
    id: 2, name: 'Alpine Ridge.jpg', seed: 'mountain-12', w: 1400, h: 900,
    dims: '4000 × 3000', size: '3.6 MB',
    gradient: 'linear-gradient(160deg,#667eea,#764ba2)',
  },
  {
    id: 3, name: 'Ocean Mist.jpg', seed: 'coast-3', w: 1400, h: 900,
    dims: '3840 × 2160', size: '2.9 MB',
    gradient: 'linear-gradient(160deg,#43cea2,#185a9d)',
  },
  {
    id: 4, name: 'Cherry Blossom.png', seed: 'forest-7', w: 1400, h: 900,
    dims: '3024 × 4032', size: '5.1 MB',
    gradient: 'linear-gradient(160deg,#fbc2eb,#a18cd1)',
  },
  {
    id: 5, name: 'Neon District.png', seed: 'aurora-2', w: 1400, h: 900,
    dims: '4032 × 3024', size: '4.8 MB',
    gradient: 'linear-gradient(160deg,#30cfd0,#330867)',
  },
  {
    id: 6, name: 'Golden Hour.tiff', seed: 'valley-9', w: 1400, h: 900,
    dims: '6000 × 4000', size: '18.4 MB',
    gradient: 'linear-gradient(160deg,#fddb92,#fda085)',
  },
  {
    id: 7, name: 'Mono No. 7.png', seed: 'desert-8', w: 1400, h: 900,
    dims: '3000 × 3000', size: '2.2 MB',
    gradient: 'linear-gradient(160deg,#bdc3c7,#2c3e50)',
  },
  {
    id: 8, name: 'Milky Way.jpg', seed: 'lake-1', w: 1400, h: 900,
    dims: '3840 × 2160', size: '3.3 MB',
    gradient: 'linear-gradient(160deg,#0f2027,#2c5364)',
  },
]

// Markup pen colors, mirroring Preview's swatch row.
export const MARKUP_COLORS = [
  '#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2', '#000000', '#ffffff',
]
