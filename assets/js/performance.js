/**
 * SquidX HRM — Performance Page Controller
 * =========================================
 * Handles all performance task management including:
 * - Loading and displaying tasks
 * - Task CRUD operations
 * - Team-level overview with charts
 * - Filtering and searching
 * - Summary metrics and analytics
 * 
 * Dependencies:
 *   - jQuery
 *   - Chart.js
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const PerformancePage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * All team members
     */
    let members = [];

    /**
     * All performance tasks
     */
    let tasks = [];

    /**
     * Filtered tasks based on current filters
     */
    let filteredTasks = [];

    /**
     * Application settings
     */
    let settings = {};

    /**
     * Loading state flag
     */
    let isLoading = false;

    /**
     * Saving state flag
     */
    let isSaving = false;

    /**
     * Task being edited (null for new task)
     */
    let editingTaskId = null;

    /**
     * Chart instances for cleanup
     */
    let charts = {
        completion: null,
        department: null,
        monthly: null
    };

    /**
     * Current pagination state
     */
    let pagination = {
        page: 1,
        perPage: 10,
        totalPages: 1
    };

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    /**
     * Task status configurations
     */
    const TASK_STATUS = {
        'Pending': { color: 'yellow', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800', label: 'Pending' },
        'In Progress': { color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-800', label: 'In Progress' },
        'Completed': { color: 'green', bgClass: 'bg-green-100', textClass: 'text-green-800', label: 'Completed' },
        'Overdue': { color: 'red', bgClass: 'bg-red-100', textClass: 'text-red-800', label: 'Overdue' },
        'Cancelled': { color: 'gray', bgClass: 'bg-gray-100', textClass: 'text-gray-800', label: 'Cancelled' }
    };

    /**
     * Chart color palette
     */
    const CHART_COLORS = {
        primary: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        secondary: '#6B7280',
        purple: '#8B5CF6',
        pink: '#EC4899'
    };

    /**
     * DOM Selectors
     */
    const SELECTORS = {
        // Page containers
        pageContainer: '#performancePageContainer',
        loadingOverlay: '#performanceLoadingOverlay',
        
        // Summary Cards
        summaryTotalTasks: '#summaryTotalTasks',
        summaryCompleted: '#summaryCompleted',
        summaryPending: '#summaryPending',
        summaryOverdue: '#summaryOverdue',
        summaryInProgress: '#summaryInProgress',
        summaryAvgScore: '#summaryAvgScore',
        
        // Filters
        filterDepartment: '#filterDepartment',
        filterEmployee: '#filterEmployee',
        filterStatus: '#filterStatus',
        searchInput: '#searchInput',
        btnClearFilters: '#btnClearFilters',
        
        // Action buttons
        btnAddTask: '#btnAddTask',
        btnRefresh: '#btnRefresh',
        
        // Table
        taskTableContainer: '#taskTableContainer',
        taskTable: '#taskTable',
        taskTableBody: '#taskTableBody',
        
        // Pagination
        paginationContainer: '#paginationContainer',
        paginationInfo: '#paginationInfo',
        btnPrevPage: '#btnPrevPage',
        btnNextPage: '#btnNextPage',
        
        // Charts
        chartCompletion: '#chartCompletion',
        chartDepartment: '#chartDepartment',
        chartMonthly: '#chartMonthly',
        chartsContainer: '#chartsContainer',
        
        // Task Modal
        taskModal: '#taskModal',
        taskForm: '#taskForm',
        taskModalTitle: '#taskModalTitle',
        taskId: '#taskId',
        taskEmployeeSelect: '#taskEmployeeSelect',
        taskTitleInput: '#taskTitleInput',
        taskDescriptionInput: '#taskDescriptionInput',
        taskDeadlineInput: '#taskDeadlineInput',
        taskStatusSelect: '#taskStatusSelect',
        taskQualityInput: '#taskQualityInput',
        taskNotesInput: '#taskNotesInput',
        btnSaveTask: '#btnSaveTask',
        btnCancelTask: '#btnCancelTask',
        btnCloseTaskModal: '#btnCloseTaskModal',
        btnDeleteTask: '#btnDeleteTask',
        
        // View Toggle
        btnViewTable: '#btnViewTable',
        btnViewCards: '#btnViewCards',
        taskCardsContainer: '#taskCardsContainer'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the performance page
     */
    const init = async () => {
        CONFIG.log('Initializing Performance Page...');
        
        try {
            // Show loading state
            showPageLoading();
            
            // Step 1: Load settings
            await loadSettings();
            
            // Step 2: Load all members
            await loadMembers();
            
            // Step 3: Load all tasks
            await loadTasks();
            
            // Step 4: Setup event listeners
            setupEventListeners();
            
            // Step 5: Populate filter dropdowns
            populateFilters();
            
            // Step 6: Apply initial filters & render
            applyFilters();
            
            // Step 7: Render charts
            renderCharts();
            
            CONFIG.log('Performance Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Performance Page:', error);
            Utils.showToast('Failed to load performance page. Please refresh.', 'error');
        } finally {
            hidePageLoading();
        }
    };

    /**
     * Load application settings
     */
    const loadSettings = async () => {
        try {
            settings = await API.getSettings();
            CONFIG.log('Settings loaded:', settings);
        } catch (error) {
            CONFIG.logError('Failed to load settings:', error);
            settings = {};
        }
    };

    /**
     * Load all members
     */
    const loadMembers = async () => {
        try {
            members = await API.getAllMembers();
            // Filter only active members
            members = members.filter(m => m.status === 'Active');
            CONFIG.log(`Loaded ${members.length} active members`);
        } catch (error) {
            CONFIG.logError('Failed to load members:', error);
            members = [];
            throw error;
        }
    };

    /**
     * Load all tasks
     */
    const loadTasks = async () => {
        try {
            showTableLoading();
            
            tasks = await API.getAllTasks();
            
            // Process tasks - check for overdue
            tasks = tasks.map(task => processTask(task));
            
            // Sort by deadline (upcoming first), then by status
            tasks.sort((a, b) => {
                // Overdue tasks first
                if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
                if (b.status === 'Overdue' && a.status !== 'Overdue') return 1;
                
                // Then by deadline
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            
            CONFIG.log(`Loaded ${tasks.length} tasks`);
            
        } catch (error) {
            CONFIG.logError('Failed to load tasks:', error);
            tasks = [];
            throw error;
        }
    };

    /**
     * Process a task - calculate status, scores, etc.
     */
    const processTask = (task) => {
        const processed = { ...task };
        
        // Auto-calculate overdue status
        if (task.status !== 'Completed' && task.status !== 'Cancelled' && task.deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(task.deadline);
            deadline.setHours(0, 0, 0, 0);
            
            if (deadline < today) {
                processed.status = 'Overdue';
            }
        }
        
        // Ensure score is a number
        processed.score = parseFloat(processed.score) || 0;
        processed.qualityScore = parseFloat(processed.qualityScore || processed.score) || 0;
        
        return processed;
    };

    // ============================================
    // 📊 SUMMARY & METRICS
    // ============================================

    /**
     * Render summary cards
     */
    const renderSummary = () => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'Completed').length;
        const pending = filteredTasks.filter(t => t.status === 'Pending').length;
        const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
        const overdue = filteredTasks.filter(t => t.status === 'Overdue').length;
        
        // Calculate average score (only for completed tasks with scores)
        const completedWithScores = filteredTasks.filter(t => 
            t.status === 'Completed' && t.qualityScore > 0
        );
        const avgScore = completedWithScores.length > 0
            ? completedWithScores.reduce((sum, t) => sum + t.qualityScore, 0) / completedWithScores.length
            : 0;
        
        // Update DOM
        $(SELECTORS.summaryTotalTasks).text(total);
        $(SELECTORS.summaryCompleted).text(completed);
        $(SELECTORS.summaryPending).text(pending);
        $(SELECTORS.summaryInProgress).text(inProgress);
        $(SELECTORS.summaryOverdue).text(overdue);
        $(SELECTORS.summaryAvgScore).text(avgScore.toFixed(1));
        
        // Add color indicators
        if (overdue > 0) {
            $(SELECTORS.summaryOverdue).addClass('text-red-600');
        } else {
            $(SELECTORS.summaryOverdue).removeClass('text-red-600');
        }
    };

    /**
     * Calculate task completion rate
     */
    const calculateCompletionRate = () => {
        const total = tasks.length;
        if (total === 0) return 0;
        
        const completed = tasks.filter(t => t.status === 'Completed').length;
        return Math.round((completed / total) * 100);
    };

    /**
     * Calculate deadline performance score
     */
    const calculateDeadlinePerformance = () => {
        const completedTasks = tasks.filter(t => t.status === 'Completed' && t.deadline && t.completedOn);
        if (completedTasks.length === 0) return 0;
        
        const onTime = completedTasks.filter(t => {
            const deadline = new Date(t.deadline);
            const completed = new Date(t.completedOn);
            return completed <= deadline;
        }).length;
        
        return Math.round((onTime / completedTasks.length) * 100);
    };

    // ============================================
    // 🔍 FILTERING
    // ============================================

    /**
     * Populate filter dropdowns
     */
    const populateFilters = () => {
        // Department filter
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))];
        let deptOptions = '<option value="all">All Departments</option>';
        departments.sort().forEach(dept => {
            deptOptions += `<option value="${Utils.escapeHtml(dept)}">${Utils.escapeHtml(dept)}</option>`;
        });
        $(SELECTORS.filterDepartment).html(deptOptions);
        
        // Employee filter
        let empOptions = '<option value="all">All Employees</option>';
        members.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            empOptions += `<option value="${member.memberId}">${Utils.escapeHtml(member.name)}</option>`;
        });
        $(SELECTORS.filterEmployee).html(empOptions);
        
        // Status filter
        let statusOptions = '<option value="all">All Status</option>';
        Object.keys(TASK_STATUS).forEach(status => {
            statusOptions += `<option value="${status}">${TASK_STATUS[status].label}</option>`;
        });
        $(SELECTORS.filterStatus).html(statusOptions);
    };

    /**
     * Apply all filters and re-render
     */
    const applyFilters = () => {
        let filtered = [...tasks];
        
        // Department filter
        const department = $(SELECTORS.filterDepartment).val();
        if (department && department !== 'all') {
            const memberIdsInDept = members
                .filter(m => m.department === department)
                .map(m => m.memberId);
            filtered = filtered.filter(t => memberIdsInDept.includes(t.memberId));
        }
        
        // Employee filter
        const employeeId = $(SELECTORS.filterEmployee).val();
        if (employeeId && employeeId !== 'all') {
            filtered = filtered.filter(t => t.memberId === employeeId);
        }
        
        // Status filter
        const status = $(SELECTORS.filterStatus).val();
        if (status && status !== 'all') {
            filtered = filtered.filter(t => t.status === status);
        }
        
        // Search filter
        const search = $(SELECTORS.searchInput).val();
        if (search) {
            const query = search.toLowerCase().trim();
            filtered = filtered.filter(t => {
                const member = getEmployeeById(t.memberId);
                const title = (t.title || '').toLowerCase();
                const description = (t.description || t.notes || '').toLowerCase();
                const memberName = (member?.name || '').toLowerCase();
                
                return title.includes(query) || 
                       description.includes(query) || 
                       memberName.includes(query);
            });
        }
        
        filteredTasks = filtered;
        
        // Reset pagination
        pagination.page = 1;
        pagination.totalPages = Math.ceil(filteredTasks.length / pagination.perPage) || 1;
        
        // Render
        renderSummary();
        renderTaskTable();
        renderPagination();
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        $(SELECTORS.filterDepartment).val('all');
        $(SELECTORS.filterEmployee).val('all');
        $(SELECTORS.filterStatus).val('all');
        $(SELECTORS.searchInput).val('');
        
        applyFilters();
        Utils.showToast('Filters cleared', 'info');
    };

    // ============================================
    // 📋 TABLE RENDERING
    // ============================================

    /**
     * Render the task table
     */
    const renderTaskTable = () => {
        const tableBody = $(SELECTORS.taskTableBody);
        
        if (filteredTasks.length === 0) {
            renderEmptyTable();
            return;
        }
        
        // Get paginated tasks
        const startIndex = (pagination.page - 1) * pagination.perPage;
        const endIndex = startIndex + pagination.perPage;
        const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
        
        let html = '';
        
        paginatedTasks.forEach((task, index) => {
            const member = getEmployeeById(task.memberId);
            const memberName = member?.name || 'Unknown';
            const memberPhoto = member?.photoURL || Utils.getAvatarUrl(memberName);
            const department = member?.department || 'N/A';
            const memberLink = Utils.getMemberLink(task.memberId);
            
            const statusConfig = TASK_STATUS[task.status] || TASK_STATUS['Pending'];
            const deadlineDisplay = formatDeadline(task.deadline);
            const isOverdue = task.status === 'Overdue';
            const scoreDisplay = task.qualityScore > 0 ? task.qualityScore.toFixed(0) : '—';
            
            html += `
                <tr class="hover:bg-gray-50 transition-colors group" data-task-id="${task.taskId}">
                    <!-- Employee -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <a href="${memberLink}" class="flex items-center group/link">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full object-cover border-2 border-transparent group-hover/link:border-primary-500 transition-all" 
                                     src="${memberPhoto}" 
                                     alt="${Utils.escapeHtml(memberName)}"
                                     onerror="this.src='${Utils.getAvatarUrl(memberName)}'">
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900 group-hover/link:text-primary-600 transition-colors">
                                    ${Utils.escapeHtml(memberName)}
                                </div>
                                <div class="text-xs text-gray-500">${Utils.escapeHtml(department)}</div>
                            </div>
                        </a>
                    </td>
                    
                    <!-- Task Title -->
                    <td class="px-6 py-4">
                        <div class="max-w-xs">
                            <p class="text-sm font-medium text-gray-900 truncate ${task.status === 'Completed' ? 'line-through text-gray-500' : ''}">
                                ${Utils.escapeHtml(task.title)}
                            </p>
                            ${task.description || task.notes ? `
                                <p class="text-xs text-gray-500 truncate mt-1" title="${Utils.escapeHtml(task.description || task.notes)}">
                                    ${Utils.escapeHtml((task.description || task.notes).substring(0, 50))}${(task.description || task.notes).length > 50 ? '...' : ''}
                                </p>
                            ` : ''}
                        </div>
                    </td>
                    
                    <!-- Deadline -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2 ${isOverdue ? 'text-red-500' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span class="text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}">
                                ${deadlineDisplay}
                            </span>
                        </div>
                    </td>
                    
                    <!-- Status -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${renderStatusBadge(task.status)}
                    </td>
                    
                    <!-- Quality Score -->
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        ${renderScoreBadge(task.qualityScore)}
                    </td>
                    
                    <!-- Actions -->
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors btn-edit-task" 
                                    data-task-id="${task.taskId}"
                                    title="Edit Task">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </button>
                            <button class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors btn-delete-task" 
                                    data-task-id="${task.taskId}"
                                    title="Delete Task">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.html(html);
        
        // Attach action button events
        attachTableActionEvents();
    };

    /**
     * Render empty table state
     */
    const renderEmptyTable = () => {
        const tableBody = $(SELECTORS.taskTableBody);
        
        const hasFilters = $(SELECTORS.filterDepartment).val() !== 'all' ||
                          $(SELECTORS.filterEmployee).val() !== 'all' ||
                          $(SELECTORS.filterStatus).val() !== 'all' ||
                          $(SELECTORS.searchInput).val();
        
        const message = hasFilters 
            ? 'No tasks match your filters.'
            : 'No tasks found. Start by adding a task.';
        
        tableBody.html(`
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                            </svg>
                        </div>
                        <p class="text-gray-500 text-lg font-medium mb-2">${Utils.escapeHtml(message)}</p>
                        ${hasFilters ? `
                            <button id="btnClearFiltersEmpty" class="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium">
                                Clear Filters
                            </button>
                        ` : `
                            <button id="btnAddFirstTask" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                Add First Task
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `);
        
        // Attach events
        $('#btnAddFirstTask').on('click', openAddModal);
        $('#btnClearFiltersEmpty').on('click', clearFilters);
    };

    /**
     * Attach events to table action buttons
     */
    const attachTableActionEvents = () => {
        // Edit task
        $('.btn-edit-task').off('click').on('click', function(e) {
            e.stopPropagation();
            const taskId = $(this).data('task-id');
            openEditModal(taskId);
        });
        
        // Delete task
        $('.btn-delete-task').off('click').on('click', async function(e) {
            e.stopPropagation();
            const taskId = $(this).data('task-id');
            await confirmDeleteTask(taskId);
        });
        
        // Row click to edit
        $(SELECTORS.taskTableBody).find('tr[data-task-id]').off('click').on('click', function(e) {
            if (!$(e.target).closest('a, button').length) {
                const taskId = $(this).data('task-id');
                openEditModal(taskId);
            }
        });
    };

    // ============================================
    // 📄 PAGINATION
    // ============================================

    /**
     * Render pagination controls
     */
    const renderPagination = () => {
        const total = filteredTasks.length;
        const start = total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1;
        const end = Math.min(pagination.page * pagination.perPage, total);
        
        // Update info text
        $(SELECTORS.paginationInfo).text(`Showing ${start} - ${end} of ${total} tasks`);
        
        // Update button states
        $(SELECTORS.btnPrevPage).prop('disabled', pagination.page <= 1);
        $(SELECTORS.btnNextPage).prop('disabled', pagination.page >= pagination.totalPages);
        
        // Show/hide pagination
        if (total <= pagination.perPage) {
            $(SELECTORS.paginationContainer).addClass('hidden');
        } else {
            $(SELECTORS.paginationContainer).removeClass('hidden');
        }
    };

    /**
     * Go to previous page
     */
    const prevPage = () => {
        if (pagination.page > 1) {
            pagination.page--;
            renderTaskTable();
            renderPagination();
        }
    };

    /**
     * Go to next page
     */
    const nextPage = () => {
        if (pagination.page < pagination.totalPages) {
            pagination.page++;
            renderTaskTable();
            renderPagination();
        }
    };

    // ============================================
    // 📊 CHART RENDERING
    // ============================================

    /**
     * Render all charts
     */
    const renderCharts = () => {
        renderCompletionChart();
        renderDepartmentChart();
        renderMonthlyChart();
    };

    /**
     * Render task completion pie chart
     */
    const renderCompletionChart = () => {
        const canvas = document.getElementById('chartCompletion');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.completion) {
            charts.completion.destroy();
        }
        
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const pending = tasks.filter(t => t.status === 'Pending').length;
        const overdue = tasks.filter(t => t.status === 'Overdue').length;
        
        const ctx = canvas.getContext('2d');
        
        charts.completion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
                datasets: [{
                    data: [completed, inProgress, pending, overdue],
                    backgroundColor: [
                        CHART_COLORS.success,
                        CHART_COLORS.info,
                        CHART_COLORS.warning,
                        CHART_COLORS.danger
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    };

    /**
     * Render department productivity bar chart
     */
    const renderDepartmentChart = () => {
        const canvas = document.getElementById('chartDepartment');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.department) {
            charts.department.destroy();
        }
        
        // Group tasks by department
        const departments = [...new Set(members.map(m => m.department).filter(Boolean))];
        const deptData = departments.map(dept => {
            const memberIds = members.filter(m => m.department === dept).map(m => m.memberId);
            const deptTasks = tasks.filter(t => memberIds.includes(t.memberId));
            const completed = deptTasks.filter(t => t.status === 'Completed').length;
            return {
                department: dept,
                total: deptTasks.length,
                completed: completed,
                rate: deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0
            };
        });
        
        // Sort by completion rate
        deptData.sort((a, b) => b.rate - a.rate);
        
        const ctx = canvas.getContext('2d');
        
        charts.department = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: deptData.map(d => d.department),
                datasets: [
                    {
                        label: 'Completed',
                        data: deptData.map(d => d.completed),
                        backgroundColor: CHART_COLORS.success,
                        borderRadius: 4
                    },
                    {
                        label: 'Total',
                        data: deptData.map(d => d.total - d.completed),
                        backgroundColor: CHART_COLORS.secondary + '40',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    };

    /**
     * Render monthly tasks trend line chart
     */
    const renderMonthlyChart = () => {
        const canvas = document.getElementById('chartMonthly');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.monthly) {
            charts.monthly.destroy();
        }
        
        // Get last 6 months
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            });
        }
        
        // Count tasks per month
        const createdData = months.map(m => {
            return tasks.filter(t => {
                if (!t.createdAt && !t.deadline) return false;
                const date = t.createdAt || t.deadline;
                return date.startsWith(m.key);
            }).length;
        });
        
        const completedData = months.map(m => {
            return tasks.filter(t => {
                if (!t.completedOn) return false;
                return t.completedOn.startsWith(m.key);
            }).length;
        });
        
        const ctx = canvas.getContext('2d');
        
        charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(m => m.label),
                datasets: [
                    {
                        label: 'Created',
                        data: createdData,
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: CHART_COLORS.primary + '20',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Completed',
                        data: completedData,
                        borderColor: CHART_COLORS.success,
                        backgroundColor: CHART_COLORS.success + '20',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    };

    // ============================================
    // 📝 TASK MODAL
    // ============================================

    /**
     * Open add task modal
     */
    const openAddModal = () => {
        editingTaskId = null;
        
        // Reset form
        $(SELECTORS.taskForm)[0]?.reset();
        clearFormErrors();
        
        // Populate employee dropdown
        populateEmployeeDropdown();
        
        // Set defaults
        $(SELECTORS.taskModalTitle).text('Add New Task');
        $(SELECTORS.taskStatusSelect).val('Pending');
        $(SELECTORS.taskQualityInput).val('');
        $(SELECTORS.btnDeleteTask).addClass('hidden');
        $(SELECTORS.btnSaveTask).text('Add Task');
        
        // Set default deadline to 1 week from now
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 7);
        $(SELECTORS.taskDeadlineInput).val(Utils.formatDate(defaultDeadline));
        
        // Show modal
        showModal(SELECTORS.taskModal);
        
        // Focus first input
        setTimeout(() => {
            $(SELECTORS.taskEmployeeSelect).focus();
        }, 100);
    };

    /**
     * Open edit task modal
     */
    const openEditModal = (taskId) => {
        const task = getTaskById(taskId);
        
        if (!task) {
            Utils.showToast('Task not found', 'error');
            return;
        }
        
        editingTaskId = taskId;
        
        // Reset form
        $(SELECTORS.taskForm)[0]?.reset();
        clearFormErrors();
        
        // Populate employee dropdown
        populateEmployeeDropdown();
        
        // Fill form with task data
        $(SELECTORS.taskModalTitle).text('Edit Task');
        $(SELECTORS.taskId).val(task.taskId);
        $(SELECTORS.taskEmployeeSelect).val(task.memberId);
        $(SELECTORS.taskTitleInput).val(task.title || '');
        $(SELECTORS.taskDescriptionInput).val(task.description || task.notes || '');
        $(SELECTORS.taskDeadlineInput).val(task.deadline || '');
        $(SELECTORS.taskStatusSelect).val(task.status || 'Pending');
        $(SELECTORS.taskQualityInput).val(task.qualityScore || task.score || '');
        
        // Show delete button
        $(SELECTORS.btnDeleteTask).removeClass('hidden');
        $(SELECTORS.btnSaveTask).text('Update Task');
        
        // Show modal
        showModal(SELECTORS.taskModal);
    };

    /**
     * Close task modal
     */
    const closeTaskModal = () => {
        hideModal(SELECTORS.taskModal);
        editingTaskId = null;
    };

    /**
     * Populate employee dropdown
     */
    const populateEmployeeDropdown = () => {
        let options = '<option value="">Select Employee</option>';
        
        members.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            options += `<option value="${member.memberId}">
                ${Utils.escapeHtml(member.name)} — ${Utils.escapeHtml(member.department || 'N/A')}
            </option>`;
        });
        
        $(SELECTORS.taskEmployeeSelect).html(options);
    };

    /**
     * Save task (add or update)
     */
    const saveTask = async () => {
        if (isSaving) return;
        
        // Validate form
        if (!validateTaskForm()) return;
        
        // Collect form data
        const taskData = {
            memberId: $(SELECTORS.taskEmployeeSelect).val(),
            title: $(SELECTORS.taskTitleInput).val().trim(),
            description: $(SELECTORS.taskDescriptionInput).val().trim(),
            notes: $(SELECTORS.taskDescriptionInput).val().trim(),
            deadline: $(SELECTORS.taskDeadlineInput).val(),
            status: $(SELECTORS.taskStatusSelect).val(),
            score: $(SELECTORS.taskQualityInput).val() || 0,
            qualityScore: $(SELECTORS.taskQualityInput).val() || 0
        };
        
        // Add timestamps
        const now = Utils.formatDate(new Date());
        if (editingTaskId) {
            taskData.taskId = editingTaskId;
            taskData.updatedAt = now;
            
            // If completed, set completedOn
            if (taskData.status === 'Completed') {
                const originalTask = getTaskById(editingTaskId);
                if (originalTask?.status !== 'Completed') {
                    taskData.completedOn = now;
                } else {
                    taskData.completedOn = originalTask.completedOn || now;
                }
            }
        } else {
            taskData.createdAt = now;
            taskData.updatedAt = now;
            if (taskData.status === 'Completed') {
                taskData.completedOn = now;
            }
        }
        
        try {
            isSaving = true;
            updateSaveButton(true);
            
            if (editingTaskId) {
                await API.updateTask(editingTaskId, taskData);
                Utils.showToast('Task updated successfully!', 'success');
            } else {
                await API.addTask(taskData);
                Utils.showToast('Task added successfully!', 'success');
            }
            
            closeTaskModal();
            await loadTasks();
            applyFilters();
            renderCharts();
            
        } catch (error) {
            CONFIG.logError('Failed to save task:', error);
            Utils.showToast(error.message || 'Failed to save task', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(false);
        }
    };

    /**
     * Validate task form
     */
    const validateTaskForm = () => {
        clearFormErrors();
        let isValid = true;
        
        // Employee required
        if (!$(SELECTORS.taskEmployeeSelect).val()) {
            showFieldError(SELECTORS.taskEmployeeSelect, 'Please select an employee');
            isValid = false;
        }
        
        // Title required
        const title = $(SELECTORS.taskTitleInput).val().trim();
        if (!title) {
            showFieldError(SELECTORS.taskTitleInput, 'Task title is required');
            isValid = false;
        } else if (title.length < 3) {
            showFieldError(SELECTORS.taskTitleInput, 'Title must be at least 3 characters');
            isValid = false;
        }
        
        // Quality score range
        const score = $(SELECTORS.taskQualityInput).val();
        if (score && (score < 0 || score > 100)) {
            showFieldError(SELECTORS.taskQualityInput, 'Score must be between 0 and 100');
            isValid = false;
        }
        
        return isValid;
    };

    /**
     * Show field error
     */
    const showFieldError = (selector, message) => {
        const $field = $(selector);
        $field.addClass('border-red-500 focus:border-red-500 focus:ring-red-500');
        
        // Add error message
        const errorHtml = `<p class="field-error text-xs text-red-600 mt-1">${Utils.escapeHtml(message)}</p>`;
        $field.parent().append(errorHtml);
    };

    /**
     * Clear all form errors
     */
    const clearFormErrors = () => {
        $(SELECTORS.taskForm).find('input, select, textarea').removeClass('border-red-500 focus:border-red-500 focus:ring-red-500');
        $(SELECTORS.taskForm).find('.field-error').remove();
    };

    /**
     * Update save button state
     */
    const updateSaveButton = (loading) => {
        const $btn = $(SELECTORS.btnSaveTask);
        
        if (loading) {
            $btn.prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving...
            `);
        } else {
            $btn.prop('disabled', false).text(editingTaskId ? 'Update Task' : 'Add Task');
        }
    };

    // ============================================
    // 🗑️ DELETE TASK
    // ============================================

    /**
     * Confirm and delete task
     */
    const confirmDeleteTask = async (taskId) => {
        const task = getTaskById(taskId);
        if (!task) return;
        
        const confirmed = await Utils.showConfirm(
            `Are you sure you want to delete "${task.title}"?`,
            'Delete Task'
        );
        
        if (confirmed) {
            await deleteTask(taskId);
        }
    };

    /**
     * Delete a task
     */
    const deleteTask = async (taskId) => {
        try {
            Utils.showLoading(SELECTORS.taskTableContainer, 'Deleting task...');
            
            await API.deleteTask(taskId);
            
            Utils.showToast('Task deleted successfully', 'success');
            closeTaskModal();
            await loadTasks();
            applyFilters();
            renderCharts();
            
        } catch (error) {
            CONFIG.logError('Failed to delete task:', error);
            Utils.showToast(error.message || 'Failed to delete task', 'error');
        } finally {
            Utils.hideLoading(SELECTORS.taskTableContainer);
        }
    };

    // ============================================
    // 🎨 RENDERING UTILITIES
    // ============================================

    /**
     * Render status badge HTML
     */
    const renderStatusBadge = (status) => {
        const config = TASK_STATUS[status] || TASK_STATUS['Pending'];
        
        return `
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}">
                ${Utils.escapeHtml(config.label)}
            </span>
        `;
    };

    /**
     * Render quality score badge
     */
    const renderScoreBadge = (score) => {
        if (!score || score === 0) {
            return '<span class="text-gray-400 text-sm">—</span>';
        }
        
        let colorClass = 'bg-gray-100 text-gray-800';
        if (score >= 80) {
            colorClass = 'bg-green-100 text-green-800';
        } else if (score >= 60) {
            colorClass = 'bg-blue-100 text-blue-800';
        } else if (score >= 40) {
            colorClass = 'bg-yellow-100 text-yellow-800';
        } else {
            colorClass = 'bg-red-100 text-red-800';
        }
        
        return `
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${colorClass}">
                ${Math.round(score)}%
            </span>
        `;
    };

    // ============================================
    // 🔧 UTILITY FUNCTIONS
    // ============================================

    /**
     * Get employee by ID
     */
    const getEmployeeById = (memberId) => {
        return members.find(m => m.memberId === memberId) || null;
    };

    /**
     * Get employee photo URL
     */
    const getEmployeePhoto = (memberId) => {
        const member = getEmployeeById(memberId);
        return member?.photoURL || Utils.getAvatarUrl(member?.name || 'Unknown');
    };

    /**
     * Get task by ID
     */
    const getTaskById = (taskId) => {
        return tasks.find(t => t.taskId === taskId) || null;
    };

    /**
     * Format deadline for display
     */
    const formatDeadline = (deadline) => {
        if (!deadline) return 'No deadline';
        
        const date = new Date(deadline);
        if (isNaN(date.getTime())) return deadline;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays <= 7) return `In ${diffDays} days`;
        
        return Utils.formatDateDisplay(deadline);
    };

    /**
     * Calculate task status based on deadline
     */
    const calculateStatus = (deadline, currentStatus) => {
        if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
            return currentStatus;
        }
        
        if (!deadline) return currentStatus || 'Pending';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (deadlineDate < today) {
            return 'Overdue';
        }
        
        return currentStatus || 'Pending';
    };

    /**
     * Calculate quality score for a set of tasks
     */
    const calculateTaskScore = (tasksArray) => {
        const completed = tasksArray.filter(t => t.status === 'Completed' && t.qualityScore > 0);
        if (completed.length === 0) return 0;
        
        const total = completed.reduce((sum, t) => sum + t.qualityScore, 0);
        return total / completed.length;
    };

    // ============================================
    // 🎭 MODAL UTILITIES
    // ============================================

    /**
     * Show modal with animation
     */
    const showModal = (selector) => {
        const $modal = $(selector);
        $modal.removeClass('hidden').addClass('flex');
        
        setTimeout(() => {
            $modal.find('.modal-content').removeClass('scale-95 opacity-0');
        }, 10);
    };

    /**
     * Hide modal with animation
     */
    const hideModal = (selector) => {
        const $modal = $(selector);
        $modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            $modal.removeClass('flex').addClass('hidden');
        }, 200);
    };

    // ============================================
    // ⏳ LOADING UTILITIES
    // ============================================

    /**
     * Show page loading overlay
     */
    const showPageLoading = () => {
        isLoading = true;
        $(SELECTORS.loadingOverlay).removeClass('hidden');
    };

    /**
     * Hide page loading overlay
     */
    const hidePageLoading = () => {
        isLoading = false;
        $(SELECTORS.loadingOverlay).addClass('hidden');
    };

    /**
     * Show table loading state
     */
    const showTableLoading = () => {
        $(SELECTORS.taskTableBody).html(`
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="spinner mb-4"></div>
                        <p class="text-gray-500">Loading tasks...</p>
                    </div>
                </td>
            </tr>
        `);
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Add Task Button
        $(SELECTORS.btnAddTask).on('click', openAddModal);
        
        // Refresh Button
        $(SELECTORS.btnRefresh).on('click', async () => {
            await loadTasks();
            applyFilters();
            renderCharts();
            Utils.showToast('Tasks refreshed', 'info');
        });
        
        // Filters
        $(SELECTORS.filterDepartment).on('change', applyFilters);
        $(SELECTORS.filterEmployee).on('change', applyFilters);
        $(SELECTORS.filterStatus).on('change', applyFilters);
        $(SELECTORS.searchInput).on('input', debounce(applyFilters, 300));
        $(SELECTORS.btnClearFilters).on('click', clearFilters);
        
        // Pagination
        $(SELECTORS.btnPrevPage).on('click', prevPage);
        $(SELECTORS.btnNextPage).on('click', nextPage);
        
        // Task Modal
        $(SELECTORS.btnCloseTaskModal).on('click', closeTaskModal);
        $(SELECTORS.btnCancelTask).on('click', closeTaskModal);
        $(SELECTORS.btnSaveTask).on('click', saveTask);
        $(SELECTORS.btnDeleteTask).on('click', () => {
            if (editingTaskId) {
                confirmDeleteTask(editingTaskId);
            }
        });
        
        // Form submission
        $(SELECTORS.taskForm).on('submit', function(e) {
            e.preventDefault();
            saveTask();
        });
        
        // Modal backdrop click
        $(SELECTORS.taskModal).on('click', function(e) {
            if (e.target === this) {
                closeTaskModal();
            }
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            // ESC to close modal
            if (e.key === 'Escape' && !$(SELECTORS.taskModal).hasClass('hidden')) {
                closeTaskModal();
            }
            
            // Ctrl/Cmd + N to add new task
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openAddModal();
            }
        });
        
        // Clear input errors on change
        $(SELECTORS.taskForm).on('input change', 'input, select, textarea', function() {
            $(this).removeClass('border-red-500 focus:border-red-500 focus:ring-red-500');
            $(this).parent().find('.field-error').remove();
        });
    };

    /**
     * Debounce utility function
     */
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        loadTasks,
        
        // Modal controls
        openAddModal,
        openEditModal,
        closeTaskModal,
        
        // Actions
        saveTask,
        deleteTask,
        
        // Filters
        applyFilters,
        clearFilters,
        
        // Charts
        renderCharts,
        
        // State getters
        getTasks: () => [...tasks],
        getFilteredTasks: () => [...filteredTasks],
        getMembers: () => [...members],
        
        // Utilities
        getTaskById,
        getEmployeeById,
        calculateStatus,
        formatDeadline
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    PerformancePage.init();
});