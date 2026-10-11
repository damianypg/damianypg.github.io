/* Preguntas reales de ejemplo → tema esperado. Incluye errores de ortografía y mensajes en lenguaje cotidiano. */
module.exports = [
  // Saludos y charla
  ['hola', 'saludo'], ['holaaaa', 'saludo'], ['buenas tardes', 'saludo'], ['buenos dias', 'saludo'], ['buenas noches', 'saludo'], ['ola', 'saludo'], ['saludos', 'saludo'],
  ['chao', 'despedida'], ['hasta luego', 'despedida'], ['adios', 'despedida'], ['eso es todo', 'despedida'], ['nos vemos', 'despedida'],
  ['gracias', 'gracias'], ['muchas gracias', 'gracias'], ['mil gracias!', 'gracias'], ['te agradezco', 'gracias'],
  ['que delicioso estuvo todo', 'elogio'], ['me encanto la comida', 'elogio'], ['felicitaciones al chef', 'elogio'],
  ['quien eres', 'quien_eres'], ['eres un bot?', 'quien_eres'], ['eres humana', 'quien_eres'], ['como te llamas', 'quien_eres'], ['usas inteligencia artificial', 'quien_eres'],
  ['que puedes hacer', 'ayuda'], ['en que me puedes ayudar', 'ayuda'], ['ayuda', 'ayuda'], ['que sabes responder', 'ayuda'],
  ['como estas', 'como_estas'], ['como andas hoy', 'como_estas'],
  ['cuentame un chiste', 'chiste'], ['hazme reir', 'chiste'], ['dato curioso', 'dato_curioso'], ['sabias que', 'dato_curioso'],
  ['que hora es', 'hora_actual'], ['que dia es hoy', 'hora_actual'],
  ['hello', 'ingles'], ['do you speak english', 'ingles'], ['what time do you open', 'ingles'], ['are you open', 'ingles'],
  ['quien gano el partido de futbol', 'fuera_de_tema'], ['cual es la capital de francia', 'fuera_de_tema'], ['resuelve esta tarea de matematica', 'fuera_de_tema'],
  ['eres una inutil', 'insulto'],

  // Horarios y lugar
  ['a que hora abren', 'horario'], ['a q hora abren', 'horario'], ['cual es el horario', 'horario'], ['horarios de atencion', 'horario'], ['hasta que hora atienden', 'horario'], ['a que hora cierran', 'horario'], ['abren los domingos', 'horario'], ['abren el lunes', 'horario'], ['abren en feriados', 'horario'], ['orario de atencion', 'horario'],
  ['estan abiertos ahora', 'abierto_ahora'], ['estan abiertos?', 'abierto_ahora'], ['abierto ahora', 'abierto_ahora'], ['puedo ir ahora', 'abierto_ahora'], ['siguen abiertos', 'abierto_ahora'],
  ['donde quedan', 'ubicacion'], ['donde estan ubicados', 'ubicacion'], ['direccion', 'ubicacion'], ['como llego', 'ubicacion'], ['cual es su ubicacion', 'ubicacion'], ['dnd quedan', 'ubicacion'], ['ubikacion', 'ubicacion'],
  ['tienen parqueadero', 'parqueadero'], ['hay donde parquear', 'parqueadero'], ['puedo dejar la moto', 'parqueadero'], ['estacionamiento', 'parqueadero'],
  ['numero de telefono', 'contacto'], ['tienen whatsapp', 'contacto'], ['cual es su correo', 'contacto'], ['instagram', 'contacto'], ['como los contacto', 'contacto'],
  ['tienen terraza', 'ambiente'], ['cuantas personas caben', 'ambiente'], ['se puede fumar', 'ambiente'], ['ponen musica', 'ambiente'],
  ['tienen rampa para silla de ruedas', 'accesibilidad'], ['hay baño adaptado', 'accesibilidad'], ['es accesible para adultos mayores', 'accesibilidad'],
  ['tienen wifi', 'wifi'], ['hay internet', 'wifi'], ['cual es la clave del wifi', 'wifi'], ['wi fi', 'wifi'],

  // Carta
  ['ver la carta', 'carta'], ['que tienen para comer', 'carta'], ['que venden', 'carta'], ['menu', 'carta'], ['me muestras el menu', 'carta'], ['que platos tienen', 'carta'], ['lista de precios', 'carta'], ['que hay de comer', 'carta'],
  ['que sopas tienen', 'cat_sopas'], ['sopas', 'cat_sopas'], ['tienen algo caliente', 'cat_sopas'],
  ['platos fuertes', 'cat_fuertes'], ['que carnes tienen', 'cat_fuertes'], ['plato principal', 'cat_fuertes'],
  ['comida de mar', 'cat_mar'], ['tienen mariscos', 'cat_mar'], ['platos del mar', 'cat_mar'],
  ['que bebidas tienen', 'cat_bebidas'], ['que hay para tomar', 'cat_bebidas'], ['bebidas', 'cat_bebidas'],
  ['que postres tienen', 'cat_postres'], ['algo dulce', 'cat_postres'], ['postres', 'cat_postres'],
  ['que me recomiendas', 'recomendacion'], ['cual es el plato estrella', 'recomendacion'], ['no se que pedir', 'recomendacion'], ['es mi primera vez, que pido', 'recomendacion'], ['lo mas pedido', 'recomendacion'], ['que es lo mejor de la casa', 'recomendacion'], ['recomiendame algo', 'recomendacion'],
  ['hornado', 'plato'], ['el encebollado', 'plato'], ['ceviche', 'plato'], ['y el locro', 'plato'], ['tienen fritada', 'plato'], ['ornado', 'plato'], ['llapingachos', 'plato'], ['colada morada', 'plato'],
  ['cuanto cuesta el hornado', 'precio'], ['precio del ceviche', 'precio'], ['cuanto vale el encebollado', 'precio'], ['que precios manejan', 'precio'], ['son caros', 'precio'], ['algo barato', 'precio'], ['cuanto cuesta', 'precio'],
  ['que lleva el hornado', 'ingredientes'], ['de que esta hecho el encebollado', 'ingredientes'], ['con que viene la fritada', 'ingredientes'], ['que trae el arroz marinero', 'ingredientes'], ['que es el locro', 'ingredientes'], ['ingredientes del seco de chivo', 'ingredientes'],
  ['el hornado pica', 'picante'], ['tienen aji', 'picante'], ['viene con aji el ceviche', 'picante'], ['es picante', 'picante'], ['sin aji por favor', 'picante'],
  ['soy alergico al mani', 'alergenos'], ['tienen opciones sin gluten', 'alergenos'], ['el locro tiene lacteos', 'alergenos'], ['que alergenos tiene el ceviche', 'alergenos'], ['soy celiaco', 'alergenos'], ['tengo intolerancia a la lactosa', 'alergenos'],
  ['tienen opciones vegetarianas', 'vegetariano'], ['soy vegano', 'vegetariano'], ['no como carne', 'vegetariano'], ['algo sin carne', 'vegetariano'], ['hay platos vegetarianos', 'vegetariano'],
  ['es grande la porcion', 'porciones'], ['alcanza para dos personas', 'porciones'], ['cual es el tamaño de las porciones', 'porciones'], ['sirve para compartir', 'porciones'],
  ['cuanto demora el hornado', 'tiempo_espera'], ['cuanto se demoran en atender', 'tiempo_espera'], ['tiempo de espera', 'tiempo_espera'], ['tengo prisa', 'tiempo_espera'],
  ['que es el mote', 'glosario'], ['que son los chifles', 'glosario'], ['que es el canguil', 'glosario'], ['que es el encurtido', 'glosario'],
  ['tienen cerveza', 'alcohol'], ['venden vino', 'alcohol'], ['bebidas alcoholicas', 'alcohol'], ['tienen tragos', 'alcohol'],
  ['de donde son los ingredientes', 'proveedores'], ['son frescos los mariscos', 'proveedores'], ['usan productos locales', 'proveedores'],

  // Cuentas
  ['2 hornados y 3 jugos', 'cuenta'], ['cuanto sale un hornado y un ceviche', 'cuenta'], ['quiero dos fritadas', 'cuenta'], ['calcula la cuenta de 3 encebollados', 'cuenta'], ['1 locro y 2 colada morada', 'cuenta'], ['dos hornados y un jugo de naranjilla', 'cuenta'],
  ['esta incluido el iva', 'iva_propina'], ['cobran propina', 'iva_propina'], ['los precios incluyen iva', 'iva_propina'], ['hay recargo por servicio', 'iva_propina'],
  ['aceptan tarjeta', 'pagos'], ['formas de pago', 'pagos'], ['puedo pagar con transferencia', 'pagos'], ['reciben efectivo', 'pagos'], ['aceptan visa', 'pagos'], ['pagan con qr', 'pagos'],
  ['dan factura', 'factura'], ['facturan con ruc', 'factura'], ['necesito factura', 'factura'],

  // Promos, eventos, familia
  ['tienen promociones', 'promociones'], ['hay descuentos', 'promociones'], ['almuerzo del dia', 'promociones'], ['cuanto cuesta el almuerzo', 'promociones'], ['menu ejecutivo', 'promociones'], ['descuento para estudiantes', 'promociones'],
  ['hacen eventos', 'eventos'], ['quiero celebrar un cumpleaños', 'eventos'], ['tienen salon para fiestas', 'eventos'], ['hacen catering', 'eventos'], ['somos un grupo grande', 'eventos'],
  ['tienen silla alta para bebe', 'ninos'], ['hay menu infantil', 'ninos'], ['puedo ir con ninos', 'ninos'],
  ['aceptan mascotas', 'mascotas'], ['puedo llevar a mi perro', 'mascotas'], ['son pet friendly', 'mascotas'],

  // Pedidos
  ['hacen entregas a domicilio', 'domicilio'], ['tienen delivery', 'domicilio'], ['cuanto cobran de envio', 'domicilio'], ['hasta donde llegan', 'domicilio'], ['llevan a casa', 'domicilio'],
  ['pedido para llevar', 'para_llevar'], ['quiero pedir para llevar', 'para_llevar'], ['paso a recoger mi pedido', 'para_llevar'], ['me empacan lo que sobre', 'para_llevar'],

  // Reservas
  ['quiero reservar', 'reservar'], ['reservar una mesa', 'reservar'], ['quiero reservar para 4 el sabado a las 7', 'reservar'], ['necesito una mesa para 6', 'reservar'], ['hay mesa para hoy', 'reservar'], ['hay espacio para 3', 'reservar'], ['reserbar', 'reservar'], ['mesa para 2 mañana', 'reservar'],
  ['ver mi reserva', 'mis_reservas'], ['mis reservas', 'mis_reservas'], ['consultar reserva', 'mis_reservas'],
  ['quiero cancelar mi reserva', 'cancelar_reserva'], ['anular mi reserva', 'cancelar_reserva'], ['ya no puedo ir', 'cancelar_reserva'],
  ['quiero cambiar mi reserva', 'cambiar_reserva'], ['puedo modificar mi reserva', 'cambiar_reserva'],

  // Personas
  ['quiero hablar con una persona', 'humano'], ['hablar con el gerente', 'humano'], ['atencion al cliente', 'humano'],
  ['tengo una queja', 'queja'], ['mala atencion', 'queja'], ['me cobraron mal', 'queja'], ['quiero reclamar', 'queja'],
  ['quiero trabajar con ustedes', 'empleo'], ['hay vacantes', 'empleo'], ['donde envio mi hoja de vida', 'empleo'], ['buscan meseros', 'empleo'],
  ['cuentame la historia del restaurante', 'historia'], ['desde cuando existen', 'historia'], ['quien es el dueño', 'historia'],
  ['tienen tarjetas de regalo', 'tarjeta_regalo'], ['venden gift card', 'tarjeta_regalo']
];
