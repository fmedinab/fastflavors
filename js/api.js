/**
 * API - Capa de abstracción para comunicación con el backend
 * Usa JSONP para evitar problemas de CORS con Google Apps Script
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
   * Realizar petición usando JSONP (solución para CORS de Google Apps Script)
   */
  async jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonp_callback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      const queryParams = new URLSearchParams({
        action: action,
        callback: callbackName,
        ...params
      });

      const script = document.createElement('script');
      script.src = `${this.baseURL}?${queryParams.toString()}`;
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('Error al cargar el script JSONP'));
      };

      document.body.appendChild(script);

      // Timeout de 30 segundos
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          document.body.removeChild(script);
          reject(new Error('Timeout de la petición'));
        }
      }, 30000);
    });
  }

  /**
   * Realizar petición GET al servidor
   */
  async get(action, params = {}) {
    try {
      const data = await this.jsonp(action, params);
      
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      
      return data;

    } catch (error) {
      console.error('Error en petición GET:', error);
      throw error;
    }
  }

  /**
   * Realizar petición POST al servidor
   */
  async post(action, postData) {
    try {
      // Para POST, agregamos los datos como parámetros en la URL
      const params = {
        postData: JSON.stringify(postData)
      };
      
      const data = await this.jsonp(action, params);
      
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      
      return data;

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
    this.cache = {
      menu: null,
      horaLimite: null
    };
    console.log('🗑️ Caché limpiado');
  }
}

// Crear instancia global del API
const api = new API();
