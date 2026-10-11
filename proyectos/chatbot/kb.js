/* Base de conocimiento de Rosita: cada tema tiene palabras clave con peso, frases y respuestas escritas a mano.
   kw: palabra → peso (con * al final coincide con el inicio de la palabra). ph: [frase, peso].
   not: palabras que restan puntos. maxTokens: el tema solo aplica a mensajes cortos. */
(function (root) {
  function factory(H) {
    var B = H.B, D = H.D, M = H.money;

    function chips() { return Array.prototype.slice.call(arguments); }
    function T(variants, ch) {
      return function (c) { return { text: c.pick(variants), chips: ch }; };
    }
    function dishChips(dish) {
      var out = [];
      if (dish.spicy) out.push('¿Pica?');
      out.push('¿Qué alérgenos tiene?');
      out.push('¿Cuánto demora?');
      out.push('Quiero reservar');
      return out;
    }
    function list(items) { return items.map(function (x) { return '- ' + x; }).join('\n'); }
    function catList(catId) {
      var cat = D.CATEGORIES.filter(function (x) { return x.id === catId; })[0];
      var rows = D.MENU.filter(function (m) { return m.cat === catId; }).map(function (m) {
        return '**' + m.name + '**, ' + M(m.price) + '. ' + m.desc + '.';
      });
      return { name: cat.name, text: '**' + cat.name + '**\n' + list(rows) + '\nLos precios no incluyen IVA (15 %).' };
    }

    var SEEN_FACTS = [
      'El hornado se hace con cerdo marinado desde la noche anterior y horneado lentamente, por eso la carne queda tan suave.',
      'El mote es maíz cocido, y es el acompañante clásico del hornado y la fritada en la sierra ecuatoriana.',
      'La naranjilla parece una naranja pequeña, pero su jugo es más ácido y de color verdoso. Es una fruta de la región andina.',
      'El helado de paila se bate a mano en una paila de bronce sobre hielo; por eso su textura es cremosa y con cristalitos de hielo.',
      'La colada morada se toma tradicionalmente en noviembre, pero aquí la servimos todo el año.',
      'El encurtido es cebolla morada con tomate y limón; corta la grasa del cerdo y le da frescura al plato.'
    ];
    var JOKES = [
      '¿Por qué el hornado nunca llega tarde? Porque siempre sale a su hora… y bien dorado.',
      '¿Cuál es el colmo de un cocinero? Que su plan de vida se queme.',
      'Le dije al ceviche que se relajara, pero me contestó que vive en limón.',
      '¿Qué le dijo un llapingacho a otro? «Estás muy aplastado hoy».',
      'Un mote entra a un bar y pide algo fuerte. El mesero responde: «Tú ya estás duro».'
    ];

    var GLOSS = {
      mote: 'El **mote** es maíz grande cocido en agua hasta quedar suave. Acompaña al hornado y a la fritada.',
      canguil: 'El **canguil** es maíz reventado, lo que en otros países llaman palomitas. Lo servimos con el ceviche.',
      chifle: 'Los **chifles** son rodajas finas de plátano verde fritas y crujientes. Van con el ceviche.',
      encurtido: 'El **encurtido** es cebolla morada con tomate y limón, que acompaña al hornado.',
      taxo: 'El **taxo** es una fruta andina, de sabor ácido y aroma intenso. Es uno de los sabores del helado de paila.',
      maduro: 'El **maduro** es plátano maduro frito, dulce y dorado.',
      yuca: 'La **yuca** es una raíz que se cocina en el encebollado y le da cuerpo.',
      guayaba: 'La **guayaba** es una fruta tropical; con su pulpa se hace el merengue de la espumilla.',
      chocho: 'El **chocho** es un grano andino parecido al altramuz, que se come con tostado o canguil.',
      tostado: 'El **tostado** es maíz tostado. Se sirve como acompañante de sopas y ceviches.'
    };

    var I = [];
    function add(o) { I.push(o); }

    /* ---------- Conversación ---------- */
    add({ id: 'saludo', label: 'Saludo', kw: { hola: 4, ola: 3, buenas: 3, saludos: 3, hey: 2.5, holi: 3, buenos: 1.5 },
      ph: [['buenos dias', 5], ['buenas tardes', 5], ['buenas noches', 5], ['buen dia', 5], ['que tal', 2.5], ['como va', 1]],
      a: function (c) {
        if (c.S.turns > 1 && c.S.seen.saludo > 0) return { text: c.pick(['¡Hola de nuevo! ¿En qué te ayudo?', 'Aquí sigo. ¿Qué necesitas?']), chips: chips('Ver la carta', 'Quiero reservar', '¿Están abiertos ahora?') };
        return { text: H.greeting(c.nowMs) + ' Soy **Rosita**, la asistente de ' + B.name + '. Puedo contarte de la carta, los horarios y ayudarte a reservar una mesa. ¿Qué necesitas?', chips: chips('Ver la carta', '¿Están abiertos ahora?', 'Quiero reservar', '¿Qué me recomiendas?') };
      } });

    add({ id: 'despedida', label: 'Despedida', kw: { chao: 4, chau: 4, adios: 4, bye: 4, nos: 0 },
      ph: [['hasta luego', 5], ['hasta pronto', 5], ['hasta manana', 3], ['nos vemos', 5], ['me voy', 3], ['eso es todo', 5], ['nada mas', 3], ['ya no necesito', 4], ['cuidate', 4]],
      a: T(['¡Hasta pronto! Aquí te esperamos con el hornado calientito.', '¡Que te vaya muy bien! Cuando quieras, vuelves a escribirme.', 'Gracias por escribir. ¡Te esperamos en la mesa!'], chips('Quiero reservar', 'Ver la carta')) });

    add({ id: 'gracias', label: 'Agradecimiento', kw: { gracias: 5, agradezco: 4, agradecida: 4, agradecido: 4, genial: 2.5, excelente: 2, perfecto: 2.5, super: 1.5, buenisimo: 2.5, chevere: 2.5, bacan: 2 },
      ph: [['muchas gracias', 6], ['mil gracias', 6], ['te agradezco', 5], ['muy amable', 4]],
      a: T(['¡Con gusto! Si necesitas algo más, solo dime.', 'Para eso estoy. ¿Algo más en lo que te ayude?', '¡A ti por escribir! ¿Quieres que te ayude con otra cosa?'], chips('Ver la carta', 'Quiero reservar', '¿Dónde quedan?')) });

    add({ id: 'elogio', label: 'Comentario positivo', kw: { delicioso: 3, deliciosa: 3, rico: 2, rica: 2, felicitaciones: 4, felicito: 4, encanta: 3, encanto: 3, exquisito: 3, maravilloso: 3 },
      ph: [['me encanto', 5], ['estuvo delicioso', 6], ['muy rico', 4], ['excelente servicio', 6], ['buen servicio', 5], ['buena atencion', 5], ['todo muy rico', 5]],
      a: T(['¡Qué alegría! Le paso tus palabras al equipo de cocina. Gracias por contarlo.', 'Eso nos hace el día. Gracias por el cariño; te esperamos pronto.'], chips('Quiero reservar', 'Ver la carta')) });

    add({ id: 'quien_eres', label: 'Quién es Rosita', kw: { robot: 3, bot: 3, chatgpt: 3, humana: 3, humano: 3 },
      ph: [['quien eres', 6], ['como te llamas', 6], ['tu nombre', 5], ['eres un bot', 6], ['eres humano', 6], ['eres humana', 6], ['eres una persona', 6], ['eres real', 5], ['eres ia', 5], ['eres una ia', 6], ['inteligencia artificial', 5], ['quien te hizo', 6], ['quien te creo', 6], ['como funcionas', 6], ['como estas hecha', 6], ['que eres', 5], ['con quien hablo', 6], ['usas ia', 5]],
      a: T(['Soy **Rosita**, la asistente virtual de esta demo. No uso inteligencia artificial generativa: tengo respuestas escritas a mano y un programa que reconoce palabras, errores de ortografía y el contexto de la conversación. Me creó Yosef Puetate para mostrar cómo se hace un chatbot para un negocio.', 'Soy un programa, no una persona. Entiendo frases, errores de tipeo y recuerdo de qué hablábamos. Todo lo que digo está escrito de antemano, sin IA. Me hizo Yosef Puetate como demostración.'], chips('¿Qué sabes responder?', 'Hablar con una persona')) });

    add({ id: 'ayuda', label: 'Qué sabe responder', kw: { ayuda: 3, ayudame: 3, opciones: 2, ayudar: 2, instrucciones: 3 },
      ph: [['que puedes', 5], ['que sabes', 5], ['en que me puedes ayudar', 6], ['en que me ayudas', 6], ['que haces', 4], ['que puedo preguntar', 6], ['como te uso', 5], ['que preguntas', 4], ['que temas', 4], ['para que sirves', 5]],
      a: function (c) {
        return { text: 'Puedo ayudarte con:\n' + list([
          '**La carta:** platos, precios, ingredientes, picante, alérgenos y opciones vegetarianas.',
          '**Cuentas:** dime «2 hornados y 3 jugos» y te calculo el total con IVA.',
          '**Horarios y lugar:** si estamos abiertos ahora, dirección y parqueadero.',
          '**Reservas:** reservar, ver o cancelar tu mesa.',
          '**Pedidos y pagos:** domicilio, para llevar, factura y formas de pago.',
          '**Eventos, niños, mascotas y accesibilidad.**'
        ]) + '\nPuedes escribir como hablas, aunque tengas errores de ortografía.', chips: chips('¿Qué me recomiendas?', 'Quiero reservar', '¿Están abiertos ahora?') };
      } });

    add({ id: 'como_estas', label: 'Charla', kw: {}, ph: [['como estas', 6], ['como andas', 6], ['como te va', 6], ['como te sientes', 6], ['todo bien', 3], ['que tal tu dia', 6]],
      a: T(['¡Muy bien, gracias por preguntar! Lista para atenderte. ¿Qué se te antoja?', 'Todo bien por aquí, con la cocina ya encendida. ¿En qué te ayudo?'], chips('¿Qué me recomiendas?', 'Ver la carta')) });

    add({ id: 'afirmacion', label: 'Afirmación', kw: { si: 3, ok: 3, dale: 3, vale: 3, claro: 3, listo: 3, bueno: 2, sip: 3, okey: 3, sii: 3 }, maxTokens: 3,
      a: T(['Perfecto. ¿En qué más te ayudo?', 'Genial. ¿Quieres que te ayude con algo más?'], chips('Ver la carta', 'Quiero reservar', '¿Dónde quedan?')) });

    add({ id: 'negacion', label: 'Negación', kw: { no: 3, nada: 3, nop: 3, ninguno: 3, ninguna: 3 }, maxTokens: 3,
      a: T(['Está bien. Si cambias de idea, aquí estoy.', 'Sin problema. Cuando necesites algo, escríbeme.'], chips('Ver la carta', 'Quiero reservar')) });

    add({ id: 'risa', label: 'Risas', kw: { jaja: 3, jajaja: 3, jeje: 3, jejeje: 3, jiji: 3, lol: 3, xd: 3, jajajaja: 3, haha: 3 },
      a: T(['¡Me alegra sacarte una sonrisa! ¿Seguimos con la carta?', 'Jaja, así da gusto. ¿En qué más te ayudo?'], chips('Ver la carta', 'Cuéntame un chiste', 'Quiero reservar')) });

    add({ id: 'chiste', label: 'Chiste', kw: { chiste: 6, chistes: 6, gracioso: 3, broma: 3, reir: 3 },
      ph: [['hazme reir', 6], ['cuentame un chiste', 8], ['algo divertido', 5], ['algo gracioso', 5]],
      a: function (c) { return { text: c.pick(JOKES), chips: chips('Otro chiste', 'Dato curioso', 'Ver la carta') }; } });

    add({ id: 'dato_curioso', label: 'Dato curioso', kw: { curioso: 4, curiosidad: 4, curiosidades: 4, interesante: 3 },
      ph: [['otro dato', 8], ['dato curioso', 8], ['cuentame algo', 5], ['sabias que', 5], ['algo interesante', 5], ['cuentame un dato', 8]],
      a: function (c) { return { text: c.pick(SEEN_FACTS), chips: chips('Otro dato', 'Ver la carta', '¿Qué me recomiendas?') }; } });

    add({ id: 'insulto', label: 'Mensaje ofensivo', kw: { estupida: 4, estupido: 4, idiota: 4, inutil: 4, tonta: 4, tonto: 4, basura: 4, imbecil: 4, maldita: 4, mierda: 4, odio: 3 },
      a: T(['Entiendo que algo no salió como esperabas. Cuéntame qué pasó y trato de ayudarte, o te paso con una persona.', 'Lamento que te hayas molestado. Si quieres, te dejo el contacto de una persona del equipo.'], chips('Hablar con una persona', 'Tengo una queja')) });

    add({ id: 'ingles', label: 'English', kw: { english: 5, ingles: 4, hello: 4, hi: 3, hours: 3, open: 3, where: 3, price: 3, prices: 3, reservation: 5, book: 3, table: 3, thanks: 4, thank: 4, please: 3, vegetarian: 3, you: 2, your: 2, address: 3 },
      ph: [['speak english', 7], ['do you', 3], ['are you', 3], ['what time', 5]],
      a: function () {
        return { text: 'I answer mostly in Spanish, but here is the short version:\n' + list([
          '**Hours:** Tue–Sat 11:00–21:00, Sun 11:00–17:00, closed on Mondays.',
          '**Address:** ' + B.address + ', Riobamba, Ecuador.',
          '**Phone:** ' + B.phone + '.',
          '**Menu:** traditional Ecuadorian dishes (hornado, fritada, encebollado, ceviche, locro). Vegetarian option: locro de papa.'
        ]) + '\nYou can book a table by writing «Quiero reservar».', chips: chips('Quiero reservar', 'Ver la carta') };
      } });

    add({ id: 'fuera_de_tema', label: 'Fuera de tema', kw: { clima: 4, futbol: 4, politica: 4, presidente: 4, tarea: 4, programar: 3, matematica: 3, bitcoin: 4, noticias: 4, pelicula: 3, cancion: 3, horoscopo: 4, loteria: 4 },
      ph: [['capital de', 5], ['quien gano', 5], ['resuelve esta', 5]],
      a: T(['De eso no sé: solo conozco la picantería. Puedo ayudarte con la carta, los horarios y las reservas.', 'Ese tema se me escapa. Lo mío es la comida: carta, precios, horarios y reservas.'], chips('Ver la carta', 'Quiero reservar', '¿Qué sabes responder?')) });

    add({ id: 'hora_actual', label: 'Hora y fecha', kw: {},
      ph: [['que hora es', 8], ['que dia es hoy', 8], ['que fecha es', 8], ['fecha de hoy', 7], ['hora actual', 7]],
      a: function (c) { var e = H.ecuNow(c.nowMs); return { text: 'En Riobamba son las **' + H.hhmm(e.minutes) + '** del ' + H.dateLong(e.date) + '.', chips: chips('¿Están abiertos ahora?', 'Quiero reservar') }; } });

    /* ---------- Horarios y lugar ---------- */
    add({ id: 'horario', label: 'Horarios', kw: { horario: 4, horarios: 4, abren: 3, abre: 2.5, cierran: 3, cierra: 2.5, atienden: 3, atencion: 1.5, feriado: 3, feriados: 3, apertura: 3, cierre: 3, abrieron: 3, abierto: 2, abiertos: 2 },
      ph: [['a que hora', 4], ['hasta que hora', 5], ['desde que hora', 5], ['cuando abren', 5], ['a que hora abren', 6], ['a que hora cierran', 6], ['que dias abren', 6], ['dias de atencion', 6], ['en que horario', 5], ['abren los', 4], ['abren el', 4], ['trabajan los', 3]],
      a: function (c) {
        var e = c.date;
        if (e) return { text: H.dayAnswer(e, c.nowMs), chips: chips('Quiero reservar', '¿Están abiertos ahora?', '¿Dónde quedan?') };
        return { text: '**Nuestro horario:**\n' + list(['**Martes a sábado:** 11:00 a 21:00', '**Domingo:** 11:00 a 17:00', '**Lunes:** descansamos']) + '\nEn feriados abrimos con horario de domingo, excepto el 25 de diciembre y el 1 de enero.', chips: chips('¿Están abiertos ahora?', 'Quiero reservar', '¿Dónde quedan?') };
      } });

    add({ id: 'abierto_ahora', label: 'Abierto ahora', kw: { ahora: 2.5, ahorita: 3, ya: 0.5 },
      ph: [['estan abiertos', 4], ['esta abierto', 4], ['abierto ahora', 7], ['abiertos ahora', 7], ['abren ahora', 6], ['abierto hoy', 4], ['siguen abiertos', 6], ['ya abrieron', 6], ['ya cerraron', 6], ['hay atencion', 3], ['atienden ahora', 6], ['puedo ir ahora', 6], ['estan atendiendo', 6], ['a esta hora', 3]],
      a: function (c) { return { text: H.openStatus(c.nowMs), chips: chips('Ver el horario completo', 'Quiero reservar', '¿Dónde quedan?') }; } });

    add({ id: 'ubicacion', label: 'Ubicación', kw: { direccion: 4, ubicacion: 4, ubicados: 3, ubicadas: 3, quedan: 3, mapa: 3, referencia: 3, sector: 2, barrio: 2, zona: 2, encuentran: 2, queda: 2, bus: 3, buses: 3, taxi: 3, transporte: 3, lejos: 2.5, cerca: 2, paradero: 3, centro: 1.5 },
      ph: [['donde estan', 5], ['donde queda', 5], ['donde quedan', 5], ['donde se ubican', 6], ['como llego', 6], ['como llegar', 6], ['google maps', 5], ['en que parte', 3], ['cerca de', 2], ['en que calle', 5], ['donde es', 3], ['donde los encuentro', 6], ['donde estan ubicados', 7]],
      a: T(['Estamos en **' + B.address + '**, ' + B.reference + '. La dirección es de demostración.\nTenemos parqueadero para clientes y la entrada tiene rampa.', 'Nos encuentras en **' + B.address + '** (' + B.reference + '). Es una dirección ficticia de la demo.\nSi vienes en carro, hay parqueadero gratis para clientes.'], chips('¿Hay parqueadero?', '¿Hasta qué hora atienden?', 'Quiero reservar')) });

    add({ id: 'parqueadero', label: 'Parqueadero', kw: { parqueadero: 4, parqueo: 4, estacionamiento: 4, estacionar: 3, aparcar: 3, parquear: 3, parqueaderos: 4, carro: 3, auto: 3, moto: 3, motos: 3, bicicleta: 3, bici: 3, vehiculo: 2 },
      ph: [['donde parqueo', 6], ['donde estaciono', 6], ['donde dejo el carro', 6], ['hay donde dejar', 5], ['dejar la moto', 5], ['dejar el carro', 5], ['dejar el auto', 5]],
      a: T(['Sí, tenemos **12 espacios** para carros, gratis para clientes hasta por 2 horas. Para motos y bicicletas hay una zona cubierta junto a la entrada.'], chips('¿Dónde quedan?', 'Quiero reservar')) });

    add({ id: 'contacto', label: 'Contacto', kw: { telefono: 4, numero: 3, celular: 3, whatsapp: 4, llamar: 3, llamada: 3, correo: 3, email: 3, mail: 3, contacto: 4, contactar: 4, comunicarme: 3, instagram: 3, facebook: 3, redes: 3, tiktok: 3, comunicar: 3 },
      ph: [['numero de telefono', 6], ['como los contacto', 6], ['como me comunico', 6]],
      a: T(['Puedes contactarnos así:\n' + list(['**Teléfono y WhatsApp:** ' + B.phone, '**Correo:** ' + B.email, '**Instagram:** ' + B.instagram]) + '\nSon datos de demostración.'], chips('Hablar con una persona', 'Quiero reservar')) });

    add({ id: 'ambiente', label: 'Ambiente y aforo', kw: { fumar: 4, fumadores: 4, cigarro: 4, vape: 3, musica: 4, ambiente: 3, tv: 3, partido: 3, partidos: 3, terraza: 4, interior: 3, aforo: 4, capacidad: 4, caben: 4, ruido: 3, tranquilo: 3 },
      ph: [['musica en vivo', 6], ['aire libre', 5], ['mesa afuera', 5], ['cuantas personas caben', 7], ['cuantas mesas', 5]],
      a: T(['El local tiene capacidad para **60 personas**, con una terraza cubierta. Dentro no se fuma. Ponemos música tradicional a volumen bajo para poder conversar, y no transmitimos partidos.'], chips('Quiero reservar', '¿Aceptan mascotas?', '¿Hacen eventos?')) });

    add({ id: 'accesibilidad', label: 'Accesibilidad y baños', kw: { rampa: 5, discapacidad: 5, accesible: 5, accesibilidad: 5, escalera: 3, escaleras: 3, bano: 2.5, banos: 2.5, tocador: 3, silla: 1, ruedas: 2 },
      ph: [['silla de ruedas', 6], ['movilidad reducida', 6], ['adulto mayor', 4], ['adultos mayores', 4], ['tercera edad', 4], ['bano adaptado', 6], ['donde esta el bano', 6]],
      a: T(['Todo el local está en **planta baja**, con rampa en la entrada y espacio entre mesas para sillas de ruedas. Los baños están al fondo, y uno de ellos es adaptado.'], chips('Quiero reservar', '¿Dónde quedan?')) });

    add({ id: 'wifi', label: 'Wi-Fi', kw: { wifi: 6, internet: 5, clave: 3, contrasena: 4, password: 4 },
      ph: [['wi fi', 6]],
      a: T(['Sí, hay Wi-Fi gratis para clientes. Red: **' + B.wifiName + '**. Clave: **' + B.wifiPass + '**.'], chips('Ver la carta', 'Quiero reservar')) });

    /* ---------- Carta ---------- */
    add({ id: 'carta', label: 'Carta', kw: { carta: 4, menu: 4, platos: 2, comida: 2, menus: 4 },
      ph: [['que venden', 5], ['que sirven', 5], ['que tienen', 3], ['que hay de comer', 6], ['que ofrecen', 5], ['ver la carta', 7], ['ver el menu', 7], ['lista de precios', 6], ['tipos de comida', 5], ['que preparan', 5], ['que cocinan', 5], ['que comida', 4], ['que platos tienen', 6], ['que platos hay', 6], ['que platos', 3], ['que hay para comer', 6], ['que tienen para comer', 6]],
      a: function () {
        var rows = D.CATEGORIES.map(function (cat) {
          var items = D.MENU.filter(function (m) { return m.cat === cat.id; });
          var prices = items.map(function (m) { return m.price; });
          return '**' + cat.name + '** (' + items.length + '): de ' + M(Math.min.apply(null, prices)) + ' a ' + M(Math.max.apply(null, prices));
        });
        return { text: 'Esta es nuestra carta, de cocina tradicional ecuatoriana:\n' + list(rows) + '\nLos precios no incluyen IVA (15 %). ¿Qué categoría quieres ver?', chips: chips('Sopas y caldos', 'Platos fuertes', 'Del mar', 'Bebidas', 'Postres') };
      } });

    [['sopas', 'Sopas', { sopa: 5, sopas: 5, caldos: 2 }, [['sopas y caldos', 6], ['algo caliente', 3], ['algo de sopa', 5]], chips('Platos fuertes', 'Del mar', 'Bebidas', 'Postres')],
     ['fuertes', 'Platos fuertes', { fuerte: 3, fuertes: 3, carnes: 3, carne: 2, cerdo: 3, principal: 3, segundo: 2, segundos: 2 }, [['platos fuertes', 6], ['plato fuerte', 6], ['plato principal', 6], ['de carne', 3]], chips('Sopas y caldos', 'Del mar', 'Bebidas', 'Postres')],
     ['mar', 'Del mar', { mariscos: 4, marisco: 4, pescado: 3, camarones: 3, mar: 2 }, [['del mar', 6], ['comida de mar', 6], ['comida marina', 6], ['platos del mar', 6]], chips('Sopas y caldos', 'Platos fuertes', 'Bebidas', 'Postres')],
     ['bebidas', 'Bebidas', { bebida: 5, bebidas: 5, tomar: 2.5, beber: 3, refresco: 3, refrescos: 3, jugos: 2 }, [['para tomar', 5], ['que hay de tomar', 6], ['de beber', 4]], chips('Sopas y caldos', 'Platos fuertes', 'Del mar', 'Postres')],
     ['postres', 'Postres', { postre: 5, postres: 5, dulce: 3, dulces: 3 }, [['algo dulce', 5], ['de postre', 5]], chips('Sopas y caldos', 'Platos fuertes', 'Del mar', 'Bebidas')]
    ].forEach(function (x) {
      add({ id: 'cat_' + x[0], label: x[1], kw: x[2], ph: x[3], a: function () { return { text: catList(x[0]).text, chips: x[4] }; } });
    });

    add({ id: 'recomendacion', label: 'Recomendación', kw: { 'recomiend*': 4, 'recomend*': 4, sugerencia: 3, sugieres: 4, sugiere: 4, sugerir: 4, especialidad: 4, favorito: 3, popular: 3, indeciso: 3, indecisa: 3, tipico: 2, especial: 1.5, hambre: 3, antojo: 3, antoja: 3, provoca: 3, hambriento: 3, hambrienta: 3 },
      ph: [['plato estrella', 6], ['lo mejor', 3], ['lo mas pedido', 6], ['mas vendido', 5], ['que pido', 4], ['que como', 3], ['que me conviene', 5], ['primera vez', 3], ['no se que pedir', 7], ['que probar', 5], ['que me aconsejas', 6], ['que es lo mejor', 6], ['que me sugieres', 7], ['que me recomiendas', 7], ['que plato pido', 6], ['que plato elijo', 6], ['mejor plato', 6], ['lo tipico', 4]],
      a: function () {
        return { text: 'Mis recomendaciones:\n' + list([
          '**Primera vez:** el **hornado con mote** (' + M(750) + '), el plato estrella de la casa.',
          '**Algo del mar:** el **ceviche de camarón** (' + M(600) + '), con canguil y chifles.',
          '**Para una sopa:** el **encebollado** (' + M(450) + '), el favorito de los sábados.',
          '**Vegetariano:** el **locro de papa** (' + M(350) + ').',
          '**Para cerrar:** una **espumilla** (' + M(125) + ') o un helado de paila.'
        ]), chips: chips('¿Qué lleva el hornado?', 'Ver la carta', 'Quiero reservar') };
      } });

    /* Preguntas sobre un plato: usan el plato que se nombre o el último del que se habló. */
    add({ id: 'plato', label: 'Un plato', kw: {}, a: function (c) {
      var d = c.dish; if (!d) return { text: '¿De qué plato quieres saber? Te muestro la carta.', chips: chips('Ver la carta') };
      return { text: '**' + d.name + '**, ' + M(d.price) + ' + IVA.\n' + d.desc + '. ' + d.note + '\nTarda unos ' + d.mins + ' minutos.', chips: dishChips(d) };
    } });

    add({ id: 'precio', label: 'Precio', kw: { precio: 4, precios: 4, cuesta: 4, cuestan: 4, costo: 3, costos: 3, valor: 2.5, barato: 3, baratos: 3, caro: 3, caros: 3, economico: 3, economicos: 3, cuanto: 1.5, sale: 1, valen: 3 },
      ph: [['cuanto es', 2], ['cuanto cuesta', 6], ['cuanto cuestan', 6], ['cuanto vale', 5], ['cuanto sale', 4], ['que precio', 5], ['mas barato', 5], ['mas economico', 5], ['cuanto cobran', 5], ['rango de precios', 6]],
      a: function (c) {
        var d = c.dish;
        if (d) return { text: '**' + d.name + '**: ' + M(d.price) + ' + IVA, es decir ' + M(H.withIva(d.price)) + ' en total.', chips: chips('Calcular una cuenta', '¿Qué lleva?', 'Quiero reservar') };
        return { text: 'Los precios van desde **' + M(100) + '** (agua) hasta **' + M(850) + '** (arroz marinero), sin IVA:\n' + list(['Sopas: ' + M(350) + ' a ' + M(450), 'Platos fuertes: ' + M(550) + ' a ' + M(750), 'Del mar: ' + M(600) + ' a ' + M(850), 'Bebidas: ' + M(100) + ' a ' + M(250), 'Postres: ' + M(125) + ' a ' + M(200)]) + '\nSi buscas algo económico, el **almuerzo del día** cuesta ' + M(450) + '. ¿Quieres que calcule una cuenta?', chips: chips('Almuerzo del día', '2 hornados y 3 jugos', 'Ver la carta') };
      } });

    add({ id: 'ingredientes', label: 'Ingredientes', kw: { lleva: 4, llevan: 4, ingrediente: 4, ingredientes: 4, acompan: 0, contiene: 3, trae: 3, incluye: 3, descripcion: 3, hecho: 2, consiste: 3, preparado: 2, preparan: 2, 'acompan*': 3 },
      ph: [['de que esta hecho', 6], ['con que viene', 6], ['viene con', 4], ['que incluye', 5], ['en que consiste', 6], ['que es el', 3.5], ['que es la', 3.5], ['que son los', 3.5], ['que son las', 3.5], ['de que es', 3], ['que trae', 5], ['como es el', 3], ['como es la', 3], ['que tiene el', 3], ['que tiene la', 3], ['que contiene', 5]],
      a: function (c) {
        var d = c.dish;
        if (!d) return { text: '¿De qué plato quieres saber? Dime el nombre y te cuento qué lleva.', chips: chips('Hornado con mote', 'Encebollado', 'Ver la carta') };
        return { text: '**' + d.name + '**: ' + d.desc + '. ' + d.note, chips: dishChips(d) };
      } });

    add({ id: 'picante', label: 'Picante', kw: { picante: 4, picantes: 4, pica: 3, pican: 3, aji: 4, picoso: 4, picosa: 4, picor: 3 },
      ph: [['sin aji', 6], ['con aji', 4], ['muy picante', 5], ['poco picante', 5], ['no pica', 5]],
      a: function (c) {
        var d = c.dish;
        if (d) return { text: d.spicy ? 'El **' + d.name.toLowerCase() + '** no viene picante: el ají casero se sirve **aparte** y tú decides cuánto agregar.' : 'El **' + d.name.toLowerCase() + '** no pica y no lleva ají.', chips: chips('¿Qué lleva?', '¿Qué alérgenos tiene?', 'Quiero reservar') };
        return { text: 'Ningún plato viene picante de fábrica. En la mesa te llevamos **ají casero** aparte, así cada persona lo ajusta. Los platos de sopa, la colada, los postres y el locro no necesitan ají.', chips: chips('Ver la carta', '¿Qué me recomiendas?') };
      } });

    add({ id: 'alergenos', label: 'Alergias', kw: { alergia: 4, alergias: 4, alergico: 4, alergica: 4, alergeno: 5, alergenos: 5, gluten: 4, celiaco: 4, celiaca: 4, celiaquia: 4, lactosa: 4, lacteo: 4, lacteos: 4, intolerancia: 4, intolerante: 4, mani: 4, nueces: 3, diabetico: 3, diabetica: 3, dieta: 2, sal: 1 },
      ph: [['sin gluten', 6], ['sin lactosa', 6], ['frutos secos', 4], ['que alergenos', 6], ['soy alergico', 6], ['soy alergica', 6], ['tengo alergia', 6], ['sin sal', 3]],
      a: function (c) {
        var d = c.dish;
        if (d) return { text: d.allergens.length ? '**' + d.name + '** contiene: **' + d.allergens.join(', ') + '**.' + ' Avísale al mesero para que lo tenga en cuenta en cocina.' : '**' + d.name + '** no contiene ninguno de los alérgenos más comunes. Aun así, avísale al mesero si tienes una alergia grave.', chips: chips('¿Qué lleva?', 'Opciones vegetarianas', 'Quiero reservar') };
        var rows = D.MENU.filter(function (m) { return m.allergens.length; }).map(function (m) { return m.name + ': ' + m.allergens.join(', '); });
        return { text: 'Dime a qué eres alérgico y te digo qué platos evitar, o pregúntame por un plato en concreto. Estos son los alérgenos de la carta:\n' + list(rows) + '\nNo hay maní en ningún plato, pero la cocina no es libre de trazas. Avisa al mesero si tu alergia es grave.', chips: chips('¿Hornado tiene lácteos?', 'Opciones vegetarianas') };
      } });

    add({ id: 'vegetariano', label: 'Vegetariano y vegano', kw: { vegetariano: 5, vegetariana: 5, vegetarianos: 5, vegetarianas: 5, vegano: 5, vegana: 5, veganos: 5, veganas: 5, veggie: 4, vegetal: 2, vegetales: 2, verduras: 2, 'vegan*': 5, 'vegetarian*': 5 },
      ph: [['sin carne', 6], ['no como carne', 7], ['no como carnes', 7], ['plant based', 4], ['opciones sin carne', 7]],
      a: function () {
        var veg = D.MENU.filter(function (m) { return m.veg === 'si'; }).map(function (m) { return m.name; });
        return { text: 'Sí, hay opciones:\n' + list([
          '**Platos:** locro de papa (' + M(350) + ') y llapingachos **sin chorizo** (' + M(550) + ', pídelos así).',
          '**Bebidas y postres:** ' + veg.filter(function (n) { return !/locro/i.test(n); }).join(', ') + '.',
          '**Veganos:** jugo de naranjilla, colada morada, agua, helado de paila y cerveza. El locro y los llapingachos llevan queso.'
        ]), chips: chips('¿Qué lleva el locro?', 'Ver la carta', 'Quiero reservar') };
      } });

    add({ id: 'porciones', label: 'Porciones', kw: { porcion: 4, porciones: 4, tamano: 4, compartir: 4, abundante: 3, grande: 2, comparto: 3 },
      ph: [['alcanza para', 5], ['sirve para dos', 6], ['es grande', 3], ['cuanto trae', 5], ['para compartir', 6], ['alcanza para dos', 7], ['es suficiente', 4], ['para una persona', 4]],
      a: T(['Las porciones son para **una persona** con buen apetito. El **arroz marinero** es el más grande y puede compartirse entre dos si piden también una sopa. Para grupos, recomendamos pedir varios platos y compartir.'], chips('¿Qué me recomiendas?', 'Ver la carta')) });

    add({ id: 'tiempo_espera', label: 'Tiempo de espera', kw: { demora: 4, demoran: 4, demoras: 4, tarda: 4, tardan: 4, tardanza: 4, demorar: 4, tardar: 4, rapido: 3, espera: 2, rapidez: 3, apuro: 3, prisa: 3 },
      ph: [['tiempo de espera', 6], ['tiempo de preparacion', 6], ['cuanto se demoran', 6], ['cuanto tardan', 6], ['cuanto demora', 6], ['que tan rapido', 6], ['tengo prisa', 5], ['en cuanto tiempo', 5]],
      a: function (c) {
        var d = c.dish;
        if (d) return { text: 'El **' + d.name.toLowerCase() + '** tarda unos **' + d.mins + ' minutos** desde que se pide.', chips: chips('¿Qué lleva?', 'Quiero reservar') };
        return { text: 'Tiempos aproximados:\n' + list(['Bebidas y postres: 2 a 5 minutos', 'Sopas: 8 a 10 minutos', 'Platos fuertes y ceviche: 10 a 15 minutos', 'Arroz marinero: unos 20 minutos']) + '\nSi tienes prisa, el locro y el encebollado salen rápido.', chips: chips('Ver la carta', 'Quiero reservar') };
      } });

    add({ id: 'cuenta', label: 'Calcular cuenta', kw: { cuenta: 2, total: 3, subtotal: 3, calcula: 4, calcular: 4, calculame: 4, presupuesto: 3 },
      ph: [['cuanto saldria', 5], ['cuanto costaria', 5], ['cuanto seria', 3], ['hazme la cuenta', 7], ['calcula la cuenta', 7], ['calcular una cuenta', 7]],
      a: function (c) {
        if (!c.order || !c.order.items.length) return { text: 'Dime los platos con su cantidad y te calculo el total con IVA. Por ejemplo: **«2 hornados, 1 ceviche y 3 jugos»**.', chips: chips('2 hornados y 3 jugos', '1 encebollado y 1 colada') };
        return { text: H.orderText(c.order), chips: chips('Quiero reservar', 'Pedir a domicilio', 'Calcular otra cuenta') };
      } });

    add({ id: 'iva_propina', label: 'IVA y propina', kw: { iva: 5, impuesto: 4, impuestos: 4, propina: 5, propinas: 5, servicio: 2, recargo: 4, incluido: 2, adicional: 3, adicionales: 3 },
      ph: [['incluye iva', 6], ['cargo adicional', 5], ['costo adicional', 5], ['cobran servicio', 5], ['diez por ciento', 4], ['se cobra propina', 6], ['esta incluida la propina', 7], ['precios incluyen', 5]],
      a: T(['Los precios de la carta **no incluyen IVA**; se suma **15 %** al total. La **propina no está incluida y es voluntaria**: si el servicio te gustó, lo habitual es dejar el 10 %. No cobramos recargo por servicio.'], chips('Calcular una cuenta', 'Formas de pago')) });

    add({ id: 'pagos', label: 'Formas de pago', kw: { pago: 3, pagos: 3, pagar: 3, pagan: 3, tarjeta: 4, tarjetas: 4, efectivo: 4, transferencia: 4, transferencias: 4, visa: 3, mastercard: 3, debito: 3, credito: 3, qr: 3, deuna: 3, billetera: 2, cheque: 3, cash: 2, aceptan: 2.5, dolares: 2, cambio: 1.5, diners: 3, 'pag*': 2 },
      ph: [['metodos de pago', 7], ['formas de pago', 7], ['pagar con', 4], ['como pago', 5], ['aceptan tarjeta', 7], ['se puede pagar', 6]],
      a: T(['Aceptamos:\n' + list(['**Efectivo** (dólares)', '**Tarjetas** de débito y crédito, sin recargo', '**Transferencia o código QR** de los bancos del país']) + '\nNo recibimos cheques.'], chips('¿Dan factura?', '¿El IVA está incluido?')) });

    add({ id: 'factura', label: 'Factura', kw: { factura: 5, facturas: 5, facturar: 5, ruc: 5, facturacion: 5, comprobante: 4, deducible: 4 },
      ph: [['nota de venta', 5], ['factura electronica', 7], ['datos de facturacion', 7], ['con ruc', 6], ['con cedula', 3]],
      a: T(['Sí, emitimos **factura electrónica**. Dale tu cédula o RUC al cajero antes de pagar y te llega al correo en unos minutos. Si no pides factura, se emite a consumidor final.'], chips('Formas de pago', 'Quiero reservar')) });

    add({ id: 'alcohol', label: 'Alcohol', kw: { alcohol: 4, vino: 4, vinos: 4, trago: 4, tragos: 4, coctel: 4, cocteles: 4, licor: 4, licores: 4, chela: 3, menores: 3, edad: 2, michelada: 3, whisky: 4, ron: 3 },
      ph: [['bebidas alcoholicas', 7], ['venden alcohol', 7], ['tienen cerveza', 3]],
      a: T(['Por ahora solo servimos **cerveza Pilsener** de 600 ml (' + M(250) + '). No tenemos vino ni tragos. Es solo para mayores de 18 años, y podemos pedir la cédula.'], chips('Ver las bebidas', 'Ver la carta')) });

    add({ id: 'glosario', label: 'Glosario', kw: { mote: 3, canguil: 3, chifle: 3, chifles: 3, encurtido: 3, taxo: 3, maduro: 2.5, yuca: 3, guayaba: 3, chocho: 3, tostado: 3 },
      ph: [['que es el mote', 6], ['que es el canguil', 6], ['que son los chifles', 6], ['que es el encurtido', 6]],
      a: function (c) {
        var key = null;
        c.an.tokens.forEach(function (t) { if (!key && GLOSS[t.stem]) key = t.stem; if (!key && GLOSS[t.raw]) key = t.raw; });
        if (key) return { text: GLOSS[key], chips: chips('¿Qué me recomiendas?', 'Ver la carta') };
        return { text: '¿Qué ingrediente quieres que te explique? Por ejemplo: mote, canguil, chifles, encurtido, taxo o maduro.', chips: chips('¿Qué es el mote?', '¿Qué son los chifles?') };
      } });

    add({ id: 'proveedores', label: 'Ingredientes locales', kw: { proveedor: 4, proveedores: 4, fresco: 3, frescos: 3, organico: 3, organicos: 3, natural: 1.5, congelado: 3, congelados: 3, local: 2 },
      ph: [['producto local', 6], ['ingredientes locales', 7], ['de donde son', 5], ['de donde viene', 5], ['de donde vienen', 5], ['son frescos', 6]],
      a: T(['Compramos las papas y el mote a productores de la sierra de Chimborazo, y el pescado y los mariscos llegan frescos de puertos del Pacífico. No usamos pescado congelado en los platos del día, y las frutas de los jugos son naturales.'], chips('¿Qué me recomiendas?', 'Ver la carta')) });

    /* ---------- Reservas ---------- */
    add({ id: 'reservar', label: 'Reservar mesa', kw: { reserva: 5, reservar: 5, reservo: 5, reservacion: 5, reservas: 3, reservarme: 5, mesa: 2.5, mesas: 2.5, apartar: 4, separar: 3, agendar: 3, cupo: 2.5, cupos: 2.5, disponibilidad: 3, disponible: 1.5, espacio: 1.5, sitio: 1.5 },
      ph: [['mesa para', 4], ['quiero ir', 3], ['puedo ir', 2], ['ir a comer', 3], ['hay espacio', 4], ['hay sitio', 4], ['hay mesa', 5], ['quiero una mesa', 6], ['quiero reservar', 8], ['necesito una mesa', 7], ['hacer una reserva', 8], ['reservar una mesa', 8], ['separar una mesa', 8]],
      not: ['cancel', 'cancelar', 'cancelo', 'anular', 'cambiar', 'modificar'],
      a: function (c) { return { startFlow: 'reserva' }; } });

    add({ id: 'mis_reservas', label: 'Mis reservas', kw: {},
      ph: [['mis reservas', 8], ['mi reserva', 7], ['ver mi reserva', 9], ['consultar reserva', 8], ['tengo una reserva', 6], ['revisar mi reserva', 9], ['codigo de reserva', 7], ['estado de mi reserva', 9], ['reservas que tengo', 8]],
      a: function (c) {
        var rs = c.S.reservations;
        if (!rs.length) return { text: 'No tienes reservas guardadas en este navegador. ¿Quieres hacer una?', chips: chips('Quiero reservar') };
        return { text: 'Tus reservas:\n' + list(rs.map(function (r) { return '**' + r.code + '**: ' + H.dateLong(r.date) + ', ' + H.hhmm(r.time) + ', mesa para ' + r.people + ' a nombre de ' + r.name + '.'; })), chips: chips('Cancelar mi reserva', 'Hacer otra reserva', '¿Dónde quedan?') };
      } });

    add({ id: 'cancelar_reserva', label: 'Cancelar reserva', kw: { cancelar: 4, cancelo: 4, cancelacion: 4, anular: 4, anulo: 4, 'cancel*': 4 },
      ph: [['cancelar mi reserva', 9], ['cancelar la reserva', 9], ['anular mi reserva', 9], ['ya no puedo ir', 6], ['no podre ir', 6], ['no voy a poder', 6], ['eliminar reserva', 8], ['borrar mi reserva', 8], ['cancelar reserva', 9]],
      a: function (c) { return { startFlow: 'cancelar' }; } });

    add({ id: 'cambiar_reserva', label: 'Cambiar reserva', kw: { modificar: 4, reprogramar: 5, cambiar: 2 },
      ph: [['cambiar mi reserva', 9], ['cambiar la reserva', 9], ['modificar mi reserva', 9], ['cambiar la hora de mi reserva', 10], ['cambiar la fecha de mi reserva', 10], ['mover mi reserva', 9], ['reprogramar mi reserva', 10]],
      a: T(['Para cambiarla, lo más fácil es **cancelar la anterior y crear una nueva**. Toma menos de un minuto. ¿Empezamos?'], chips('Cancelar mi reserva', 'Hacer una reserva')) });

    add({ id: 'eventos', label: 'Eventos y grupos', kw: { evento: 4, eventos: 4, cumpleanos: 4, cumple: 4, fiesta: 4, celebrar: 4, celebracion: 4, grupo: 2, grupos: 3, salon: 4, catering: 5, banquete: 4, matrimonio: 3, boda: 3, graduacion: 4, reunion: 3, agasajo: 4, aniversario: 3, bautizo: 3, empresa: 2, empresarial: 3, 'cumplea*': 4, 'celebr*': 4 },
      ph: [['grupo grande', 6], ['salon privado', 7], ['menu cerrado', 6], ['somos muchos', 5], ['mesa grande', 5], ['mas de doce', 6]],
      a: T(['Sí, hacemos eventos y cumpleaños:\n' + list(['**Grupos desde 13 personas:** se reservan con 48 horas de anticipación por teléfono.', '**Salón privado** para hasta 40 personas.', '**Menú cerrado** desde ' + M(900) + ' por persona (hornado o fritada, bebida y postre).', '**Cumpleaños:** el cumpleañero recibe una espumilla con vela, cortesía de la casa.']) + '\nEscribe o llama al **' + B.phone + '** para cotizar.'], chips('Hablar con una persona', 'Quiero reservar')) });

    /* ---------- Pedidos ---------- */
    add({ id: 'domicilio', label: 'Domicilio', kw: { domicilio: 5, delivery: 5, envio: 4, envios: 4, entrega: 3, entregas: 3, entregan: 3, envian: 4, glovo: 3, rappi: 3, pedidosya: 3, 'entreg*': 3, 'envi*': 2 },
      ph: [['a domicilio', 6], ['llevan a casa', 6], ['pedido a casa', 6], ['uber eats', 4], ['costo de envio', 6], ['el envio', 5], ['cuanto es el envio', 8], ['a mi casa', 5], ['a casa', 3], ['llevan comida', 6], ['comida a mi casa', 7], ['cuanto cobran de envio', 7], ['hasta donde llegan', 6], ['llegan hasta', 5], ['cobertura', 5]],
      a: T(['Sí, hacemos entregas a domicilio:\n' + list(['**Cobertura:** hasta 5 km del local.', '**Costo:** ' + M(150) + ' hasta 3 km y ' + M(250) + ' hasta 5 km.', '**Pedido mínimo:** ' + M(800) + '.', '**Tiempo:** de 35 a 50 minutos.', '**Cómo pedir:** por llamada o WhatsApp al ' + B.phone + '. No trabajamos con aplicaciones.']), 'Sí, enviamos a domicilio dentro de 5 km. Pides por llamada o WhatsApp al **' + B.phone + '**, el pedido mínimo es de ' + M(800) + ' y el envío cuesta ' + M(150) + ' (hasta 3 km) o ' + M(250) + ' (hasta 5 km). Tarda de 35 a 50 minutos.'], chips('Calcular una cuenta', 'Pedir para llevar', 'Formas de pago')) });

    add({ id: 'para_llevar', label: 'Para llevar', kw: { llevar: 3, empaque: 3, envase: 3, retirar: 4, recoger: 4, tupper: 2, empacar: 3, empacan: 3 },
      ph: [['para llevar', 7], ['take away', 4], ['paso a recoger', 6], ['pedir para llevar', 8], ['llevarme', 3], ['sobras', 3]],
      a: T(['Sí, todo se puede pedir **para llevar**. Llama al ' + B.phone + ' unos 20 minutos antes y lo tendremos listo en caja. El envase es biodegradable y cuesta ' + M(30) + ' por sopa o plato. Si te sobra comida en la mesa, también te la empacamos.'], chips('Calcular una cuenta', 'Entregas a domicilio')) });

    add({ id: 'promociones', label: 'Promociones', kw: { promo: 5, promocion: 5, promociones: 5, descuento: 5, descuentos: 5, oferta: 5, ofertas: 5, almuerzo: 5, almuerzos: 5, ejecutivo: 4, combo: 4, combos: 4, estudiante: 4, estudiantes: 4, carnet: 4, cupon: 4, promos: 5, especial: 1 },
      ph: [['almuerzo del dia', 8], ['menu del dia', 8], ['menu ejecutivo', 7], ['dos por uno', 6], ['cuesta el almuerzo', 14], ['precio del almuerzo', 14], ['cuanto cuesta el almuerzo', 14], ['domingo familiar', 7], ['tienen descuento', 6], ['hay promociones', 7]],
      a: T(['Estas son las promociones de la casa:\n' + list(['**Almuerzo del día** (' + M(450) + ' con IVA incluido): sopa, plato fuerte y jugo. De martes a viernes, de 12:00 a 15:00.', '**Martes de estudiantes:** 10 % de descuento con carnet vigente (no se suma al almuerzo).', '**Domingo familiar:** una jarra de jugo de naranjilla gratis por cada 4 platos fuertes.'])], chips('Ver la carta', 'Quiero reservar')) });

    add({ id: 'ninos', label: 'Niños', kw: { nino: 4, ninos: 4, nina: 4, ninas: 4, bebe: 4, bebes: 4, infantil: 4, familia: 2, hijo: 2, hijos: 2, hija: 2, coche: 2, cambiador: 4, juegos: 2 },
      ph: [['silla alta', 6], ['menu infantil', 7], ['con ninos', 6], ['con un bebe', 6], ['para ninos', 6], ['sillas para bebes', 7]],
      a: T(['Sí, recibimos familias. Tenemos **4 sillas altas** para bebés (pídelas al reservar) y un **menú infantil** a ' + M(300) + ': media porción de llapingachos o de caldo de gallina, con jugo. Los niños menores de 5 años no pagan consumo si comparten el plato de un adulto.'], chips('Quiero reservar', '¿Hay opciones vegetarianas?')) });

    add({ id: 'mascotas', label: 'Mascotas', kw: { mascota: 5, mascotas: 5, perro: 5, perros: 5, perrito: 5, gato: 5, gatos: 5, pet: 3, animal: 3, animales: 3, 'perr*': 4 },
      ph: [['aceptan mascotas', 8], ['puedo llevar a mi perro', 8], ['con mi perro', 6], ['pet friendly', 6]],
      a: T(['Las mascotas son bienvenidas en la **terraza**, con correa. Dentro del local no se permiten, salvo perros de asistencia.'], chips('Quiero reservar', '¿Dónde quedan?')) });

    /* ---------- Personas ---------- */
    add({ id: 'humano', label: 'Hablar con una persona', kw: { humano: 3, agente: 4, asesor: 4, gerente: 4, encargado: 4, administrador: 4, llamen: 3, persona: 2, personal: 1 },
      ph: [['hablar con una persona', 9], ['hablar con alguien', 8], ['persona real', 7], ['quiero hablar con', 6], ['pasame con', 6], ['atencion al cliente', 7], ['hablar con el gerente', 9], ['hablar con un humano', 9], ['comunicarme con una persona', 9]],
      a: T(['Con gusto. Una persona del equipo te atiende en el **' + B.phone + '** (llamada o WhatsApp) durante el horario de atención, o por correo en **' + B.email + '**. Son datos de demostración.'], chips('Ver el horario', 'Quiero reservar')) });

    add({ id: 'queja', label: 'Queja', kw: { queja: 5, quejas: 5, reclamo: 5, reclamos: 5, pesimo: 4, horrible: 4, molesto: 3, molesta: 3, decepcion: 4, decepcionado: 4, inconforme: 4, mal: 1.5, error: 2, equivocaron: 4, 'queja*': 5 },
      ph: [['mal servicio', 6], ['mala atencion', 6], ['no me gusto', 6], ['me cobraron mal', 7], ['error en la cuenta', 7], ['tengo una queja', 8], ['quiero reclamar', 7], ['mala experiencia', 7], ['llego frio', 5], ['estaba frio', 5]],
      a: T(['Lamento mucho que hayas tenido esa experiencia. Quiero que se solucione: escribe a **' + B.email + '** con la fecha, la mesa y lo que pasó, o llama al **' + B.phone + '** y pide hablar con el encargado. Respondemos en máximo 24 horas.'], chips('Hablar con una persona')) });

    add({ id: 'empleo', label: 'Trabajo', kw: { empleo: 5, vacante: 5, vacantes: 5, curriculum: 5, cv: 4, contratando: 5, pasantia: 5, pasantias: 5, practicas: 3, 'trabaj*': 2.5 },
      ph: [['hoja de vida', 7], ['quiero trabajar', 7], ['necesitan personal', 7], ['buscan personal', 7], ['trabajar con ustedes', 8], ['buscan meseros', 7]],
      a: T(['Si quieres trabajar con nosotros, envía tu **hoja de vida** a **' + B.jobsEmail + '** indicando el puesto (mesero, cocina o caja). Cuando abrimos vacantes, te escribimos para una entrevista.'], chips('Hablar con una persona', 'Ver la carta')) });

    add({ id: 'historia', label: 'Historia', kw: { historia: 4, fundacion: 4, fundada: 4, origen: 3, tradicion: 3, chef: 3, cocinero: 3, cocineros: 3, receta: 3, recetas: 3, dueno: 3, duena: 3, familiar: 2 },
      ph: [['quienes son', 4], ['desde cuando', 5], ['cuantos anos', 4], ['sobre ustedes', 5], ['acerca de', 3], ['quien es el dueno', 6], ['de quien es', 3]],
      a: T(['La picantería nació en **1998** como un puesto en el mercado, y desde 2012 está en este local. Las recetas son de la familia y se cocinan a fuego lento, como siempre. Es una historia de demostración, pensada para este portafolio.'], chips('Ver la carta', 'Quiero reservar')) });

    add({ id: 'tarjeta_regalo', label: 'Tarjetas de regalo', kw: { bono: 4, bonos: 4, regalo: 3, regalar: 3, obsequio: 3 },
      ph: [['tarjeta de regalo', 8], ['gift card', 8], ['vale regalo', 8], ['quiero regalar', 6]],
      a: T(['Todavía no tenemos tarjetas de regalo. Sí puedes dejar **un consumo pagado por adelantado** en caja, y la persona lo usa cuando venga. Pregunta por el encargado.'], chips('Hablar con una persona', 'Quiero reservar')) });

    return I;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = factory;
  else root.BOT_KB = factory;
})(typeof window !== 'undefined' ? window : globalThis);
