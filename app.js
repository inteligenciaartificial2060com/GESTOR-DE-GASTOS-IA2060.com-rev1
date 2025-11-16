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
        montoInput: document.getElementById('montoInput'), 
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
    
    // Gestión de Mensajes y Alerta de Saldo Rojo
    const gestionarMensajesFinales = (saldoProyectado) => {
        const esPositivo = saldoProyectado > 0;
        
        // Felicitación para cualquier saldo proyectado mayor a 0
        if (esPositivo) {
            const mensajeFelicitacion = `¡Felicidades! Tienes un saldo proyectado positivo. IA2060 te informa que llegas satisfactoriamente a fin de mes. Te invitamos a visitar www.ia2060.com para aumentar tus ingresos y/o digitalizar tu negocio.`;
            
            elements.felicitacionesMsg.textContent = mensajeFelicitacion;
            elements.felicitacionesMsg.classList.remove('hidden');

            // Mensaje de voz y URL
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
            row.cells[0].setAttribute('data-label', 'Fecha');
            
            row.insertCell().textContent = mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1); // Tipo
            row.cells[1].setAttribute('data-label', 'Tipo');
            row.cells[1].classList.add(mov.tipo === 'ingreso' ? 'ingreso-text' : 'gasto-text');

            row.insertCell().textContent = mov.categoria; // Categoría
            row.cells[2].setAttribute('data-label', 'Categoría');

            row.insertCell().textContent = mov.descripcion; // Descripción
            row.cells[3].setAttribute('data-label', 'Descripción');

            row.insertCell().textContent = formatCurrency(parseFloat(mov.monto) * factor); // Monto (con signo)
            row.cells[4].setAttribute('data-label', 'Monto');

            row.insertCell().textContent = formatCurrency(saldoProyectadoAcumulado); // Saldo Proyectado
            row.cells[5].setAttribute('data-label', 'Saldo Proyectado');

            // Columna Realizado (Checkbox)
            const realizadoCell = row.insertCell();
            realizadoCell.setAttribute('data-label', 'Realizado');
            realizadoCell.classList.add('realizado-checkbox');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = mov.realizado;
            checkbox.addEventListener('change', () => toggleRealizado(mov.id));
            realizadoCell.appendChild(checkbox);

            // Columna Acciones
            const actionsCell = row.insertCell();
            actionsCell.setAttribute('data-label', 'Acciones');
            actionsCell.classList.add('action-buttons');
            
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️ Editar';
            editBtn.className = 'edit-btn';
            editBtn.addEventListener('click', () => startEdit(mov.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️ Eliminar';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', () => deleteMovimiento(mov.id));
            
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    };
    
    const renderizarCalendario = (sortedMovimientos, saldosDiarios, primerSaldoRojo) => {
        elements.calendarGrid.innerHTML = ''; // Limpiar la cuadrícula
        elements.calendarMonthTitle.textContent = currentRegistrationDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        // Días de la semana (recreados para móvil)
        const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        daysOfWeek.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            elements.calendarGrid.appendChild(header);
        });

        // Lógica de generación de celdas
        const year = currentRegistrationDate.getFullYear();
        const month = currentRegistrationDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Ajustar el día de inicio (0=Dom, 1=Lun... 6=Sáb) a (1=Lun... 7=Dom)
        let startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 
        
        // Días vacíos al inicio
        for (let i = 0; i < startDayIndex; i++) {
            elements.calendarGrid.appendChild(document.createElement('div'));
        }

        // Mapear movimientos por día
        const movimientosPorDia = sortedMovimientos.reduce((acc, mov) => {
            const dateKey = mov.fecha;
            if (new Date(dateKey).getMonth() === month) {
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(mov);
            }
            return acc;
        }, {});

        // Días del mes
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateISO = date.toISOString().split('T')[0];
            
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.innerHTML = `<span class="day-number">${day}</span>`;
            
            // Resaltar si hay saldo rojo proyectado en este día
            if (primerSaldoRojo && dateISO === primerSaldoRojo.fecha) {
                dayCell.classList.add('saldo-rojo-day');
            }

            // Agregar eventos del día
            const dailyMovs = movimientosPorDia[dateISO] || [];
            dailyMovs.forEach(mov => {
                const event = document.createElement('div');
                event.className = `calendar-event ${mov.tipo === 'ingreso' ? 'ingreso-bg' : 'gasto-bg'}`;
                event.textContent = `${mov.tipo === 'ingreso' ? '+' : '-'} ${parseFloat(mov.monto).toFixed(0)}`;
                dayCell.appendChild(event);
            });
            
            // Mostrar saldo diario
            if (saldosDiarios[dateISO] !== undefined) {
                const balanceSpan = document.createElement('span');
                balanceSpan.className = 'cell-balance';
                balanceSpan.textContent = formatCurrency(saldosDiarios[dateISO]);
                dayCell.appendChild(balanceSpan);
            }

            elements.calendarGrid.appendChild(dayCell);
        }
    };

    // =========================================================
    // --- 6. MANIPULACIÓN DE MOVIMIENTOS ---
    // =========================================================

    // Maneja la adición/edición del formulario
    const handleFormSubmit = (e) => {
        e.preventDefault();

        const data = {
            tipo: elements.tipoSelect.value,
            monto: parseFloat(elements.montoInput.value), 
            categoria: elements.categoriaSelect.value, 
            descripcion: elements.descripcionInput.value, 
            fecha: elements.fechaInput.value, 
            realizado: currentEditId ? movimientos.find(m => m.id === currentEditId).realizado : false 
        };

        if (currentEditId) {
            // Edición
            const index = movimientos.findIndex(m => m.id === currentEditId);
            if (index !== -1) {
                movimientos[index] = { ...movimientos[index], ...data };
            }
            currentEditId = null;
            elements.addMovimientoBtn.textContent = 'Agregar Movimiento';
        } else {
            // Adición
            data.id = Date.now();
            movimientos.push(data);
        }
        
        persistData();
        updateSummaryAndRender();
        elements.registroForm.reset();
        populateCategories(''); // Resetear categorías
        elements.fechaInput.value = new Date().toISOString().split('T')[0]; // Resetear la fecha a hoy
    };

    const startEdit = (id) => {
        const mov = movimientos.find(m => m.id === id);
        if (!mov) return;

        currentEditId = id;
        elements.tipoSelect.value = mov.tipo;
        populateCategories(mov.tipo);
        elements.categoriaSelect.value = mov.categoria;
        elements.descripcionInput.value = mov.descripcion;
        elements.montoInput.value = mov.monto;
        elements.fechaInput.value = mov.fecha;

        elements.addMovimientoBtn.textContent = 'Guardar Edición';
    };

    const deleteMovimiento = (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
            movimientos = movimientos.filter(mov => mov.id !== id);
            persistData();
            updateSummaryAndRender();
        }
    };

    const toggleRealizado = (id) => {
        const mov = movimientos.find(m => m.id === id);
        if (mov) {
            mov.realizado = !mov.realizado;
            persistData();
            updateSummaryAndRender();
        }
    };

    // =========================================================
    // --- 7. RECONOCIMIENTO DE VOZ (SpeechRecognition) ---
    // =========================================================

    const setupSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            elements.vozBtn.disabled = true;
            elements.vozBtn.textContent = '🎙️ Voz (No soportado)';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        elements.vozBtn.addEventListener('click', () => {
            recognition.start();
            elements.vozBtn.textContent = '🔴 Escuchando...';
            elements.vozBtn.disabled = true;
        });

        recognition.onresult = (event) => {
            const comando = event.results[0][0].transcript;
            procesarComandoVoz(comando);
        };

        recognition.onend = () => {
            elements.vozBtn.textContent = '🎙️ Voz';
            elements.vozBtn.disabled = false;
        };

        recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            elements.vozBtn.textContent = '🎙️ Voz (Error)';
            elements.vozBtn.disabled = false;
            alert(`Error de voz: ${event.error}. Asegúrate de permitir el micrófono.`);
        };
    };
    
    // Procesamiento de Comando de Voz para Orden Estricto (Tipo, Monto, Descripción/Cat, Fecha)
    function procesarComandoVoz(comando) {
        const comandoLower = comando.toLowerCase();
        let tipo = '';
        let monto = NaN;
        let fechaISO = new Date().toISOString().split('T')[0]; // Default a hoy

        // 1. Encontrar Tipo: Debe ser lo primero.
        if (comandoLower.startsWith('ingreso')) {
            tipo = 'ingreso';
        } else if (comandoLower.startsWith('gasto')) {
            tipo = 'gasto';
        }

        // Si no se encuentra el tipo al inicio, fallar de inmediato.
        if (!tipo) {
            alert('❌ Orden incorrecto o falta el TIPO (ingreso/gasto) al inicio del comando. El orden **DEBE** ser: [Tipo] [Monto] [Descripción/Categoría] [Fecha]. Ejemplo: "Ingreso 1500 Sueldo 1 de diciembre de 2025"');
            return;
        }

        // 2. Encontrar Monto: Se busca el primer número después del tipo.
        let comandoAfterType = comandoLower.substring(tipo.length).trim();
        const montoMatch = comandoAfterType.match(/(\d+[\.,]?\d*)/);

        if (montoMatch) {
            monto = parseFloat(montoMatch[1].replace(',', '.'));
            // Lo que queda después del Monto es la Descripción/Fecha.
            comandoAfterType = comandoAfterType.substring(montoMatch.index + montoMatch[0].length).trim();
        } else {
            alert('❌ Falta el MONTO o no es un número justo después del tipo. El orden **DEBE** ser: [Tipo] [Monto] [Descripción/Categoría] [Fecha]. Ejemplo: "Ingreso 1500 Sueldo 1 de diciembre de 2025"');
            return;
        }


        // 3. Encontrar Fecha y 4. Categoría/Descripción (lo que queda)
        let categoria = ''; 
        let descripcion = comandoAfterType; 
        const fechaPattern = /(\d{1,2})\s*de\s*([a-záéíóúüñ]+)\s*de\s*(\d{4})|el\s*(\d{1,2})|hoy|mañana|pasado mañana/;
        const fechaMatch = comandoAfterType.match(fechaPattern);

        if (fechaMatch) {
             // Lógica para fechas relativas y completas
            const today = new Date();
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const dayAfterTomorrow = new Date(today); dayAfterTomorrow.setDate(today.getDate() + 2);

            if (comandoAfterType.includes('hoy')) {
                 fechaISO = today.toISOString().split('T')[0];
                 descripcion = descripcion.replace('hoy', '').trim();
            } else if (comandoAfterType.includes('mañana')) {
                 fechaISO = tomorrow.toISOString().split('T')[0];
                 descripcion = descripcion.replace('mañana', '').trim();
            } else if (comandoAfterType.includes('pasado mañana')) {
                 fechaISO = dayAfterTomorrow.toISOString().split('T')[0];
                 descripcion = descripcion.replace('pasado mañana', '').trim();
            }
            else if (fechaMatch[1]) { // Formato completo: '15 de noviembre de 2025'
                let day = fechaMatch[1];
                let monthStr = fechaMatch[2];
                let year = fechaMatch[3];
                const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                const monthIndex = meses.findIndex(m => monthStr.startsWith(m));
                
                if (monthIndex !== -1) {
                    const monthPadded = (monthIndex + 1).toString().padStart(2, '0');
                    const dayPadded = day.padStart(2, '0');
                    fechaISO = `${year}-${monthPadded}-${dayPadded}`;
                }
                descripcion = descripcion.replace(fechaMatch[0], '').trim();
            } else if (fechaMatch[4]) { // Formato día: 'el 15' (asume mes y año actual)
                let day = fechaMatch[4];
                const yearCurrent = today.getFullYear();
                const monthCurrent = today.getMonth() + 1;
                
                const monthPadded = monthCurrent.toString().padStart(2, '0');
                const dayPadded = day.padStart(2, '0');
                fechaISO = `${yearCurrent}-${monthPadded}-${dayPadded}`;
                descripcion = descripcion.replace(fechaMatch[0], '').trim();
            }
        } 
        
        // 4. Inferencia de Categoría
        let descripcionFinal = descripcion;
        const currentCategories = categories[tipo].map(c => c.toLowerCase());
        for (const cat of currentCategories) {
            if (descripcionFinal.includes(cat.toLowerCase())) {
                categoria = cat.charAt(0).toUpperCase() + cat.slice(1);
                // Remover la categoría de la descripción
                const catRegex = new RegExp(`\\b${cat}\\b`, 'gi');
                descripcionFinal = descripcionFinal.replace(catRegex, '').trim();
                break;
            }
        }
        if (!categoria) categoria = 'Otros';

        // 5. Limpieza final de la descripción
        if (descripcionFinal.length === 0) {
             descripcionFinal = (tipo === 'ingreso' ? 'Ingreso Voz' : 'Gasto Voz');
        }

        if (tipo && !isNaN(monto) && monto > 0) {
            // Precargar el formulario
            elements.tipoSelect.value = tipo;
            populateCategories(tipo);
            elements.categoriaSelect.value = categoria;
            elements.descripcionInput.value = descripcionFinal;
            elements.montoInput.value = monto;
            elements.fechaInput.value = fechaISO;

            alert('✅ Datos precargados por voz. Revisa, ajusta si es necesario, y haz clic en "Agregar Movimiento" para guardar.');
        } else {
            // Este caso ya no debería ocurrir si se cumple el chequeo de tipo y monto
            alert('❌ No se pudo procesar el comando. El orden **DEBE** ser: [Tipo] [Monto] [Descripción/Categoría] [Fecha]. Ejemplo: "Ingreso 1500 Sueldo 1 de diciembre de 2025"');
        }
    }


    // =========================================================
    // --- 8. MANEJO DE EVENTOS ---
    // =========================================================

    const setFormMonth = (date) => {
        currentRegistrationDate = date;
        elements.displayMonth.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        // Establecer el día 1 del mes como fecha por defecto del input
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        elements.fechaInput.value = firstDayOfMonth;
    };
    
    const changeFormMonth = (direction) => {
        const newDate = new Date(currentRegistrationDate);
        newDate.setMonth(currentRegistrationDate.getMonth() + direction);
        setFormMonth(newDate);
    };


    // Inicialización y Listeners
    const initialize = () => {
        // Inicializar Moneda
        elements.currencySelect.value = currencySymbol;

        // Inicializar Fecha del Formulario
        setFormMonth(new Date());

        // Inicializar el Saldo y renderizar
        updateSummaryAndRender();
        
        // Listeners del Formulario
        elements.registroForm.addEventListener('submit', handleFormSubmit);
        elements.tipoSelect.addEventListener('change', () => populateCategories(elements.tipoSelect.value));

        // Listeners de Vistas
        elements.listViewBtn.addEventListener('click', () => {
            elements.listView.classList.remove('hidden');
            elements.calendarView.classList.add('hidden');
            elements.listViewBtn.classList.add('active');
            elements.calendarViewBtn.classList.remove('active');
            updateSummaryAndRender();
        });
        
        elements.calendarViewBtn.addEventListener('click', () => {
            elements.calendarView.classList.remove('hidden');
            elements.listView.classList.add('hidden');
            elements.calendarViewBtn.classList.add('active');
            elements.listViewBtn.classList.remove('active');
            updateSummaryAndRender();
        });

        // Listeners de Utilidades
        elements.clearAllBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar TODOS los movimientos? Esta acción no se puede deshacer.')) {
                movimientos = [];
                persistData();
                updateSummaryAndRender();
            }
        });
        elements.resetBalanceBtn.addEventListener('click', () => {
            const newBalance = prompt('Introduce el nuevo Saldo Inicial:', saldoInicial.toFixed(2));
            if (newBalance !== null && !isNaN(parseFloat(newBalance))) {
                saldoInicial = parseFloat(newBalance);
                persistData();
                updateSummaryAndRender();
            }
        });

        // Listener de Moneda
        elements.currencySelect.addEventListener('change', (e) => {
            currencySymbol = e.target.value;
            persistData();
            updateSummaryAndRender();
        });

        // Listeners del Modal
        elements.modalCloseBtn.addEventListener('click', () => elements.alertModal.classList.add('hidden'));
        elements.modalCloseLink.addEventListener('click', (e) => {
            e.preventDefault();
            elements.alertModal.classList.add('hidden');
        });

        // Listeners de Control de Mes de Registro
        elements.prevMonthBtn.addEventListener('click', () => changeFormMonth(-1));
        elements.nextMonthBtn.addEventListener('click', () => changeFormMonth(1));

        // Setup de Voz
        setupSpeechRecognition();
    };

    initialize();
}); // <-- CORRECCIÓN: Asegúrate que esta es la última línea del archivo.