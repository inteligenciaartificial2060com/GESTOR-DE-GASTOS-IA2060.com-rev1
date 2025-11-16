document.addEventListener('DOMContentLoaded', function() {
    // --- Configuración y Elementos del DOM ---
    const DB_KEY = 'movimientos_ia2060';
    const BALANCE_KEY = 'initial_balance_ia2060';
    
    const elements = {
        form: document.getElementById('registroForm'),
        tipoSelect: document.getElementById('tipo'),
        categoriaSelect: document.getElementById('categoria'),
        descripcionInput: document.getElementById('descripcion'),
        montoInput: document.getElementById('monto'),
        fechaInput: document.getElementById('fecha'),
        tableBody: document.getElementById('movimientosTable').getElementsByTagName('tbody')[0],
        saldoTotal: document.getElementById('saldoTotal'),
        vozBtn: document.getElementById('vozBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        resetBalanceBtn: document.getElementById('resetBalanceBtn'),
        listViewBtn: document.getElementById('listViewBtn'),
        calendarViewBtn: document.getElementById('calendarViewBtn'),
        listView: document.getElementById('list-view'),
        calendarView: document.getElementById('calendar-view'),
        calendarGrid: document.getElementById('calendar-grid'),
        calendarMonthTitle: document.getElementById('calendarMonthTitle'),
        currencySelect: document.getElementById('currencySelect'),
        modal: document.getElementById('red-balance-modal'),
        modalCloseBtn: document.querySelector('#red-balance-modal .close-btn'),
        modalMessage: document.getElementById('modal-message'),
        displayMonth: document.getElementById('displayMonth'),
        prevMonthBtn: document.getElementById('prevMonthBtn'),
        nextMonthBtn: document.getElementById('nextMonthBtn')
    };

    const categories = {
        ingreso: ['Sueldo', 'Regalo', 'Inversión', 'Venta', 'Otros'],
        gasto: ['Alquiler', 'Comida', 'Transporte', 'Entretenimiento', 'Deudas', 'Otros']
    };

    let currentCurrency = 'EUR';
    let currentMonth = new Date(); // Para el mes de ingreso de datos

    // --- Funciones de Utilidad ---

    /** Formatea la fecha a D/M/A (DD/MM/YYYY) */
    const formatDate = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    /** Formatea el monto con la moneda actual */
    const formatCurrency = (amount) => {
        const symbol = currentCurrency === 'EUR' ? '€' : '$';
        return `${amount.toFixed(2)} ${symbol}`;
    };

    /** Rellena el select de categorías basado en el tipo de movimiento. */
    const populateCategories = (type) => {
        elements.categoriaSelect.innerHTML = '';
        categories[type].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            elements.categoriaSelect.appendChild(option);
        });
    };

    // --- Persistencia y Saldo ---

    /** Carga movimientos y saldo inicial desde localStorage. */
    const cargarDatos = () => {
        try {
            const movimientos = JSON.parse(localStorage.getItem(DB_KEY)) || [];
            const initialBalance = parseFloat(localStorage.getItem(BALANCE_KEY)) || 0;
            return { movimientos, initialBalance };
        } catch (e) {
            console.error('Error al cargar datos:', e);
            return { movimientos: [], initialBalance: 0 };
        }
    };

    /** Guarda movimientos y saldo en localStorage. */
    const guardarDatos = (movimientos, initialBalance) => {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(movimientos));
            localStorage.setItem(BALANCE_KEY, initialBalance.toFixed(2));
            renderAllViews();
        } catch (e) {
            console.error('Error al guardar datos:', e);
        }
    };

    /** Calcula el saldo total (incluyendo el saldo inicial). */
    const calcularSaldoTotal = (movimientos) => {
        const { initialBalance } = cargarDatos();
        const saldo = movimientos.reduce((total, mov) => {
            return mov.tipo === 'ingreso' ? total + mov.monto : total - mov.monto;
        }, initialBalance);
        return saldo;
    };

    /** Actualiza el display del saldo total. */
    const actualizarDisplaySaldoTotal = () => {
        const { movimientos } = cargarDatos();
        const saldo = calcularSaldoTotal(movimientos);
        elements.saldoTotal.textContent = `Saldo Total: ${formatCurrency(saldo)}`;
        elements.saldoTotal.style.color = saldo >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    };

    // --- Renderizado de Vistas ---

    /** Renderiza la vista de Listado. */
    const renderizarListado = (movimientos) => {
        elements.tableBody.innerHTML = '';
        const { initialBalance } = cargarDatos();
        let runningBalance = initialBalance;
        let foundRedDay = false;

        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        movimientos.forEach((movimiento, index) => {
            const montoSign = movimiento.tipo === 'ingreso' ? 1 : -1;
            runningBalance += movimiento.monto * montoSign;

            const newRow = elements.tableBody.insertRow();
            newRow.className = `${movimiento.tipo} ${movimiento.realizado ? 'completed-row' : ''}`;
            newRow.classList.remove('saldo-rojo-row');

            // 1. Detección de Saldo Rojo: solo si el saldo pasa a ser negativo.
            if (!foundRedDay && runningBalance < 0) {
                newRow.classList.add('saldo-rojo-row');
                foundRedDay = true;
                mostrarAlertaSaldoRojo(movimiento.fecha, runningBalance);
            }

            newRow.innerHTML = `
                <td data-label="Realizado">
                    <input type="checkbox" ${movimiento.realizado ? 'checked' : ''} 
                           onchange="toggleRealizado('${movimiento.id}', this.checked)"
                           ${!movimiento.id ? 'disabled' : ''}>
                </td>
                <td data-label="Tipo" class="${movimiento.tipo}">${movimiento.tipo.charAt(0).toUpperCase() + movimiento.tipo.slice(1)}</td>
                <td data-label="Categoría">${movimiento.categoria || ''}</td>
                <td data-label="Descripción">${movimiento.descripcion}</td>
                <td data-label="Monto">${formatCurrency(movimiento.monto)}</td>
                <td data-label="Fecha">${formatDate(movimiento.fecha)}</td>
                <td data-label="Acciones">
                    <button type="button" onclick="editarMovimiento('${movimiento.id}')" ${movimiento.realizado ? 'disabled' : ''}>Editar</button>
                    <button type="button" onclick="eliminarMovimiento('${movimiento.id}')">Eliminar</button>
                </td>
            `;
            // Aplicar data-label para responsividad
            const labels = ['Realizado', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Fecha', 'Acciones'];
            Array.from(newRow.cells).forEach((cell, i) => {
                cell.setAttribute('data-label', labels[i]);
            });
        });

        actualizarDisplaySaldoTotal();
    };

    /** Renderiza la vista de Calendario. */
    const renderizarCalendario = (movimientos) => {
        elements.calendarGrid.innerHTML = '';
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        elements.calendarMonthTitle.textContent = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayIndex = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // Lunes = 0

        // Días de la semana
        const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        daysOfWeek.forEach(day => {
            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = day;
            elements.calendarGrid.appendChild(header);
        });

        // Días de meses anteriores para rellenar
        for (let i = 0; i < startDayIndex; i++) {
            const prevMonthDate = new Date(year, month, 0 - startDayIndex + i + 1);
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell other-month';
            emptyCell.innerHTML = `<span class="day-number">${prevMonthDate.getDate()}</span>`;
            elements.calendarGrid.appendChild(emptyCell);
        }

        const dailyData = {}; // { 'YYYY-MM-DD': [{movimiento}, ...], ... }
        movimientos.forEach(mov => {
            const dateStr = mov.fecha;
            if (!dailyData[dateStr]) dailyData[dateStr] = [];
            dailyData[dateStr].push(mov);
        });

        const { initialBalance } = cargarDatos();
        let runningBalance = initialBalance;
        let foundRedDay = false;
        
        // Días del mes actual
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const cell = document.createElement('div');
            cell.className = 'day-cell current-month';
            cell.dataset.date = dateStr;
            cell.onclick = (e) => showDayDetails(e, dateStr);

            // Calcular saldo del día
            const movementsToday = dailyData[dateStr] || [];
            let dailyTotal = 0;
            movementsToday.forEach(mov => {
                const montoSign = mov.tipo === 'ingreso' ? 1 : -1;
                dailyTotal += mov.monto * montoSign;
            });
            runningBalance += dailyTotal;

            // Renderizar contenido de la celda
            cell.innerHTML = `<span class="day-number">${day}</span>`;
            movementsToday.forEach(mov => {
                const entryDiv = document.createElement('div');
                entryDiv.className = `cell-entry ${mov.tipo}-bg`;
                entryDiv.textContent = `${mov.tipo.charAt(0)}: ${formatCurrency(mov.monto)}`;
                cell.appendChild(entryDiv);
            });

            const balanceDisplay = document.createElement('span');
            balanceDisplay.className = `cell-balance ${runningBalance >= 0 ? 'positive' : 'negative'}`;
            balanceDisplay.textContent = formatCurrency(runningBalance);
            cell.appendChild(balanceDisplay);

            // Alerta visual de saldo rojo en el calendario
            if (!foundRedDay && runningBalance < 0) {
                cell.classList.add('saldo-rojo-day');
                foundRedDay = true;
                // El mensaje de voz ya se disparó en renderizarListado
            }

            elements.calendarGrid.appendChild(cell);
        }
    };

    /** Muestra los detalles de un día en el calendario (simulado por ahora con alerta) */
    const showDayDetails = (e, dateStr) => {
        e.stopPropagation();
        const movimientos = cargarDatos().movimientos.filter(m => m.fecha === dateStr);
        let details = `Movimientos del ${formatDate(dateStr)}:\n\n`;
        if (movimientos.length === 0) {
             details += 'No hay movimientos registrados.';
        } else {
             movimientos.forEach(mov => {
                details += `${mov.tipo.toUpperCase()} (${mov.categoria}): ${mov.descripcion} - ${formatCurrency(mov.monto)} ${mov.realizado ? '(Realizado)' : ''}\n`;
             });
        }
        alert(details + "\n\nPara editar/eliminar, usa la vista de Listado."); 
        // Nota: La edición directa en la celda del calendario es compleja de implementar en una sola pieza de código. 
        // Se sugiere usar la vista de Listado por simplicidad, tal como se indica en el código.
    };
    
    /** Dibuja ambas vistas y actualiza el saldo. */
    const renderAllViews = () => {
        const { movimientos } = cargarDatos();
        renderizarListado(movimientos);
        renderizarCalendario(movimientos);
        actualizarDisplaySaldoTotal();
    };

    // --- Manejo de Eventos CRUD ---

    /** Expone la función global para editar un movimiento. */
    window.editarMovimiento = (id) => {
        const { movimientos } = cargarDatos();
        const movToEdit = movimientos.find(m => m.id === id);
        
        if (movToEdit) {
            // Precargar el formulario
            elements.tipoSelect.value = movToEdit.tipo;
            populateCategories(movToEdit.tipo); // Actualizar categorías
            elements.categoriaSelect.value = movToEdit.categoria;
            elements.descripcionInput.value = movToEdit.descripcion;
            elements.montoInput.value = movToEdit.monto;
            elements.fechaInput.value = movToEdit.fecha;

            // Eliminar el movimiento antiguo de la base de datos
            const newMovs = movimientos.filter(m => m.id !== id);
            guardarDatos(newMovs, cargarDatos().initialBalance);
            renderAllViews();
            
            alert('Datos cargados para edición. Modifica y haz clic en "Agregar Movimiento" para guardar el cambio.');
        }
    };

    /** Expone la función global para eliminar un movimiento. */
    window.eliminarMovimiento = (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;
        
        let { movimientos, initialBalance } = cargarDatos();
        const newMovs = movimientos.filter(m => m.id !== id);
        
        guardarDatos(newMovs, initialBalance);
        renderAllViews();
    };
    
    /** Expone la función global para marcar como realizado. */
    window.toggleRealizado = (id, isChecked) => {
        let { movimientos, initialBalance } = cargarDatos();
        const movIndex = movimientos.findIndex(m => m.id === id);
        
        if (movIndex !== -1) {
            movimientos[movIndex].realizado = isChecked;
            guardarDatos(movimientos, initialBalance);
        }
    };


    // --- Inicialización de Eventos y Lógica ---

    // Manejo de Formulario
    elements.form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const { movimientos, initialBalance } = cargarDatos();
        const nuevoMovimiento = {
            id: Date.now().toString(), // ID único
            tipo: elements.tipoSelect.value,
            categoria: elements.categoriaSelect.value,
            descripcion: elements.descripcionInput.value,
            monto: parseFloat(elements.montoInput.value),
            fecha: elements.fechaInput.value,
            realizado: false
        };

        movimientos.push(nuevoMovimiento);
        guardarDatos(movimientos, initialBalance);
        elements.form.reset();
        
        // Volver a establecer la fecha al mes actual de ingreso después de enviar
        updateMonthDisplay(new Date()); 
    });

    // Cambiar Categorías al cambiar Tipo
    elements.tipoSelect.addEventListener('change', (e) => populateCategories(e.target.value));

    // Botón de Saldo Inicial
    elements.resetBalanceBtn.addEventListener('click', () => {
        let initialBalance = parseFloat(prompt('Ingresa el saldo inicial de tu cuenta:', cargarDatos().initialBalance));
        if (!isNaN(initialBalance)) {
            localStorage.setItem(BALANCE_KEY, initialBalance.toFixed(2));
            renderAllViews();
        } else {
            alert('Monto inválido.');
        }
    });
    
    // Botón Borrar Todo
    elements.clearAllBtn.addEventListener('click', () => {
        if (confirm('ADVERTENCIA: ¿Estás seguro de que quieres borrar TODOS los movimientos y el saldo inicial? Esta acción no se puede deshacer.')) {
            localStorage.removeItem(DB_KEY);
            localStorage.removeItem(BALANCE_KEY);
            alert('Todos los datos han sido borrados. La aplicación está lista para compartir.');
            renderAllViews();
        }
    });
    
    // Manejo de Vistas
    elements.listViewBtn.addEventListener('click', () => {
        elements.listView.classList.remove('hidden');
        elements.calendarView.classList.add('hidden');
        elements.listViewBtn.classList.add('active');
        elements.calendarViewBtn.classList.remove('active');
    });

    elements.calendarViewBtn.addEventListener('click', () => {
        elements.listView.classList.add('hidden');
        elements.calendarView.classList.remove('hidden');
        elements.listViewBtn.classList.remove('active');
        elements.calendarViewBtn.classList.add('active');
        renderizarCalendario(cargarDatos().movimientos); // Re-renderizar al cambiar
    });
    
    // Selector de Moneda
    elements.currencySelect.addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        localStorage.setItem('currency', currentCurrency);
        renderAllViews();
    });

    // --- Manejo del Mes de Ingreso ---
    
    const updateMonthDisplay = (date) => {
        currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        elements.displayMonth.textContent = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        
        // Configurar la fecha de ingreso por defecto al primer día del mes seleccionado
        elements.fechaInput.value = new Date(date.getFullYear(), date.getMonth(), new Date().getDate()).toISOString().split('T')[0];
        
        renderizarCalendario(cargarDatos().movimientos); // Actualizar calendario
    };

    elements.prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        updateMonthDisplay(currentMonth);
    });

    elements.nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        updateMonthDisplay(currentMonth);
    });

    // --- Funciones de Alerta y Voz ---

    const mostrarAlertaSaldoRojo = (fecha, monto) => {
        const montoCorregir = formatCurrency(Math.abs(monto) + 0.01);
        const fechaFormatted = formatDate(fecha);
        const mensaje = `El saldo se vuelve negativo (${formatCurrency(monto)}) el día **${fechaFormatted}**. Necesitas un ingreso de al menos **${montoCorregir}** antes de esa fecha.`;

        elements.modalMessage.innerHTML = mensaje;
        elements.modal.classList.add('visible');

        // Mensaje de voz
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`Alerta de saldo en rojo. El saldo se vuelve negativo el día ${fechaFormatted}. Se necesitan acciones urgentes.`);
            utterance.lang = 'es-ES';
            speechSynthesis.speak(utterance);
        }
    };
    
    elements.modalCloseBtn.onclick = () => {
        elements.modal.classList.remove('visible');
    };
    window.onclick = (event) => {
        if (event.target == elements.modal) {
            elements.modal.classList.remove('visible');
        }
    };

    // Lógica de Reconocimiento de Voz (Ajustada para mejor extracción de fecha)
    elements.vozBtn.addEventListener('click', function() {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Tu navegador no soporta el reconocimiento de voz. Usa Chrome o Edge sobre HTTPS.");
            return;
        }
        // Desactivar el botón mientras escucha
        elements.vozBtn.disabled = true;

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = function() {
            elements.vozBtn.textContent = '🗣️ Hablando...';
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            console.log('Transcripción: ', transcript);
            procesarComandoVoz(transcript);
        };

        recognition.onerror = function(event) {
            console.error('Error de reconocimiento de voz', event.error);
            alert(`Error: ${event.error === 'no-speech' ? 'No se detectó voz.' : 'Ocurrió un error.'}`);
            elements.vozBtn.textContent = '🎙️ Voz';
            elements.vozBtn.disabled = false;
        };

        recognition.onend = function() {
            elements.vozBtn.textContent = '🎙️ Voz';
            elements.vozBtn.disabled = false;
        };

        recognition.start();
    });

    function procesarComandoVoz(comando) {
        const comandoLower = comando.toLowerCase();

        // 1. Tipo y Categoría
        let tipo = comandoLower.includes('ingreso') ? 'ingreso' : (comandoLower.includes('gasto') ? 'gasto' : '');
        let categoria = ''; 
        if (tipo) {
            const currentCategories = categories[tipo].map(c => c.toLowerCase());
            for (const cat of currentCategories) {
                if (comandoLower.includes(cat.toLowerCase())) {
                    categoria = cat.charAt(0).toUpperCase() + cat.slice(1);
                    break;
                }
            }
            if (!categoria) categoria = 'Otros';
        }
        
        // 2. Monto (busca el número más cercano a una palabra clave)
        const montoMatch = comandoLower.match(/(\d+[\.,]?\d*)/);
        let monto = montoMatch ? parseFloat(montoMatch[1].replace(',', '.')) : NaN;

        // 3. Fecha (Mejora la extracción de fechas en español)
        let fechaISO = new Date().toISOString().split('T')[0]; // Fecha actual por defecto
        const fechaPattern = /(\d{1,2})\s*de\s*([a-záéíóúüñ]+)\s*de\s*(\d{4})|el\s*(\d{1,2})/;
        const fechaMatch = comandoLower.match(fechaPattern);

        if (fechaMatch) {
            let day, monthStr, year;
            
            if (fechaMatch[1]) { // Formato completo: '15 de noviembre de 2025'
                day = fechaMatch[1];
                monthStr = fechaMatch[2];
                year = fechaMatch[3];
                
                const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                const monthIndex = meses.findIndex(m => monthStr.startsWith(m));
                
                if (monthIndex !== -1) {
                    const monthPadded = (monthIndex + 1).toString().padStart(2, '0');
                    const dayPadded = day.padStart(2, '0');
                    fechaISO = `${year}-${monthPadded}-${dayPadded}`;
                }
            } else if (fechaMatch[4]) { // Formato día: 'el 15' (asume mes y año actual)
                day = fechaMatch[4];
                const today = new Date();
                const yearCurrent = today.getFullYear();
                const monthCurrent = today.getMonth() + 1;
                
                const monthPadded = monthCurrent.toString().padStart(2, '0');
                const dayPadded = day.padStart(2, '0');
                fechaISO = `${yearCurrent}-${monthPadded}-${dayPadded}`;
            }
        }
        
        // 4. Descripción (el resto del texto)
        let descripcion = comando;
        descripcion = descripcion.replace(/ingreso|gasto|(\d+[\.,]?\d*)/gi, '').trim(); 
        descripcion = descripcion.replace(/de|por|el|la|para|en/gi, '').trim();
        descripcion = descripcion.replace(categoria, '').trim(); // Eliminar categoría de la descripción

        if (tipo && !isNaN(monto) && monto > 0) {
            // Precargar el formulario
            elements.tipoSelect.value = tipo;
            populateCategories(tipo);
            elements.categoriaSelect.value = categoria;
            elements.descripcionInput.value = descripcion.substring(0, 20) || (tipo === 'ingreso' ? 'Ingreso Voz' : 'Gasto Voz');
            elements.montoInput.value = monto;
            elements.fechaInput.value = fechaISO;

            alert('✅ Datos precargados por voz. Revisa, ajusta si es necesario, y haz clic en "Agregar Movimiento" para guardar.');
        } else {
            alert('❌ No se pudo extraer el TIPO (ingreso/gasto) o el MONTO. Intenta decir: "Ingreso 1500 Sueldo el 15 de noviembre de 2025"');
        }
    }

    // --- Inicialización ---

    // 1. Cargar Moneda
    currentCurrency = localStorage.getItem('currency') || 'EUR';
    elements.currencySelect.value = currentCurrency;

    // 2. Configurar el Mes de Ingreso
    updateMonthDisplay(new Date());

    // 3. Configurar Categorías Iniciales
    populateCategories(elements.tipoSelect.value);

    // 4. Renderizar todo
    renderAllViews();
});