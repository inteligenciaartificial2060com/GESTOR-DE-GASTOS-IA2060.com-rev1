# 📘 MANUAL DE USUARIO: IA2060 - GESTIÓN FINANCIERA INTELIGENTE

**Versión:** 1.3
**Fecha:** 16 de noviembre de 2025

Este manual describe el uso de la aplicación IA2060, diseñada para gestionar sus movimientos financieros y predecir su saldo futuro.

---

### 1. Conceptos Clave del Resumen Financiero

| Indicador | Definición | Relevancia |
| :--- | :--- | :--- |
| **Saldo Proyectado** | Es el **balance final** si todas las transacciones (realizadas y **pendientes**) se cumplen. | Es tu principal indicador de flujo de caja futuro. |
| **Saldo Actual** | Es el dinero que tienes disponible **HOY**. Solo incluye el saldo inicial y los movimientos marcados como **Realizados**. | Determina tu liquidez actual. |

---

### 2. Registro de Movimientos

El orden de entrada es **idéntico y obligatorio** para el formulario manual y el comando de voz.

#### 2.1. Orden de Entrada de Datos (Estándar Único)

El orden de los campos principales es: **Tipo** $\rightarrow$ **Monto** $\rightarrow$ **Categoría** $\rightarrow$ **Descripción** $\rightarrow$ **Fecha**.

| Campo | Propósito |
| :--- | :--- |
| **Tipo** | Define si es `Ingreso` o `Gasto`. |
| **Monto** | Valor numérico de la transacción. |
| **Categoría** | Clasificación predefinida (Sueldo, Comida, etc.). |
| **Descripción** | Detalle de la transacción. |
| **Fecha** | Cuándo se espera que ocurra. |

#### 2.2. Entrada por Voz (Botón 🎙️ Voz)

1.  Haga clic en el botón **"🎙️ Voz"** (debe usar el navegador Chrome o Edge).
2.  Hable en español claro **siguiendo el orden estricto**.

> **Ejemplo de Comando de Voz:**
> * `"Ingreso 1250 sueldo el 1 de diciembre de 2025"`
> * `"Gasto 55 comida mañana"`

---

### 3. Alertas y Mensajes Automáticos

* **Felicitación:** Si el **Saldo Proyectado Final** es **mayor a 0**, el sistema anunciará por voz que llega satisfactoriamente a fin de mes e invitará a visitar `www.ia2060.com`.
* **Alerta de Saldo en Rojo:** Si su saldo proyectado cae a negativo en alguna fecha futura, el sistema mostrará una alerta modal y la anunciará por voz.

---