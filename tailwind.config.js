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
                    600: '#96a725',
                    700: '#78861e',
                    800: '#5a6416',
                    900: '#434b11',
                },
                // Override Tailwind "indigo" to match Kivii brand color across Jetstream scaffolding.
                indigo: {
                    50: '#fafbee',
                    100: '#f4f8de',
                    200: '#e9f0bc',
                    300: '#dce792',
                    400: '#cede69',
                    500: '#aec22b',
                    600: '#96a725',
                    700: '#78861e',
                    800: '#5a6416',
                    900: '#434b11',
                },
            },
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms, typography],
};
