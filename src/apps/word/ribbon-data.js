// Static ribbon configuration for the Word clone.

export const FONTS = [
  {
    id: 'system',
    label: 'System',
    css: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  },
  { id: 'georgia', label: 'Georgia', css: "Georgia, 'Times New Roman', serif" },
  { id: 'times', label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { id: 'courier', label: 'Courier New', css: "'Courier New', Courier, monospace" },
]

export const SIZES = [11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]

export const TEXT_COLORS = [
  { label: 'Black', value: '#1d1d1f' },
  { label: 'Gray', value: '#86868b' },
  { label: 'Red', value: '#d70015' },
  { label: 'Orange', value: '#ff8500' },
  { label: 'Yellow', value: '#ffd60a' },
  { label: 'Green', value: '#248a3d' },
  { label: 'Blue', value: '#0a5cff' },
  { label: 'Purple', value: '#8944ab' },
]

export const HIGHLIGHTS = [
  { label: 'Yellow', value: '#fff3a3' },
  { label: 'Green', value: '#b7f0b1' },
  { label: 'Cyan', value: '#a5e8f7' },
  { label: 'Pink', value: '#ffc7de' },
  { label: 'No Color', value: 'transparent' },
]

export const SPACINGS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
]

export const MARGINS = [
  { id: 'narrow', label: 'Narrow', desc: '0.5" all around', padding: '48px 64px' },
  { id: 'normal', label: 'Normal', desc: '1" all around', padding: '96px' },
  { id: 'wide', label: 'Wide', desc: '1" top/bottom, 2" left/right', padding: '96px 192px' },
]

export const PAGE_SIZES = [
  { id: 'letter', label: 'Letter', desc: '8.5" × 11"', w: 816, h: 1056 },
  { id: 'legal', label: 'Legal', desc: '8.5" × 14"', w: 816, h: 1344 },
  { id: 'a4', label: 'A4', desc: '8.27" × 11.69"', w: 816, h: 1123 },
]

export const EMOJIS = [
  '🖼️', '😀', '😁', '😂', '😊', '😍', '😎', '🤔',
  '👍', '👏', '🙏', '❤️', '🔥', '✨', '🎉', '🎂',
  '⚽', '🎮', '🎵', '📚', '✏️', '📌', '📎', '🚀',
  '✈️', '🚗', '🏠', '🌈', '☀️', '🌙', '⭐', '🌸',
  '🍎', '🍕', '☕', '🐱', '🐶', '🦄', '🌍', '💡',
]
