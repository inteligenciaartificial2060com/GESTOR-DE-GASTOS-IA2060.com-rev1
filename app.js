document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // --- 1. REFERENCIAS DE ELEMENTOS DEL DOM ---
    // =========================================================

    const elements = {
        // Formulario
        registroForm: document.getElementById('registroForm'),
        tipoSelect: document.getElementById('tipoSelect'),
        categoriaSelect: document.getElementById('categoriaSelect'),
        descripcionInput: document.getElementById('descripcionInput'),
        montoInput: document.getElementById('montoInput'), // Reordenado en HTML
        fechaInput: document.getElementById('fechaInput'),
        vozBtn: document.getElementById('vozBtn'),

        // Vistas
        listViewBtn: document.getElementById('listViewBtn'),
        calendarViewBtn: document.getElementById('calendarViewBtn'),
        listView: document.getElementById('list-view'),
        calendarView: document.getElementById('calendar-view'),

        // Resumen
        currencySelect: document.getElementById('currencySelect'),
        saldoTotal: document.getElementById('saldoTotal'),
        saldoProyectado: document.getElementById('saldoProyectado'),
        saldoActual: document.getElementById('saldoActual'),
        pendienteCobrar: document.getElementById('pendienteCobrar'),
        pendientePagar: document.getElementById('pendientePagar'),
        
        // Tabla y Calendario
        movimientosTableBody: document.querySelector('#movimientosTable tbody'),
        calendarMonthTitle: document.getElementById('calendarMonthTitle'),
        calendarGrid: document.getElementById('calendar-grid'),

        // Utilidades
        clearAllBtn: document.getElementById('clearAllBtn'),
        resetBalanceBtn: document.getElementById('resetBalanceBtn'),

        // Mensajes y Modal
        felicitacionesMsg: document.getElementById('felicitacionesMsg'),
        invitacionMsg: document.getElementById('invitacionMsg'),
        alertModal: document.getElementById('alertModal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalCloseBtn: document.querySelector('#alertModal .close-btn'),
        modalCloseLink: document.getElementById('modalCloseLink'),

        // Control de Mes de Registro
        prevMonthBtn: document.getElementById('prevMonthBtn'),
        nextMonthBtn: document.getElementById('nextMonthBtn'),
        displayMonth: document.getElementById('displayMonth'),
    };

    // =========================================================
    // --- 2. ESTADO GLOBAL Y DATOS ---
    // =========================================================

    let movimientos = JSON.parse(localStorage.getItem('movimientos')) || [];
    let saldoInicial = parseFloat(localStorage.getItem('saldoInicial')) || 0;
    let currencySymbol = localStorage.getItem('currencySymbol') || '€';
    let currentEditId = null; 
    let currentRegistrationDate = new Date(); // Para el control de mes en el formulario

    const categories = {
        ingreso: ['Sueldo', 'Venta', 'Inversión', 'Regalo', 'Otros'],
        gasto: ['Alquiler', 'Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Otros']
    };

    // =========================================================
    // --- 3. LÓGICA DE DATOS Y PERSISTENCIA ---
    // =========================================================

    const persistData = () => {
        localStorage.setItem('movimientos', JSON.stringify(movimientos));
        localStorage.setItem('saldoInicial', saldoInicial.toFixed(2));
        localStorage.setItem('currencySymbol', currencySymbol);
    };

    // Formato de moneda
    const formatCurrency = (amount) => {
        const sign = amount < 0 ? '-' : '';
        const absAmount = Math.abs(amount).toFixed(2);
        return `${sign}${absAmount} ${currencySymbol}`;
    };

    // Función que carga las categorías según el tipo seleccionado
    const populateCategories = (tipo) => {
        elements.categoriaSelect.innerHTML = '<option value="">-- Selecciona Categoría --</option>';
        if (tipo && categories[tipo]) {
            categories[tipo].forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                elements.categoriaSelect.appendChild(option);
            });
            elements.categoriaSelect.disabled = false;
        } else {
            elements.categoriaSelect.disabled = true;
        }
    };

    // =========================================================
    // --- 4. CÁLCULOS FINANCIEROS Y RESUMEN ---
    // =========================================================

    // Calcular el Saldo Proyectado Acumulado día a día (clave para detección de saldo rojo)
    const calcularSaldosAcumulados = () => {
        // Ordenar movimientos por fecha y luego por id (para consistencia)
        const sortedMovimientos = [...movimientos].sort((a, b) => {
            if (a.fecha !== b.fecha) {
                return new Date(a.fecha) - new Date(b.fecha);
            }
            return a.id - b.id; 
        });

        let saldoAcumulado = saldoInicial;
        let saldoActual = saldoInicial; // Solo para movimientos realizados
        let pendienteCobrar = 0;
        let pendientePagar = 0;
        let primerSaldoRojo = null;

        const saldosDiarios = {};
        
        for (const mov of sortedMovimientos) {
            const monto = parseFloat(mov.monto);
            const factor = mov.tipo === 'ingreso' ? 1 : -1;
            const valorMovimiento = monto * factor;
            
            saldoAcumulado += valorMovimiento;
            
            // Si está realizado, afecta el saldo actual
            if (mov.realizado) {
                saldoActual += valorMovimiento;
            } else {
                // Si está pendiente, afecta los pendientes
                if (mov.tipo === 'ingreso') {
                    pendienteCobrar += monto;
                } else {
                    pendientePagar += monto;
                }
            }

            // Detección de Saldo Rojo Acumulado
            if (saldoAcumulado < 0 && !primerSaldoRojo) {
                primerSaldoRojo = { fecha: mov.fecha, deficit: saldoAcumulado };
            }

            // Guardar el saldo acumulado para ese día
            saldosDiarios[mov.fecha] = saldoAcumulado;
        }

        const saldoProyectadoFinal = saldoAcumulado;

        return { 
            sortedMovimientos, 
            saldoProyectadoFinal, 
            saldoActual, 
            pendienteCobrar, 
            pendientePagar,
            primerSaldoRojo,
            saldosDiarios
        };
    };

    // Muestra el resumen financiero y gestiona los mensajes
    const updateSummaryAndRender = () => {
        const { 
            sortedMovimientos, 
            saldoProyectadoFinal, 
            saldoActual, 
            pendienteCobrar, 
            pendientePagar,
            primerSaldoRojo,
            saldosDiarios
        } = calcularSaldosAcumulados();

        // Actualizar el DOM del resumen
        elements.saldoTotal.textContent = `Saldo Inicial: ${formatCurrency(saldoInicial)}`;
        elements.saldoProyectado.textContent = formatCurrency(saldoProyectadoFinal);
        elements.saldoActual.textContent = formatCurrency(saldoActual);
        elements.pendienteCobrar.textContent = formatCurrency(pendienteCobrar);
        elements.pendientePagar.textContent = formatCurrency(pendientePagar);

        // Aplicar estilos de color
        elements.saldoProyectado.className = `saldo-value ${saldoProyectadoFinal < 0 ? 'red-balance' : 'positive-balance'}`;
        elements.saldoActual.className = `saldo-value ${saldoActual < 0 ? 'red-balance' : 'positive-balance'}`;
        
        // Renderizar la vista actual (tabla o calendario)
        if (!elements.listView.classList.contains('hidden')) {
            renderizarListado(sortedMovimientos, primerSaldoRojo);
        } else {
            renderizarCalendario(sortedMovimientos, saldosDiarios, primerSaldoRojo);
        }

        // Gestionar mensajes de felicitación y alerta
        gestionarMensajesFinales(saldoProyectadoFinal);
        
        // Mostrar modal de alerta si hay saldo rojo proyectado
        if (primerSaldoRojo) {
            mostrarAlertaSaldoRojo(primerSaldoRojo);
        } else {
            elements.alertModal.classList.add('hidden');
        }
    };
    
    // --- [ACTUALIZADO] Gestión de Mensajes y Alerta de Saldo Rojo ---
    const gestionarMensajesFinales = (saldoProyectado) => {
        const esPositivo = saldoProyectado > 0;
        
        // [MODIFICADO] Felicitación para cualquier saldo proyectado mayor a 0
        if (esPositivo) {
            const mensajeFelicitacion = `¡Felicidades! Tienes un saldo proyectado positivo. IA2060 te informa que llegas satisfactoriamente a fin de mes. Te invitamos a visitar www.ia2060.com para aumentar tus ingresos y/o digitalizar tu negocio.`;
            
            elements.felicitacionesMsg.textContent = mensajeFelicitacion;
            elements.felicitacionesMsg.classList.remove('hidden');

            // [MODIFICADO] Mensaje de voz y URL
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(`Felicidades, llegas satisfactoriamente a fin de mes y dispones de www.ia2060.com para aumentar tus ingresos.`);
                utterance.lang = 'es-ES';
                speechSynthesis.speak(utterance);
            }

        } else {
            elements.felicitacionesMsg.classList.add('hidden');
        }

        // Mensaje de Invitación 
        if (movimientos.length > 0) {
            elements.invitacionMsg.classList.remove('hidden');
        } else {
             elements.invitacionMsg.classList.add('hidden');
        }
    };

    const mostrarAlertaSaldoRojo = (alerta) => {
        elements.modalMessage.innerHTML = `Según tus movimientos pendientes, tu saldo proyectado caerá en **rojo** a partir del día **${new Date(alerta.fecha).toLocaleDateString()}**. <br><br> El déficit será de aproximadamente **${formatCurrency(alerta.deficit)}**.`;
        elements.alertModal.classList.remove('hidden');

        // Mensaje de voz
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`Atención, se detecta saldo rojo proyectado de ${alerta.deficit} el día ${new Date(alerta.fecha).toLocaleDateString()}`);
            utterance.lang = 'es-ES';
            speechSynthesis.speak(utterance);
        }
    };

    // =========================================================
    // --- 5. RENDERIZACIÓN DE VISTAS ---
    // =========================================================

    const renderizarListado = (sortedMovimientos, primerSaldoRojo) => {
        elements.movimientosTableBody.innerHTML = '';
        let saldoProyectadoAcumulado = saldoInicial;
        let saldoRojoActivado = false;

        if (sortedMovimientos.length === 0) {
            elements.movimientosTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay movimientos registrados.</td></tr>';
            return;
        }

        sortedMovimientos.forEach(mov => {
            const factor = mov.tipo === 'ingreso' ? 1 : -1;
            saldoProyectadoAcumulado += parseFloat(mov.monto) * factor;

            const isSaldoRojoRow = primerSaldoRojo && (mov.fecha === primerSaldoRojo.fecha && !saldoRojoActivado && saldoProyectadoAcumulado < 0);
            if (isSaldoRojoRow) saldoRojoActivado = true;

            const row = elements.movimientosTableBody.insertRow();
            row.className = mov.realizado ? 'completed-row' : 'pending-row';
            if (isSaldoRojoRow) row.classList.add('saldo-rojo-row');

            // Columnas de la tabla (data-label para responsividad móvil)
            row.insertCell().textContent = mov.fecha; // Fecha
            row.cells