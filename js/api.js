/**
 * API - Capa de abstracción para comunicación con el backend
 * Todas las peticiones HTTP al backend pasan por aquí
 */

class API {
  constructor() {
    this.baseURL = CONFIG.API_URL;
    this.cache = {
      menu: null,
      horaLimite: null
    };
  }

  /**
   * Realizar petición GET al servidor
   */
  async get(action, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        action: action,
        ...params
      });

      const url = `${this.baseURL}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error en petición GET:', error);
      throw error;
    }
  }

  /**
   * Realizar petición POST al servidor
   */
  async post(action, data) {
    try {
      const url = `${this.baseURL}?action=${action}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error en petición POST:', error);
      throw error;
    }
  }

  /**
   * Obtener el menú del día según el turno
   */
  async getMenuDelDia(turno, forceRefresh = false) {
    const cacheKey = `menu_${turno}`;
    if (this.cache[cacheKey] && !forceRefresh) {
      return this.cache[cacheKey];
    }

    const response = await this.get('getMenuDelDia', { turno: turno });
    
    if (response.success) {
      this.cache[cacheKey] = response;
      return response;
    } else {
      throw new Error(response.error || 'Error al obtener el menú');
    }
  }

  /**
   * Obtener el menú semanal completo (para admin)
   */
  async getMenuSemanal() {
    const response = await this.get('getMenuSemanal');
    
    if (response.success) {
      return response;
    } else {
      throw new Error(response.error || 'Error al obtener el menú semanal');
    }
  }

  /**
   * Verificar disponibilidad para reservar según el turno
   */
  async checkDisponibilidad(turno) {
    const response = await this.get('checkDisponibilidad', { turno: turno });
    
    if (response.success) {
      this.cache.disponibilidad = response;
      return response;
    } else {
      throw new Error(response.error || 'Error al verificar disponibilidad');
    }
  }

  /**
   * Crear una nueva reserva
   */
  async crearReserva(reservaData) {
    const response = await this.post('crearReserva', reservaData);
    
    if (response.success) {
      return response;
    } else {
      throw new Error(response.error || 'Error al crear la reserva');
    }
  }

  /**
   * Obtener reservas de una fecha específica y turno
   */
  async getReservas(fecha = null, turno = null) {
    const params = {};
    if (fecha) params.fecha = fecha;
    if (turno) params.turno = turno;
    
    const response = await this.get('getReservas', params);
    
    if (response.success) {
      return response;
    } else {
      throw new Error(response.error || 'Error al obtener las reservas');
    }
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache = {
      menu: null,
      horaLimite: null
    };
  }
}

// Crear instancia global de la API
const api = new API();
