/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                capaBlue: '#2575c4', // Azul exacto CAPA CERO
            },
        },
    },
    plugins: [],
}
