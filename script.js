document.addEventListener('DOMContentLoaded', function () {
    var orderForm = document.getElementById('orderForm');
    var customerNameInput = document.getElementById('customerName');
    var orderDescriptionInput = document.getElementById('orderDescription');
    var orderAmountInput = document.getElementById('orderAmount');
    var dueDateInput = document.getElementById('dueDate');
    var searchInput = document.getElementById('searchInput');
    var paymentStatusFilters = document.getElementById('paymentStatusFilters');
    var orderBoard = document.getElementById('orderBoard');
    var ordersEmpty = document.getElementById('ordersEmpty');
    var addOrderBtn = document.getElementById('addOrderBtn');
    var emptyAddOrderBtn = document.getElementById('emptyAddOrderBtn');
    var modalOverlay = document.getElementById('modalOverlay');
    var modalClose = document.getElementById('modalClose');
    var mobileMenuBtn = document.getElementById('mobileMenuBtn');
    var sidebar = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var todayCountEl = document.getElementById('todayCount');
    var unpaidCountEl = document.getElementById('unpaidCount');
    var overdueCountEl = document.getElementById('overdueCount');
    var boardCountEl = document.getElementById('boardCount');

    if (!orderForm || !orderBoard) return;

    var orders = [];
    var searchQuery = '';
    var paymentStatusFilter = 'all';
    var statuses = ['New', 'Preparing', 'Ready', 'Delivered'];

    function loadOrders() {
        try {
            var data = localStorage.getItem('orders');
            orders = data ? JSON.parse(data) : [];
            if (!Array.isArray(orders)) orders = [];
        } catch (e) {
            orders = [];
        }
    }

    function saveOrders() {
        try {
            localStorage.setItem('orders', JSON.stringify(orders));
        } catch (e) {
            // localStorage unavailable
        }
    }

    function getTodayStr() {
        var today = new Date();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        return today.getFullYear() + '-' + mm + '-' + dd;
    }

    function isOverdue(order) {
        if (order.orderStatus === 'Delivered' || !order.dueDate) return false;
        var due = new Date(order.dueDate + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    }

    function updateSummary() {
        var todayStr = getTodayStr();
        var todayCount = 0;
        var unpaidCount = 0;
        var overdueCount = 0;
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].dateReceived === todayStr) todayCount++;
            if (orders[i].paymentStatus === 'Unpaid') unpaidCount++;
            if (isOverdue(orders[i])) overdueCount++;
        }
        if (todayCountEl) todayCountEl.textContent = todayCount;
        if (unpaidCountEl) unpaidCountEl.textContent = unpaidCount;
        if (overdueCountEl) overdueCountEl.textContent = overdueCount;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatAmount(amount) {
        var num = parseInt(amount, 10);
        if (isNaN(num)) return '₦0';
        return '₦' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatDueDate(dateStr) {
        if (!dateStr) return '';
        var due = new Date(dateStr + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var diffMs = due - today;
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
        if (order.orderStatus === 'Delivered') return '';
        if (!order.dueDate) return '';
        var due = new Date(order.dueDate + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var diffDays = Math.round((due - today) / 86400000);
        if (diffDays < 0) return 'tint-overdue';
        if (diffDays === 0) return 'tint-due-soon';
        return '';
    }

    function getSelectColor(value) {
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

    function getFilteredOrders() {
        return orders.filter(function (order) {
            if (searchQuery) {
                var q = searchQuery.toLowerCase();
                if (!order.customer.toLowerCase().includes(q) &&
                    !order.description.toLowerCase().includes(q)) {
                    return false;
                }
            }
            if (paymentStatusFilter !== 'all' && order.paymentStatus !== paymentStatusFilter) {
                return false;
            }
            return true;
        });
    }

    function renderOrderCard(order) {
        var tintClass = getTintClass(order);
        var dueDateText = formatDueDate(order.dueDate);
        var formattedAmount = formatAmount(order.amount);

        return '<div class="order-card ' + tintClass + '" data-id="' + order.id + '">' +
            '<div class="order-header">' +
                '<span class="order-customer">' + escapeHtml(order.customer) + '</span>' +
                '<span class="order-amount">' + formattedAmount + '</span>' +
            '</div>' +
            '<div class="order-description">' + escapeHtml(order.description) + '</div>' +
            '<div class="order-statuses">' +
                '<select class="status-select" data-id="' + order.id + '" data-field="orderStatus">' +
                    '<option value="New"' + (order.orderStatus === 'New' ? ' selected' : '') + '>New</option>' +
                    '<option value="Preparing"' + (order.orderStatus === 'Preparing' ? ' selected' : '') + '>Preparing</option>' +
                    '<option value="Ready"' + (order.orderStatus === 'Ready' ? ' selected' : '') + '>Ready</option>' +
                    '<option value="Delivered"' + (order.orderStatus === 'Delivered' ? ' selected' : '') + '>Delivered</option>' +
                '</select>' +
                '<select class="status-select" data-id="' + order.id + '" data-field="paymentStatus">' +
                    '<option value="Unpaid"' + (order.paymentStatus === 'Unpaid' ? ' selected' : '') + '>Unpaid</option>' +
                    '<option value="Paid"' + (order.paymentStatus === 'Paid' ? ' selected' : '') + '>Paid</option>' +
                '</select>' +
            '</div>' +
            '<div class="order-footer">' +
                '<span class="order-due">' + dueDateText + '</span>' +
                '<button class="order-delete" data-id="' + order.id + '">Delete</button>' +
            '</div>' +
        '</div>';
    }

    function updateSelectColors() {
        var selects = orderBoard.querySelectorAll('.status-select');
        for (var i = 0; i < selects.length; i++) {
            selects[i].style.color = getSelectColor(selects[i].value);
        }
    }

    function renderOrders() {
        var filtered = getFilteredOrders();

        if (orders.length === 0) {
            orderBoard.style.display = 'none';
            ordersEmpty.style.display = 'block';
        } else {
            orderBoard.style.display = 'flex';
            ordersEmpty.style.display = 'none';

            for (var s = 0; s < statuses.length; s++) {
                var status = statuses[s];
                var columnEl = orderBoard.querySelector('.board-column[data-status="' + status + '"]');
                var bodyEl = columnEl.querySelector('.column-body');
                var countEl = columnEl.querySelector('.column-count');

                var columnOrders = filtered.filter(function (order) {
                    return order.orderStatus === status;
                });
                columnOrders.sort(function (a, b) { return b.id - a.id; });

                countEl.textContent = '(' + columnOrders.length + ')';

                if (columnOrders.length === 0) {
                    bodyEl.innerHTML = '<div class="column-empty">Nothing here right now.</div>';
                } else {
                    var html = '';
                    for (var i = 0; i < columnOrders.length; i++) {
                        html += renderOrderCard(columnOrders[i]);
                    }
                    bodyEl.innerHTML = html;
                }
            }
            updateSelectColors();
        }
        updateSummary();
    }

    function openModal() {
        modalOverlay.classList.add('active');
        customerNameInput.focus();
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        var customer = customerNameInput.value.trim();
        var description = orderDescriptionInput.value.trim();
        var amount = parseFloat(orderAmountInput.value);
        var dueDate = dueDateInput.value;

        if (!customer || !description || isNaN(amount)) return;

        var dateReceived = getTodayStr();

        var order = {
            id: Date.now(),
            customer: customer,
            description: description,
            amount: amount,
            orderStatus: 'New',
            paymentStatus: 'Unpaid',
            dateReceived: dateReceived,
            dueDate: dueDate || '',
            notes: ''
        };

        orders.push(order);
        saveOrders();
        renderOrders();
        orderForm.reset();
        closeModal();
        customerNameInput.focus();
    }

    function handleStatusChange(id, field, value) {
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].id === id) {
                orders[i][field] = value;
                break;
            }
        }
        saveOrders();
        renderOrders();
    }

    function handleDelete(id) {
        if (!confirm('Delete this order?')) return;
        orders = orders.filter(function (o) { return o.id !== id; });
        saveOrders();
        renderOrders();
    }

    function handleFilter(value, container) {
        paymentStatusFilter = value;
        var btns = container.querySelectorAll('.filter-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].dataset.value === value) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
        renderOrders();
    }

    function handleSearch(e) {
        searchQuery = e.target.value;
        renderOrders();
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    addOrderBtn.addEventListener('click', openModal);
    emptyAddOrderBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (modalOverlay.classList.contains('active')) closeModal();
            if (sidebar.classList.contains('open')) closeSidebar();
        }
    });

    mobileMenuBtn.addEventListener('click', openSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    orderForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', handleSearch);

    paymentStatusFilters.addEventListener('click', function (e) {
        if (e.target.classList.contains('filter-btn')) {
            handleFilter(e.target.dataset.value, paymentStatusFilters);
        }
    });

    orderBoard.addEventListener('change', function (e) {
        if (e.target.classList.contains('status-select')) {
            var id = parseInt(e.target.dataset.id, 10);
            var field = e.target.dataset.field;
            var value = e.target.value;
            handleStatusChange(id, field, value);
        }
    });

    orderBoard.addEventListener('click', function (e) {
        if (e.target.classList.contains('order-delete')) {
            var id = parseInt(e.target.dataset.id, 10);
            handleDelete(id);
        }
    });

    loadOrders();
    renderOrders();
});