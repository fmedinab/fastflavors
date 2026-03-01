/**
 * API - Capa de abstracción para comunicación con el backend
 * Usa GET simple para evitar problemas CORS (sin preflight)
 */

class API {
  constructor() {
    this.baseURL = CONFIG.API_URL;
    this.cache = {};
  }

  /**
   * Realizar petición GET simple (sin preflight CORS)
   */
  async get(action, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        action: action,
        ...params
      });

      const url = `${this.baseURL}?${queryParams.toString()}`;
      
      // Fetch simple sin headers personalizados (no activa preflight)
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 API Response:', data);
      
      // No lanzar error aquí, dejar que el caller maneje success/failure
      return data;

    } catch (error) {
      console.error('Error en petición:', error);
      throw error;
    }
  }

  /**
   * POST usando GET (enviando datos en URL)
   */
  async post(action, postData) {
    try {
      const params = {
        postData: JSON.stringify(postData)
      };
      
      return await this.get(action, params);

    } catch (error) {
      console.error('Error en petición POST:', error);
      throw error;
    }
  }

  /**
   * Petición genérica para cualquier acción
   */
  async request(action, params = {}) {
    try {
      // Si es una acción de escritura (POST), usar post
      const accionesPost = ['crearReserva', 'cancelarReserva', 'actualizarMenu'];
      
      if (accionesPost.includes(action)) {
        return await this.post(action, params);
      } else {
        return await this.get(action, params);
      }
    } catch (error) {
      console.error(`Error en petición ${action}:`, error);
      throw error;
    }
  }

  /**
   * Buscar estudiante por código
   */
  async buscarEstudiante(codigo) {
    return await this.get('buscarEstudiante', { codigo });
  }

  /**
   * Buscar reserva para cancelar
   */
  async buscarReservaParaCancelar(codigo) {
    return await this.get('buscarReservaParaCancelar', { codigo });
  }

  /**
   * Cancelar una reserva
   */
  async cancelarReserva(codigo, rowNumber) {
    return await this.post('cancelarReserva', { codigo, rowNumber });
  }

  /**
   * Obtener el menú del día según el turno
   */
  async getMenuDelDia(turno, forceRefresh = false) {
    const cacheKey = `menu_${turno}`;
    if (this.cache[cacheKey] && !forceRefresh) {
      console.log('📦 Menú cargado desde caché');
      return this.cache[cacheKey];
    }

    const data = await this.get('getMenuDelDia', { turno });
    this.cache[cacheKey] = data;
    return data;
  }

  /**
   * Verificar disponibilidad de reserva según turno
   */
  async checkDisponibilidad(turno) {
    return await this.get('checkDisponibilidad', { turno });
  }

  /**
   * Verificar disponibilidad de todos los turnos
   */
  async checkTodosLosTurnos() {
    console.log('🔎 Iniciando verificación de todos los turnos...');
    const turnos = Object.keys(CONFIG.TURNOS);
    console.log('📝 Turnos a verificar:', turnos);
    const resultados = {};
    
    for (const turno of turnos) {
      try {
        console.log(`⏳ Verificando turno: ${turno}`);
        const response = await this.checkDisponibilidad(turno);
        console.log(`📦 Respuesta para ${turno}:`, response);
        
        const data = response.data || response;
        resultados[turno] = {
          disponible: data.puedeReservar || false,
          mensaje: data.mensaje || '',
          horaLimite: data.horaLimite || '',
          razon: data.razon || null,
          horaInicio: data.horaInicio || null
        };
        
        console.log(`✔️ ${turno} procesado:`, resultados[turno]);
      } catch (error) {
        console.error(`❌ Error verificando turno ${turno}:`, error);
        resultados[turno] = {
          disponible: false,
          mensaje: 'Error al verificar',
          horaLimite: ''
        };
      }
    }
    
    console.log('✅ Resultados finales de disponibilidad:', resultados);
    return resultados;
  }

  /**
   * Obtener menú semanal completo (para admin)
   */
  async getMenuSemanal() {
    return await this.get('getMenuSemanal');
  }

  /**
   * Obtener anuncios dinámicos
   */
  async getAnuncios() {
    return await this.get('getAnuncios');
  }

  /**
   * Crear nueva reserva
   */
  async crearReserva(datosReserva) {
    return await this.post('crearReserva', datosReserva);
  }

  /**
   * Actualizar menú semanal (para admin)
   */
  async actualizarMenu(menuData) {
    return await this.post('actualizarMenu', menuData);
  }

  /**
   * Obtener estadísticas de reservas por fecha
   */
  async getEstadisticas(fecha = null) {
    const params = fecha ? { fecha } : {};
    return await this.get('getEstadisticas', params);
  }

  /**
   * Obtener resumen de estadísticas (últimos 7 días)
   */
  async getEstadisticasResumen() {
    return await this.get('getEstadisticasResumen');
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache = {};
    console.log('🗑️ Caché limpiado');
  }
}

// Crear instancia global del API
const api = new API();
