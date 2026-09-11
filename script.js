(function () {
    'use strict';

    var page = document.getElementById('page');
    if (!page) return;

    /* ================= DOM refs ================= */
    var appBody = document.body;
    var sidebar = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');

    var orderModalOverlay = document.getElementById('orderModalOverlay');
    var orderModalTitle = document.getElementById('orderModalTitle');
    var orderForm = document.getElementById('orderForm');
    var customerNameInput = document.getElementById('customerName');
    var orderDescriptionInput = document.getElementById('orderDescription');
    var orderAmountInput = document.getElementById('orderAmount');
    var dueDateInput = document.getElementById('dueDate');
    var orderStatusInput = document.getElementById('orderStatus');
    var paymentStatusInput = document.getElementById('paymentStatus');

    var customerModalOverlay = document.getElementById('customerModalOverlay');
    var customerModalTitle = document.getElementById('customerModalTitle');
    var customerForm = document.getElementById('customerForm');
    var customerNameField = document.getElementById('customerNameField');
    var customerEmail = document.getElementById('customerEmail');
    var customerPhone = document.getElementById('customerPhone');
    var customerNotes = document.getElementById('customerNotes');

    var confirmOverlay = document.getElementById('confirmOverlay');
    var confirmMessage = document.getElementById('confirmMessage');

    /* ================= Constants ================= */
    var STORE_ORDERS = 'orders';
    var STORE_CUSTOMERS = 'customers';
    var STORE_SETTINGS = 'settings';
    var SESSION_SIDEBAR = 'abstract.sidebarCollapsed';

    var statuses = ['New', 'Preparing', 'Ready', 'Delivered'];
    var routeTitles = { dashboard: 'Dashboard', orders: 'Orders', customers: 'Customers', reports: 'Reports', settings: 'Settings' };
    var WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var CURRENCIES = [
        { symbol: '\u20A6', label: 'Nigerian Naira (\u20A6)' },
        { symbol: '$', label: 'US Dollar ($)' },
        { symbol: '\u20AC', label: 'Euro (\u20AC)' },
        { symbol: '\u00A3', label: 'Pound Sterling (\u00A3)' },
        { symbol: '\u00A5', label: 'Yen (\u00A5)' }
    ];
    var defaultSettings = {
        businessName: 'Abstract',
        ownerName: '',
        email: '',
        currency: '\u20A6',
        defaultOrderStatus: 'New',
        defaultPaymentStatus: 'Unpaid',
        theme: 'light'
    };

    /* ================= State ================= */
    var state = {
        orders: [],
        customerRecords: [],
        settings: copySettings(defaultSettings),
        sidebarCollapsed: false,
        route: 'dashboard',
        editingOrderId: null,
        editingCustomerKey: null,
        prefillCustomer: '',
        ordersSearch: '',
        paymentFilter: 'all',
        statusFilter: 'all',
        customersSearch: '',
        reportPeriod: 'month',
        selectedCustomer: null,
        confirmAction: null,
        flashSaved: false
    };

    function copySettings(obj) {
        var out = {};
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) out[k] = obj[k];
        }
        return out;
    }

    /* ================= Storage ================= */
    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    function loadOrders() {
        state.orders = readJSON(STORE_ORDERS, []);
        if (!Array.isArray(state.orders)) state.orders = [];
    }
    function saveOrders() { writeJSON(STORE_ORDERS, state.orders); }
    function loadCustomerRecords() {
        state.customerRecords = readJSON(STORE_CUSTOMERS, []);
        if (!Array.isArray(state.customerRecords)) state.customerRecords = [];
    }
    function saveCustomerRecords() { writeJSON(STORE_CUSTOMERS, state.customerRecords); }
    function loadSettings() {
        var saved = readJSON(STORE_SETTINGS, {});
        var merged = copySettings(defaultSettings);
        for (var k in saved) {
            if (saved.hasOwnProperty(k) && merged.hasOwnProperty(k)) {
                merged[k] = saved[k];
            }
        }
        if (merged.theme !== 'dark') merged.theme = 'light';
        state.settings = merged;
    }
    function saveSettings() { writeJSON(STORE_SETTINGS, state.settings); }

    /* ================= Helpers ================= */
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function getTodayStr() { return ymd(new Date()); }

    function normalizeName(name) {
        return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function isOverdue(order) {
        if (order.orderStatus === 'Delivered' || !order.dueDate) return false;
        var due = new Date(order.dueDate + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return due.getTime() < today.getTime();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = String(str == null ? '' : str);
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatAmount(amount) {
        var num = Number(amount);
        if (!isFinite(num)) num = 0;
        var s = String(Math.round(num * 100) / 100);
        var parts = s.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return state.settings.currency + parts.join('.');
    }

    function formatLongDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr + 'T00:00:00');
        var now = new Date();
        var opts = { month: 'short', day: 'numeric' };
        if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
        return d.toLocaleDateString('en-US', opts);
    }

    function formatDueDate(dateStr) {
        if (!dateStr) return '';
        var due = new Date(dateStr + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var diffMs = due.getTime() - today.getTime();
        var diffDays = Math.round(diffMs / 86400000);

        if (diffDays < 0) {
            var absDiff = Math.abs(diffDays);
            return absDiff === 1 ? '1 day overdue' : absDiff + ' days overdue';
        }
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        if (diffDays <= 6) return 'Due ' + due.toLocaleDateString('en-US', { weekday: 'long' });
        return 'Due ' + due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getTintClass(order) {
        if (order.orderStatus === 'Delivered' || !order.dueDate) return '';
        var due = new Date(order.dueDate + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
        if (diffDays < 0) return 'tint-overdue';
        if (diffDays === 0) return 'tint-due-soon';
        return '';
    }

    function getStatusColor(value) {
        var colors = {
            'New': '#5B6B8C',
            'Preparing': '#C08A2E',
            'Ready': '#4E7C5C',
            'Delivered': '#7A8B7E',
            'Unpaid': '#B4472F',
            'Paid': '#3E6B4F'
        };
        return colors[value] || '#2A2A28';
    }

    function pct(v, total) {
        if (!total) return 0;
        return Math.round(v / total * 100);
    }

    function statusColorVar(status) { return '--' + status.toLowerCase(); }

    /* ================= Customers ================= */
    function ensureCustomerRecord(order) {
        var key = normalizeName(order.customer);
        if (!key) return;
        for (var i = 0; i < state.customerRecords.length; i++) {
            var recKey = state.customerRecords[i].key || normalizeName(state.customerRecords[i].name);
            if (recKey === key) {
                if (!state.customerRecords[i].name) state.customerRecords[i].name = String(order.customer).trim();
                if (!state.customerRecords[i].key) state.customerRecords[i].key = key;
                return;
            }
        }
        state.customerRecords.push({ key: key, name: String(order.customer).trim(), email: '', phone: '', notes: '' });
    }

    function allCustomers() {
        var map = {};
        for (var i = state.orders.length - 1; i >= 0; i--) {
            var o = state.orders[i];
            var key = normalizeName(o.customer);
            if (!key) continue;
            if (!map[key]) map[key] = { key: key, name: String(o.customer).trim(), email: '', phone: '', notes: '' };
        }
        for (var j = 0; j < state.customerRecords.length; j++) {
            var rec = state.customerRecords[j];
            var rKey = rec.key || normalizeName(rec.name);
            if (!rKey) continue;
            if (!map[rKey]) {
                map[rKey] = { key: rKey, name: rec.name || rec.key, email: rec.email || '', phone: rec.phone || '', notes: rec.notes || '' };
            } else {
                if (rec.email) map[rKey].email = rec.email;
                if (rec.phone) map[rKey].phone = rec.phone;
                if (rec.notes) map[rKey].notes = rec.notes;
                if (!map[rKey].name && rec.name) map[rKey].name = rec.name;
            }
        }
        var list = [];
        for (var k in map) {
            if (map.hasOwnProperty(k)) list.push(map[k]);
        }
        list.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        return list;
    }

    function customerOrders(key) {
        return state.orders.filter(function (o) {
            return normalizeName(o.customer) === key;
        }).sort(function (a, b) { return b.id - a.id; });
    }

    function customerStats(key) {
        var list = customerOrders(key);
        var stats = { count: list.length, total: 0, paid: 0, unpaid: 0, outstanding: 0, lastDate: '' };
        for (var i = 0; i < list.length; i++) {
            var a = Number(list[i].amount) || 0;
            stats.total += a;
            if (list[i].paymentStatus === 'Paid') {
                stats.paid += a;
            } else {
                stats.unpaid += a;
                stats.outstanding += a;
            }
        }
        if (list.length) stats.lastDate = list[0].dateReceived || '';
        return stats;
    }

    function findCustomerRecord(key) {
        for (var i = 0; i < state.customerRecords.length; i++) {
            if ((state.customerRecords[i].key || normalizeName(state.customerRecords[i].name)) === key) {
                return state.customerRecords[i];
            }
        }
        return null;
    }

    /* ================= Orders ================= */
    function nextOrderId() {
        return Date.now() * 100 + Math.floor(Math.random() * 100);
    }

    function getOrderById(id) {
        for (var i = 0; i < state.orders.length; i++) {
            if (state.orders[i].id === id) return state.orders[i];
        }
        return null;
    }

    function getFilteredOrders() {
        return state.orders.filter(function (o) {
            if (state.ordersSearch) {
                var q = state.ordersSearch.toLowerCase();
                if (String(o.customer || '').toLowerCase().indexOf(q) === -1 &&
                    String(o.description || '').toLowerCase().indexOf(q) === -1) {
                    return false;
                }
            }
            if (state.paymentFilter !== 'all' && o.paymentStatus !== state.paymentFilter) return false;
            if (state.statusFilter !== 'all' && o.orderStatus !== state.statusFilter) return false;
            return true;
        });
    }

    function markPaid(id) {
        var o = getOrderById(id);
        if (!o) return;
        o.paymentStatus = 'Paid';
        saveOrders();
        renderPage();
    }

    function deleteOrder(id) {
        state.orders = state.orders.filter(function (o) { return o.id !== id; });
        saveOrders();
        renderPage();
    }

    function deleteCustomer(key) {
        state.customerRecords = state.customerRecords.filter(function (c) {
            return (c.key || normalizeName(c.name)) !== key;
        });
        saveCustomerRecords();
        renderPage();
    }

    function clearAllData() {
        state.orders = [];
        state.customerRecords = [];
        state.selectedCustomer = null;
        saveOrders();
        saveCustomerRecords();
        renderPage();
    }

    /* ================= Modals ================= */
    function openOrderModal(id, prefillCustomer) {
        var order = id ? getOrderById(id) : null;
        state.editingOrderId = id;
        orderModalTitle.textContent = order ? 'Edit order' : 'Add order';
        customerNameInput.value = order ? order.customer : (prefillCustomer || '');
        orderDescriptionInput.value = order ? order.description : '';
        orderAmountInput.value = order ? order.amount : '';
        dueDateInput.value = order ? (order.dueDate || '') : '';
        orderStatusInput.value = order ? order.orderStatus : state.settings.defaultOrderStatus;
        paymentStatusInput.value = order ? order.paymentStatus : state.settings.defaultPaymentStatus;
        orderModalOverlay.classList.add('active');
        customerNameInput.focus();
    }

    function closeOrderModal() {
        orderModalOverlay.classList.remove('active');
    }

    function openCustomerModal(key) {
        var rec = key ? findCustomerRecord(key) : null;
        state.editingCustomerKey = key;
        customerModalTitle.textContent = rec ? 'Edit customer' : 'Add customer';
        customerNameField.value = rec ? rec.name : '';
        customerEmail.value = rec ? (rec.email || '') : '';
        customerPhone.value = rec ? (rec.phone || '') : '';
        customerNotes.value = rec ? (rec.notes || '') : '';
        customerModalOverlay.classList.add('active');
        customerNameField.focus();
    }

    function closeCustomerModal() {
        customerModalOverlay.classList.remove('active');
    }

    function askConfirm(message, fn) {
        confirmMessage.textContent = message;
        state.confirmAction = fn;
        confirmOverlay.classList.add('active');
    }

    function closeConfirm() {
        confirmOverlay.classList.remove('active');
    }

    orderForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var customer = customerNameInput.value.trim();
        var description = orderDescriptionInput.value.trim();
        var amount = parseFloat(orderAmountInput.value);
        if (!customer || !description || isNaN(amount)) return;

        var oStatus = orderStatusInput.value;
        var pStatus = paymentStatusInput.value;

        if (state.editingOrderId) {
            var order = getOrderById(state.editingOrderId);
            if (order) {
                order.customer = customer;
                order.description = description;
                order.amount = amount;
                order.dueDate = dueDateInput.value || '';
                order.orderStatus = oStatus;
                order.paymentStatus = pStatus;
                saveOrders();
            }
        } else {
            var newOrder = {
                id: nextOrderId(),
                customer: customer,
                description: description,
                amount: amount,
                orderStatus: oStatus,
                paymentStatus: pStatus,
                dateReceived: getTodayStr(),
                dueDate: dueDateInput.value || '',
                notes: '',
                createdAt: Date.now()
            };
            state.orders.push(newOrder);
            saveOrders();
            ensureCustomerRecord(newOrder);
            saveCustomerRecords();
        }

        orderForm.reset();
        closeOrderModal();
        renderPage();
    });

    customerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = customerNameField.value.trim();
        if (!name) return;
        var key = normalizeName(name);
        var email = customerEmail.value.trim();
        var phone = customerPhone.value.trim();
        var notes = customerNotes.value.trim();

        var rec = findCustomerRecord(key);
        if (rec) {
            rec.name = name;
            rec.email = email;
            rec.phone = phone;
            rec.notes = notes;
        } else {
            state.customerRecords.push({ key: key, name: name, email: email, phone: phone, notes: notes });
        }
        saveCustomerRecords();
        customerForm.reset();
        closeCustomerModal();
        renderPage();
    });

    /* ================= Sidebar ================= */
    function setSidebarCollapsed(collapsed) {
        state.sidebarCollapsed = collapsed;
        sidebar.classList.toggle('collapsed', collapsed);
        try {
            sessionStorage.setItem(SESSION_SIDEBAR, collapsed ? '1' : '0');
        } catch (e) {}
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    sidebarCollapseBtn.addEventListener('click', function () {
        setSidebarCollapsed(!state.sidebarCollapsed);
    });
    sidebarOverlay.addEventListener('click', closeSidebar);

    /* ================= Routing ================= */
    function getRoute() {
        var h = window.location.hash;
        if (/^#\/(dashboard|orders|customers|reports|settings)$/.test(h)) {
            return h.slice(2);
        }
        return 'dashboard';
    }

    function navigate() {
        state.route = getRoute();
        if (state.route !== 'customers') state.selectedCustomer = null;
        renderPage();
    }

    window.addEventListener('hashchange', navigate);

    function sidebarActive(route) {
        var links = sidebar.querySelectorAll('.sidebar-link');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('data-route') === route) {
                links[i].classList.add('active');
            } else {
                links[i].classList.remove('active');
            }
        }
    }

    /* ================= Theme ================= */
    function applyTheme() {
        appBody.classList.toggle('dark', state.settings.theme === 'dark');
    }

    /* ================= UI builders ================= */
    function headerHtml(title, subtitle, rightHtml) {
        var html = '<header class="main-header"><div class="header-left">' +
            '<button type="button" class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open menu" data-action="open-nav"><span></span><span></span><span></span></button>' +
            '<div><h1 class="header-title">' + title + '</h1><p class="header-subtitle">' + subtitle + '</p></div>' +
            '</div>';
        if (rightHtml) html += '<div class="header-right">' + rightHtml + '</div>';
        html += '</header>';
        return html;
    }

    function filterBtn(value, label, action) {
        return '<button type="button" class="filter-btn" data-action="' + action + '" data-value="' + value + '">' + label + '</button>';
    }

    function emptyState(title, desc, action, actionLabel) {
        var html = '<div class="orders-empty"><p class="orders-empty-title">' + title + '</p><p class="orders-empty-desc">' + desc + '</p>';
        if (action && actionLabel) html += '<button type="button" class="btn-primary" data-action="' + action + '">' + actionLabel + '</button>';
        html += '</div>';
        return html;
    }

    function emptyStateButtons(title, desc, buttons) {
        var html = '<div class="orders-empty"><p class="orders-empty-title">' + title + '</p><p class="orders-empty-desc">' + desc + '</p>';
        html += '<div class="empty-actions">';
        for (var i = 0; i < buttons.length; i++) {
            html += '<button type="button" class="' + buttons[i][2] + '" data-action="' + buttons[i][0] + '">' + buttons[i][1] + '</button>';
        }
        html += '</div></div>';
        return html;
    }

    function summaryCard(label, badgeText, badgeClass, number) {
        return '<div class="summary-card"><div class="summary-card-header"><span class="summary-card-label">' + label + '</span>' +
            '<span class="summary-card-badge ' + badgeClass + '">' + badgeText + '</span></div>' +
            '<div class="summary-card-number">' + number + '</div></div>';
    }

    function statusBarRow(label, count, total, colorVar) {
        return '<div class="bar-row"><div class="bar-row-top"><span class="bar-label">' + label + '</span><span class="bar-count">' + count + '</span></div>' +
            '<div class="bar-track"><div class="bar-fill" style="width:' + pct(count, total) + '%;background-color:var(' + colorVar + ')"></div></div></div>';
    }

    /* ================= Order card ================= */
    function statusSelectOptions(id, field, value, options) {
        var html = '';
        for (var i = 0; i < options.length; i++) {
            var v = options[i];
            html += '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + v + '</option>';
        }
        return '<select class="status-select" data-id="' + id + '" data-field="' + field + '">' + html + '</select>';
    }

    function renderOrderCard(order) {
        var tintClass = getTintClass(order);
        var formattedAmount = formatAmount(order.amount);
        return '<div class="order-card ' + tintClass + '" data-id="' + order.id + '">' +
            '<div class="order-header">' +
                '<span class="order-customer">' + escapeHtml(order.customer) + '</span>' +
                '<span class="order-amount">' + formattedAmount + '</span>' +
            '</div>' +
            '<div class="order-description">' + escapeHtml(order.description) + '</div>' +
            '<div class="order-statuses">' +
                statusSelectOptions(order.id, 'orderStatus', order.orderStatus, statuses) +
                statusSelectOptions(order.id, 'paymentStatus', order.paymentStatus, ['Unpaid', 'Paid']) +
            '</div>' +
            '<div class="order-footer">' +
                '<span class="order-due">' + formatDueDate(order.dueDate) + '</span>' +
                '<div class="order-card-actions">' +
                    '<button type="button" class="order-edit" data-action="edit-order" data-id="' + order.id + '">Edit</button>' +
                    '<button type="button" class="order-delete" data-action="delete-order" data-id="' + order.id + '">Delete</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function colorizeSelects(container) {
        if (!container) return;
        var selects = container.querySelectorAll('.status-select');
        for (var i = 0; i < selects.length; i++) {
            selects[i].style.color = getStatusColor(selects[i].value);
        }
    }

    /* ================= Dashboard ================= */
    function renderDashboard() {
        var html = headerHtml('Dashboard', 'What is happening with your business right now.',
            '<button type="button" class="btn-primary add-order-btn" data-action="open-add-order">+ Add order</button>');

        if (!state.orders.length) {
            html += emptyState('No orders yet', 'Add your first order to start tracking your business.', 'open-add-order', '+ Add order');
            return html;
        }

        var todayStr = getTodayStr();
        var todayCount = 0, unpaidCount = 0, overdueCount = 0, paidCount = 0, paidAmount = 0, unpaidAmount = 0;
        var byStatus = {};
        for (var i = 0; i < statuses.length; i++) byStatus[statuses[i]] = 0;

        for (var j = 0; j < state.orders.length; j++) {
            var o = state.orders[j];
            var a = Number(o.amount) || 0;
            if (o.paymentStatus === 'Unpaid') { unpaidCount++; unpaidAmount += a; } else { paidCount++; paidAmount += a; }
            if (o.dateReceived === todayStr) todayCount++;
            if (isOverdue(o)) overdueCount++;
            if (byStatus.hasOwnProperty(o.orderStatus)) byStatus[o.orderStatus]++;
        }

        var recent = state.orders.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 5);

        html += '<div class="summary-strip">';
        html += summaryCard('Orders today', 'Today', 'today', todayCount);
        html += summaryCard('Unpaid orders', 'Attention', 'unpaid', unpaidCount);
        html += summaryCard('Overdue orders', 'Attention', 'overdue', overdueCount);
        html += '</div>';

        html += '<div class="dashboard-grid">';

        html += '<div class="panel"><div class="panel-header"><h2 class="section-title">Recent orders</h2><a class="filter-btn" href="#/orders">View all</a></div><div class="recent-list">';
        for (var r = 0; r < recent.length; r++) {
            var ro = recent[r];
            html += '<div class="recent-order">' +
                '<div class="recent-main"><span class="recent-customer">' + escapeHtml(ro.customer) + '</span><span class="recent-desc">' + escapeHtml(ro.description) + '</span></div>' +
                '<div class="recent-meta">' +
                    '<span class="order-badge badge-' + ro.orderStatus.toLowerCase() + '">' + ro.orderStatus + '</span>' +
                    '<span class="order-badge badge-' + ro.paymentStatus.toLowerCase() + '">' + ro.paymentStatus + '</span>' +
                '</div>' +
                '<span class="recent-amount">' + formatAmount(ro.amount) + '</span>' +
                (ro.paymentStatus === 'Unpaid'
                    ? '<button type="button" class="btn-mini" data-action="quick-pay" data-id="' + ro.id + '">Mark paid</button>'
                    : '<span class="recent-paid">Paid</span>') +
            '</div>';
        }
        html += '</div></div>';

        html += '<div class="panel"><h2 class="section-title">Order status</h2><div class="status-bars">';
        for (var s = 0; s < statuses.length; s++) {
            var st = statuses[s];
            html += statusBarRow(st, byStatus[st] || 0, state.orders.length, statusColorVar(st));
        }
        html += '</div>';
        var totalAmount = paidAmount + unpaidAmount;
        html += '<div class="pay-split">';
        html += '<div class="pay-row"><span class="bar-label">Paid</span><span class="pay-amount" style="color:var(--paid)">' + paidCount + ' \u00B7 ' + formatAmount(paidAmount) + '</span></div>';
        html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct(paidAmount, totalAmount) + '%;background-color:var(--paid)"></div></div>';
        html += '<div class="pay-row" style="margin-top:10px"><span class="bar-label">Unpaid</span><span class="pay-amount" style="color:var(--unpaid)">' + unpaidCount + ' \u00B7 ' + formatAmount(unpaidAmount) + '</span></div>';
        html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct(unpaidAmount, totalAmount) + '%;background-color:var(--unpaid)"></div></div>';
        html += '</div></div>';

        html += '</div>';
        return html;
    }

    /* ================= Orders page ================= */
    function renderOrdersPage() {
        var html = headerHtml('Orders', 'Manage every order, from new to delivered.',
            '<button type="button" class="btn-primary add-order-btn" data-action="open-add-order">+ Add order</button>');
        html += '<div class="orders-toolbar">';
        html += '<input type="text" id="ordersSearch" class="search-input orders-search" placeholder="Search by customer or item..." autocomplete="off">';
        html += '<div class="filter-row" id="paymentFilters">';
        html += filterBtn('all', 'All', 'set-payment-filter');
        html += filterBtn('Unpaid', 'Unpaid', 'set-payment-filter');
        html += filterBtn('Paid', 'Paid', 'set-payment-filter');
        html += '</div>';
        html += '<div class="filter-row" id="statusFilters">';
        html += filterBtn('all', 'All statuses', 'set-status-filter');
        for (var i = 0; i < statuses.length; i++) html += filterBtn(statuses[i], statuses[i], 'set-status-filter');
        html += '</div>';
        html += '</div>';
        html += '<div id="ordersResults">' + buildOrdersResults() + '</div>';
        return html;
    }

    function buildOrdersResults() {
        if (!state.orders.length) {
            return emptyState('No orders yet', 'Add your first order to start tracking your business.', 'open-add-order', '+ Add order');
        }
        var filtered = getFilteredOrders();
        var html = '';
        if (!filtered.length) {
            html += emptyState('No orders match', 'Try a different search or filter.', '', '');
        } else {
            html += '<div class="orders-meta">' + filtered.length + ' of ' + state.orders.length + ' order' + (state.orders.length === 1 ? '' : 's') + '</div>';
            html += '<div class="order-board">';
            for (var s = 0; s < statuses.length; s++) {
                var status = statuses[s];
                var colOrders = filtered.filter(function (o) { return o.orderStatus === status; })
                    .sort(function (a, b) { return b.id - a.id; });
                html += '<div class="board-column" data-status="' + status + '">' +
                    '<div class="column-header section-' + status.toLowerCase() + '">' +
                        '<span class="column-title">' + status + '</span>' +
                        '<span class="column-count">(' + colOrders.length + ')</span>' +
                    '</div><div class="column-body">';
                if (!colOrders.length) {
                    html += '<div class="column-empty">Nothing here right now.</div>';
                } else {
                    for (var i = 0; i < colOrders.length; i++) html += renderOrderCard(colOrders[i]);
                }
                html += '</div></div>';
            }
            html += '</div>';
        }
        return html;
    }

    function renderOrdersResults() {
        var c = document.getElementById('ordersResults');
        if (!c) return;
        c.innerHTML = buildOrdersResults();
        colorizeSelects(c);
    }

    function setPaymentFilter(value) {
        state.paymentFilter = value;
        setActiveFilter(document.getElementById('paymentFilters'), value);
        renderOrdersResults();
    }

    function setStatusFilter(value) {
        state.statusFilter = value;
        setActiveFilter(document.getElementById('statusFilters'), value);
        renderOrdersResults();
    }

    /* ================= Customers page ================= */
    function renderCustomersPage() {
        var html = headerHtml('Customers', 'Every customer behind your orders.',
            '<button type="button" class="btn-primary add-order-btn" data-action="open-add-customer">+ Add customer</button>');
        html += '<div class="customers-toolbar">';
        html += '<input type="text" id="customersSearch" class="search-input customers-search" placeholder="Search customers..." autocomplete="off">';
        html += '</div>';
        html += '<div id="customersResults">' + (state.selectedCustomer ? customerDetail(state.selectedCustomer) : buildCustomersList()) + '</div>';
        return html;
    }

    function buildCustomersList() {
        var list = allCustomers();
        var q = state.customersSearch.trim().toLowerCase();
        var filtered = list;
        if (q) filtered = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1; });

        if (!filtered.length) {
            if (!state.orders.length && !state.customerRecords.length) {
                return emptyStateButtons('No customers yet', 'Customers will appear here when you add orders.',
                    [['open-add-order', '+ Add an order', 'btn-primary'], ['open-add-customer', '+ Add customer', 'filter-btn add-customer-btn']]);
            }
            return emptyState('No customers match', 'Try a different search.', '', '');
        }

        var html = '<div class="customer-list">';
        html += '<div class="customer-list-head"><span>Customer</span><span>Orders</span><span>Total</span><span>Outstanding</span><span>Last order</span><span></span></div>';
        for (var i = 0; i < filtered.length; i++) {
            var c = filtered[i];
            var st = customerStats(c.key);
            var last = st.lastDate ? formatLongDate(st.lastDate) : '\u2014';
            html += '<div class="customer-row" data-action="open-customer" data-key="' + escapeHtml(c.key) + '" tabindex="0" role="button" aria-label="View ' + escapeHtml(c.name) + '">' +
                '<span class="cust-name">' + escapeHtml(c.name) + '</span>' +
                '<span class="cust-cell cust-orders">' + st.count + '</span>' +
                '<span class="cust-cell cust-total">' + formatAmount(st.total) + '</span>' +
                '<span class="cust-cell cust-outstanding">' + formatAmount(st.outstanding) + '</span>' +
                '<span class="cust-cell cust-last">' + last + '</span>' +
                '<span class="cust-chevron">\u203A</span>' +
            '</div>';
        }
        html += '<div class="orders-meta results-meta">' + filtered.length + ' customer' + (filtered.length === 1 ? '' : 's') + '</div>';
        html += '</div>';
        return html;
    }

    function customerDetail(key) {
        var list = allCustomers();
        var rec = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].key === key) rec = list[i];
        }
        if (!rec) return buildCustomersList();

        var st = customerStats(key);
        var orders = customerOrders(key);

        var html = '<button type="button" class="back-btn" data-action="back-customers">\u2039 All customers</button>';

        html += '<div class="customer-detail-header">';
        html += '<div>';
        html += '<h2 class="customer-name">' + escapeHtml(rec.name) + '</h2>';
        var contactHtml = '';
        if (rec.email || rec.phone || rec.notes) {
            contactHtml = '<div class="customer-contact">';
            if (rec.email) contactHtml += '<span>Email: ' + escapeHtml(rec.email) + '</span>';
            if (rec.phone) contactHtml += '<span>Phone: ' + escapeHtml(rec.phone) + '</span>';
            if (rec.notes) contactHtml += '<span class="customer-note">' + escapeHtml(rec.notes) + '</span>';
            contactHtml += '</div>';
        }
        html += contactHtml;
        html += '</div>';
        html += '<div class="customer-detail-actions">';
        html += '<button type="button" class="filter-btn" data-action="edit-customer" data-key="' + escapeHtml(key) + '">Edit profile</button>';
        html += '<button type="button" class="order-delete" data-action="delete-customer" data-key="' + escapeHtml(key) + '">Delete profile</button>';
        html += '</div>';
        html += '</div>';

        html += '<div class="summary-strip summary-customer">';
        html += '<div class="summary-card"><div class="summary-card-header"><span class="summary-card-label">Orders</span></div><div class="summary-card-number">' + st.count + '</div></div>';
        html += '<div class="summary-card"><div class="summary-card-header"><span class="summary-card-label">Total spent</span></div><div class="summary-card-number">' + formatAmount(st.total) + '</div></div>';
        html += '<div class="summary-card"><div class="summary-card-header"><span class="summary-card-label">Paid</span></div><div class="summary-card-number" style="color:var(--paid)">' + formatAmount(st.paid) + '</div></div>';
        html += '<div class="summary-card"><div class="summary-card-header"><span class="summary-card-label">Outstanding</span></div><div class="summary-card-number" style="color:var(--unpaid)">' + formatAmount(st.outstanding) + '</div></div>';
        html += '</div>';

        html += '<div class="panel">';
        html += '<div class="panel-header"><h2 class="section-title">Order history</h2>' +
            '<button type="button" class="btn-primary add-order-btn" data-action="open-add-order" data-customer="' + escapeHtml(rec.name) + '">+ Add order</button></div>';
        if (orders.length) {
            html += '<div class="customer-orders">';
            for (var i = 0; i < orders.length; i++) {
                var o = orders[i];
                html += '<div class="order-row">' +
                    '<div class="order-row-main">' +
                        '<span class="recent-customer">' + escapeHtml(o.description) + '</span>' +
                        '<span class="order-due">' + (o.dateReceived ? 'Received ' + formatLongDate(o.dateReceived) : '') + '</span>' +
                    '</div>' +
                    '<span class="order-badge badge-' + o.orderStatus.toLowerCase() + '">' + o.orderStatus + '</span>' +
                    '<span class="order-badge badge-' + o.paymentStatus.toLowerCase() + '">' + o.paymentStatus + '</span>' +
                    '<span class="order-row-amount">' + formatAmount(o.amount) + '</span>' +
                    '<div class="order-row-actions">' +
                        (o.paymentStatus === 'Unpaid'
                            ? '<button type="button" class="btn-mini" data-action="quick-pay" data-id="' + o.id + '">Mark paid</button>'
                            : '') +
                        '<button type="button" class="order-edit" data-action="edit-order" data-id="' + o.id + '">Edit</button>' +
                        '<button type="button" class="order-delete" data-action="delete-order" data-id="' + o.id + '">Delete</button>' +
                    '</div>' +
                '</div>';
            }
            html += '</div>';
        } else {
            html += '<p class="orders-empty-desc">No orders for this customer yet. Add their first order above.</p>';
        }
        html += '</div>';

        return html;
    }

    function renderCustomersResults() {
        var c = document.getElementById('customersResults');
        if (!c) return;
        c.innerHTML = state.selectedCustomer ? customerDetail(state.selectedCustomer) : buildCustomersList();
    }

    /* ================= Reports page ================= */
    function renderReportsPage() {
        var html = headerHtml('Reports', 'Understand your sales and orders.', '');
        html += '<div class="filter-row report-controls" id="reportPeriodFilters">';
        html += filterBtn('today', 'Today', 'set-period');
        html += filterBtn('week', 'This week', 'set-period');
        html += filterBtn('month', 'This month', 'set-period');
        html += filterBtn('year', 'This year', 'set-period');
        html += '</div>';
        html += '<div id="reportsContent">' + buildReportsContent() + '</div>';
        return html;
    }

    function periodNoun(p) {
        if (p === 'today') return 'today';
        if (p === 'week') return 'this week';
        if (p === 'month') return 'this month';
        return 'this year';
    }

    function getPeriodRange(period) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var start;
        if (period === 'today') {
            start = today;
        } else if (period === 'week') {
            var day = today.getDay();
            var diffToMon = (day === 0 ? 6 : day - 1);
            start = new Date(today);
            start.setDate(today.getDate() - diffToMon);
        } else if (period === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            start = new Date(today.getFullYear(), 0, 1);
        }
        return { start: start, end: today };
    }

    function periodLabel(period) {
        var r = getPeriodRange(period);
        var start = r.start, end = r.end;
        if (period === 'today') return 'Today \u00B7 ' + formatLongDate(ymd(end));
        if (period === 'week') return 'This week \u00B7 ' + formatLongDate(ymd(start)) + ' \u2013 ' + formatLongDate(ymd(end));
        if (period === 'month') return 'This month \u00B7 ' + start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return 'This year \u00B7 ' + start.getFullYear();
    }

    function computeStats(list) {
        var t = { total: 0, paidAmount: 0, unpaidAmount: 0, count: list.length, completed: 0, pending: 0 };
        for (var i = 0; i < list.length; i++) {
            var o = list[i];
            var a = Number(o.amount) || 0;
            t.total += a;
            if (o.paymentStatus === 'Paid') t.paidAmount += a; else t.unpaidAmount += a;
            if (o.orderStatus === 'Delivered') t.completed++; else t.pending++;
        }
        return t;
    }

    function buildReportsContent() {
        if (!state.orders.length) {
            return emptyState('Not enough data yet', 'Add some orders to start seeing your business reports.', 'open-add-order', '+ Add order');
        }
        var range = getPeriodRange(state.reportPeriod);
        var startStr = ymd(range.start), endStr = ymd(range.end);
        var periodOrders = state.orders.filter(function (o) {
            return o.dateReceived >= startStr && o.dateReceived <= endStr;
        });
        if (!periodOrders.length) {
            return emptyState('No orders ' + periodNoun(state.reportPeriod), 'Add an order in this period, or pick another one.', 'open-add-order', '+ Add order');
        }
        var stats = computeStats(periodOrders);
        var totalAll = stats.paidAmount + stats.unpaidAmount;

        var html = '<div class="report-period-label">' + periodLabel(state.reportPeriod) + '</div>';

        html += '<div class="metrics-grid">';
        html += metricCard('Total sales', formatAmount(stats.total), 'primary');
        html += metricCard('Paid amount', formatAmount(stats.paidAmount), 'paid');
        html += metricCard('Unpaid amount', formatAmount(stats.unpaidAmount), 'unpaid');
        html += metricCard('Number of orders', stats.count, '');
        html += metricCard('Completed orders', stats.completed, '');
        html += metricCard('Pending orders', stats.pending, 'muted');
        html += '</div>';

        html += '<div class="report-grid">';
        html += '<div class="panel"><div class="panel-header"><h2 class="section-title">Sales</h2></div>' + chartHtml(state.reportPeriod, periodOrders) + '</div>';
        html += '<div class="panel"><div class="panel-header"><h2 class="section-title">Orders by status</h2></div><div class="status-bars">';
        for (var s = 0; s < statuses.length; s++) {
            var stName = statuses[s];
            var stCount = periodOrders.filter(function (o) { return o.orderStatus === stName; }).length;
            html += statusBarRow(stName, stCount, periodOrders.length, statusColorVar(stName));
        }
        html += '</div></div>';
        html += '</div>';

        html += '<div class="panel payment-panel"><div class="panel-header"><h2 class="section-title">Payments</h2></div>';
        html += '<div class="split-bars">';
        html += '<div class="split-bar-seg" style="width:' + (stats.paidAmount ? pct(stats.paidAmount, totalAll) : 0) + '%;background-color:var(--paid)"></div>';
        html += '<div class="split-bar-seg" style="width:' + (stats.unpaidAmount ? pct(stats.unpaidAmount, totalAll) : 0) + '%;background-color:var(--unpaid)"></div>';
        html += '</div>';
        html += '<div class="split-legend">';
        html += '<span class="split-item"><span class="split-dot" style="background-color:var(--paid)"></span>Paid ' + formatAmount(stats.paidAmount) + '</span>';
        html += '<span class="split-item"><span class="split-dot" style="background-color:var(--unpaid)"></span>Unpaid ' + formatAmount(stats.unpaidAmount) + '</span>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    function metricCard(label, value, tone) {
        return '<div class="metric-card"><div class="metric-label">' + label + '</div><div class="metric-value metric-' + tone + '">' + value + '</div></div>';
    }

    function hourLabel(h) {
        if (h === 0) return '12a';
        if (h < 12) return h + 'a';
        if (h === 12) return '12p';
        return (h - 12) + 'p';
    }

    function getChartBuckets(period) {
        var buckets = [];
        var i;
        var today = new Date();
        if (period === 'today') {
            for (i = 0; i < 24; i++) buckets.push({ key: i, label: hourLabel(i), total: 0 });
        } else if (period === 'week') {
            var day = today.getDay();
            var diff = (day === 0 ? 6 : day - 1);
            var mon = new Date(today);
            mon.setDate(today.getDate() - diff);
            for (i = 0; i < 7; i++) {
                var d = new Date(mon);
                d.setDate(mon.getDate() + i);
                buckets.push({ key: ymd(d), label: WEEKDAYS[i], total: 0 });
            }
        } else if (period === 'month') {
            var dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            for (i = 1; i <= dim; i++) buckets.push({ key: i, label: String(i), total: 0 });
        } else {
            for (i = 0; i < 12; i++) buckets.push({ key: i, label: MONTHS[i], total: 0 });
        }
        return buckets;
    }

    function chartHtml(period, orders) {
        var buckets = getChartBuckets(period);
        var byKey = {};
        for (var b = 0; b < buckets.length; b++) byKey[buckets[b].key] = buckets[b];

        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            var a = Number(o.amount) || 0;
            var bucket;
            if (period === 'today') {
                var hh = 0;
                if (o.createdAt) hh = new Date(o.createdAt).getHours();
                if (hh < 0 || hh > 23) hh = 0;
                bucket = byKey[hh];
            } else if (period === 'week') {
                bucket = byKey[o.dateReceived];
            } else if (period === 'month') {
                var dom = parseInt(o.dateReceived.slice(8, 10), 10);
                bucket = byKey[dom];
            } else {
                var mi = new Date(o.dateReceived + 'T00:00:00').getMonth();
                bucket = byKey[mi];
            }
            if (bucket) bucket.total += a;
        }

        var max = 0;
        for (var j = 0; j < buckets.length; j++) if (buckets[j].total > max) max = buckets[j].total;
        if (!max) max = 1;

        var html = '<div class="chart-wrap"><div class="chart">';
        for (var k = 0; k < buckets.length; k++) {
            var bk = buckets[k];
            var h = bk.total > 0 ? Math.max(4, Math.round(bk.total / max * 100)) : 2;
            html += '<div class="chart-col" title="' + escapeHtml(bk.label) + ': ' + formatAmount(bk.total) + '">' +
                '<div class="chart-bar" style="height:' + h + '%"></div>' +
                '<span class="chart-label">' + bk.label + '</span>' +
            '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function setReportPeriod(value) {
        state.reportPeriod = value;
        setActiveFilter(document.getElementById('reportPeriodFilters'), value);
        var c = document.getElementById('reportsContent');
        if (c) c.innerHTML = buildReportsContent();
    }

    /* ================= Settings page ================= */
    function settingsInput(id, label, value, type) {
        return '<div class="settings-field"><label class="settings-label" for="' + id + '">' + label + '</label>' +
            '<input type="' + (type || 'text') + '" id="' + id + '" class="form-input" value="' + escapeHtml(value) + '"></div>';
    }

    function markSelected(options, value) {
        var esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var re = new RegExp('value="' + esc + '"');
        if (re.test(options)) return options.replace(re, 'value="' + esc + '" selected');
        return options;
    }

    function settingsSelect(id, label, options, value) {
        return '<div class="settings-field"><label class="settings-label" for="' + id + '">' + label + '</label>' +
            '<select id="' + id + '" class="form-input">' + markSelected(options, value) + '</select></div>';
    }

    function currencyOptions() {
        var h = '';
        for (var i = 0; i < CURRENCIES.length; i++) {
            h += '<option value="' + CURRENCIES[i].symbol + '">' + CURRENCIES[i].label + '</option>';
        }
        return h;
    }

    function statusOptions() {
        var h = '';
        for (var i = 0; i < statuses.length; i++) h += '<option value="' + statuses[i] + '">' + statuses[i] + '</option>';
        return h;
    }

    function paymentOptions() {
        return '<option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>';
    }

    function renderSettingsPage() {
        var s = state.settings;
        var html = headerHtml('Settings', 'Keep your business details and preferences.', '');

        html += '<form id="settingsForm" class="settings-form">';

        html += '<div class="settings-section"><div class="settings-section-title">Profile</div><div class="settings-fields">';
        html += settingsInput('setBusinessName', 'Business name', s.businessName, 'text');
        html += settingsInput('setOwnerName', 'Owner name', s.ownerName, 'text');
        html += settingsInput('setEmail', 'Email / contact', s.email, 'email');
        html += '</div></div>';

        html += '<div class="settings-section"><div class="settings-section-title">Business settings</div><div class="settings-fields">';
        html += settingsSelect('setCurrency', 'Currency', currencyOptions(), s.currency);
        html += '<p class="settings-hint">Used for order amounts, dashboards and reports.</p>';
        html += '</div></div>';

        html += '<div class="settings-section"><div class="settings-section-title">Order settings</div><div class="settings-fields">';
        html += settingsSelect('setDefaultStatus', 'Default order status', statusOptions(), s.defaultOrderStatus);
        html += settingsSelect('setDefaultPayment', 'Default payment status', paymentOptions(), s.defaultPaymentStatus);
        html += '<p class="settings-hint">Applied to every new order you create.</p>';
        html += '</div></div>';

        html += '<div class="settings-section"><div class="settings-section-title">Appearance</div><div class="settings-fields">';
        html += settingsSelect('themeSelect', 'Theme', '<option value="light">Light</option><option value="dark">Dark</option>', s.theme);
        html += '<p class="settings-hint">Applied instantly across the whole app.</p>';
        html += '</div></div>';

        html += '<div class="settings-footer"><button type="submit" class="btn-primary">Save settings</button>' +
            '<span class="settings-saved" id="settingsSaved" style="display:none">Saved</span></div>';

        html += '</form>';

        html += '<div class="settings-section"><div class="settings-section-title">Data</div><div class="settings-fields">';
        html += '<div class="settings-actions">';
        html += '<button type="button" class="filter-btn" data-action="export-data">Export data</button>';
        html += '<button type="button" class="btn-danger-outline" data-action="clear-data">Clear all data</button>';
        html += '</div>';
        html += '<p class="settings-hint">Export downloads a JSON backup of your orders and customers. Clearing removes everything from this device.</p>';
        html += '</div></div>';

        return html;
    }

    function saveSettingsForm() {
        var el = function (id) { return document.getElementById(id); };
        state.settings.businessName = (el('setBusinessName').value.trim()) || 'Abstract';
        state.settings.ownerName = el('setOwnerName').value.trim();
        state.settings.email = el('setEmail').value.trim();
        state.settings.currency = el('setCurrency').value;
        state.settings.defaultOrderStatus = el('setDefaultStatus').value;
        state.settings.defaultPaymentStatus = el('setDefaultPayment').value;
        var themeEl = el('themeSelect');
        if (themeEl) state.settings.theme = themeEl.value;
        saveSettings();
        applyTheme();
        state.flashSaved = true;
        renderPage();
    }

    function exportData() {
        var payload = {
            app: 'Abstract',
            version: 1,
            exportedAt: new Date().toISOString(),
            orders: state.orders,
            customers: state.customerRecords,
            settings: state.settings
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'abstract-export-' + getTodayStr() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ================= Render dispatch ================= */
    function renderPage() {
        var route = state.route;
        sidebarActive(route);
        document.title = (routeTitles[route] || 'Dashboard') + ' \u00B7 Abstract';

        var html = '';
        if (route === 'dashboard') html = renderDashboard();
        else if (route === 'orders') html = renderOrdersPage();
        else if (route === 'customers') html = renderCustomersPage();
        else if (route === 'reports') html = renderReportsPage();
        else if (route === 'settings') html = renderSettingsPage();

        page.innerHTML = html;
        afterRender(route);
    }

    function setActiveFilter(container, value) {
        if (!container) return;
        var btns = container.querySelectorAll('.filter-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-value') === value) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
    }

    function afterRender(route) {
        if (route === 'orders') {
            var sEl = document.getElementById('ordersSearch');
            if (sEl) sEl.value = state.ordersSearch;
            setActiveFilter(document.getElementById('paymentFilters'), state.paymentFilter);
            setActiveFilter(document.getElementById('statusFilters'), state.statusFilter);
            colorizeSelects(document.getElementById('ordersResults'));
        }
        if (route === 'customers') {
            var cEl = document.getElementById('customersSearch');
            if (cEl) cEl.value = state.customersSearch;
        }
        if (route === 'reports') {
            setActiveFilter(document.getElementById('reportPeriodFilters'), state.reportPeriod);
        }
        if (route === 'settings') {
            var tEl = document.getElementById('themeSelect');
            if (tEl) tEl.value = state.settings.theme;
            if (state.flashSaved) {
                var savedEl = document.getElementById('settingsSaved');
                if (savedEl) {
                    savedEl.style.display = 'inline';
                    setTimeout(function () { savedEl.style.display = 'none'; }, 2000);
                }
                state.flashSaved = false;
            }
        }
    }

    /* ================= Actions (event delegation) ================= */
    function handleAction(action, el) {
        var id, key;
        switch (action) {
            case 'open-add-order':
                openOrderModal(null, el.getAttribute('data-customer') || '');
                break;
            case 'open-add-customer':
                openCustomerModal(null);
                break;
            case 'edit-order':
                id = parseInt(el.getAttribute('data-id'), 10);
                if (!isNaN(id)) openOrderModal(id);
                break;
            case 'delete-order':
                id = parseInt(el.getAttribute('data-id'), 10);
                if (!isNaN(id)) {
                    askConfirm('Delete this order? It will also be removed from your dashboard, reports and customer history.', function () {
                        deleteOrder(id);
                    });
                }
                break;
            case 'quick-pay':
                id = parseInt(el.getAttribute('data-id'), 10);
                if (!isNaN(id)) markPaid(id);
                break;
            case 'set-payment-filter':
                setPaymentFilter(el.getAttribute('data-value'));
                break;
            case 'set-status-filter':
                setStatusFilter(el.getAttribute('data-value'));
                break;
            case 'open-customer':
                state.selectedCustomer = el.getAttribute('data-key');
                renderPage();
                break;
            case 'back-customers':
                state.selectedCustomer = null;
                renderPage();
                break;
            case 'edit-customer':
                openCustomerModal(el.getAttribute('data-key'));
                break;
            case 'delete-customer':
                key = el.getAttribute('data-key');
                askConfirm('Delete this customer profile? Their orders will stay, but contact details and notes will be removed.', function () {
                    deleteCustomer(key);
                });
                break;
            case 'set-period':
                setReportPeriod(el.getAttribute('data-value'));
                break;
            case 'export-data':
                exportData();
                break;
            case 'clear-data':
                askConfirm('This will permanently delete all orders, customers and report data on this device. Your settings will stay. Are you sure?', clearAllData);
                break;
            case 'confirm-yes':
                var fn = state.confirmAction;
                state.confirmAction = null;
                closeConfirm();
                if (fn) fn();
                break;
            case 'confirm-no':
                state.confirmAction = null;
                closeConfirm();
                break;
            case 'close-order-modal':
                closeOrderModal();
                break;
            case 'close-customer-modal':
                closeCustomerModal();
                break;
            case 'open-nav':
                openSidebar();
                break;
        }
    }

    document.addEventListener('click', function (e) {
        var target = e.target;

        if (target.closest && target.closest('.sidebar-link') && window.innerWidth <= 768) {
            closeSidebar();
        }

        var el = target.closest ? target.closest('[data-action]') : null;
        if (!el) return;
        var action = el.getAttribute('data-action');
        if (!action) return;
        e.preventDefault();
        handleAction(action, el);
    });

    document.addEventListener('change', function (e) {
        var t = e.target;
        if (t.classList && t.classList.contains('status-select')) {
            var field = t.getAttribute('data-field');
            var id = parseInt(t.getAttribute('data-id'), 10);
            if (!isNaN(id)) {
                var order = getOrderById(id);
                if (order) {
                    order[field] = t.value;
                    saveOrders();
                    renderPage();
                }
            }
        } else if (t.id === 'themeSelect') {
            state.settings.theme = t.value;
            saveSettings();
            applyTheme();
        }
    });

    document.addEventListener('submit', function (e) {
        if (e.target.id === 'settingsForm') {
            e.preventDefault();
            saveSettingsForm();
        }
    });

    document.addEventListener('input', function (e) {
        var t = e.target;
        if (t.id === 'ordersSearch') {
            state.ordersSearch = t.value;
            renderOrdersResults();
        } else if (t.id === 'customersSearch') {
            state.customersSearch = t.value;
            if (!state.selectedCustomer) renderCustomersResults();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (confirmOverlay.classList.contains('active')) {
            state.confirmAction = null;
            closeConfirm();
        }
        if (orderModalOverlay.classList.contains('active')) closeOrderModal();
        if (customerModalOverlay.classList.contains('active')) closeCustomerModal();
        if (sidebar.classList.contains('open')) closeSidebar();
    });

    orderModalOverlay.addEventListener('click', function (e) {
        if (e.target === orderModalOverlay) closeOrderModal();
    });
    customerModalOverlay.addEventListener('click', function (e) {
        if (e.target === customerModalOverlay) closeCustomerModal();
    });
    confirmOverlay.addEventListener('click', function (e) {
        if (e.target === confirmOverlay) {
            state.confirmAction = null;
            closeConfirm();
        }
    });

    /* ================= Init ================= */
    loadOrders();
    loadCustomerRecords();
    loadSettings();

    try {
        state.sidebarCollapsed = sessionStorage.getItem(SESSION_SIDEBAR) === '1';
    } catch (e) {}
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);

    applyTheme();
    navigate();
})();