/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./welcome.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                nunito: ['Nunito', 'sans-serif'],
            },
            colors: {
                sky: {
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                },
            }
        },
    },
    plugins: [],
}