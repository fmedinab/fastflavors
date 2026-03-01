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
    
    // Anuncios/Slider
    this.anuncios = [];
    this.indiceAnuncioActual = 0;
    this.timerAutoRotacion = null;
    
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

        // Cargar anuncios dinámicos
    await this.cargarAnuncios();
    
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

    // Actualizar estado del botón según validaciones
    this.actualizarBotonConfirmar();
  }

  /**
   * Procesar reserva
   */
  /**
   * Buscar estudiante por código y autocomplete datos
   */
  async buscarEstudiantePorCodigo() {
    const codigoInput = document.getElementById('codigoEstudiante');
    const nombreInput = document.getElementById('nombreEstudiante');
    const emailInput = document.getElementById('emailEstudiante');
    const codigoHint = document.getElementById('codigoHint');
    const btnConfirmar = document.getElementById('btnConfirmarReserva');
    
    const codigo = codigoInput.value.trim();
    
    // Limpiar si está vacío
    if (!codigo) {
      nombreInput.value = '';
      emailInput.value = '';
      codigoHint.textContent = '';
      codigoHint.style.color = '#666';
      this.actualizarBotonConfirmar();
      return;
    }
    
    try {
      console.log('🔍 Buscando estudiante con código:', codigo);
      const response = await api.request('buscarEstudiante', { codigo: codigo });
      
      console.log('📥 Respuesta:', response);
      
      if (response.success) {
        // Autocompletar datos
        const estudiante = response.data;
        nombreInput.value = estudiante.nombre;
        emailInput.value = estudiante.email || '';
        codigoHint.textContent = `✅ Estudiante encontrado: ${estudiante.nombre}`;
        codigoHint.style.color = '#27ae60';
        console.log('✅ Datos autocompleted:', estudiante);
      } else {
        // Código no válido
        nombreInput.value = '';
        emailInput.value = '';
        codigoHint.textContent = `❌ ${response.message}`;
        codigoHint.style.color = '#e74c3c';
        console.error('❌ Estudiante no encontrado');
      }
      
      this.actualizarBotonConfirmar();
      
    } catch (error) {
      console.error('❌ Error al buscar estudiante:', error);
      nombreInput.value = '';
      emailInput.value = '';
      codigoHint.textContent = '❌ Error al validar código';
      codigoHint.style.color = '#e74c3c';
      this.actualizarBotonConfirmar();
    }
  }

  /**
   * Actualizar estado del botón confirmar según validaciones
   */
  actualizarBotonConfirmar() {
    const codigoInput = document.getElementById('codigoEstudiante');
    const nombreInput = document.getElementById('nombreEstudiante');
    const platoSelected = this.menusSeleccionados.length > 0;
    const codigoValido = codigoInput.value.trim().length > 0;
    const nombreValido = nombreInput.value.trim().length > 0;
    const btnConfirmar = document.getElementById('btnConfirmarReserva');
    
    if (btnConfirmar) {
      btnConfirmar.disabled = !(codigoValido && nombreValido && platoSelected);
    }
  }

  /**
   * Cambiar entre tabs (Reservar vs Cancelar)
   */
  cambiarTab(tabName) {
    console.log('📑 Cambiando a tab:', tabName);
    
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"].tab-content`).classList.add('active');
    
    // Limpiar campos si es necesario
    if (tabName === 'cancelar') {
      document.getElementById('codigoCancelar').value = '';
      document.getElementById('nombreCancelar').value = '';
      document.getElementById('cancelarHint').textContent = '';
      document.getElementById('reservacionEncontrada').style.display = 'none';
      document.getElementById('reservacionNoEncontrada').style.display = 'none';
      document.getElementById('btnConfirmarCancelacion').style.display = 'none';
      document.getElementById('codigoCancelar').focus();
    }
  }

  /**
   * Buscar reserva para cancelar
   */
  async buscarReservaParaCancelar() {
    const codigoInput = document.getElementById('codigoCancelar');
    const nombreInput = document.getElementById('nombreCancelar');
    const cancelarHint = document.getElementById('cancelarHint');
    const reservacionEncontrada = document.getElementById('reservacionEncontrada');
    const reservacionNoEncontrada = document.getElementById('reservacionNoEncontrada');
    const btnCancelar = document.getElementById('btnConfirmarCancelacion');
    
    const codigo = codigoInput.value.trim();
    
    // Limpiar si está vacío
    if (!codigo) {
      nombreInput.value = '';
      cancelarHint.textContent = '';
      reservacionEncontrada.style.display = 'none';
      reservacionNoEncontrada.style.display = 'none';
      btnCancelar.style.display = 'none';
      return;
    }
    
    try {
      console.log('🔍 Buscando reserva para cancelar, código:', codigo);
      const response = await api.request('buscarReservaParaCancelar', { codigo: codigo });
      
      console.log('📥 Respuesta:', response);
      
      if (response.success) {
        // Reserva encontrada
        const reserva = response.data;
        nombreInput.value = reserva.nombre;
        cancelarHint.textContent = `✅ Reserva encontrada para hoy`;
        cancelarHint.style.color = '#27ae60';
        
        // Mostrar detalles de la reserva
        document.getElementById('detalleReserva').innerHTML = `
          <p>🍽️ <strong>${reserva.plato}</strong></p>
          <p>📍 Turno: <strong>${reserva.turno}</strong></p>
          <p>📦 Cantidad: <strong>${reserva.cantidad} plato${reserva.cantidad !== 1 ? 's' : ''}</strong></p>
        `;
        
        // Guardar rowNumber para cancelar
        codigoInput.dataset.rowNumber = reserva.rowNumber;
        
        reservacionEncontrada.style.display = 'block';
        reservacionNoEncontrada.style.display = 'none';
        btnCancelar.style.display = 'block';
        btnCancelar.disabled = false;
        
      } else {
        // No hay reserva
        nombreInput.value = '';
        cancelarHint.textContent = `❌ ${response.message}`;
        cancelarHint.style.color = '#e74c3c';
        
        reservacionEncontrada.style.display = 'none';
        reservacionNoEncontrada.style.display = 'block';
        btnCancelar.style.display = 'none';
        console.log('❌ Sin reserva para cancelar');
      }
      
    } catch (error) {
      console.error('❌ Error al buscar reserva:', error);
      nombreInput.value = '';
      cancelarHint.textContent = '❌ Error al validar código';
      cancelarHint.style.color = '#e74c3c';
      reservacionEncontrada.style.display = 'none';
      reservacionNoEncontrada.style.display = 'block';
      btnCancelar.style.display = 'none';
    }
  }

  /**
   * Procesar cancelación de reserva
   */
  async procesarCancelacion(event) {
    event.preventDefault();
    
    const codigoInput = document.getElementById('codigoCancelar');
    const codigo = codigoInput.value.trim();
    const rowNumber = codigoInput.dataset.rowNumber;
    
    if (!codigo || !rowNumber) {
      Utils.showToast('Error: falta información de la reserva', 'error');
      return;
    }
    
    // Confirmar cancelación
    const confirmado = confirm('⚠️ ¿Estás seguro de que deseas cancelar tu reserva?\n\nEsta acción no se puede deshacer.');
    
    if (!confirmado) {
      console.log('❌ Cancelación abortada por el usuario');
      return;
    }
    
    try {
      Utils.showLoader();
      console.log('📤 Enviando cancelación...');
      
      const response = await api.request('cancelarReserva', { 
        codigo: codigo,
        rowNumber: parseInt(rowNumber)
      });
      
      console.log('📥 Respuesta:', response);
      
      if (response.success) {
        console.log('✅ Reserva cancelada');
        Utils.showToast('✅ Tu reserva ha sido cancelada exitosamente', 'success');
        
        // Limpiar formulario y volver a tab de reservar
        setTimeout(() => {
          document.getElementById('formCancelar').reset();
          document.getElementById('codigoCancelar').value = '';
          document.getElementById('nombreCancelar').value = '';
          document.getElementById('cancelarHint').textContent = '';
          document.getElementById('reservacionEncontrada').style.display = 'none';
          document.getElementById('reservacionNoEncontrada').style.display = 'none';
          document.getElementById('btnConfirmarCancelacion').style.display = 'none';
          
          // Cambiar a tab de reservar
          this.cambiarTab('reservar');
        }, 1500);
        
      } else {
        console.error('❌ Error en cancelación:', response.message);
        Utils.showToast(response.message || 'Error al cancelar reserva', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error al cancelar:', error);
      Utils.showToast(error.message || 'Error de conexión', 'error');
    } finally {
      Utils.hideLoader();
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
      codigoEstudiante: document.getElementById('codigoEstudiante').value.trim(),
      email: document.getElementById('emailEstudiante').value.trim(),
      notas: document.getElementById('notasReserva').value.trim(),
      plato: platosNombres,
      cantidad: cantidadTotal,
      precioTotal: precioTotal
    };

    console.log('📤 Enviando al backend:', formData);

    if (!formData.codigoEstudiante) {
      Utils.showToast('Por favor ingresa tu código de estudiante', 'error');
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

    // TABS: Cambiar entre Reservar y Cancelar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.cambiarTab(tabName);
      });
    });

    // Buscar estudiante cuando completa el código (RESERVAR)
    const codigoInput = document.getElementById('codigoEstudiante');
    if (codigoInput) {
      codigoInput.addEventListener('blur', () => this.buscarEstudiantePorCodigo());
      codigoInput.addEventListener('change', () => this.buscarEstudiantePorCodigo());
    }

    // Buscar reserva para cancelar cuando completa el código (CANCELAR)
    const codigoCancelarInput = document.getElementById('codigoCancelar');
    if (codigoCancelarInput) {
      codigoCancelarInput.addEventListener('blur', () => this.buscarReservaParaCancelar());
      codigoCancelarInput.addEventListener('change', () => this.buscarReservaParaCancelar());
    }

    // Formulario de cancelación
    const formCancelar = document.getElementById('formCancelar');
    if (formCancelar) {
      formCancelar.addEventListener('submit', (e) => this.procesarCancelacion(e));
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

  /**
   * Cargar anuncios dinámicos desde el backend
   */
  async cargarAnuncios() {
    try {
      console.log('📢 Cargando anuncios...');
      const response = await api.request('getAnuncios');
      
      if (response.success && response.data.anuncios.length > 0) {
        this.anuncios = response.data.anuncios;
        console.log('✅ Anuncios cargados:', this.anuncios.length);
        this.renderizarSlider();
      } else {
        console.log('⚠️ Sin anuncios disponibles');
        this.ocultarSlider();
      }
    } catch (error) {
      console.error('❌ Error al cargar anuncios:', error);
      this.ocultarSlider();
    }
  }

  /**
   * Renderizar slider de anuncios
   */
  renderizarSlider() {
    const sliderContainer = document.getElementById('anunciosSlider');
    const sliderDots = document.getElementById('sliderDots');
    
    if (!sliderContainer || !this.anuncios || this.anuncios.length === 0) return;
    
    // Limpiar slider
    sliderContainer.innerHTML = '';
    sliderDots.innerHTML = '';
    
    // Crear tarjetas de anuncios
    this.anuncios.forEach((anuncio, index) => {
      // Tarjeta del anuncio
      const card = document.createElement('div');
      card.className = 'anuncio-card';
      card.setAttribute('data-color', anuncio.color || '#d62300');
      card.setAttribute('data-index', index);
      
      card.innerHTML = `
        <div class="anuncio-emoji">${anuncio.emoji || '🎉'}</div>
        <div class="anuncio-content">
          <h2 class="anuncio-titulo">${anuncio.titulo}</h2>
          ${anuncio.descripcion ? `<p class="anuncio-descripcion">${anuncio.descripcion}</p>` : ''}
          ${anuncio.precio ? `<div class="anuncio-precio">S/ ${anuncio.precio}</div>` : ''}
        </div>
      `;
      
      sliderContainer.appendChild(card);
      
      // Dots (indicadores)
      const dot = document.createElement('button');
      dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
      dot.setAttribute('data-index', index);
      dot.addEventListener('click', () => this.irAlAnuncio(index));
      sliderDots.appendChild(dot);
    });
    
    // Mostrar controles solo si hay más de 1 anuncio
    if (this.anuncios.length > 1) {
      document.getElementById('sliderPrev').style.display = 'block';
      document.getElementById('sliderNext').style.display = 'block';
      
      document.getElementById('sliderPrev').addEventListener('click', () => this.sliderAnterior());
      document.getElementById('sliderNext').addEventListener('click', () => this.sliderSiguiente());
      
      // Auto-rotación cada 5 segundos
      this.iniciarAutoRotacion();
    }
    
    this.indiceAnuncioActual = 0;
  }

  /**
   * Ir a un anuncio específico
   */
  irAlAnuncio(index) {
    if (index < 0 || index >= this.anuncios.length) return;
    
    this.indiceAnuncioActual = index;
    this.mostrarAnuncio(index);
    this.detenerAutoRotacion();
    this.iniciarAutoRotacion(); // Reiniciar temporizador
  }

  /**
   * Mostrar anuncio específico
   */
  mostrarAnuncio(index) {
    const cards = document.querySelectorAll('.anuncio-card');
    const dots = document.querySelectorAll('.slider-dot');
    
    cards.forEach((card, i) => {
      card.style.display = i === index ? 'flex' : 'none';
    });
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  /**
   * Slider anterior
   */
  sliderAnterior() {
    this.indiceAnuncioActual = (this.indiceAnuncioActual - 1 + this.anuncios.length) % this.anuncios.length;
    this.mostrarAnuncio(this.indiceAnuncioActual);
    this.detenerAutoRotacion();
    this.iniciarAutoRotacion();
  }

  /**
   * Slider siguiente
   */
  sliderSiguiente() {
    this.indiceAnuncioActual = (this.indiceAnuncioActual + 1) % this.anuncios.length;
    this.mostrarAnuncio(this.indiceAnuncioActual);
    this.detenerAutoRotacion();
    this.iniciarAutoRotacion();
  }

  /**
   * Iniciar auto-rotación del slider
   */
  iniciarAutoRotacion() {
    this.timerAutoRotacion = setInterval(() => {
      this.sliderSiguiente();
    }, 5000); // Rotación cada 5 segundos
  }

  /**
   * Detener auto-rotación
   */
  detenerAutoRotacion() {
    if (this.timerAutoRotacion) {
      clearInterval(this.timerAutoRotacion);
    }
  }

  /**
   * Ocultar slider si no hay anuncios
   */
  ocultarSlider() {
    const container = document.querySelector('.anuncios-slider-container');
    if (container) {
      container.style.display = 'none';
    }
  }
}

// Inicializar aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ComedorApp();
});

