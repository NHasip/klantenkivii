import defaultTheme from 'tailwindcss/defaultTheme';
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
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms, typography],
};
