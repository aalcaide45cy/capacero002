// api/subscribe.js - Vercel Serverless Function
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { nombre, apellidos, email, telefono, fecha_nacimiento, pais, website_url } = req.body;

        // 1. COMPROBACIÓN ANTISPAM HONEYPOT (Trampa para Bots)
        // El campo 'website_url' es invisible en el front. Un humano no puede rellenarlo.
        if (website_url) {
            console.log("🤖 🚨 Bot eliminado vía Honeypot. Registro silenciosamente descartado.");
            // Le devolvemos un 200 OK al bot para que crea que ha tenido éxito y no intente ataques alternativos.
            return res.status(200).json({ message: "¡Suscripción exitosa!" });
        }

        // 2. REENVÍO A GOOGLE SHEETS (VÍA APPS SCRIPT)
        // Usamos la URL que generó el usuario del Apps Script
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSRfnlCNi4vDwyPw4e7qIvXo5jn3Yd3WT_h4uwj8-pQf2NRJ-B40uSG2_bzOpbsow0/exec";
        
        const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                nombre, 
                apellidos, 
                email, 
                telefono, 
                fecha_nacimiento, 
                // Enviar la clave multiplicada previniendo errores tipográficos en el Excel del cliente
                pais, 
                "país": pais, 
                "pais ": pais, 
                "país ": pais 
            })
        });

        if (!googleResponse.ok) {
            throw new Error(`Error en el destino (Google Sheets): ${googleResponse.status}`);
        }

        // 3. (OPCIONAL EN EL FUTURO) REENVÍO A MAILERLITE / BREVO
        // Aquí añadiremos el fetch a la API de MailerLite cuando esté la cuenta creada.

        return res.status(200).json({ message: "¡Suscripción confirmada! Revisa tu bandeja de entrada pronto." });

    } catch (error) {
        console.error("🔥 Error crítico en /api/subscribe:", error);
        return res.status(500).json({ message: "Ha ocurrido un error en nuestros servidores. Inténtalo más tarde." });
    }
}
