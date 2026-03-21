import React, { useState } from 'react';
import { Mail, User, Phone, Calendar, Loader2, Globe } from 'lucide-react';

const PAISES = [
    "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán", "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia", "Birmania", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi", "Bután", "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Ciudad del Vaticano", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba", "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Etiopía", "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guyana", "Guinea", "Guinea ecuatorial", "Guinea-Bisáu", "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia", "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo", "Macedonia del Norte", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia", "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Suazilandia", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam", "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Uruguay", "Uzbekistán", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Zambia", "Zimbabue"
];

export default function CourseLeadForm() {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                setStatus('success');
                setMessage('¡Plaza reservada! Te avisaremos cuando el curso esté listo.');
                e.target.reset(); // Vacia los campos tras el éxito
            } else {
                throw new Error("Error en el servidor");
            }
        } catch (error) {
            setStatus('error');
            setMessage('Hubo un problema. Por favor, inténtalo más tarde.');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-gray-100 dark:border-gray-700">
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center">Únete a la Lista de Espera</h3>
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-8 text-center max-w-lg mx-auto">
                Apúntate sin compromiso y recibe un descuento exclusivo al abrir plazas.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 
                  SISTEMA ANTISPAM "HONEYPOT" 🍯
                  Es invisible para humanos por CSS. Los BOTS, al ver código HTML, lo rellenan automáticamente.
                  El servidor de Vercel (api/subscribe) detectará que está relleno y bloqueará ese intento en la sombra.
                */}
                <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                    <label htmlFor="website_url">No rellenes este campo si eres humano</label>
                    <input type="text" id="website_url" name="website_url" tabIndex="-1" autoComplete="off" />
                </div>

                {/* Campos visibles reales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <input required type="text" name="nombre" placeholder="Nombre" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
                    </div>
                    <div className="relative">
                        <input required type="text" name="apellidos" placeholder="Apellidos" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
                    </div>

                    <div className="relative md:col-span-2">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <input required type="email" name="email" placeholder="Correo electrónico principal" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
                    </div>

                    <div className="relative">
                        <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <input type="tel" name="telefono" placeholder="Teléfono" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
                    </div>
                    
                    <div className="relative">
                        <Globe className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <select required name="pais" defaultValue="" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none cursor-pointer font-medium">
                            <option value="" disabled>Selecciona País...</option>
                            {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="relative md:col-span-2">
                        <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <input type="date" name="fecha_nacimiento" className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
                    </div>
                </div>

                {/* Confirmación RGPD Obligatoria */}
                <div className="flex items-start mt-4 pt-2">
                    <div className="flex items-center h-5 mt-0.5">
                        <input required id="privacy" name="privacy" type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 transition-colors cursor-pointer" />
                    </div>
                    <label htmlFor="privacy" className="ms-3 text-xs font-medium text-gray-500 dark:text-gray-400 leading-snug cursor-pointer">
                        He leído y acepto la <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-500">Política de Privacidad</a> y consiento recibir información y recursos gratuitos vinculados.
                    </label>
                </div>

                <button 
                    type="submit" 
                    disabled={status === 'loading'}
                    className="w-full text-white bg-blue-600 hover:bg-blue-500 focus:ring-4 focus:outline-none focus:ring-blue-600/50 font-extrabold rounded-xl text-lg md:text-xl px-5 py-4 text-center flex justify-center items-center mt-8 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 cursor-pointer"
                >
                    {status === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Reservar mi Plaza Gratis'}
                </button>

                {/* Feedback del sistema */}
                {status === 'success' && <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800"><p className="text-sm text-green-700 dark:text-green-400 font-medium text-center">{message}</p></div>}
                {status === 'error' && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800"><p className="text-sm text-red-700 dark:text-red-400 font-medium text-center">{message}</p></div>}
            </form>
        </div>
    );
}
