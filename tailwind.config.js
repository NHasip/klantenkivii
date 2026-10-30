import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './vendor/laravel/jetstream/**/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.js',
        './resources/js/**/*.jsx',
    ],

    // Badge-tonen worden dynamisch opgebouwd (`badge-${tone}` in ui.jsx en Blade): altijd meebouwen.
    safelist: [{ pattern: /^badge-(neutral|brand|success|warning|danger|info)$/ }],
    theme: {
        extend: {
            colors: {
                kivii: {
                    50: '#fafbee',
                    100: '#f4f8de',
                    200: '#e9f0bc',
                    300: '#dce792',
                    400: '#cede69',
                    500: '#aec22b',
                    // 600+ donkerder gemaakt: wit op 600 haalt 5.2:1 (WCAG AA), 500 blijft het merkgroen.
                    600: '#667319',
                    700: '#56611a',
                    800: '#474f15',
                    900: '#383e11',
                },
                // Override Tailwind "indigo" to match Kivii brand color across Jetstream scaffolding.
                indigo: {
                    50: '#fafbee',
                    100: '#f4f8de',
                    200: '#e9f0bc',
                    300: '#dce792',
                    400: '#cede69',
                    500: '#aec22b',
                    // 600+ donkerder gemaakt: wit op 600 haalt 5.2:1 (WCAG AA), 500 blijft het merkgroen.
                    600: '#667319',
                    700: '#56611a',
                    800: '#474f15',
                    900: '#383e11',
                },
            },
            // Designtokens (fase 1 design foundation). Gebruik bij voorkeur de componentklassen in resources/css/app.css.
            // canvas = paginaachtergrond (zinc met een vleug merkgroen), surface = kaarten/panelen.
            backgroundColor: {
                canvas: '#f5f6f1',
                surface: '#ffffff',
            },
            borderColor: {
                hairline: 'rgb(228 228 231 / 0.8)',
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(24 24 27 / 0.04), 0 1px 3px 0 rgb(24 24 27 / 0.03)',
                'card-hover': '0 2px 4px -1px rgb(24 24 27 / 0.05), 0 6px 16px -4px rgb(24 24 27 / 0.08)',
                pop: '0 4px 6px -2px rgb(24 24 27 / 0.05), 0 16px 32px -8px rgb(24 24 27 / 0.14)',
                'inset-hairline': 'inset 0 0 0 1px rgb(24 24 27 / 0.06)',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            fontSize: {
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
            },
            letterSpacing: {
                snug: '-0.011em',
                display: '-0.022em',
            },
            width: {
                sidebar: '16rem',
            },
            padding: {
                sidebar: '16rem',
            },
            maxWidth: {
                content: '88rem',
            },
            // Systeemlettertype: geen externe fonts laden, overal dezelfde rustige stack.
            fontFamily: {
                sans: [
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    '"Noto Sans"',
                    'sans-serif',
                    '"Apple Color Emoji"',
                    '"Segoe UI Emoji"',
                ],
            },
        },
    },

    plugins: [forms, typography],
};
