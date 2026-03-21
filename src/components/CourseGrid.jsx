import React, { useState, useEffect } from 'react';
import CourseCard from './CourseCard';
import CourseLanding from './CourseLanding';
import cursosData from '../data/cursos.json';

export default function CourseGrid() {
    const [cursos, setCursos] = useState([]);

    useEffect(() => {
        // Carga estática local generada por update-cursos.js
        setCursos(cursosData || []);
    }, []);

    if (cursos.length === 0) {
        return (
            <div className="text-center py-32 px-4">
                <p className="text-gray-400 text-2xl font-semibold mb-4">
                    Próximamente: Nuevos Cursos
                </p>
                <p className="text-gray-500">
                    Estamos preparando contenido exclusivo sobre Impresión 3D. ¡Vuelve pronto!
                </p>
            </div>
        );
    }

    // Calculamos dinámicamente si solo hay un curso publicado para darle el tratamiento "Estrella"
    const isSingleCourse = cursos.length === 1;

    if (isSingleCourse) {
        return <CourseLanding course={cursos[0]} />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20 pt-10">
            <div className="text-center mb-16">
                <div className="inline-block bg-blue-900/30 text-blue-400 border border-blue-800/50 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    Academia Capa Cero
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                    {isSingleCourse ? 'Nuestra Formación Estrella' : 'Cursos Premium'}
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Domina la impresión 3D desde cero hasta nivel experto. Apúntate a la lista de espera para recibir <strong className="text-gray-300">descuentos exclusivos del 80%</strong> en los lanzamientos.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cursos.map((course) => (
                    <CourseCard key={course.id} course={course} layout="grid" />
                ))}
            </div>
        </div>
    );
}
