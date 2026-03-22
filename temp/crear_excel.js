import * as XLSX from 'xlsx';
import path from 'path';

const data = [
  // Block 1
  ["SUNLU Rápido PETG Filamento 3D 1.75mm 1KG", "Alta resistencia mecánica y térmica", "Fácil de imprimir a altas velocidades sin atascos", "Requiere mayor temperatura de cama que el PLA normal"],
  ["SUNLU PLA Plus 2.0 Filamento para Impresora 3D Rápido 1.75mm", "Extrusión súper fluida ideal para impresoras rápidas", "Mayor dureza y tolerancia a impactos que el PLA estándar", "Puede dejar hilos muy finos (stringing) si no ajustas la retracción"],
  ["SUNLU 8 Paquetes Filamento ASA de 1,75 mm", "Excelente tolerancia a los rayos UV (ideal para exteriores)", "Muy duradero y maleable con vapor de acetona", "Emite gases tóxicos al imprimir (requiere estar en zona ventilada)"],
  ["SUNLU PLA Plus 2.0 Filamento para Impresora 3D Rápido 1.75mm", "Extrusión ultra rápida sin interrupciones ni clics del motor", "Acabado superficial extremadamente liso y sedoso", "Su rigidez extrema lo hace inadecuado para piezas que necesiten flexar"],
  ["GEEETECH 3D Filament PETG 1,75 mm 1 kg para impresora 3D", "Muy fuerte adhesión entre las capas (evita rotura estructural)", "Tolerancia de diámetro estricta y control libre de burbujas", "La adhesión a la cama es muy fuerte (usa laca para no arrancar el PEI)"],
  ["SUNLU Filamento PLA Brillo en la Oscuridad", "Efecto fotoluminiscente súper llamativo en la oscuridad", "Se imprime de forma tan sencilla como cualquier PLA clásico", "El filamento es muy abrasivo (desgasta las boquillas de latón rápido)"],
  ["SUNLU Silk PLA Plus Filamento para impresora 3D", "Efecto visual tricolor perlado espectacular en piezas curvas", "Diseño que disimula perfectamente las líneas de impresión entre capa y capa", "La adherencia térmica entre capas es algo más débil que en el PLA puro"],
  ["SUNLU PLA+ Filament 1.75mm", "Bobinado 100% perfecto y ordenado que evita tirones", "Paleta de colores hiper vivos y de tono consistente siempre", "Soporta menos el calor estructural (se deforma si lo dejas al sol en verano)"],
  ["SUNLU Filamento PLA + 2.0 de 1 kg", "Fórmula \"Anti-fragilidad\" mejorada para impresiones más robustas", "Excelente tolerancia geométrica garantizada de +/- 0.02mm", "Al ser más resistente, quitar los soportes cuesta un poco más de trabajo"],
  ["SUNLU Filamento PLA Plus para impresora 3D", "Adhesión inicial fenomenal a camas tanto frías como calientes", "Gran variedad de formatos cromáticos mate y brillantes", "Al igual que todo PLA, no es óptimo para piezas bajo fricción constante"],
  ["ANYCUBIC ASA Filamento 1,75mm", "Calidad de nivel premium diseñada para piezas de ingeniería", "Soporta la lluvia y la intemperie sin perder propiedades químicas", "Alta tendencia a curvarse (warping) si se imprime sin la impresora cerrada"],
  
  ["", "", "", ""],

  // Block 2
  ["BIQU - Panda CryoGrip Pro - Placa Fria", "Adhesión magnética extrema sin necesidad de echar lacas ni pegamentos", "El frío criogénico facilita que las piezas grandes \"salten\" solas al terminar", "El precio es bastante elevado en comparación con las láminas PEI estándar"],
  ["Glarks 460 piezas M2 M3 M4", "Kit completísimo para hacer infinidad de montajes en robótica e impresoras 3D", "Caja divisoria perfecta para tener el taller siempre organizado", "La tornillería es de latón blando (no los aprietes con taladro industrial)"],
  ["Kit Hotend Completo para 3D Impresora Bambu Lab X1/X1C", "La resistencia cerámica permite un calentamiento veloz", "Ya incluye boquillas de acero endurecido para usar PLA de carbono", "Exclusivo y limitado únicamente para el ecosistema de impresoras Bambu Lab"],
  ["52 piezas Imanes de neodimio 10x2 mm extremadamente potentes", "Fuerza de atracción brutal teniendo en cuenta su tamaño diminuto", "Acristalado de níquel que lo protege de la oxidación frente al aire", "Los imanes de neodimio son muy frágiles y se astillan ante golpes duros"],
  ["Kit de lámpara LED para impresora", "Aporta una iluminación periférica excelente para la cámara de vigilancia", "Le da una estética premium e industrial a la impresora 3D apagada", "La instalación exige saber manejar mínimamente perfiles y ruteo de cables"],
  ["Kit De Tubos Termorretráctiles 650 Piezas 2:1 Negro", "Gran surtido de diámetros para abarcar cualquier grosor de empalme", "La relación de contracción es idónea y abraza el cable con firmeza", "El pack entero solo se entrega en color negro perdiendo código de colores"],
  ["15m 2x0.81mm² 18AWG de Extensión Cable", "Cobre altamente conductivo gracias a su núcleo pre-estañado", "Altísima flexibilidad y recubrimiento aislante maleable ideal para guías", "El diámetro no soporta la alta corriente de una Cama Caliente general"],
  ["150pcs Terminales Eléctricos Termorretráctiles", "Fusiona el cableado y sella herméticamente contra el agua en el mismo paso", "Aislamiento impermeable grado IP67 idóneo para componentes externos", "A fuerza exigen una pistola de aire caliente potente, el mechero no sirve"],
  ["Tira LED COB 3m Tira LED Regulable con Mando e Alimentación", "Luz de cinta homogénea y continua, sin los molestos \"puntos\" LED visibles", "Índice altísimo de representación cromática (CRI mayor a 90) que no falsea colores", "Las cintas COB disipan mucho calor y exigen estar pegadas sobre perfil de aluminio"],
  ["700 piezas de tornillos Phillips de cabeza avellanada", "Surtido de tuercas incontable para reponer pérdidas en placas y chasis RC", "Acabado liso negro mate muy elegante para disimular tornillos de vista", "El formato cian Philips se estropeará si el destornillador no encaja 100% exacto"],
  ["Super Lube® Multipropósito Grasa Sintética", "El aceite de Teflón (PTFE) por excelencia para engrasar varillas y guías lineales", "Gracias a ser sintético, atrapa un 80% menos de polvo que el aceite mineral negro", "Es extremadamente pegajosa si entra en contacto con la piel al aplicarla"],
  ["72 Colores de Rotuladores Acrílicos para", "Su tinta opaca hiper-cubriente es la número uno para pintar encima del PLA", "Aporta tonos inmensos, neones y metálicos espectaculares", "La punta microporosa tiende a secarse irreversiblemente si no tapas al segundo"],
  ["40 Piezas Mini Luces LED Luz", "Ideales para retro-iluminar figuras e iluminar maquetas con filamento transparente", "Su bajísimo amperaje de consumo dispara la duración de la batería de botón", "El recubrimiento de los hilos de cobre es minúsculo y se parte con rozaduras"],
  ["Superpegamento Gel Extra Fuerte", "La textura de gel no gotea absolutamente nada en las verticales, dándote control final", "Funde termoplásticos (PETG, PLA y ABS) soldándolos como una roca impenetrable", "El dispensador puede llegar a atascarse con los meses si el tapón no apretó bien"],
  ["Soldador Estaño Set 24 in 1 con Caja de Herramientas", "Estación de control temperatura sencilla que agiliza el trabajo", "Trae bomba desoldadora y todo el catálogo en una caja perfecta para principiantes", "La aleación estructural de las puntas es de rango básico y termina degradando"],
  ["Alcohol isopropílico 99,99% 5L", "Cómputo por litro increíblemente económico para talleres y power-users intensivos", "No deja ni rastro blanco en la limpieza del cristal y del PEI liso", "Esencial manipular los 5 Litros lejos de mascotas y con mascarilla de rejilla"],
  ["440 Piezas M3 Juego de Tornillos y Tuercas", "El templado de Acero INOX permite someterlos a alta humedad y entornos de agua", "Dado su cabeza hexagonal no existe peligro del típico destornillador resbalado", "Para el trabajo diario se necesita siempre tener cerca la respectiva llave de tubo"],
  ["100 Piezas 25 mm Anillas Llaveros", "La pieza fetiche para amortizar retales de filamento y vender llaveros articulados", "Posee un muelle cerrado extremadamente robusto e irrompible a la mano", "Dado el volumen a granel, algunos en base pueden enlazarse perdiendo tiempo en separar"],

  ["", "", "", ""],

  // Block 3
  ["Soplador de aire eléctrico turbo", "Crea un flujo de presión industrial masivo y eficaz para despejar placas de circuito abierto", "Completamente inalámbrico e ideal para rutinas de limpieza en el interior de un PC", "La velocidad de giro del rotor provoca un fuerte y notorio aullido al activarse"],
  ["Linterna UV 2 en 1", "Endurece masillas de resina y cianocrilatos sensitivos en segundos visualizando fisuras", "Diseño de chasis todo terreno con luz diurna muy útil en apagones", "Existen muchas variantes en las baterías por lo general demandando carga frecuente"],
  ["Herramienta de Desbarbado", "Elimina a ras el temido \"Pie de Elefante\" del PLA puliendo las bases al tacto real", "Ergonomía perfecta y repuestos de cuchilla universal que alargan la vida útil", "Es muy agresiva y requiere una técnica sutil para no arañar la propia pieza visual"],
  ["Swpeet Kit de Herramientas de Desborrado", "Set definitivo para retirar perfiles de soporte imposibles u ocultos tras la impresión", "Organización espectacular con funda rígida estanca para no dañar puntas por viaje", "Las limas aserradas de la funda necesitan bastante control para lijar caras expuestas"],
  ["Juego de herramientas de inserción de calor", "El soldador clave para estampar roscas post-impresión 3D dentro de carcasas y soportes", "Ofrece matrices y guías específicas para insertar perfectamente las tuercas M3 o M4", "El cuerpo general irradia mucho calor a la empuñadura a los pocos minutos de encendido"],
  ["3 cepillos de limpieza de boquillas de impresión 3D", "Cepillado constante sin deteriorar o arañar críticamente el bloque de los filamentos", "Evitan el mal olor de los pegotes calcinados arrastrando toda mancha superficial del latón", "Al igual que los cepillos de limpieza dental los alambres acaban muy aplastados y curvos"],
  ["Juego de bolsas de almacenamiento de filamentos", "Consigue estancar la humedad logrando un vacío puro gracias a sus válvulas plásticas de 2 pasos", "Construcción a prueba de pinchazos por los bordes afilados y puntas de los carretes gruesos", "Trabajar el vacío total con la bomba cilíndrica manual exprime físicamente el brazo del usuario"]
];

const headers = ["Nombre Producto (Guía Solo Para Mirar)", "ventaja_1", "ventaja_2", "desventaja_1"];
const worksheetData = [headers, ...data];

const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Pros y Contras");

const outputPath = path.resolve('temp', 'Reseñas_Afiliados.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`Excel generado con éxito en: ${outputPath}`);
