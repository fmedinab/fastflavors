/**
 * APP - Lógica principal de la aplicación
 * Sistema de Comedor Estudiantil
 */

class ComedorApp {
  constructor() {
    this.menu = [];
    this.menusSeleccionados = []; // Array para múltiples selecciones con cantidad
    this.maxSelecciones = 2; // ⚙️ CAMBIAR AQUÍ: Máximo de platos totales por persona
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
      
      const alerta = document.getElementById('alertaTurnoCerrado');
      if (!this.puedeReservar && alerta) {
        alerta.style.display = 'block';
        alerta.textContent = data.razon === 'turno_no_iniciado' 
          ? `⏳ ${response.mensaje}`
          : `⚠️ ${response.mensaje}`;
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
      
      // DEBUG: Verificar que los precios están cargados
      console.log('🍽️ Menú cargado con precios:');
      this.menu.forEach(plato => {
        console.log(`   - ${plato.nombre}: S/ ${plato.precio} (tipo: ${typeof plato.precio})`);
      });
      
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
    this.menusSeleccionados = [];
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
    card.dataset.platoId = plato.id; // Agregar data attribute para debug
    
    // Verificar si este plato está en el array de seleccionados
    const platoSeleccionado = this.menusSeleccionados.find(p => p.id === plato.id);
    const esSeleccionado = !!platoSeleccionado;
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
          <div class="cantidad-control" style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.85rem; color: var(--text-light);">Cant:</label>
            <input 
              type="number" 
              class="input-cantidad" 
              data-id="${plato.id}" 
              min="1" 
              max="2" 
              value="${esSeleccionado ? platoSeleccionado.cantidad : 1}"
              style="width: 50px; padding: 5px; border: 1px solid #ddd; border-radius: 5px; text-align: center;"
              ${!this.puedeReservar ? 'disabled' : ''}
            >
          </div>
        </div>
        <button class="btn-select-menu ${esSeleccionado ? 'selected' : ''}" data-id="${plato.id}" ${!this.puedeReservar ? 'disabled' : ''}>
          ${esSeleccionado ? '✓ Seleccionado' : (this.puedeReservar ? 'Agregar al Carrito' : '🔒 Cerrado')}
        </button>
      </div>
    `;

    // NO agregar listener aquí - se maneja por event delegation en setupEventListeners
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
   * Seleccionar menú del día - Versión simplificada con cantidad manual
   */
  seleccionarMenu(plato) {
    console.log('🎯 Agregar/Remover plato:', plato.nombre);
    
    // Verificar disponibilidad
    if (!this.puedeReservar) {
      Utils.showToast('⏰ Reservas cerradas para este turno.', 'error');
      return;
    }

    // Verificar si ya está seleccionado (remover)
    const index = this.menusSeleccionados.findIndex(p => p.id === plato.id);
    
    if (index !== -1) {
      // Remover del carrito
      const removido = this.menusSeleccionados.splice(index, 1)[0];
      console.log('❌ Removido:', removido.nombre);
      Utils.showToast(`${plato.nombre} removido del carrito`, 'info');
    } else {
      // Obtener cantidad del input
      const inputCantidad = document.querySelector(`.input-cantidad[data-id="${plato.id}"]`);
      const cantidad = inputCantidad ? parseInt(inputCantidad.value) || 1 : 1;
      
      // Verificar si supera el límite total
      const cantidadActual = this.menusSeleccionados.reduce((sum, p) => sum + p.cantidad, 0);
      if (cantidadActual + cantidad > this.maxSelecciones) {
        Utils.showToast(`⚠️ Máximo ${this.maxSelecciones} platos en total por persona`, 'error');
        return;
      }
      
      // Agregar al carrito con cantidad
      const platoConCantidad = {
        ...plato,
        cantidad: cantidad
      };
      
      this.menusSeleccionados.push(platoConCantidad);
      console.log('✅ Agregado:', plato.nombre, 'x', cantidad);
      Utils.showToast(`${plato.nombre} agregado (${cantidad}x)`, 'success');
    }

    this.actualizarEstadosVisuales();
    this.actualizarResumen();
  }

  /**
   * Actualizar estados visuales de las tarjetas sin re-renderizar todo
   */
  actualizarEstadosVisuales() {
    console.log('🎨 Actualizando estados visuales...');
    
    document.querySelectorAll('.menu-card').forEach(card => {
      const btn = card.querySelector('.btn-select-menu');
      const inputCantidad = card.querySelector('.input-cantidad');
      if (!btn) return;
      
      const platoId = btn.dataset.id;
      const platoSeleccionado = this.menusSeleccionados.find(p => p.id === platoId);
      const esSeleccionado = !!platoSeleccionado;
      
      console.log(`🎨 Card ID ${platoId}: ${esSeleccionado ? 'SELECCIONADO' : 'NO seleccionado'}`);
      
      if (esSeleccionado) {
        card.classList.add('selected');
        btn.classList.add('selected');
        btn.innerHTML = '✓ Seleccionado';
        if (inputCantidad) {
          inputCantidad.value = platoSeleccionado.cantidad;
          inputCantidad.disabled = true; // Deshabilitar cuando está en carrito
        }
      } else {
        card.classList.remove('selected');
        btn.classList.remove('selected');
        btn.innerHTML = 'Agregar al Carrito';
        if (inputCantidad) {
          inputCantidad.disabled = false; // Habilitar para editar
        }
      }
    });
  }

  /**
   * Actualizar resumen de la reserva
   */
  actualizarResumen() {
    const resumenContainer = document.getElementById('resumenReserva');
    const totalElement = document.getElementById('totalReserva');
    const btnConfirmar = document.getElementById('btnConfirmarReserva');

    if (this.menusSeleccionados.length === 0) {
      if (resumenContainer) {
        resumenContainer.innerHTML = `
          <div class="empty-resumen">
            <i class="icon-empty">🍽️</i>
            <p>Selecciona tu menú para continuar</p>
            <small>Máximo ${this.maxSelecciones} platos en total</small>
          </div>
        `;
      }
      if (totalElement) totalElement.textContent = Utils.formatPrice(0);
      if (btnConfirmar) btnConfirmar.disabled = true;
      return;
    }

    if (resumenContainer) {
      let html = '';
      let totalCantidad = 0;
      
      this.menusSeleccionados.forEach((plato, index) => {
        const subtotal = plato.precio * plato.cantidad;
        totalCantidad += plato.cantidad;
        
        html += `
          <div class="resumen-item">
            <div class="resumen-info">
              <span class="resumen-numero">${index + 1}.</span>
              <div class="resumen-details">
                <strong>${plato.nombre}</strong>
                <small>${Utils.formatPrice(plato.precio)} x ${plato.cantidad}</small>
              </div>
            </div>
            <div class="resumen-precio">
              <span>${Utils.formatPrice(subtotal)}</span>
              <button class="btn-remove-item" data-id="${plato.id}" title="Eliminar">×</button>
            </div>
          </div>
        `;
      });
      
      html += `<div class="resumen-total-items">Total: ${totalCantidad} plato${totalCantidad !== 1 ? 's' : ''}</div>`;
      resumenContainer.innerHTML = html;

      // Event listeners para botones de eliminar
      resumenContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const platoId = btn.dataset.id;
          const plato = this.menu.find(p => p.id === platoId);
          if (plato) {
            this.seleccionarMenu(plato); // Reutilizar la misma función
          }
        });
      });
    }

    // Calcular total
    const total = this.menusSeleccionados.reduce((sum, plato) => sum + (plato.precio * plato.cantidad), 0);
    if (totalElement) {
      totalElement.textContent = Utils.formatPrice(total);
    }

    // Habilitar/deshabilitar botón confirmar
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

    if (this.menusSeleccionados.length === 0) {
      Utils.showToast('Por favor selecciona al menos un menú', 'error');
      return;
    }

    // Crear lista de platos seleccionados con cantidades
    const platosDetalle = this.menusSeleccionados.map(p => `${p.nombre} (${p.cantidad}x)`).join(', ');
    const platosNombres = this.menusSeleccionados.map(p => p.nombre).join(', ');
    const cantidadTotal = this.menusSeleccionados.reduce((sum, p) => sum + p.cantidad, 0);
    const precioTotal = this.menusSeleccionados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

    console.log('📊 DEBUG - Calculando totales:');
    console.log('   - Platos seleccionados:', this.menusSeleccionados);
    console.log('   - Cantidad total:', cantidadTotal);
    console.log('   - Precio total:', precioTotal);

    const formData = {
      turno: this.turnoActual,
      nombreEstudiante: document.getElementById('nombreEstudiante').value.trim(),
      codigoEstudiante: document.getElementById('codigoEstudiante').value.trim(),
      email: document.getElementById('emailEstudiante').value.trim(),
      notas: document.getElementById('notasReserva').value.trim(),
      plato: platosNombres,
      cantidad: cantidadTotal,
      precioTotal: precioTotal
    };

    console.log('📤 Enviando al backend:', formData);

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
      console.log('📤 Enviando reserva al backend...');
      const response = await api.crearReserva(formData);
      console.log('📥 Respuesta del backend:', response);

      if (response.success) {
        console.log('✅ Reserva exitosa');
        // El backend envía los datos en response.data
        const data = response.data || response;
        this.mostrarConfirmacionReserva(data);
        this.limpiarFormulario();
        this.menusSeleccionados = []; // Limpiar selecciones
        this.renderMenu(); // Re-renderizar para quitar selecciones visuales
        this.actualizarResumen();
      } else {
        console.error('❌ Backend respondió con error:', response.mensaje);
        Utils.showToast(response.mensaje || 'Error al crear reserva', 'error');
      }

    } catch (error) {
      console.error('❌ Error al crear reserva:', error);
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
          <p><strong>Cantidad:</strong> ${reserva.cantidad || 1} plato${reserva.cantidad !== 1 ? 's' : ''}</p>
          <p><strong>Total:</strong> ${Utils.formatPrice(reserva.precioTotal || 0)}</p>
        </div>
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

    // Event delegation para botones de selección de menú
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
      menuContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-select-menu');
        if (!btn || btn.disabled) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const platoId = btn.dataset.id;
        const plato = this.menu.find(p => p.id === platoId);
        
        if (plato) {
          this.seleccionarMenu(plato);
        }
      }, false);
    }
  }
}

// Inicializar aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ComedorApp();
});
