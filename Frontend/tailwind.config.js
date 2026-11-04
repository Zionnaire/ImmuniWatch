/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Vital Intel — Deep Emerald brand palette ──────────────────────────
        primary:   {
          DEFAULT: '#0d3d3d',   // Deep Emerald
          dark:    '#082828',
          light:   '#1a5252',
          muted:   'rgba(13,61,61,0.08)',
        },
        secondary: {
          DEFAULT: '#00897b',   // Teal accent
          light:   '#26a69a',
          muted:   'rgba(0,137,123,0.10)',
        },
        // ── Accent pastels (data differentiation) ────────────────────────────
        peach:    { DEFAULT: '#F4A261', light: '#FFD8B8', muted: 'rgba(244,162,97,0.15)' },
        mauve:    { DEFAULT: '#B08BBF', light: '#E4D4EE', muted: 'rgba(176,139,191,0.15)' },
        ocean:    { DEFAULT: '#5BA4CF', light: '#BDD9F0', muted: 'rgba(91,164,207,0.15)' },
        // ── Surfaces ─────────────────────────────────────────────────────────
        surface: {
          DEFAULT: '#f0f4f4',
          base:    '#e8eeee',
          glass:   'rgba(255,255,255,0.72)',
          card:    'rgba(255,255,255,0.82)',
        },
        'on-surface': '#0f2626',
        'on-muted':   '#4a6060',
        'border-glass': 'rgba(13,61,61,0.10)',
        // ── Semantic ─────────────────────────────────────────────────────────
        error:   { DEFAULT: '#c0392b', light: '#fde8e6' },
        warning: { DEFAULT: '#d97706', light: '#fef3c7' },
        success: { DEFAULT: '#059669', light: '#d1fae5' },
        info:    { DEFAULT: '#2563eb', light: '#dbeafe' },
      },
      fontFamily: {
        sans:    ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        label:   ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        'display-lg':  ['2.5rem',  { lineHeight: '3rem',   letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        'title-lg':    ['1.125rem',{ lineHeight: '1.5rem',  fontWeight: '600' }],
        'body-sm':     ['0.875rem',{ lineHeight: '1.375rem',fontWeight: '400' }],
        'label-caps':  ['0.6875rem',{ lineHeight: '1rem',   fontWeight: '700', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        sm:    '6px',
        DEFAULT:'8px',
        md:    '12px',
        lg:    '16px',
        xl:    '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'glass':      '0 4px 24px rgba(13,61,61,0.08), 0 1px 4px rgba(13,61,61,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
        'glass-lg':   '0 8px 40px rgba(13,61,61,0.12), 0 2px 8px rgba(13,61,61,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
        'glass-xl':   '0 20px 60px rgba(13,61,61,0.16), 0 8px 24px rgba(13,61,61,0.08)',
        'glow':       '0 0 20px rgba(0,137,123,0.25)',
        'glow-sm':    '0 0 8px rgba(0,137,123,0.18)',
        'stat':       '0 2px 16px rgba(13,61,61,0.07), 0 1px 3px rgba(13,61,61,0.04)',
        'dropdown':   '0 12px 40px rgba(13,61,61,0.14), 0 4px 12px rgba(13,61,61,0.08)',
        'sidebar':    '-4px 0 24px rgba(13,61,61,0.20)',
      },
      backdropBlur: {
        glass: '12px',
        'glass-lg': '20px',
      },
      backgroundImage: {
        'emerald-mesh': 'radial-gradient(at 20% 10%, rgba(13,61,61,0.06) 0%, transparent 60%), radial-gradient(at 80% 90%, rgba(0,137,123,0.04) 0%, transparent 60%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)',
        'header-gradient': 'linear-gradient(180deg, rgba(13,61,61,0.03) 0%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
