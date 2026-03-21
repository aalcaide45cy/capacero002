import React from 'react';

export default function PrivacyCookies() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-16 text-gray-300">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-10 tracking-tight">Política de Privacidad y Cookies</h1>
            
            <div className="space-y-10 text-lg leading-relaxed">
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">1. Identificación del Responsable</h2>
                    <p className="text-gray-400">En estricto cumplimiento de la Ley de Servicios de la Sociedad de la Información y el Comercio Electrónico (LSSI-CE) y el Reglamento General de Protección de Datos (RGPD), Capa Cero informa que el tratamiento de los datos recabados en este sitio web es confidencial y destinado exclusivamente a las finalidades indicadas en esta política.</p>
                </section>
                
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">2. Finalidad del Tratamiento de Datos</h2>
                    <p className="text-gray-400">Los datos que nos proporcionas libremente a través de nuestros formularios (nombre, correo electrónico, país, etc.) se guardan y protegen con la única finalidad de:</p>
                    <ul className="list-disc pl-6 mt-4 space-y-3 text-gray-400">
                        <li>Garantizar el acceso a la plataforma y tramitación de compras.</li>
                        <li>Enviar comunicaciones relevantes, descuentos de lanzamiento y novedades estrcitamente ligadas al ecosistema de la Impresión 3D.</li>
                        <li>Proporcionar soporte técnico y resolver tus dudas de alumno.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">3. Política de Cookies</h2>
                    <p className="text-gray-400">Capa Cero utiliza un sistema mínimo e indispensable de cookies. Las empleamos exclusivamente para el <strong>funcionamiento técnico y memorización</strong> (por ejemplo, para recordar que ya has ocultado el banner legal) y para métricas de tráfico totalmente anónimas. No perfilamos a nuestros usuarios ni vendemos datos de navegación a terceros.</p>
                </section>
                
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">4. Conservación y Derechos del Usuario</h2>
                    <p className="text-gray-400">Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición en cualquier instante. Cualquier e-mail que recibas por nuestra parte incluirá en su parte inferior un botón directo para darte de baja permanentemente del servicio. Jamás cederemos ni alquilaremos tu información a terceros.</p>
                </section>
            </div>
        </div>
    );
}
