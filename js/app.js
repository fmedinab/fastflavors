/**
 * APP - Lógica principal de la aplicación
 * Sistema de Comedor Estudiantil
 */

class ComedorApp {
  constructor() {
    this.menu = [];
    this.menuSeleccionado = null;
    this.turnoActual = CONFIG.TURNO_DEFAULT;
    this.puedeReservar = true;
    this.initTheme();
    this.init();
  }

  /**
   * Inicializar tema (dark/light)
   */
  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.setTheme(theme);
  }

  /**
   * Cambiar tema
   */
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  /**
   * Toggle tema
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Inicializar aplicación
   */
  async init() {
    console.log('🚀 Inicializando aplicación...');
    
    if (!Utils.esDiaHabil()) {
      this.mostrarAlertaFinDeSemana();
      return;
    }
    
    this.setupEventListeners();
    await this.verificarDisponibilidadTurnos();
    await this.cambiarTurno(this.turnoActual);
    
    console.log('✅ Aplicación lista');
  }

  /**
   * Verificar disponibilidad de todos los turnos y actualizar botones
   */
  async verificarDisponibilidadTurnos() {
    try {
      console.log('🔍 Verificando disponibilidad de turnos...');
      const disponibilidad = await api.checkTodosLosTurnos();
      console.log('📊 Disponibilidad obtenida:', disponibilidad);
      
      document.querySelectorAll('.btn-turno').forEach(btn => {
        const turno = btn.dataset.turno;
        const info = disponibilidad[turno];
        const turnoIcon = btn.querySelector('.turno-icon');
        const turnoSmall = btn.querySelector('.turno-text small');
        
        // Guardar icono original si no existe
        if (!btn.dataset.iconoOriginal && turnoIcon) {
          btn.dataset.iconoOriginal = turnoIcon.textContent;
        }
        
        console.log(`🔸 Turno ${turno}:`, info);
        
        if (info && !info.disponible) {
          btn.classList.add('cerrado');
          btn.disabled = true;
          btn.title = info.mensaje;
          
          // Diferentes iconos según la razón
          if (turnoIcon) {
            // Si es porque aún no inicia (turno tarde antes de que cierre mañana)
            if (info.razon === 'turno_no_iniciado') {
              turnoIcon.textContent = '⏳';
              if (turnoSmall) {
                turnoSmall.textContent = `Inicia ${info.horaInicio || ''}`;
              }
            } else {
              // Ya pasó la hora límite
              turnoIcon.textContent = '🔒';
              if (turnoSmall) {
                turnoSmall.textContent = 'Cerrado';
              }
            }
          }
          
          console.log(`❌ Turno ${turno} CERRADO/INACTIVO - Razón: ${info.razon || 'hora_limite'}`);
        } else {
          btn.classList.remove('cerrado');
          btn.disabled = false;
          btn.title = info ? info.mensaje : '';
          
          // Restaurar icono original
          if (turnoIcon && btn.dataset.iconoOriginal) {
            turnoIcon.textContent = btn.dataset.iconoOriginal;
          }
          
          // Actualizar texto con hora límite (solo formato HH:mm)
          if (turnoSmall && info && info.horaLimite) {
            // Extraer solo HH:mm del string de hora límite
            const horaLimiteFormato = info.horaLimite.includes(':') 
              ? info.horaLimite.split(':').slice(0, 2).join(':')
              : info.horaLimite;
            turnoSmall.textContent = `Reserva hasta ${horaLimiteFormato}`;
          }
          
          console.log(`✅ Turno ${turno} DISPONIBLE (hasta ${info.horaLimite})`);
        }
      });
      
      // Si el turno actual está cerrado, cambiar al primero disponible
      const turnoActualInfo = disponibilidad[this.turnoActual];
      if (turnoActualInfo && !turnoActualInfo.disponible) {
        const turnoDisponible = Object.keys(disponibilidad).find(t => disponibilidad[t].disponible);
        if (turnoDisponible) {
          console.log(`🔄 Cambiando de ${this.turnoActual} a ${turnoDisponible}`);
          this.turnoActual = turnoDisponible;
          // Actualizar el botón activo visualmente
          document.querySelectorAll('.btn-turno').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.turno === turnoDisponible) {
              btn.classList.add('active');
            }
          });
        } else {
          // Si no hay turnos disponibles, mostrar mensaje
          console.log('⚠️ No hay turnos disponibles');
        }
      }
      
    } catch (error) {
      console.error('❌ Error al verificar disponibilidad de turnos:', error);
    }
  }

  /**
   * Cambiar turno y cargar menú correspondiente
   */
  async cambiarTurno(turno) {
    this.turnoActual = turno;
    
    document.querySelectorAll('.btn-turno').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.turno === turno) {
        btn.classList.add('active');
      }
    });
    
    await this.verificarDisponibilidad(turno);
    await this.cargarMenu(turno);
  }

  /**
   * Verificar si aún se pueden hacer reservas para el turno
   */
  async verificarDisponibilidad(turno) {
    try {
      Utils.showLoader();
      const response = await api.checkDisponibilidad(turno);
      
      // El backend envía los datos en response.data
      const data = response.data || response;
      
      this.puedeReservar = data.puedeReservar;
      this.actualizarBannerTurno(data);
      
      const alerta = document.getElementById('alertaTurnoCerrado');
      if (!this.puedeReservar && alerta) {
        alerta.style.display = 'block';
        alerta.textContent = `⚠️ ${response.mensaje}`;
      } else if (alerta) {
        alerta.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      Utils.showToast(CONFIG.MENSAJES.ERROR_CONEXION, 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Cargar menú del día según el turno
   */
  async cargarMenu(turno) {
    try {
      Utils.showLoader();
      const response = await api.getMenuDelDia(turno);
      
      // El backend envía los datos en response.data
      const data = response.data || response;
      
      this.menu = data.menu || [];
      
      // Verificar si el día no está disponible
      if (data.diaDisponible === false) {
        this.mostrarDiaNoDisponible(data.mensaje);
        return;
      }
      
      this.renderMenu();
      
      console.log(`📋 Menú ${data.nombreTurno} cargado: ${this.menu.length} platos`);
      
    } catch (error) {
      console.error('Error al cargar el menú:', error);
      Utils.showToast(CONFIG.MENSAJES.ERROR_CONEXION, 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Mostrar alerta de día no disponible
   */
  mostrarDiaNoDisponible(mensaje) {
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
      const iconos = {
        'feriado': '🎉',
        'semana': '🏖️',
        'desactivado': '⚠️'
      };
      
      let icono = '📅';
      if (mensaje.toLowerCase().includes('feriado')) icono = iconos.feriado;
      else if (mensaje.toLowerCase().includes('semana')) icono = iconos.semana;
      else if (mensaje.toLowerCase().includes('desactivado') || mensaje.toLowerCase().includes('disponible')) icono = iconos.desactivado;
      
      menuContainer.innerHTML = `
        <div class="empty-state">
          <div class="icon-empty">${icono}</div>
          <h3>Servicio no disponible</h3>
          <p>${mensaje}</p>
        </div>
      `;
    }
    
    // Actualizar resumen
    this.menu = [];
    this.menuSeleccionado = null;
    this.actualizarResumen();
  }

  /**
   * Renderizar menú en el DOM
   */
  renderMenu() {
    const menuContainer = document.getElementById('menuContainer');
    if (!menuContainer) return;

    menuContainer.innerHTML = '';

    if (this.menu.length === 0) {
      menuContainer.innerHTML = `
        <div class="empty-state">
          <div class="icon-empty">🍽️</div>
          <h3>No hay menú disponible</h3>
          <p>Para este turno no hay platos configurados</p>
        </div>
      `;
      return;
    }

    this.menu.forEach(plato => {
      const card = this.crearCardPlato(plato);
      menuContainer.appendChild(card);
    });
  }

  /**
   * Crear tarjeta de plato
   */
  crearCardPlato(plato) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    const esSeleccionado = this.menuSeleccionado && this.menuSeleccionado.id === plato.id;
    if (esSeleccionado) {
      card.classList.add('selected');
    }
    
    // Deshabilitar tarjeta si no se puede reservar
    if (!this.puedeReservar) {
      card.classList.add('disabled');
    }
    
    // Seleccionar ícono según el nombre del plato
    const icono = this.obtenerIconoPlato(plato.nombre);
    
    card.innerHTML = `
      <div class="menu-image" style="background: linear-gradient(135deg, var(--secondary-color) 0%, rgba(245, 235, 220, 0.5) 100%); display: flex; align-items: center; justify-content: center; font-size: 5rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));">
        ${icono}
      </div>
      <div class="menu-info">
        <h3 class="menu-name">${Utils.sanitizeHTML(plato.nombre)}</h3>
        <p class="menu-description">${Utils.sanitizeHTML(plato.descripcion)}</p>
        <div class="menu-footer">
          <span class="menu-price">${Utils.formatPrice(plato.precio)}</span>
          <button class="btn-select-menu ${esSeleccionado ? 'selected' : ''}" data-id="${plato.id}" ${!this.puedeReservar ? 'disabled' : ''}>
            ${esSeleccionado ? '✓ Seleccionado' : (this.puedeReservar ? 'Seleccionar' : '🔒 Cerrado')}
          </button>
        </div>
      </div>
    `;

    const btnSelect = card.querySelector('.btn-select-menu');
    btnSelect.addEventListener('click', () => this.seleccionarMenu(plato));

    return card;
  }

  /**
   * Obtener ícono según el nombre del plato
   */
  obtenerIconoPlato(nombrePlato) {
    const nombre = nombrePlato.toLowerCase();
    
    // Arroz y pollo
    if (nombre.includes('arroz') && nombre.includes('pollo')) return '🍗';
    if (nombre.includes('pollo')) return '🍗';
    
    // Carnes
    if (nombre.includes('lomo') || nombre.includes('bistec')) return '🥩';
    if (nombre.includes('carne')) return '🥩';
    if (nombre.includes('res')) return '🥩';
    
    // Pescados y mariscos
    if (nombre.includes('pescado') || nombre.includes('trucha') || nombre.includes('atún')) return '🐟';
    if (nombre.includes('ceviche') || nombre.includes('camarón') || nombre.includes('mariscos')) return '🦐';
    
    // Pasta
    if (nombre.includes('pasta') || nombre.includes('spaguetti') || nombre.includes('tallarín')) return '🍝';
    if (nombre.includes('lasagna') || nombre.includes('lasaña')) return '🍝';
    
    // Arroz
    if (nombre.includes('arroz')) return '🍚';
    if (nombre.includes('chaufa')) return '🍛';
    
    // Sopas
    if (nombre.includes('sopa') || nombre.includes('caldo')) return '🍲';
    
    // Ensaladas
    if (nombre.includes('ensalada')) return '🥗';
    
    // Sándwiches y hamburguesas
    if (nombre.includes('hamburguesa')) return '🍔';
    if (nombre.includes('sandwich') || nombre.includes('sándwich')) return '🥪';
    
    // Pizza
    if (nombre.includes('pizza')) return '🍕';
    
    // Tacos y mexicana
    if (nombre.includes('taco') || nombre.includes('burrito')) return '🌮';
    
    // Milanesa
    if (nombre.includes('milanesa')) return '🍖';
    
    // Guisos y estofados
    if (nombre.includes('estofado') || nombre.includes('guiso')) return '🍲';
    
    // Postres
    if (nombre.includes('postre') || nombre.includes('torta') || nombre.includes('pastel')) return '🍰';
    
    // Desayunos
    if (nombre.includes('huevo') || nombre.includes('tortilla')) return '🍳';
    if (nombre.includes('pan')) return '🥖';
    
    // Por defecto - platillo genérico
    return '🍽️';
  }

  /**
   * Seleccionar menú del día
   */
  seleccionarMenu(plato) {
    // Verificar disponibilidad antes de permitir selección
    if (!this.puedeReservar) {
      Utils.showToast('⏰ Reservas cerradas para este turno. Hora límite superada.', 'error');
      return;
    }

    this.menuSeleccionado = plato;
    this.renderMenu();
    this.actualizarResumen();
    Utils.showToast(`${plato.nombre} seleccionado`, 'success');
  }

  /**
   * Actualizar resumen de la reserva
   */
  actualizarResumen() {
    const resumenContainer = document.getElementById('resumenReserva');
    const totalElement = document.getElementById('totalReserva');
    const btnConfirmar = document.getElementById('btnConfirmarReserva');

    if (!this.menuSeleccionado) {
      if (resumenContainer) {
        resumenContainer.innerHTML = `
          <div class="empty-resumen">
            <i class="icon-empty">🍽️</i>
            <p>Selecciona tu menú para continuar</p>
          </div>
        `;
      }
      if (totalElement) totalElement.textContent = Utils.formatPrice(0);
      if (btnConfirmar) btnConfirmar.disabled = true;
      return;
    }

    if (resumenContainer) {
      resumenContainer.innerHTML = `
        <div class="resumen-item">
          <div class="resumen-info">
            <h4>${Utils.sanitizeHTML(this.menuSeleccionado.nombre)}</h4>
            <p>${Utils.sanitizeHTML(this.menuSeleccionado.descripcion)}</p>
          </div>
          <div class="resumen-precio">
            ${Utils.formatPrice(this.menuSeleccionado.precio)}
          </div>
        </div>
      `;
    }

    if (totalElement) {
      totalElement.textContent = Utils.formatPrice(this.menuSeleccionado.precio);
    }

    if (btnConfirmar) {
      btnConfirmar.disabled = false;
    }
  }

  /**
   * Procesar reserva
   */
  async procesarReserva(event) {
    event.preventDefault();

    if (!this.puedeReservar) {
      Utils.showToast(CONFIG.MENSAJES.RESERVA_CERRADA, 'error');
      return;
    }

    if (!this.menuSeleccionado) {
      Utils.showToast('Por favor selecciona un menú', 'error');
      return;
    }

    const formData = {
      turno: this.turnoActual,
      nombreEstudiante: document.getElementById('nombreEstudiante').value.trim(),
      codigoEstudiante: document.getElementById('codigoEstudiante').value.trim(),
      email: document.getElementById('emailEstudiante').value.trim(),
      notas: document.getElementById('notasReserva').value.trim(),
      plato: this.menuSeleccionado.nombre
    };

    if (!formData.nombreEstudiante || !formData.codigoEstudiante) {
      Utils.showToast(CONFIG.MENSAJES.CAMPOS_REQUERIDOS, 'error');
      return;
    }

    if (!Utils.validarCodigo(formData.codigoEstudiante)) {
      Utils.showToast('Aula no válida (2-10 caracteres)', 'error');
      return;
    }

    if (formData.email && !Utils.validarEmail(formData.email)) {
      Utils.showToast('Email no válido', 'error');
      return;
    }

    try {
      Utils.showLoader();
      const response = await api.crearReserva(formData);

      if (response.success) {
        // El backend envía los datos en response.data
        const data = response.data || response;
        this.mostrarConfirmacionReserva(data);
        this.limpiarFormulario();
        this.menuSeleccionado = null;
        this.actualizarResumen();
      }

    } catch (error) {
      console.error('Error al crear reserva:', error);
      Utils.showToast(error.message || CONFIG.MENSAJES.ERROR_CONEXION, 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Mostrar confirmación de reserva
   */
  mostrarConfirmacionReserva(data) {
    const modal = document.getElementById('modalConfirmacion');
    const content = document.getElementById('confirmacionContent');

    if (modal && content) {
      const reserva = data.reserva;
      content.innerHTML = `
        <div class="success-icon">✅</div>
        <h2>¡Reserva Confirmada!</h2>
        <div class="reserva-details">
          <p><strong>Fecha:</strong> ${reserva.fecha}</p>
          <p><strong>Hora:</strong> ${reserva.hora}</p>
          <p><strong>Turno:</strong> ${reserva.turno}</p>
          <p><strong>Estudiante:</strong> ${reserva.estudiante}</p>
          <p><strong>Menú:</strong> ${reserva.plato}</p>
        </div>
        <p class="message">${data.mensaje}</p>
        <button class="btn btn-primary" onclick="app.cerrarModal()">Aceptar</button>
      `;
      modal.style.display = 'flex';
    } else {
      Utils.showToast(data.mensaje, 'success');
    }
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    const modal = document.getElementById('modalConfirmacion');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Limpiar formulario
   */
  limpiarFormulario() {
    const form = document.getElementById('formReserva');
    if (form) {
      form.reset();
    }
  }

  /**
   * Actualizar banner de turno
   */
  actualizarBannerTurno(info) {
    const banner = document.getElementById('turnoBanner');
    if (!banner) return;

    const configTurno = CONFIG.TURNOS[this.turnoActual];
    banner.innerHTML = `
      <div class="turno-info ${info.puedeReservar ? 'abierto' : 'cerrado'}">
        <span class="hora-icon">${info.puedeReservar ? '✅' : '⏰'}</span>
        <span class="hora-texto">${info.mensaje}</span>
      </div>
    `;
  }

  /**
   * Mostrar alerta de fin de semana
   */
  mostrarAlertaFinDeSemana() {
    const alerta = document.getElementById('alertaTurnoCerrado');
    if (alerta) {
      alerta.style.display = 'block';
      alerta.textContent = CONFIG.MENSAJES.FIN_SEMANA;
    }
    
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
      menuContainer.innerHTML = `
        <div class="empty-state">
          <div class="icon-empty">🏖️</div>
          <h3>Fin de semana</h3>
          <p>${CONFIG.MENSAJES.FIN_SEMANA}</p>
        </div>
      `;
    }
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    const form = document.getElementById('formReserva');
    if (form) {
      form.addEventListener('submit', (e) => this.procesarReserva(e));
    }

    document.querySelectorAll('.btn-turno').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const turno = e.currentTarget.dataset.turno;
        this.cambiarTurno(turno);
      });
    });

    const btnTheme = document.getElementById('btnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => this.toggleTheme());
    }
  }
}

// Inicializar aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ComedorApp();
});
