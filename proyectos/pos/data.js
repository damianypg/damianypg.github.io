/* Carta de demostración. Precios en centavos de dólar (sin IVA). stock = porciones con que abre el día. */
(function (root) {
  var CATEGORIES = [
    { id: 'sopas', name: 'Sopas y caldos' },
    { id: 'fuertes', name: 'Platos fuertes' },
    { id: 'mar', name: 'Del mar' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'postres', name: 'Postres' }
  ];

  var MENU = [
    { id: 'encebollado', cat: 'sopas', name: 'Encebollado de albacora', desc: 'Albacora, yuca y cebolla encurtida', price: 450, stock: 12 },
    { id: 'caldo-gallina', cat: 'sopas', name: 'Caldo de gallina criolla', desc: 'Con arroz y huevo', price: 400, stock: 10 },
    { id: 'locro', cat: 'sopas', name: 'Locro de papa', desc: 'Con queso y aguacate', price: 350, stock: 8 },

    { id: 'hornado', cat: 'fuertes', name: 'Hornado con mote', desc: 'Cerdo horneado, llapingachos y encurtido', price: 750, stock: 15 },
    { id: 'fritada', cat: 'fuertes', name: 'Fritada', desc: 'Cerdo frito, mote y plátano maduro', price: 650, stock: 10 },
    { id: 'seco-chivo', cat: 'fuertes', name: 'Seco de chivo', desc: 'Con arroz y maduro', price: 750, stock: 6 },
    { id: 'llapingachos', cat: 'fuertes', name: 'Llapingachos', desc: 'Tortillas de papa con chorizo y huevo', price: 550, stock: 12 },

    { id: 'ceviche-camaron', cat: 'mar', name: 'Ceviche de camarón', desc: 'Con canguil y chifles', price: 600, stock: 8 },
    { id: 'arroz-marinero', cat: 'mar', name: 'Arroz marinero', desc: 'Mariscos mixtos', price: 850, stock: 6 },

    { id: 'jugo-naranjilla', cat: 'bebidas', name: 'Jugo de naranjilla', desc: 'Natural, jarra individual', price: 150, stock: 20 },
    { id: 'colada-morada', cat: 'bebidas', name: 'Colada morada', desc: 'Caliente', price: 175, stock: 15 },
    { id: 'pilsener', cat: 'bebidas', name: 'Cerveza Pilsener', desc: 'Botella 600 ml', price: 250, stock: 24 },
    { id: 'agua', cat: 'bebidas', name: 'Agua', desc: 'Botella 500 ml', price: 100, stock: 30 },

    { id: 'helado-paila', cat: 'postres', name: 'Helado de paila', desc: 'Mora, coco o taxo', price: 200, stock: 12 },
    { id: 'quesadilla', cat: 'postres', name: 'Quesadilla', desc: 'Con queso fresco', price: 150, stock: 10 },
    { id: 'espumilla', cat: 'postres', name: 'Espumilla', desc: 'Merengue de guayaba', price: 125, stock: 3 }
  ];

  var TABLES = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6', 'Mesa 7', 'Mesa 8', 'Para llevar'];

  var data = { CATEGORIES: CATEGORIES, MENU: MENU, TABLES: TABLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.POS_DATA = data;
})(typeof window !== 'undefined' ? window : globalThis);
