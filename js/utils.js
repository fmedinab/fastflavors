/**
 * UTILIDADES - Funciones auxiliares reutilizables
 */

const Utils = {
  /**
   * Formatear precio con símbolo de moneda
   */
  formatPrice(price) {
    return `${CONFIG.MONEDA} ${parseFloat(price).toFixed(2)}`;
  },

  /**
   * Obtener fecha actual en formato YYYY-MM-DD
   */
  getFechaHoy() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Obtener hora actual en formato HH:MM
   */
  getHoraActual() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  /**
   * Formatear fecha legible (DD/MM/YYYY)
   */
  formatFecha(fecha) {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  },

  /**
   * Validar email
   */
  validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validar código de estudiante (5-10 caracteres alfanuméricos)
   */
  validarCodigo(codigo) {
    const regex = /^[A-Za-z0-9]{5,10}$/;
    return regex.test(codigo);
  },

  /**
   * Obtener día de la semana actual
   */
  getDiaSemana() {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = new Date();
    return dias[hoy.getDay()];
  },

  /**
   * Verificar si es día hábil (Lunes a Viernes)
   */
  esDiaHabil() {
    const hoy = new Date();
    const dia = hoy.getDay();
    return dia >= 1 && dia <= 5; // 1 = Lunes, 5 = Viernes
  },

  /**
   * Verificar si es antes de la hora límite
   */
  esAntesDeHoraLimite() {
    const now = new Date();
    const horaActual = now.getHours();
    return horaActual < CONFIG.HORA_LIMITE;
  },

  /**
   * Mostrar notificación toast
   */
  showToast(message, type = 'info') {
    // Si existe una librería de toast, úsala
    // Si no, crear un elemento temporal
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Mostrar loader/spinner
   */
  showLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'flex';
    }
  },

  /**
   * Ocultar loader/spinner
   */
  hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'none';
    }
  },

  /**
   * Sanitizar HTML para prevenir XSS
   */
  sanitizeHTML(text) {
    const temp = document.createElement('div');
    temp.textContent = text;
    return temp.innerHTML;
  },

  /**
   * Generar ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Debounce para optimizar eventos repetitivos
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Copiar texto al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copiado al portapapeles', 'success');
      return true;
    } catch (err) {
      console.error('Error al copiar:', err);
      return false;
    }
  },

  /**
   * Agrupar items por categoría
   */
  groupByCategory(items) {
    return items.reduce((groups, item) => {
      const category = item.categoria || 'Otros';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  },

  /**
   * Calcular total del carrito
   */
  calcularTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
  },

  /**
   * Guardar en localStorage
   */
  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
      return false;
    }
  },

  /**
   * Obtener de localStorage
   */
  getFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error al leer de localStorage:', error);
      return null;
    }
  },

  /**
   * Eliminar de localStorage
   */
  removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error al eliminar de localStorage:', error);
      return false;
    }
  }
};

// Animaciones CSS para toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(toastStyles);
