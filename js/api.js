
/**
 * API - Capa de abstracción para comunicación con el backend
 * Usa GET simple para evitar problemas CORS (sin preflight)
 */

class API {
  constructor() {
    this.baseURL = CONFIG.API_URL;
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos de caché
    this.cacheTimestamps = {};
  }

  /**
   * Obtener item del caché si no ha expirado
   */
  getFromCache(key) {
    const now = Date.now();
    const timestamp = this.cacheTimestamps[key] || 0;
    const cacheAge = now - timestamp;
    
    // Si el caché tiene menos de 5 minutos, devolverlo
    if (this.cache[key] && cacheAge < this.cacheTimeout) {
      return this.cache[key];
    }
    
    // Si expiró, limpiar
    delete this.cache[key];
    delete this.cacheTimestamps[key];
    return null;
  }

  /**
   * Guardar en caché
   */
  setCache(key, value) {
    this.cache[key] = value;
    this.cacheTimestamps[key] = Date.now();
  }

  /**
   * 🚀 Fetch con timeout automático (15 segundos max)
   */
  async fetchWithTimeout(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Petición excedió ${timeoutMs}ms`);
      }
      throw error;
    }
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
      
      // 🚀 Usar fetch con timeout
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // console.log('📦 API Response:', data);
      
      // No lanzar error aquí, dejar que el caller maneje success/failure
      return data;

    } catch (error) {
      // console.error('Error en petición:', error);
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
   * Buscar estudiante por código o nombre (con autocompletado)
   */
  async searchStudent(query) {
    return await this.get('searchStudent', { query });
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
   * Obtener el menú del día según el turno con caché
   */
  async getMenuDelDia(turno, forceRefresh = false) {
    const cacheKey = `menu_${turno}`;
    
    if (forceRefresh) {
      delete this.cache[cacheKey];
      delete this.cacheTimestamps[cacheKey];
    }
    
    if (!forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        if (cached.data && cached.data.menu && cached.data.menu.length > 0) {
          const turnoEnCache = (cached.data.menu[0].turno || cached.data.menu[0].Turno || '').toUpperCase();
          if (turnoEnCache === turno.toUpperCase()) {
            return cached;
          }
          delete this.cache[cacheKey];
          delete this.cacheTimestamps[cacheKey];
        }
      }
    }

    const data = await this.get('getMenuDelDia', { turno });
    
    if (data.data && data.data.menu && data.data.menu.length > 0) {
      const turnoDelBackend = (data.data.menu[0].turno || data.data.menu[0].Turno || '').toUpperCase();
      
      if (turnoDelBackend !== turno.toUpperCase()) {
        const menuFiltrado = data.data.menu.filter(p => 
          (p.turno || p.Turno || '').toUpperCase() === turno.toUpperCase()
        );
        data.data.menu = menuFiltrado;
      }
    }
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Verificar disponibilidad de reserva según turno
   */
  async checkDisponibilidad(turno) {
    return await this.get('checkDisponibilidad', { turno });
  }

  /**
   * Verificar disponibilidad de todos los turnos en paralelo
   */
  async checkTodosLosTurnos() {
    const turnos = Object.keys(CONFIG.TURNOS);
    
    const promesas = turnos.map(turno => 
      this.checkDisponibilidad(turno)
        .then(response => {
          const data = response.data || response;
          return {
            turno,
            resultado: {
              disponible: data.puedeReservar || false,
              mensaje: data.mensaje || '',
              horaLimite: data.horaLimite || '',
              razon: data.razon || null,
              horaInicio: data.horaInicio || null
            }
          };
        })
        .catch(() => {
          return {
            turno,
            resultado: {
              disponible: false,
              mensaje: 'Error al verificar',
              horaLimite: ''
            }
          };
        })
    );
    
    const resultadosArray = await Promise.all(promesas);
    const resultados = {};
    resultadosArray.forEach(({ turno, resultado }) => {
      resultados[turno] = resultado;
    });
    
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
    this.cacheTimestamps = {};
  }

  // ========== SISTEMA DE PRÉSTAMOS ==========

  /**
   * Obtener todos los estudiantes
   */
  async getEstudiantes() {
    return await this.get('getEstudiantes');
  }

  /**
   * Buscar estudiante por código o nombre (para préstamos)
   */
  async buscarEstudianteParaPrestamo(filtro) {
    return await this.get('buscarEstudianteParaPrestamo', { filtro });
  }

  /**
   * Registrar un nuevo préstamo
   */
  async registrarPrestamo(datos) {
    return await this.post('registrarPrestamo', datos);
  }

  /**
   * Obtener préstamos de un estudiante
   */
  async getPrestamosEstudiante(codigoEstudiante) {
    return await this.get('getPrestamosEstudiante', { codigoEstudiante });
  }

  /**
   * Registrar un pago
   */
  async registrarPago(datos) {
    return await this.post('registrarPago', datos);
  }

  /**
   * Obtener resumen de deudas de todos los estudiantes
   */
  async getResumenDeudas() {
    return await this.get('getResumenDeudas');
  }
}

// Crear instancia global del API
const api = new API();