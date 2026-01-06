/**
 * CONFIGURACIÓN - Variables globales del sistema
 * Sistema de Comedor Estudiantil con 2 turnos diarios
 */

const CONFIG = {
  // URL de tu Google Apps Script Web App
  // ⚠️ REEMPLAZA esta URL con la que obtuviste al implementar el Apps Script
  // Ejemplo: 'https://script.google.com/macros/s/AKfycbx.../exec'
  API_URL: 'https://script.google.com/macros/s/AKfycbzWMyeqpYH44toaFCiz8RH1TIjNoeRrZsGGR-JeynmfYam00Wc5rHfk5exeSZ_4h298/exec',
  
  // Configuración de turnos
  TURNOS: {
    MANANA: {
      nombre: 'Mañana',
      horaReceso: '10:00 AM',
      horaLimite: '09:00 AM',
      descripcion: 'Receso de mañana'
    },
    TARDE: {
      nombre: 'Tarde',
      horaReceso: '5:30 PM',
      horaLimite: '4:30 PM',
      descripcion: 'Receso de tarde'
    }
  },
  
  // Turno por defecto
  TURNO_DEFAULT: 'MANANA',
  
  // Configuración de interfaz
  MONEDA: 'S/', // Símbolo de moneda
  
  // Días de la semana
  DIAS_HABILES: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  
  // Mensajes del sistema
  MENSAJES: {
    RESERVA_EXITOSA: '¡Reserva confirmada! No olvides recoger tu comida a la hora indicada.',
    RESERVA_CERRADA: 'Lo sentimos, ya no se aceptan reservas para este turno.',
    DIA_FERIADO: '🎉 Hoy es feriado, no hay servicio de comedor',
    DIA_DESACTIVADO: '⚠️ El servicio no está disponible hoy',
    ERROR_CONEXION: 'Error de conexión con el servidor. Por favor, intenta nuevamente.',
    CAMPOS_REQUERIDOS: 'Por favor, completa todos los campos obligatorios.',
    SIN_MENU: 'Selecciona tu menú para continuar.',
    FIN_SEMANA: 'El servicio de comedor no está disponible los fines de semana.',
    CODIGO_INVALIDO: 'El código de estudiante debe tener entre 5 y 10 caracteres.'
  }
};

// Exportar configuración (para módulos ES6, si se usa)
// export default CONFIG;







