// vocabulary.js — Ciencias Sociales Kapitel 5: Trabajo y profesiones
// Each entry: id (unique), es (Spanish), de (German), emoji
// Categories: trabajo, pesca, agricultura, ganaderia, fabrica, servicios, comercio, transporte, seguridad_vial
const VOCABULARY = [
  // ========== Trabajo (Arbeit) ==========
  { id: "trabajo", es: "el trabajo", de: "die Arbeit", emoji: "💼", cat: "trabajo" },
  { id: "salario", es: "el salario", de: "das Gehalt", emoji: "💰", cat: "trabajo" },
  { id: "contrato", es: "el contrato", de: "der Vertrag", emoji: "📝", cat: "trabajo" },
  { id: "horario", es: "el horario", de: "die Arbeitszeit", emoji: "🕐", cat: "trabajo" },
  { id: "vacaciones", es: "las vacaciones", de: "der Urlaub", emoji: "🏖️", cat: "trabajo" },
  { id: "teletrabajar", es: "teletrabajar", de: "im Homeoffice arbeiten", emoji: "🏠", cat: "trabajo" },

  // ========== Pesca (Fischerei) ==========
  { id: "pesca", es: "la pesca", de: "die Fischerei", emoji: "🎣", cat: "pesca" },
  { id: "pescador", es: "el pescador", de: "der Fischer", emoji: "🧑‍🦺", cat: "pesca" },
  { id: "barco", es: "el barco", de: "das Boot", emoji: "🚢", cat: "pesca" },
  { id: "caladero", es: "el caladero", de: "das Fanggebiet", emoji: "🗺️", cat: "pesca" },
  { id: "pesca-bajura", es: "la pesca de bajura", de: "die Küstenfischerei", emoji: "🏖️", cat: "pesca" },
  { id: "pesca-altura", es: "la pesca de altura", de: "die Hochseefischerei", emoji: "🌊", cat: "pesca" },
  { id: "acuicultura", es: "la acuicultura", de: "die Aquakultur", emoji: "🐟", cat: "pesca" },

  // ========== Agricultura (Landwirtschaft) ==========
  { id: "agricultura", es: "la agricultura", de: "die Landwirtschaft", emoji: "🌾", cat: "agricultura" },
  { id: "agricultor", es: "el agricultor", de: "der Landwirt", emoji: "👨‍🌾", cat: "agricultura" },
  { id: "arar", es: "arar", de: "pflügen", emoji: "🚜", cat: "agricultura" },
  { id: "abonar", es: "abonar", de: "düngen", emoji: "🧪", cat: "agricultura" },
  { id: "sembrar", es: "sembrar", de: "säen", emoji: "🌱", cat: "agricultura" },
  { id: "cosecha", es: "la cosecha", de: "die Ernte", emoji: "🌾", cat: "agricultura" },
  { id: "tractor", es: "el tractor", de: "der Traktor", emoji: "🚜", cat: "agricultura" },
  { id: "invernadero", es: "el invernadero", de: "das Gewächshaus", emoji: "🏡", cat: "agricultura" },
  { id: "agri-secano", es: "la agricultura de secano", de: "der Trockenfeldbau", emoji: "☀️", cat: "agricultura" },
  { id: "agri-regadio", es: "la agricultura de regadío", de: "die Bewässerungslandwirtschaft", emoji: "💧", cat: "agricultura" },
  { id: "riego-surcos", es: "el riego por surcos", de: "die Furchenbewässerung", emoji: "🔲", cat: "agricultura" },
  { id: "riego-aspersion", es: "el riego por aspersión", de: "die Sprinklerbewässerung", emoji: "💦", cat: "agricultura" },
  { id: "riego-goteo", es: "el riego por goteo", de: "die Tröpfchenbewässerung", emoji: "💧", cat: "agricultura" },
  { id: "agri-ecologica", es: "la agricultura ecológica", de: "die ökologische Landwirtschaft", emoji: "🌿", cat: "agricultura" },

  // ========== Ganadería (Viehzucht) ==========
  { id: "ganaderia", es: "la ganadería", de: "die Viehzucht", emoji: "🐄", cat: "ganaderia" },
  { id: "ganadero", es: "el ganadero", de: "der Viehzüchter", emoji: "🤠", cat: "ganaderia" },
  { id: "ganaderia-extensiva", es: "la ganadería extensiva", de: "die Freilandhaltung", emoji: "🏔️", cat: "ganaderia" },
  { id: "ganaderia-intensiva", es: "la ganadería intensiva", de: "die Stallhaltung", emoji: "🏠", cat: "ganaderia" },
  { id: "ganado-ovino", es: "el ganado ovino", de: "die Schafzucht", emoji: "🐑", cat: "ganaderia" },
  { id: "ganado-porcino", es: "el ganado porcino", de: "die Schweinezucht", emoji: "🐷", cat: "ganaderia" },
  { id: "ganado-bovino", es: "el ganado bovino", de: "die Rinderzucht", emoji: "🐄", cat: "ganaderia" },
  { id: "ganado-aviar", es: "el ganado aviar", de: "die Geflügelzucht", emoji: "🐔", cat: "ganaderia" },
  { id: "bienestar-animal", es: "el bienestar animal", de: "das Tierwohl", emoji: "❤️", cat: "ganaderia" },

  // ========== Fábrica (Fabrik) ==========
  { id: "fabrica", es: "la fábrica", de: "die Fabrik", emoji: "🏭", cat: "fabrica" },
  { id: "materia-prima", es: "la materia prima", de: "der Rohstoff", emoji: "🪨", cat: "fabrica" },
  { id: "producto-elaborado", es: "el producto elaborado", de: "das Fertigprodukt", emoji: "📦", cat: "fabrica" },
  { id: "industria-base", es: "la industria de base", de: "die Grundstoffindustrie", emoji: "⚙️", cat: "fabrica" },
  { id: "industria-consumo", es: "la industria de consumo", de: "die Konsumgüterindustrie", emoji: "🛒", cat: "fabrica" },

  // ========== Servicios (Dienstleistungen) ==========
  { id: "servicios", es: "los servicios", de: "die Dienstleistungen", emoji: "🔧", cat: "servicios" },
  { id: "sanitarios", es: "los servicios sanitarios", de: "das Gesundheitswesen", emoji: "🏥", cat: "servicios" },
  { id: "educativos", es: "los servicios educativos", de: "das Bildungswesen", emoji: "🎓", cat: "servicios" },
  { id: "investigacion", es: "la investigación", de: "die Forschung", emoji: "🔬", cat: "servicios" },

  // ========== Comercio (Handel) ==========
  { id: "comercio", es: "el comercio", de: "der Handel", emoji: "🏪", cat: "comercio" },
  { id: "cliente", es: "el cliente", de: "der Kunde", emoji: "🧑", cat: "comercio" },
  { id: "vendedor", es: "el vendedor", de: "der Verkäufer", emoji: "🧑‍💼", cat: "comercio" },
  { id: "producto", es: "el producto", de: "das Produkt", emoji: "📦", cat: "comercio" },
  { id: "forma-pago", es: "la forma de pago", de: "die Zahlungsart", emoji: "💳", cat: "comercio" },
  { id: "comercio-electronico", es: "el comercio electrónico", de: "der Onlinehandel", emoji: "🛒", cat: "comercio" },

  // ========== Transporte (Transport) ==========
  { id: "transporte", es: "el transporte", de: "der Transport", emoji: "🚛", cat: "transporte" },
  { id: "medios-transporte", es: "los medios de transporte", de: "die Verkehrsmittel", emoji: "🚌", cat: "transporte" },
  { id: "infraestructuras", es: "las infraestructuras", de: "die Infrastrukturen", emoji: "🛤️", cat: "transporte" },
  { id: "turismo", es: "el turismo", de: "der Tourismus", emoji: "✈️", cat: "transporte" },
  { id: "socorrista", es: "el socorrista", de: "der Rettungsschwimmer", emoji: "🏊", cat: "transporte" },
  { id: "recepcionista", es: "el/la recepcionista", de: "der/die Rezeptionist/in", emoji: "🛎️", cat: "transporte" },

  // ========== Seguridad vial (Verkehrssicherheit) ==========
  { id: "seguridad-vial", es: "la seguridad vial", de: "die Verkehrssicherheit", emoji: "⚠️", cat: "seguridad_vial" },
  { id: "conductor", es: "el conductor", de: "der Fahrer", emoji: "🚗", cat: "seguridad_vial" },
  { id: "peaton", es: "el peatón", de: "der Fußgänger", emoji: "🚶", cat: "seguridad_vial" },
  { id: "pasajero", es: "el pasajero", de: "der Fahrgast", emoji: "🧑‍🤝‍🧑", cat: "seguridad_vial" },
  { id: "acera", es: "la acera", de: "der Bürgersteig", emoji: "🛤️", cat: "seguridad_vial" },
  { id: "paso-peatones", es: "el paso de peatones", de: "der Zebrastreifen", emoji: "🚸", cat: "seguridad_vial" },
  { id: "semaforo", es: "el semáforo", de: "die Ampel", emoji: "🚦", cat: "seguridad_vial" },
  { id: "cinturon-seguridad", es: "el cinturón de seguridad", de: "der Sicherheitsgurt", emoji: "🔒", cat: "seguridad_vial" },
  { id: "senales-trafico", es: "las señales de tráfico", de: "die Verkehrsschilder", emoji: "🪧", cat: "seguridad_vial" },
];
