/* Evento de demostración. Todo es ficticio. */
(function (root) {
  var EVENT = {
    name: 'Jornadas de Software Chimborazo',
    edition: '2026',
    dates: 'Del 23 al 25 de noviembre',
    place: 'Presencial, Centro de Convenciones Chimborazo',
    codePrefix: 'JSC-'
  };

  var SESSIONS = [
    { id: 's1', day: 'Lun 23 nov', time: '09:00', title: 'Inauguración y charla magistral', place: 'Auditorio Mayor', cap: 300 },
    { id: 's2', day: 'Lun 23 nov', time: '14:00', title: 'Taller: automatiza tareas con IA', place: 'Laboratorio 2, piso 3', cap: 40 },
    { id: 's3', day: 'Mar 24 nov', time: '10:00', title: 'Panel: primeros empleos en software', place: 'Sala Chimborazo', cap: 250 },
    { id: 's4', day: 'Mar 24 nov', time: '15:00', title: 'Taller: webs rápidas con Astro', place: 'Laboratorio 1, piso 3', cap: 30 },
    { id: 's5', day: 'Mié 25 nov', time: '09:00', title: 'Hackatón relámpago', place: 'Sala de innovación', cap: 60 },
    { id: 's6', day: 'Mié 25 nov', time: '16:00', title: 'Clausura y sorteos', place: 'Auditorio Mayor', cap: 300 }
  ];

  var data = { EVENT: EVENT, SESSIONS: SESSIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.JSC_DATA = data;
})(typeof window !== 'undefined' ? window : globalThis);
