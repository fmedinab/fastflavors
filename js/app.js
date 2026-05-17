
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
    this.disponibilidadTurnos = {}; // 🚀 Guardar disponibilidad para evitar duplicados
    
    // Anuncios/Slider
    this.anuncios = [];
    this.indiceAnuncioActual = 0;
    this.timerAutoRotacion = null;
    
    // 🚀 Timer para actualización automática cuando pase hora límite
    this.timerActualizacionTurno = null;
    
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
    // ✅ Eliminado bloqueo hardcodeado de fines de semana
    // El backend ahora verifica dinámicamente qué días están activos
    // mediante isDiaActivo() que lee de Google Sheets

    this.setupEventListeners();
    
    // 🚀 OPTIMIZACIÓN MÁXIMA: 
    // 1. Verificar disponibilidad de TODOS los turnos (en paralelo)
    // 2. Mientras se carga, preparar el DOM
    // 3. Luego cargar menú del turno actual
    // 4. Anuncios en background
    
    Utils.showLoader();
    
    try {
      // Paralela: Verificar disponibilidad
      await this.verificarDisponibilidadTurnos();
      
      // Una vez sabemos qué turno está disponible, cargar su menú
      await this.cambiarTurno(this.turnoActual);
    } catch (error) {
      console.error('❌ Error en init:', error);
      Utils.showToast('Error al cargar la aplicación', 'error');
    } finally {
      Utils.hideLoader();
    }
    
    // 🚀 Cargar anuncios en background (NO bloqueante)
    setTimeout(() => this.cargarAnuncios(), 300);
  }

  /**
   * Verificar disponibilidad de todos los turnos y actualizar botones
   * 🚀 AHORA DINÁMICO: Usa datos del backend (HorasEntreTurnos, horaLimite, horaInicio)
   */
  async verificarDisponibilidadTurnos() {
    try {
      const disponibilidad = await api.checkTodosLosTurnos();
      
      this.disponibilidadTurnos = disponibilidad; // 🚀 Guardar para reutilizar
      
      document.querySelectorAll('.btn-turno').forEach(btn => {
        const turno = btn.dataset.turno;
        const info = disponibilidad[turno];
        const turnoIcon = btn.querySelector('.turno-icon');
        const turnoSmall = btn.querySelector('.turno-text small');
        
        // Guardar icono original si no existe
        if (!btn.dataset.iconoOriginal && turnoIcon) {
          btn.dataset.iconoOriginal = turnoIcon.textContent;
        }
        
        if (info && !info.disponible) {
          btn.classList.add('cerrado');
          btn.disabled = true;
          btn.title = info.mensaje;
          
          if (turnoIcon) {
            if (info.razon === 'turno_no_iniciado') {
              turnoIcon.textContent = '⏳';
              if (turnoSmall) {
                const horaInicioFormato = Utils.formatHora12(info.horaInicio);
                turnoSmall.textContent = `Inicia ${horaInicioFormato || ''}`;
              }
            } else if (info.razon === 'dia_cerrado') {
              turnoIcon.textContent = '📅';
              if (turnoSmall) {
                turnoSmall.textContent = 'Hoy cerrado';
              }
            } else {
              turnoIcon.textContent = '🔒';
              if (turnoSmall) {
                turnoSmall.textContent = 'Cerrado';
              }
            }
          }
        } else {
          btn.classList.remove('cerrado');
          btn.disabled = false;
          btn.title = info ? info.mensaje : '';
          
          // Restaurar icono original
          if (turnoIcon && btn.dataset.iconoOriginal) {
            turnoIcon.textContent = btn.dataset.iconoOriginal;
          }
          
          // Mostrar rango dinámico: horaInicio → horaLimite
          if (turnoSmall && info) {
            const inicioFormato = Utils.formatHora12(info.horaInicio);
            const limiteFormato = info.horaLimite
              ? Utils.formatHora12(info.horaLimite)
              : '';
            
            if (inicioFormato && limiteFormato) {
              turnoSmall.textContent = `${inicioFormato} → ${limiteFormato}`;
            } else if (limiteFormato) {
              turnoSmall.textContent = `Reserva hasta ${limiteFormato}`;
            } else if (inicioFormato) {
              turnoSmall.textContent = `Desde ${inicioFormato}`;
            } else {
              turnoSmall.textContent = 'Disponible';
            }
          }
        }
      });
      
      // 🚀 ACTUALIZAR ESTADO DE DISPONIBILIDAD DEL TURNO ACTUAL
      const turnoActualInfo = disponibilidad[this.turnoActual];
      this.puedeReservar = turnoActualInfo ? turnoActualInfo.disponible : false;
      
      if (turnoActualInfo && !turnoActualInfo.disponible) {
        const turnoDisponible = Object.keys(disponibilidad).find(t => disponibilidad[t].disponible);
        if (turnoDisponible) {
          this.turnoActual = turnoDisponible;
          this.puedeReservar = true; // El nuevo turno SÍ está disponible
          // Actualizar el botón activo visualmente
          document.querySelectorAll('.btn-turno').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.turno === turnoDisponible) {
              btn.classList.add('active');
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error en verificarDisponibilidadTurnos:', error);
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
    
    // 🚀 OPTIMIZACIÓN: Ya verificamos disponibilidad en verificarDisponibilidadTurnos()
    // Solo actualizamos puedeReservar basado en datos ya obtenidos
    if (this.disponibilidadTurnos && this.disponibilidadTurnos[turno]) {
      this.puedeReservar = this.disponibilidadTurnos[turno].disponible;
      const alerta = document.getElementById('alertaTurnoCerrado');
      if (!this.puedeReservar && alerta) {
        alerta.style.display = 'block';
        alerta.textContent = this.obtenerMensajeCierre(turno);
      } else if (alerta) {
        alerta.style.display = 'none';
      }
    }
    
    await this.cargarMenu(turno);
    
  }

  /**
   * Obtener mensaje de cierre dinamico para el banner
   */
  obtenerMensajeCierre(turno) {
    const info = this.disponibilidadTurnos?.[turno];
    if (!info) return CONFIG.MENSAJES.RESERVA_CERRADA;

    if (info.razon === 'turno_no_iniciado') {
      const nombreTurno = CONFIG.TURNOS[turno]?.nombre || turno;
      const horaInicio = Utils.formatHora12(info.horaInicio) || info.horaInicio || '';
      return `⏳ Turno ${nombreTurno} inicia a las ${horaInicio}`.trim();
    }

    if (info.razon === 'hora_limite_superada') {
      const turnoProximo = Object.keys(this.disponibilidadTurnos)
        .find(t => this.disponibilidadTurnos[t].razon === 'turno_no_iniciado');

      if (turnoProximo) {
        const nombreTurno = CONFIG.TURNOS[turnoProximo]?.nombre || turnoProximo;
        const horaInicio = Utils.formatHora12(this.disponibilidadTurnos[turnoProximo].horaInicio) || '';
        return `⏳ Próximo: ${nombreTurno} desde ${horaInicio}`.trim();
      }
    }

    if (info.razon === 'dia_cerrado') {
      return info.mensaje || CONFIG.MENSAJES.DIA_DESACTIVADO;
    }

    return info.mensaje || CONFIG.MENSAJES.RESERVA_CERRADA;
  }

  /**
   * Cargar menú del día según el turno
   * ✨ MEJORADO: Detecta automáticamente cambios de turno
   */
  async cargarMenu(turno) {
    try {
      // Obtener estado completo del backend (SIEMPRE)
      const response = await api.getMenuDelDia(turno, false);
      const data = response.data || response;
      
      // El backend retorna:
      // - turnoActual: El turno que DEBEMOS mostrar (puede ser diferente si no está disponible)
      // - turnoSiguiente: El próximo turno para previsualización
      // - dia: El día para el menú
      
      const turnoAMostrar = data.turnoActual || turno;
      const menuAMostrar = data.menu || [];
      const estaDisponible = this.disponibilidadTurnos[turnoAMostrar]?.disponible || false;
      
      // 🚀 CASO 1: El turno está disponible - MOSTRAR MENÚ NORMAL
      if (estaDisponible) {
        // Remover banner anterior si existe
        const bannerAnterior = document.getElementById('bannerTurnoSiguiente');
        if (bannerAnterior) bannerAnterior.remove();
        
        this.menu = menuAMostrar;
        this.renderMenu();
        
      } 
      // 🚀 CASO 2: El turno NO está disponible - MOSTRAR PREVISUALIZACIÓN DEL SIGUIENTE
      else {
        const esDiaInactivo = data.diaDisponible === false;
        const hoy = Utils.getDiaSemana();
        const diaPreview = data.dia;
        const esOtroDia = diaPreview && diaPreview !== hoy;
        
        // Si es día inactivo o día diferente (ej: domingo mostrando lunes)
        if (esDiaInactivo || esOtroDia) {
          await this.cargarMenuTurnoSiguienteConCards(
            turnoAMostrar,
            diaPreview,
            '',                // Sin hora, mostramos solo el día
            menuAMostrar,
            true               // flag: es preview de otro día
          );
        } else {
          // Preview normal entre turnos del mismo día
          const horaInicioPreview =
            this.disponibilidadTurnos?.[turnoAMostrar]?.horaInicio ||
            data.horaInicioTurnoSiguiente ||
            'Pronto';

          await this.cargarMenuTurnoSiguienteConCards(
            turnoAMostrar,
            diaPreview,
            horaInicioPreview,
            menuAMostrar,
            false
          );
        }
      }
      
      // 🚀 CONFIGURAR ACTUALIZACIÓN AUTOMÁTICA
      // Si estamos cerca de la hora límite, actualizar cuando pase
      this.configurarActualizacionAutomatica(turnoAMostrar, data);
    } catch (error) {
      console.error('❌ Error en cargarMenu:', error);
      Utils.showToast(CONFIG.MENSAJES.ERROR_CONEXION, 'error');
    }
  }

  /**
   * 🚀 Cargar y mostrar menú del turno siguiente CON CARDS (deshabilitadas) - OPTIMIZADO
   * Parámetros claros:
   * - turnoSiguiente: Qué turno es el siguiente
   * - dia: Qué día es (para mostrar en preview)
   * - horaInicio: Cuándo comienza
   * - menuYaObtenido: Menú ya filtrado desde backend
   */
  async cargarMenuTurnoSiguienteConCards(turnoSiguiente, dia, horaInicio, menuYaObtenido = null, esOtroDia = false) {
    try {
      const menuContainer = document.getElementById('menuContainer');
      if (!menuContainer) return;
      
      menuContainer.innerHTML = '';
      
      // Información para el banner
      const nombreTurnoSiguiente = CONFIG.TURNOS[turnoSiguiente]?.nombre || turnoSiguiente;
      const primerPlatoNombre = menuYaObtenido && menuYaObtenido.length > 0 
        ? menuYaObtenido[0].nombre || menuYaObtenido[0].Plato 
        : 'Menú disponible';
      const primerPlatoIcono = this.obtenerIconoPlato(primerPlatoNombre);
      
      // Crear banner de previsualización
      const banner = document.createElement('div');
      banner.id = 'bannerTurnoSiguiente';
      banner.className = 'menu-preview-banner';
      
      if (esOtroDia) {
        // Preview de OTRO DÍA (ej: domingo mostrando lunes)
        banner.innerHTML = `
          <div class="menu-preview-main">
            <div class="menu-preview-title">
              <span class="menu-preview-icon">📅</span>
              <span class="menu-preview-turno">${dia} - ${nombreTurnoSiguiente}</span>
            </div>
            <div class="menu-preview-sub">
              <span class="menu-preview-dish-icon" aria-hidden="true">${primerPlatoIcono}</span>
              <span class="menu-preview-dish-text">${primerPlatoNombre}</span>
            </div>
          </div>
        `;
      } else {
        // Preview del mismo día (entre turnos)
        const horaFormateada = Utils.formatHora12(horaInicio) || horaInicio || 'Pronto';
        banner.innerHTML = `
          <div class="menu-preview-main">
            <div class="menu-preview-title">
              <span class="menu-preview-icon">⏳</span>
              <span class="menu-preview-turno">${nombreTurnoSiguiente}</span>
              <span class="menu-preview-time">desde ${horaFormateada}</span>
            </div>
            <div class="menu-preview-sub">
              <span class="menu-preview-dish-icon" aria-hidden="true">${primerPlatoIcono}</span>
              <span class="menu-preview-dish-text">${primerPlatoNombre}</span>
            </div>
          </div>
          <div class="menu-preview-day">📅 ${dia}</div>
        `;
      }
      
      menuContainer.appendChild(banner);
      
      // 🚀 MOSTRAR CARDS DEL TURNO SIGUIENTE (DESHABILITADAS CON VISUAL MEJORADO)
      if (menuYaObtenido && menuYaObtenido.length > 0) {
        // Renderizar cards DESHABILITADAS CON UX MEJORADO
        menuYaObtenido.forEach(plato => {
          const card = document.createElement('div');
          card.className = 'menu-card disabled';
          card.style.cssText = `
            opacity: 0.65;
            filter: grayscale(40%);
            position: relative;
            transition: all 0.3s ease;
          `;
          
          const icono = this.obtenerIconoPlato(plato.nombre || plato.Plato);
          
          // Badge con el día
          const badgeDia = document.createElement('div');
          badgeDia.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #FF5722 0%, #FF6F00 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `;
          badgeDia.innerHTML = `📅 ${dia}`;
          
          // Overlay de "Preview"
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 87, 34, 0.85);
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 0.9rem;
            text-align: center;
            pointer-events: none;
            z-index: 5;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            backdrop-filter: blur(5px);
          `;
          overlay.innerHTML = '👁️ VISTA PREVIA';
          
          card.innerHTML = `
            <div class="menu-image" style="background: linear-gradient(135deg, var(--secondary-color) 0%, rgba(245, 235, 220, 0.5) 100%); display: flex; align-items: center; justify-content: center; font-size: 4.5rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)) grayscale(20%); position: relative;">
              ${icono}
            </div>
            <div class="menu-info">
              <h3 class="menu-name">${Utils.sanitizeHTML(plato.nombre || plato.Plato)}</h3>
              <p class="menu-description" style="opacity: 0.8;">${Utils.sanitizeHTML(plato.descripcion || plato.Descripcion || '')}</p>
              <div class="menu-footer" style="opacity: 0.8;">
                <span class="menu-price">${Utils.formatPrice(plato.precio || plato.Precio)}</span>
              </div>
              <button class="btn-select-menu" disabled style="
                opacity: 0.5; 
                cursor: not-allowed;
                background: #ccc;
              ">Disponible más tarde</button>
            </div>
          `;
          
          card.appendChild(badgeDia);
          card.querySelector('.menu-image').appendChild(overlay);
          menuContainer.appendChild(card);
        });
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `
          text-align: center;
          padding: 40px 20px;
          color: #999;
        `;
        emptyMsg.innerHTML = '❌ No hay menú disponible para este turno';
        menuContainer.appendChild(emptyMsg);
      }
      
    } catch (error) {
      console.error('❌ Error en cargarMenuTurnoSiguienteConCards:', error);
    }
  }

  /**
   * 🚀 Configurar actualización automática cuando pase la hora límite del turno
   * Esto asegura que el preview se actualice automáticamente sin que el usuario tenga que recargar
   */
  configurarActualizacionAutomatica(turnoActual, estadoBackend) {
    // Limpiar timer anterior si existe
    if (this.timerActualizacionTurno) {
      clearTimeout(this.timerActualizacionTurno);
    }
    
    // Obtener hora límite del turno actual
    const horaLimite = estadoBackend.horaLimite;
    if (!horaLimite) return;
    
    // Calcular tiempo hasta la hora límite
    const ahora = new Date();
    const [horas, minutos] = horaLimite.split(':').map(Number);
    const fechaLimite = new Date(ahora);
    fechaLimite.setHours(horas, minutos, 0, 0);
    
    // Si la hora límite ya pasó hoy, será mañana
    if (fechaLimite <= ahora) {
      fechaLimite.setDate(fechaLimite.getDate() + 1);
    }
    
    const tiempoHastaLimite = fechaLimite - ahora;
    const minutosHasta = Math.floor(tiempoHastaLimite / 60000);
    
    // Solo configurar si faltan menos de 1 hora
    if (minutosHasta <= 60) {
      // Actualizar 2 minutos después de la hora límite para asegurar cambio
      const tiempoActualizacion = tiempoHastaLimite + (2 * 60 * 1000);
      
      this.timerActualizacionTurno = setTimeout(() => {
        this.cargarMenu(this.turnoActual);
      }, tiempoActualizacion);
    }
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
    card.dataset.platoId = plato.id;
    
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
    
    // Aeropuerto (plato específico - fusión asiática-latinoamericana)
    if (nombre.includes('aeropuerto')) return '🍛';
    
    // Salteados
    if (nombre.includes('salteado') || nombre.includes('saltado') || nombre.includes('salteados')) return '🍳';
    if (nombre.includes('tallarín salteado') || nombre.includes('tallarines salteados')) return '🍝';
    if (nombre.includes('pollo salteado') || nombre.includes('pollo saltado')) return '🍗';
    
    // Arroz y pollo
    if (nombre.includes('arroz') && nombre.includes('pollo')) return '🍗';
    if (nombre.includes('pollo')) return '🍗';
    
    // Carnes
    if (nombre.includes('lomo') || nombre.includes('bistec')) return '🥩';
    if (nombre.includes('carne')) return '🥩';
    if (nombre.includes('res')) return '🥩';
    if (nombre.includes('asado')) return '🍖';
    
    // Pescados y mariscos
    if (nombre.includes('pescado') || nombre.includes('trucha') || nombre.includes('atún')) return '🐟';
    if (nombre.includes('ceviche') || nombre.includes('camarón') || nombre.includes('mariscos')) return '🦐';
    
    // Pasta - Tallarines
    if (nombre.includes('tallarín') || nombre.includes('tallarines')) return '🍝';
    if (nombre.includes('pasta') || nombre.includes('spaguetti')) return '🍝';
    if (nombre.includes('lasagna') || nombre.includes('lasaña')) return '🍝';
    
    // Arroz
    if (nombre.includes('chaufa')) return '🍛';
    if (nombre.includes('arroz')) return '🍚';
    
    // Sopas y caldos
    if (nombre.includes('sopa') || nombre.includes('caldo')) return '🍲';
    if (nombre.includes('consomé') || nombre.includes('consomé')) return '🍲';
    
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
    if (nombre.includes('flan') || nombre.includes('pudín')) return '🍮';
    
    // Desayunos
    if (nombre.includes('huevo') || nombre.includes('tortilla')) return '🍳';
    if (nombre.includes('pan') || nombre.includes('tostada')) return '🥖';
    
    // Por defecto - platillo genérico
    return '🍽️';
  }

  /**
   * Seleccionar menú del día - Versión simplificada con cantidad manual
   */
  seleccionarMenu(plato) {
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
      Utils.showToast(`${plato.nombre} agregado (${cantidad}x)`, 'success');
    }

    this.actualizarEstadosVisuales();
    this.actualizarResumen();
  }

  /**
   * Actualizar estados visuales de las tarjetas sin re-renderizar todo
   */
  actualizarEstadosVisuales() {
    document.querySelectorAll('.menu-card').forEach(card => {
      const btn = card.querySelector('.btn-select-menu');
      const inputCantidad = card.querySelector('.input-cantidad');
      if (!btn) return;
      
      const platoId = btn.dataset.id;
      const platoSeleccionado = this.menusSeleccionados.find(p => p.id === platoId);
      const esSeleccionado = !!platoSeleccionado;
      
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
      nombreInput.readOnly = false;
      codigoHint.textContent = '';
      codigoHint.style.color = '#666';
      this.actualizarBotonConfirmar();
      return;
    }
    
    try {
      const response = await api.request('buscarEstudiante', { codigo: codigo });
      
      if (response.success) {
        // Autocompletar datos
        const estudiante = response.data;
        nombreInput.value = estudiante.nombre;
        emailInput.value = estudiante.email || '';
        nombreInput.readOnly = true;
        codigoHint.textContent = `✅ Estudiante encontrado: ${estudiante.nombre}`;
        codigoHint.style.color = '#27ae60';
      } else {
        // Código no registrado - permitir ingreso manual
        nombreInput.value = '';
        emailInput.value = '';
        nombreInput.readOnly = false;
        nombreInput.focus();
        codigoHint.innerHTML = `⚠️ Código no registrado. <strong>Ingresa tu nombre para completar el registro.</strong>`;
        codigoHint.style.color = '#f39c12';
      }
      
      this.actualizarBotonConfirmar();
      
    } catch (error) {
      nombreInput.value = '';
      emailInput.value = '';
      nombreInput.readOnly = false;
      codigoHint.textContent = '⚠️ Error al validar código. Ingresa tu nombre manualmente.';
      codigoHint.style.color = '#f39c12';
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
   * Búsqueda de estudiante en tiempo real
   */
  async searchStudentRealtime(query, mode = 'reservar') {
    try {
      const response = await api.request('searchStudent', { query: query });
      
      if (response.success && response.data) {
        this.showSearchResults(response.data, query, mode);
      } else {
        this.hideSearchSuggestions(mode);
      }
    } catch (error) {
      this.hideSearchSuggestions(mode);
    }
  }

  /**
   * Mostrar resultados de búsqueda
   */
  showSearchResults(searchData, query, mode = 'reservar') {
    const suggestionsId = mode === 'reservar' ? 'searchSuggestions' : 'searchSuggestionsCancelar';
    const suggestionsDiv = document.getElementById(suggestionsId);
    
    if (!suggestionsDiv) return;
    
    // Compatibilidad con diferentes estructuras de respuesta
    const students = searchData.students || searchData.results || [];
    const found = searchData.found !== false && students.length > 0;
    
    if (found) {
      // Mostrar estudiantes encontrados
      let html = '';
      students.forEach(student => {
        const studentJson = JSON.stringify(student).replace(/'/g, '\\\'');
        html += `
          <div class="search-suggestion-item" onclick='app.selectStudentFromSearch(${studentJson}, "${mode}")'>
            <div class="name">${student.nombre}</div>
            <div class="details">📝 ${student.codigo} | 🎓 ${student.grado || 'N/A'} - ${student.seccion || 'N/A'}</div>
          </div>
        `;
      });
      suggestionsDiv.innerHTML = html;
      suggestionsDiv.classList.add('show');
    } else {
      // No se encontraron resultados - mensaje informativo
      suggestionsDiv.innerHTML = `
        <div class="search-suggestion-item" style="cursor: default; opacity: 0.7;">
          <div class="name" style="font-weight: normal;">ℹ️ No encontrado</div>
          <div class="details">Ingresa tu código y nombre para registrarte automáticamente</div>
        </div>
      `;
      suggestionsDiv.classList.add('show');
      
      // Ocultar después de 3 segundos
      setTimeout(() => {
        this.hideSearchSuggestions(mode);
      }, 3000);
    }
  }

  /**
   * Ocultar sugerencias de búsqueda
   */
  hideSearchSuggestions(mode = 'reservar') {
    const suggestionsId = mode === 'reservar' ? 'searchSuggestions' : 'searchSuggestionsCancelar';
    const suggestionsDiv = document.getElementById(suggestionsId);
    
    if (suggestionsDiv) {
      suggestionsDiv.classList.remove('show');
      suggestionsDiv.innerHTML = '';
    }
  }

  /**
   * Seleccionar estudiante desde las sugerencias
   */
  async selectStudentFromSearch(student, mode = 'reservar') {
    this.hideSearchSuggestions(mode);
    
    if (mode === 'reservar') {
      // Rellenar campos de reserva
      document.getElementById('codigoEstudiante').value = student.codigo;
      document.getElementById('nombreEstudiante').value = student.nombre;
      document.getElementById('emailEstudiante').value = student.email || '';
      
      const nombreInput = document.getElementById('nombreEstudiante');
      nombreInput.readOnly = true;
      
      const codigoHint = document.getElementById('codigoHint');
      codigoHint.textContent = `✅ Estudiante: ${student.nombre}`;
      codigoHint.style.color = '#27ae60';
      
      this.actualizarBotonConfirmar();
    } else {
      // Rellenar campos de cancelación
      document.getElementById('codigoCancelar').value = student.codigo;
      document.getElementById('nombreCancelar').value = student.nombre;
      
      const cancelarHint = document.getElementById('cancelarHint');
      cancelarHint.textContent = `✅ Estudiante: ${student.nombre}`;
      cancelarHint.style.color = '#27ae60';
      
      // Buscar la reserva de este estudiante
      await this.buscarReservaParaCancelar();
    }
  }

  /**
   * Cambiar entre tabs (Reservar vs Cancelar)
   */
  cambiarTab(tabName) {
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
      const response = await api.request('buscarReservaParaCancelar', { codigo: codigo });
      
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
      }
      
    } catch (error) {
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
      return;
    }
    
    try {
      Utils.showLoader();
      const response = await api.request('cancelarReserva', { 
        codigo: codigo,
        rowNumber: parseInt(rowNumber)
      });
      
      if (response.success) {
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
        Utils.showToast(response.message || 'Error al cancelar reserva', 'error');
      }
      
    } catch (error) {
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

    const formData = {
      turno: this.turnoActual,
      codigoEstudiante: document.getElementById('codigoEstudiante').value.trim(),
      nombreEstudiante: document.getElementById('nombreEstudiante').value.trim(),
      email: document.getElementById('emailEstudiante').value.trim(),
      notas: document.getElementById('notasReserva').value.trim(),
      plato: platosNombres,
      cantidad: cantidadTotal,
      precioTotal: precioTotal
    };

    if (!formData.codigoEstudiante) {
      Utils.showToast('Por favor ingresa tu código de estudiante', 'error');
      return;
    }

    if (!formData.nombreEstudiante) {
      Utils.showToast('Por favor ingresa tu nombre completo', 'error');
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
        this.menusSeleccionados = []; // Limpiar selecciones
        this.renderMenu(); // Re-renderizar para quitar selecciones visuales
        this.actualizarResumen();
      } else {
        Utils.showToast(response.message || response.mensaje || 'Error al crear reserva', 'error');
      }

    } catch (error) {
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

    // Búsqueda en tiempo real para RESERVAR
    const codigoInput = document.getElementById('codigoEstudiante');
    if (codigoInput) {
      let searchTimeout;
      codigoInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        // Actualizar botón siempre que cambie el input
        this.actualizarBotonConfirmar();

        if (query.length < 2) {
          this.hideSearchSuggestions();
          // Limpiar campos si está vacío
          if (query.length === 0) {
            document.getElementById('nombreEstudiante').value = '';
            document.getElementById('emailEstudiante').value = '';
            document.getElementById('codigoHint').textContent = '';
          }
          return;
        }

        searchTimeout = setTimeout(() => {
          this.searchStudentRealtime(query, 'reservar');
        }, 300);
      });
    }

    // Listener para campo de nombre (permite entrada manual)
    const nombreInput = document.getElementById('nombreEstudiante');
    if (nombreInput) {
      nombreInput.addEventListener('input', () => {
        this.actualizarBotonConfirmar();
      });
      
      // Permitir editar si el usuario quiere modificar el nombre autocompletado
      nombreInput.addEventListener('focus', () => {
        if (nombreInput.readOnly) {
          const confirmar = confirm('¿Deseas editar el nombre? (Esto creará una nueva cuenta si cambias el nombre)');
          if (confirmar) {
            nombreInput.readOnly = false;
          }
        }
      });
    }

    // Búsqueda en tiempo real para CANCELAR
    const codigoCancelarInput = document.getElementById('codigoCancelar');
    if (codigoCancelarInput) {
      let searchTimeoutCancelar;
      codigoCancelarInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeoutCancelar);
        const query = e.target.value.trim();

        if (query.length < 2) {
          this.hideSearchSuggestions('cancelar');
          // Limpiar campos si está vacío
          if (query.length === 0) {
            document.getElementById('nombreCancelar').value = '';
            document.getElementById('cancelarHint').textContent = '';
            document.getElementById('reservacionEncontrada').style.display = 'none';
            document.getElementById('reservacionNoEncontrada').style.display = 'none';
            document.getElementById('btnConfirmarCancelacion').style.display = 'none';
          }
          return;
        }

        searchTimeoutCancelar = setTimeout(() => {
          this.searchStudentRealtime(query, 'cancelar');
        }, 300);
      });
    }

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-section')) {
        this.hideSearchSuggestions();
        this.hideSearchSuggestions('cancelar');
      }
    });

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
      const response = await api.request('getAnuncios');
      
      if (response.success && response.data.anuncios.length > 0) {
        this.anuncios = response.data.anuncios;
        this.renderizarSlider();
      } else {
        this.ocultarSlider();
      }
    } catch (error) {
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
