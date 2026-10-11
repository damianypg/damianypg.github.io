/* Datos ficticios de Picantería Chimborazo. Precios en centavos de dólar, sin IVA. */
(function (root) {
  var BUSINESS = {
    name: 'Picantería Chimborazo',
    bot: 'Rosita',
    city: 'Riobamba',
    address: 'Av. Demostración 123 y Calle Ejemplo, Riobamba',
    reference: 'frente al parque de la Madre, junto a la panadería',
    phone: '099 000 0000',
    email: 'hola@picanteria-demo.example',
    jobsEmail: 'trabajo@picanteria-demo.example',
    instagram: '@picanteria.demo',
    wifiName: 'Picanteria-Clientes',
    wifiPass: 'mora2026',
    iva: 0.15,
    maxPartyOnline: 12,
    codePrefix: 'PCH-'
  };

  /* 0 = domingo … 6 = sábado. Horas en minutos desde las 00:00. null = cerrado. */
  var HOURS = {
    0: { open: 11 * 60, close: 17 * 60 },
    1: null,
    2: { open: 11 * 60, close: 21 * 60 },
    3: { open: 11 * 60, close: 21 * 60 },
    4: { open: 11 * 60, close: 21 * 60 },
    5: { open: 11 * 60, close: 21 * 60 },
    6: { open: 11 * 60, close: 21 * 60 }
  };

  var CATEGORIES = [
    { id: 'sopas', name: 'Sopas y caldos' },
    { id: 'fuertes', name: 'Platos fuertes' },
    { id: 'mar', name: 'Del mar' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'postres', name: 'Postres' }
  ];

  /* spicy: 0 no pica, 1 con ají aparte. veg: 'si' | 'pedido' | 'no'. mins: preparación. */
  var MENU = [
    { id: 'encebollado', cat: 'sopas', name: 'Encebollado de albacora', desc: 'Albacora, yuca y cebolla encurtida', price: 450, mins: 8, spicy: 1, veg: 'no', vegan: false, allergens: ['pescado'], keys: ['encebollado', 'encebolado'], star: false, note: 'Es el favorito de los sábados.' },
    { id: 'caldo-gallina', cat: 'sopas', name: 'Caldo de gallina criolla', desc: 'Con arroz y huevo', price: 400, mins: 10, spicy: 0, veg: 'no', vegan: false, allergens: ['huevo'], keys: ['gallina', 'caldo de gallina', 'caldo'], star: false, note: 'Se cocina a fuego lento desde la mañana.' },
    { id: 'locro', cat: 'sopas', name: 'Locro de papa', desc: 'Con queso y aguacate', price: 350, mins: 8, spicy: 0, veg: 'si', vegan: false, allergens: ['lácteos'], keys: ['locro'], star: false, note: 'Es el plato vegetariano de la casa.' },

    { id: 'hornado', cat: 'fuertes', name: 'Hornado con mote', desc: 'Cerdo horneado, llapingachos y encurtido', price: 750, mins: 10, spicy: 1, veg: 'no', vegan: false, allergens: ['lácteos'], keys: ['hornado', 'horneado'], star: true, note: 'Es el plato estrella: el cerdo se hornea unas horas antes de abrir.' },
    { id: 'fritada', cat: 'fuertes', name: 'Fritada', desc: 'Cerdo frito, mote y plátano maduro', price: 650, mins: 12, spicy: 1, veg: 'no', vegan: false, allergens: [], keys: ['fritada'], star: false, note: 'Viene con mote y plátano maduro.' },
    { id: 'seco-chivo', cat: 'fuertes', name: 'Seco de chivo', desc: 'Con arroz y maduro', price: 750, mins: 15, spicy: 1, veg: 'no', vegan: false, allergens: [], keys: ['seco de chivo', 'chivo', 'seco'], star: false, note: 'Se sirve con arroz y maduro.' },
    { id: 'llapingachos', cat: 'fuertes', name: 'Llapingachos', desc: 'Tortillas de papa con chorizo y huevo', price: 550, mins: 12, spicy: 0, veg: 'pedido', vegan: false, allergens: ['lácteos', 'huevo'], keys: ['llapingacho', 'llapingachos'], star: false, note: 'Si los pides sin chorizo, son vegetarianos.' },

    { id: 'ceviche-camaron', cat: 'mar', name: 'Ceviche de camarón', desc: 'Con canguil y chifles', price: 600, mins: 12, spicy: 1, veg: 'no', vegan: false, allergens: ['mariscos'], keys: ['ceviche', 'camaron'], star: false, note: 'Se prepara al momento, con limón y cebolla.' },
    { id: 'arroz-marinero', cat: 'mar', name: 'Arroz marinero', desc: 'Mariscos mixtos', price: 850, mins: 20, spicy: 1, veg: 'no', vegan: false, allergens: ['mariscos'], keys: ['arroz marinero', 'marinero', 'arroz'], star: false, note: 'Es el plato más grande: alcanza para compartir entre dos si hay poco apetito.' },

    { id: 'jugo-naranjilla', cat: 'bebidas', name: 'Jugo de naranjilla', desc: 'Natural, jarra individual', price: 150, mins: 3, spicy: 0, veg: 'si', vegan: true, allergens: [], keys: ['naranjilla', 'jugo'], star: false, note: 'Natural, sin colorantes.' },
    { id: 'colada-morada', cat: 'bebidas', name: 'Colada morada', desc: 'Caliente', price: 175, mins: 3, spicy: 0, veg: 'si', vegan: true, allergens: [], keys: ['colada morada', 'colada'], star: false, note: 'Se sirve caliente, con fruta.' },
    { id: 'pilsener', cat: 'bebidas', name: 'Cerveza Pilsener', desc: 'Botella 600 ml', price: 250, mins: 2, spicy: 0, veg: 'si', vegan: true, allergens: ['gluten'], keys: ['pilsener', 'pilsen', 'cerveza', 'cervezas'], star: false, note: 'Solo para mayores de 18 años, con cédula.' },
    { id: 'agua', cat: 'bebidas', name: 'Agua', desc: 'Botella 500 ml', price: 100, mins: 1, spicy: 0, veg: 'si', vegan: true, allergens: [], keys: ['agua'], star: false, note: 'Sin gas.' },

    { id: 'helado-paila', cat: 'postres', name: 'Helado de paila', desc: 'Mora, coco o taxo', price: 200, mins: 5, spicy: 0, veg: 'si', vegan: true, allergens: [], keys: ['helado', 'paila'], star: false, note: 'Se prepara en paila de bronce, con fruta y hielo.' },
    { id: 'quesadilla', cat: 'postres', name: 'Quesadilla', desc: 'Con queso fresco', price: 150, mins: 5, spicy: 0, veg: 'si', vegan: false, allergens: ['lácteos', 'gluten', 'huevo'], keys: ['quesadilla'], star: false, note: 'Es un pan dulce relleno de queso.' },
    { id: 'espumilla', cat: 'postres', name: 'Espumilla', desc: 'Merengue de guayaba', price: 125, mins: 5, spicy: 0, veg: 'si', vegan: false, allergens: ['huevo'], keys: ['espumilla'], star: false, note: 'Es un merengue de guayaba, muy ligero.' }
  ];

  /* Mesas que "no tienen cupo" en la demo, para mostrar alternativas: día, desde, hasta (minutos). */
  var BUSY = [
    { dow: 6, from: 12 * 60 + 30, to: 14 * 60 + 30 },
    { dow: 5, from: 19 * 60, to: 20 * 60 + 30 },
    { dow: 0, from: 12 * 60, to: 13 * 60 + 30 }
  ];

  var SAMPLE_QUESTIONS = [
    { group: 'Carta y precios', items: ['¿Qué lleva el hornado?', '¿Cuánto cuestan 2 hornados y 3 jugos?', '¿Qué me recomiendas?'] },
    { group: 'Horarios y lugar', items: ['¿Están abiertos ahora?', '¿Abren los lunes?', '¿Dónde quedan y hay parqueadero?'] },
    { group: 'Reservas', items: ['Quiero reservar para 4 mañana a las 7 pm', '¿Tienen opciones vegetarianas?', '¿Hacen eventos y cumpleaños?'] },
    { group: 'Pedidos y pagos', items: ['¿Hacen entregas a domicilio?', '¿Aceptan tarjeta?', '¿Dan factura?'] }
  ];

  var data = {
    BUSINESS: BUSINESS, HOURS: HOURS, CATEGORIES: CATEGORIES, MENU: MENU, BUSY: BUSY, SAMPLE_QUESTIONS: SAMPLE_QUESTIONS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.BOT_DATA = data;
})(typeof window !== 'undefined' ? window : globalThis);
