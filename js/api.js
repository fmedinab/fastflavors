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

      const data = await response.json();
      
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      
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
   * Obtener menú semanal completo (para admin)
   */
  async getMenuSemanal() {
    return await this.get('getMenuSemanal');
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
   * Limpiar caché
   */
  clearCache() {
    this.cache = {};
    console.log('🗑️ Caché limpiado');
  }
}

// Crear instancia global del API
const api = new API();
