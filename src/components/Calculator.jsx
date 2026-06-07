import React, { useState, useEffect } from 'react';
import { DollarSign, Zap, Layers, Clock, TrendingUp } from 'lucide-react';

export default function Calculator() {
    // 1. Coste de Material
    const [precioRollo, setPrecioRollo] = useState(20);
    const [pesoRollo, setPesoRollo] = useState(1000);
    const [pesoPieza, setPesoPieza] = useState(150);
    const subtotalMaterial = (precioRollo / (pesoRollo || 1)) * pesoPieza;

    // 2. Consumo Eléctrico
    const [potencia, setPotencia] = useState(200);
    const [horasImpresion, setHorasImpresion] = useState(4.5);
    const [precioKwh, setPrecioKwh] = useState(0.15);
    const subtotalElectricidad = (potencia / 1000) * horasImpresion * precioKwh;

    // 3. Desgaste de la Máquina (Hardware wear)
    const [wearItems, setWearItems] = useState([
        { id: 'impresora', name: 'Impresora', desc: 'Chasis, motores, electrónica', price: 300, life: 5000 },
        { id: 'nozzle', name: 'Boquilla (Nozzle)', desc: 'Acero, latón, diamante...', price: 5, life: 300 },
        { id: 'cama', name: 'Superficie Cama', desc: 'PEI, cristal magnético', price: 25, life: 1000 },
        { id: 'mantenimiento', name: 'Mantenimiento General', desc: 'Lubricantes, correas, AMS...', price: 40, life: 2000 }
    ]);

    const handleWearChange = (index, field, value) => {
        const updated = [...wearItems];
        updated[index][field] = parseFloat(value) || 0;
        setWearItems(updated);
    };

    const wearPerHour = wearItems.reduce((acc, item) => acc + (item.price / (item.life || 1)), 0);
    const subtotalDesgaste = wearPerHour * horasImpresion;

    // 4. Mano de Obra
    const [tarifaHora, setTarifaHora] = useState(10);
    const [tiempoPrep, setTiempoPrep] = useState(15);
    const [tiempoPost, setTiempoPost] = useState(15);
    const subtotalManoObra = tarifaHora * ((tiempoPrep + tiempoPost) / 60);

    // 5. Riesgo y Margen
    const [riesgoFallo, setRiesgoFallo] = useState(8);
    const [beneficioNeto, setBeneficioNeto] = useState(20);

    // 6. Resultados (Calculados al presionar el botón)
    const [resultados, setResultados] = useState(null);

    const calcularPrecioFinal = () => {
        const baseCost = subtotalMaterial + subtotalElectricidad + subtotalDesgaste + subtotalManoObra;
        const prodCost = subtotalMaterial + subtotalElectricidad + subtotalDesgaste;
        const riesgoCost = baseCost * (riesgoFallo / 100);
        const beneficioCost = (baseCost + riesgoCost) * (beneficioNeto / 100);
        const ventaRecomendado = baseCost + riesgoCost + beneficioCost;
        const ventaConIva = ventaRecomendado * 1.21;

        setResultados({
            prodCost,
            ventaRecomendado,
            material: subtotalMaterial,
            electricidad: subtotalElectricidad,
            desgaste: subtotalDesgaste,
            manoObra: subtotalManoObra,
            riesgo: riesgoCost,
            beneficio: beneficioCost,
            ventaConIva
        });
    };

    // Auto-calculate on mount
    useEffect(() => {
        calcularPrecioFinal();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 pb-24 text-zinc-300">
            {/* Header / Intro */}
            <div className="text-center mb-12">
                <div className="inline-block bg-capaBlue/20 text-capaBlue border border-capaBlue/40 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4 shadow-[0_0_15px_rgba(37,117,196,0.15)]">
                    Calculadora de Impresión 3D
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                    Calcula el coste real de tu impresión 3D
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                    Determina con precisión el precio de cada pieza: material, electricidad, desgaste de máquina y mano de obra. Sin estimaciones, sin sorpresas.
                </p>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Direct costs (Material, Electricity, Labor, Margins) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* 1. Coste de Material */}
                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-900/30 rounded-lg text-capaBlue border border-blue-800/30">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Coste de Material</h3>
                                <p className="text-xs text-zinc-500">Peso real calculado por el laminador</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Precio Rollo (€)</label>
                                <input
                                    type="number"
                                    value={precioRollo}
                                    onChange={(e) => setPrecioRollo(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Peso Rollo (g)</label>
                                <input
                                    type="number"
                                    value={pesoRollo}
                                    onChange={(e) => setPesoRollo(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Peso Pieza (g)</label>
                                <input
                                    type="number"
                                    value={pesoPieza}
                                    onChange={(e) => setPesoPieza(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-sm">
                            <span className="text-zinc-500 font-medium">Subtotal Material</span>
                            <span className="text-white font-extrabold text-lg">{subtotalMaterial.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* 2. Consumo Eléctrico */}
                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-yellow-900/30 rounded-lg text-yellow-500 border border-yellow-800/30">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Consumo Eléctrico</h3>
                                <p className="text-xs text-zinc-500">Gasto energético estimado por horas de uso</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Potencia (W)</label>
                                <input
                                    type="number"
                                    value={potencia}
                                    onChange={(e) => setPotencia(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Horas Impresión (H)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={horasImpresion}
                                    onChange={(e) => setHorasImpresion(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Precio KWH (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={precioKwh}
                                    onChange={(e) => setPrecioKwh(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-sm">
                            <span className="text-zinc-500 font-medium">Subtotal Electricidad</span>
                            <span className="text-white font-extrabold text-lg">{subtotalElectricidad.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* 4. Mano de Obra */}
                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-900/30 rounded-lg text-emerald-400 border border-emerald-800/30">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Mano de Obra</h3>
                                <p className="text-xs text-zinc-500">Tiempo de preparación y post-procesado</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Tarifa (€/H)</label>
                                <input
                                    type="number"
                                    value={tarifaHora}
                                    onChange={(e) => setTarifaHora(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Prep. (Min)</label>
                                <input
                                    type="number"
                                    value={tiempoPrep}
                                    onChange={(e) => setTiempoPrep(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Post-Proc. (Min)</label>
                                <input
                                    type="number"
                                    value={tiempoPost}
                                    onChange={(e) => setTiempoPost(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-sm">
                            <span className="text-zinc-500 font-medium">Subtotal Mano de Obra</span>
                            <span className="text-white font-extrabold text-lg">{subtotalManoObra.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* 5. Riesgo y Margen */}
                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-900/30 rounded-lg text-orange-400 border border-orange-800/30">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Riesgo y Margen</h3>
                                <p className="text-xs text-zinc-500">Márgenes de seguridad y beneficios esperados</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Riesgo de Fallo (%)</label>
                                <input
                                    type="number"
                                    value={riesgoFallo}
                                    onChange={(e) => setRiesgoFallo(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-2">Beneficio Neto (%)</label>
                                <input
                                    type="number"
                                    value={beneficioNeto}
                                    onChange={(e) => setBeneficioNeto(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Wear Items & Result Sheet */}
                <div className="lg:col-span-5 space-y-6">
                    {/* 3. Desgaste de la Máquina */}
                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400 border border-purple-800/30">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Precio por Hora de Uso</h3>
                                <p className="text-xs text-zinc-500">Amortización de impresora y recambios</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {wearItems.map((item, idx) => {
                                const costPerHour = item.price / (item.life || 1);
                                return (
                                    <div key={item.id} className="border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-semibold text-zinc-200 text-sm block">{item.name}</span>
                                                <span className="text-[10px] text-zinc-500">{item.desc}</span>
                                            </div>
                                            <span className="text-xs font-bold text-zinc-400">{costPerHour.toFixed(3)} €/H</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Precio Reemplazo (€)</label>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleWearChange(idx, 'price', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded px-2 py-1 text-white text-xs outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Vida Útil (Horas)</label>
                                                <input
                                                    type="number"
                                                    value={item.life}
                                                    onChange={(e) => handleWearChange(idx, 'life', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-capaBlue rounded px-2 py-1 text-white text-xs outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-sm">
                            <span className="text-zinc-500 font-medium">Coste de máquina por hora</span>
                            <span className="text-white font-extrabold text-base">{wearPerHour.toFixed(3)} €/H</span>
                        </div>
                        <div className="mt-1 flex justify-between items-center text-xs text-zinc-500">
                            <span>Subtotal Desgaste ({horasImpresion}H)</span>
                            <span className="font-bold">{subtotalDesgaste.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* Calculate Button */}
                    <button
                        onClick={calcularPrecioFinal}
                        className="relative flex items-center justify-center h-12 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-base rounded-full transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.7)] uppercase tracking-wider overflow-hidden group cursor-pointer active:scale-95"
                    >
                        <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                            🧮 CALCULAR PRECIO FINAL
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:transition-all group-hover:duration-700 group-hover:translate-x-[150%] pointer-events-none"></div>
                    </button>
                </div>
            </div>

            {/* Profitability Analysis Report (Spanned bottom) */}
            {resultados && (
                <div className="mt-12 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-8 animate-fade-in">
                    <h3 className="text-xs font-bold text-capaBlue tracking-widest uppercase border-b border-zinc-800 pb-3">
                        Análisis de Rentabilidad
                    </h3>

                    {/* Cost Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-950/60 p-6 rounded-2xl border border-zinc-800/80">
                            <span className="block text-xs font-extrabold text-orange-400/90 uppercase tracking-widest mb-2">
                                Coste Real de Producción
                            </span>
                            <span className="text-4xl font-black text-white">{resultados.prodCost.toFixed(2)} €</span>
                            <span className="block text-[10px] text-zinc-500 mt-2">Material + Electricidad + Desgaste</span>
                        </div>
                        <div className="bg-zinc-950/60 p-6 rounded-2xl border border-zinc-800/80 relative overflow-hidden">
                            <span className="block text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-2">
                                Precio Venta Recomendado
                            </span>
                            <span className="text-4xl font-black text-white">{resultados.ventaRecomendado.toFixed(2)} €</span>
                            <span className="block text-[10px] text-zinc-500 mt-2">Incluye Mano de Obra, Riesgo y Margen</span>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">📦 Material</span>
                            <span className="font-semibold text-white">{resultados.material.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">⚡ Electricidad</span>
                            <span className="font-semibold text-white">{resultados.electricidad.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">⚙️ Desgaste de Máquina ({horasImpresion}H)</span>
                            <span className="font-semibold text-white">{resultados.desgaste.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">👤 Mano de Obra</span>
                            <span className="font-semibold text-white">{resultados.manoObra.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">⚠️ Seguro de Riesgo ({riesgoFallo}%)</span>
                            <span className="font-semibold text-white">{resultados.riesgo.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-zinc-400">💰 Margen de Beneficio Neto ({beneficioNeto}%)</span>
                            <span className="font-semibold text-white">{resultados.beneficio.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-base font-extrabold text-white pt-4 border-t border-zinc-900/60">
                            <span>Precio final (IVA 21% Incluido)</span>
                            <span className="text-capaBlue text-lg">{resultados.ventaConIva.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
