/**
 * SquidX HRM — Employee Detail Page Controller
 * ==============================================
 * Handles all employee profile page functionality including:
 * - Loading and displaying employee profile
 * - Attendance history with filtering
 * - Leave history and remaining balance
 * - Performance tasks management
 * - Ratings timeline with charts
 * 
 * Dependencies:
 *   - jQuery
 *   - Chart.js
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const EmployeePage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * Current member ID from URL
     */
    let memberId = null;

    /**
     * Current member profile data
     */
    let member = null;

    /**
     * All members (for reference)
     */
    let allMembers = [];

    /**
     * Attendance records for this member
     */
    let attendanceRecords = [];

    /**
     * Leave records for this member
     */
    let leaveRecords = [];

    /**
     * Performance tasks for this member
     */
    let tasks = [];

    /**
     * Rating records for this member
     */
    let ratings = [];

    /**
     * Application settings
     */
    let settings = {};

    /**
     * Current active tab
     */
    let activeTab = 'attendance';

    /**
     * Ratings chart instance
     */
    let ratingsChart = null;

    /**
     * Task being edited (null for new task)
     */
    let editingTaskId = null;

    /**
     * Flag to prevent double submissions
     */
    let isSaving = false;

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    /**
     * Attendance status configurations
     */
    const ATTENDANCE_STATUS = {
        'On Time': { color: 'green', icon: 'check-circle', label: 'On Time' },
        'Present': { color: 'green', icon: 'check-circle', label: 'Present' },
        'Late': { color: 'amber', icon: 'clock', label: 'Late' },
        'Absent': { color: 'red', icon: 'x-circle', label: 'Absent' },
        'On Leave': { color: 'blue', icon: 'calendar', label: 'On Leave' },
        'Half Day': { color: 'orange', icon: 'minus-circle', label: 'Half Day' }
    };

    /**
     * Task status configurations
     */
    const TASK_STATUS = {
        'Pending': { color: 'gray', label: 'Pending' },
        'In Progress': { color: 'blue', label: 'In Progress' },
        'Completed': { color: 'green', label: 'Completed' },
        'Overdue': { color: 'red', label: 'Overdue' },
        'Cancelled': { color: 'gray', label: 'Cancelled' }
    };

    /**
     * Chart colors for ratings
     */
    const CHART_COLORS = {
        quality: { border: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' },
        punctuality: { border: '#10B981', background: 'rgba(16, 185, 129, 0.1)' },
        reliability: { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' },
        deadlines: { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' }
    };

    // ============================================
    // 🎯 DOM SELECTORS
    // ============================================

    const SELECTORS = {
        // Page containers
        pageContainer: '#employeePageContainer',
        loadingOverlay: '#employeeLoadingOverlay',
        errorContainer: '#employeeErrorContainer',
        
        // Basic Info
        employeePhoto: '#employeePhoto',
        employeeName: '#employeeName',
        employeeDepartment: '#employeeDepartment',
        employeeRole: '#employeeRole',
        employeeEmail: '#employeeEmail',
        employeePhone: '#employeePhone',
        employeeJoinDate: '#employeeJoinDate',
        employeeBirthday: '#employeeBirthday',
        employeeStatus: '#employeeStatus',
        employeeId: '#employeeId',
        
        // Action buttons
        btnEditMember: '#btnEditMember',
        btnBackToDirectory: '#btnBackToDirectory',
        
        // Summary Cards
        summaryTotalDays: '#summaryTotalDays',
        summaryPresentDays: '#summaryPresentDays',
        summaryLateDays: '#summaryLateDays',
        summaryAbsentDays: '#summaryAbsentDays',
        summaryLeaveDays: '#summaryLeaveDays',
        summaryRatingScore: '#summaryRatingScore',
        
        // Tab Navigation
        tabButtons: '.tab-button',
        tabContents: '.tab-content',
        tabAttendance: '#tabAttendance',
        tabLeave: '#tabLeave',
        tabPerformance: '#tabPerformance',
        tabRatings: '#tabRatings',
        
        // Attendance Tab
        attendanceContent: '#attendanceContent',
        attendanceList: '#attendanceList',
        attendanceFilterMonth: '#attendanceFilterMonth',
        attendanceFilterYear: '#attendanceFilterYear',
        attendanceEmptyState: '#attendanceEmptyState',
        
        // Leave Tab
        leaveContent: '#leaveContent',
        leaveList: '#leaveList',
        leaveRemaining: '#leaveRemaining',
        leaveTaken: '#leaveTaken',
        leaveTotal: '#leaveTotal',
        leaveEmptyState: '#leaveEmptyState',
        
        // Performance Tab
        performanceContent: '#performanceContent',
        taskList: '#taskList',
        btnAddTask: '#btnAddTask',
        taskEmptyState: '#taskEmptyState',
        taskStats: '#taskStats',
        
        // Ratings Tab
        ratingsContent: '#ratingsContent',
        ratingChart: '#ratingChart',
        ratingChartCanvas: '#ratingChartCanvas',
        ratingList: '#ratingList',
        btnAddRating: '#btnAddRating',
        ratingEmptyState: '#ratingEmptyState',
        averageRating: '#averageRating',
        
        // Task Modal
        taskModal: '#taskModal',
        taskForm: '#taskForm',
        taskModalTitle: '#taskModalTitle',
        taskId: '#taskId',
        taskTitle: '#taskTitle',
        taskDescription: '#taskDescription',
        taskDeadline: '#taskDeadline',
        taskStatus: '#taskStatus',
        taskScore: '#taskScore',
        taskNotes: '#taskNotes',
        btnSaveTask: '#btnSaveTask',
        btnCloseTaskModal: '#btnCloseTaskModal',
        btnCancelTask: '#btnCancelTask',
        btnDeleteTask: '#btnDeleteTask',
        
        // Rating Modal
        ratingModal: '#ratingModal',
        ratingForm: '#ratingForm',
        ratingModalTitle: '#ratingModalTitle',
        ratingId: '#ratingId',
        ratingDate: '#ratingDate',
        ratingQuality: '#ratingQuality',
        ratingPunctuality: '#ratingPunctuality',
        ratingReliability: '#ratingReliability',
        ratingDeadlines: '#ratingDeadlines',
        ratingQualityValue: '#ratingQualityValue',
        ratingPunctualityValue: '#ratingPunctualityValue',
        ratingReliabilityValue: '#ratingReliabilityValue',
        ratingDeadlinesValue: '#ratingDeadlinesValue',
        btnSaveRating: '#btnSaveRating',
        btnCloseRatingModal: '#btnCloseRatingModal',
        btnCancelRating: '#btnCancelRating'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the employee page
     */
    const init = async () => {
        CONFIG.log('Initializing Employee Page...');
        
        try {
            // Show loading state
            showLoading(true);
            
            // Parse member ID from URL
            memberId = Utils.getUrlParam('memberId');
            
            if (!memberId) {
                Utils.showToast('No member ID provided', 'error');
                setTimeout(() => {
                    window.location.href = 'members.html';
                }, 1500);
                return;
            }
            
            CONFIG.log('Loading employee:', memberId);
            
            // Load settings first
            await loadSettings();
            
            // Load member profile
            await loadMemberProfile();
            
            // Load all data in parallel
            await Promise.all([
                loadAttendance(),
                loadTasks(),
                loadRatings()
            ]);
            
            // Calculate and render summaries
            calculateSummaries();
            
            // Render the active tab
            switchTab(activeTab);
            
            // Setup event listeners
            setupEventListeners();
            
            // Hide loading
            showLoading(false);
            
            CONFIG.log('Employee Page initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Employee Page:', error);
            showLoading(false);
            showError('Failed to load employee profile. Please try again.');
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
            settings = {
                PaidLeavePerMonth: '2',
                WorkingDays: 'Mon,Tue,Wed,Thu,Fri',
                StartTime: '09:00',
                LateGracePeriod: '10'
            };
        }
    };

    /**
     * Load member profile
     */
    const loadMemberProfile = async () => {
        try {
            member = await API.getMemberById(memberId);
            
            if (!member) {
                throw new Error('Member not found');
            }
            
            CONFIG.log('Member loaded:', member);
            renderBasicInfo();
            
        } catch (error) {
            CONFIG.logError('Failed to load member:', error);
            Utils.showToast('Member not found', 'error');
            setTimeout(() => {
                window.location.href = 'members.html';
            }, 1500);
            throw error;
        }
    };

    /**
     * Load attendance records for this member
     */
    const loadAttendance = async () => {
        try {
            attendanceRecords = await API.getAttendanceByMember(memberId);
            
            // Sort by date descending
            attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            CONFIG.log(`Loaded ${attendanceRecords.length} attendance records`);
            
        } catch (error) {
            CONFIG.logError('Failed to load attendance:', error);
            attendanceRecords = [];
        }
    };

    /**
     * Load performance tasks for this member
     */
    const loadTasks = async () => {
        try {
            tasks = await API.getPerformanceTasks(memberId);
            
            // Sort by deadline (upcoming first)
            tasks.sort((a, b) => {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            
            // Check for overdue tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            tasks = tasks.map(task => {
                if (task.status !== 'Completed' && task.status !== 'Cancelled' && task.deadline) {
                    const deadline = new Date(task.deadline);
                    if (deadline < today) {
                        task.status = 'Overdue';
                    }
                }
                return task;
            });
            
            CONFIG.log(`Loaded ${tasks.length} tasks`);
            
        } catch (error) {
            CONFIG.logError('Failed to load tasks:', error);
            tasks = [];
        }
    };

    /**
     * Load ratings for this member
     */
    const loadRatings = async () => {
        try {
            ratings = await API.getRatings(memberId);
            
            // Sort by date ascending for chart
            ratings.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            CONFIG.log(`Loaded ${ratings.length} ratings`);
            
        } catch (error) {
            CONFIG.logError('Failed to load ratings:', error);
            ratings = [];
        }
    };

    // ============================================
    // 🎨 RENDER FUNCTIONS
    // ============================================

    /**
     * Render basic employee information
     */
    const renderBasicInfo = () => {
        if (!member) return;
        
        // Photo
        const photoUrl = member.photoURL || Utils.getAvatarUrl(member.name);
        $(SELECTORS.employeePhoto)
            .attr('src', photoUrl)
            .attr('alt', member.name)
            .on('error', function() {
                $(this).attr('src', Utils.getAvatarUrl(member.name));
            });
        
        // Name and basic info
        $(SELECTORS.employeeName).text(member.name || 'Unknown');
        $(SELECTORS.employeeDepartment).text(member.department || 'N/A');
        $(SELECTORS.employeeRole).text(member.role || 'N/A');
        $(SELECTORS.employeeEmail).text(member.email || 'N/A');
        $(SELECTORS.employeePhone).text(member.phone || 'N/A');
        $(SELECTORS.employeeId).text(member.memberId || 'N/A');
        
        // Dates
        $(SELECTORS.employeeJoinDate).text(
            member.joinDate ? Utils.formatDateDisplay(member.joinDate) : 'N/A'
        );
        $(SELECTORS.employeeBirthday).text(
            member.birthDate ? Utils.formatDateDisplay(member.birthDate) : 'N/A'
        );
        
        // Status badge
        renderStatusBadge(member.status);
        
        // Update page title
        document.title = `${member.name} | SquidX HRM`;
    };

    /**
     * Render member status badge
     */
    const renderStatusBadge = (status) => {
        const badges = {
            'Active': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
            'Inactive': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
            'On Leave': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
            'Terminated': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' }
        };
        
        const badge = badges[status] || badges['Inactive'];
        
        $(SELECTORS.employeeStatus).html(`
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}">
                <span class="w-2 h-2 rounded-full ${badge.dot}"></span>
                ${Utils.escapeHtml(status || 'Unknown')}
            </span>
        `);
    };

    /**
     * Render summary cards
     */
    const renderSummaryCards = (summaries) => {
        $(SELECTORS.summaryTotalDays).text(summaries.totalDays);
        $(SELECTORS.summaryPresentDays).text(summaries.presentDays);
        $(SELECTORS.summaryLateDays).text(summaries.lateDays);
        $(SELECTORS.summaryAbsentDays).text(summaries.absentDays);
        $(SELECTORS.summaryLeaveDays).text(summaries.leaveDays);
        $(SELECTORS.summaryRatingScore).text(summaries.averageRating.toFixed(1));
    };

    /**
     * Render attendance list
     */
    const renderAttendanceList = () => {
        const $list = $(SELECTORS.attendanceList);
        const $empty = $(SELECTORS.attendanceEmptyState);
        
        // Get filter values
        const filterMonth = $(SELECTORS.attendanceFilterMonth).val();
        const filterYear = $(SELECTORS.attendanceFilterYear).val();
        
        // Filter records
        let filtered = [...attendanceRecords];
        
        if (filterMonth && filterMonth !== 'all') {
            filtered = filtered.filter(a => {
                const month = new Date(a.date).getMonth() + 1;
                return month === parseInt(filterMonth);
            });
        }
        
        if (filterYear && filterYear !== 'all') {
            filtered = filtered.filter(a => {
                const year = new Date(a.date).getFullYear();
                return year === parseInt(filterYear);
            });
        }
        
        if (filtered.length === 0) {
            $list.html('');
            $empty.removeClass('hidden');
            return;
        }
        
        $empty.addClass('hidden');
        
        let html = '';
        
        filtered.forEach(record => {
            const statusConfig = ATTENDANCE_STATUS[record.status] || ATTENDANCE_STATUS['Present'];
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const formattedDate = Utils.formatDateDisplay(record.date);
            
            html += `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-4">
                        <!-- Date -->
                        <div class="text-center min-w-[60px]">
                            <p class="text-2xl font-bold text-gray-900">${date.getDate()}</p>
                            <p class="text-xs text-gray-500">${dayName}</p>
                        </div>
                        
                        <!-- Status Icon -->
                        <div class="w-10 h-10 rounded-full bg-${statusConfig.color}-100 flex items-center justify-center">
                            ${getStatusIcon(statusConfig.icon, statusConfig.color)}
                        </div>
                        
                        <!-- Details -->
                        <div>
                            <p class="font-medium text-gray-900">${formattedDate}</p>
                            <div class="flex items-center gap-3 text-sm text-gray-500">
                                <span>In: ${record.punchIn || '--:--'}</span>
                                <span>•</span>
                                <span>Out: ${record.punchOut || '--:--'}</span>
                                ${record.hoursWorked ? `<span>•</span><span>${record.hoursWorked} hrs</span>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Badge -->
                    <span class="px-3 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-800">
                        ${statusConfig.label}
                    </span>
                </div>
            `;
        });
        
        $list.html(html);
    };

    /**
     * Get status icon SVG
     */
    const getStatusIcon = (icon, color) => {
        const icons = {
            'check-circle': `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            'clock': `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            'x-circle': `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            'calendar': `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
            'minus-circle': `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        };
        return icons[icon] || icons['check-circle'];
    };

    /**
     * Render leave list
     */
    const renderLeaveList = () => {
        const $list = $(SELECTORS.leaveList);
        const $empty = $(SELECTORS.leaveEmptyState);
        
        // Calculate leave from attendance (days marked as "On Leave")
        const leaveDays = attendanceRecords.filter(a => a.status === 'On Leave');
        
        // Calculate leave summary
        const paidLeavePerMonth = parseInt(settings.PaidLeavePerMonth) || 2;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthLeave = leaveDays.filter(a => {
            const date = new Date(a.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        
        const remainingLeave = Math.max(0, paidLeavePerMonth - thisMonthLeave);
        
        // Update leave stats
        $(SELECTORS.leaveRemaining).text(remainingLeave);
        $(SELECTORS.leaveTaken).text(thisMonthLeave);
        $(SELECTORS.leaveTotal).text(paidLeavePerMonth);
        
        if (leaveDays.length === 0) {
            $list.html('');
            $empty.removeClass('hidden');
            return;
        }
        
        $empty.addClass('hidden');
        
        // Group by month
        const groupedByMonth = {};
        leaveDays.forEach(leave => {
            const date = new Date(leave.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groupedByMonth[key]) {
                groupedByMonth[key] = [];
            }
            groupedByMonth[key].push(leave);
        });
        
        let html = '';
        
        Object.entries(groupedByMonth)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .forEach(([monthKey, leaves]) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                
                html += `
                    <div class="mb-4">
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">${monthName}</h4>
                        <div class="space-y-2">
                `;
                
                leaves.forEach(leave => {
                    html += `
                        <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <span class="text-sm font-medium text-gray-900">
                                    ${Utils.formatDateDisplay(leave.date)}
                                </span>
                            </div>
                            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                On Leave
                            </span>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
        
        $list.html(html);
    };

    /**
     * Render tasks list
     */
    const renderTaskList = () => {
        const $list = $(SELECTORS.taskList);
        const $empty = $(SELECTORS.taskEmptyState);
        
        // Calculate task stats
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
        const overdue = tasks.filter(t => t.status === 'Overdue').length;
        
        $(SELECTORS.taskStats).html(`
            <span class="text-green-600">${completed} Completed</span>
            <span class="text-gray-400">•</span>
            <span class="text-blue-600">${pending} In Progress</span>
            ${overdue > 0 ? `<span class="text-gray-400">•</span><span class="text-red-600">${overdue} Overdue</span>` : ''}
        `);
        
        if (tasks.length === 0) {
            $list.html('');
            $empty.removeClass('hidden');
            return;
        }
        
        $empty.addClass('hidden');
        
        let html = '';
        
        tasks.forEach(task => {
            const statusConfig = TASK_STATUS[task.status] || TASK_STATUS['Pending'];
            const deadline = task.deadline ? Utils.formatDateDisplay(task.deadline) : 'No deadline';
            const isOverdue = task.status === 'Overdue';
            
            html += `
                <div class="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer task-item"
                     data-task-id="${task.taskId}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 ${task.status === 'Completed' ? 'line-through text-gray-500' : ''}">
                                ${Utils.escapeHtml(task.title)}
                            </h4>
                            ${task.notes ? `<p class="text-sm text-gray-500 mt-1">${Utils.escapeHtml(task.notes)}</p>` : ''}
                            <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span class="flex items-center gap-1">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <span class="${isOverdue ? 'text-red-600 font-medium' : ''}">${deadline}</span>
                                </span>
                                ${task.score ? `
                                    <span class="flex items-center gap-1">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                        </svg>
                                        Score: ${task.score}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-800">
                            ${statusConfig.label}
                        </span>
                    </div>
                </div>
            `;
        });
        
        $list.html(html);
        
        // Attach click handlers
        $('.task-item').on('click', function() {
            const taskId = $(this).data('task-id');
            openTaskModal(taskId);
        });
    };

    /**
     * Render ratings chart
     */
    const renderRatingsChart = () => {
        const canvas = document.getElementById('ratingChartCanvas');
        if (!canvas) return;
        
        // Destroy existing chart
        if (ratingsChart) {
            ratingsChart.destroy();
        }
        
        if (ratings.length === 0) {
            $(SELECTORS.ratingChart).addClass('hidden');
            return;
        }
        
        $(SELECTORS.ratingChart).removeClass('hidden');
        
        const labels = ratings.map(r => Utils.formatDateDisplay(r.date));
        
        const ctx = canvas.getContext('2d');
        
        ratingsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Quality',
                        data: ratings.map(r => r.quality || 0),
                        borderColor: CHART_COLORS.quality.border,
                        backgroundColor: CHART_COLORS.quality.background,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Punctuality',
                        data: ratings.map(r => r.punctuality || 0),
                        borderColor: CHART_COLORS.punctuality.border,
                        backgroundColor: CHART_COLORS.punctuality.background,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Reliability',
                        data: ratings.map(r => r.reliability || 0),
                        borderColor: CHART_COLORS.reliability.border,
                        backgroundColor: CHART_COLORS.reliability.background,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Deadlines',
                        data: ratings.map(r => r.deadlines || 0),
                        borderColor: CHART_COLORS.deadlines.border,
                        backgroundColor: CHART_COLORS.deadlines.background,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    };

    /**
     * Render ratings list
     */
    const renderRatingsList = () => {
        const $list = $(SELECTORS.ratingList);
        const $empty = $(SELECTORS.ratingEmptyState);
        
        // Calculate and display average rating
        const avgRating = calculateAverageRating();
        $(SELECTORS.averageRating).html(`
            <span class="text-3xl font-bold text-gray-900">${avgRating.toFixed(1)}</span>
            <span class="text-gray-500">/5</span>
        `);
        
        if (ratings.length === 0) {
            $list.html('');
            $empty.removeClass('hidden');
            return;
        }
        
        $empty.addClass('hidden');
        
        // Show ratings in reverse chronological order
        const sortedRatings = [...ratings].reverse();
        
        let html = '';
        
        sortedRatings.forEach(rating => {
            const avg = (
                (rating.quality || 0) + 
                (rating.punctuality || 0) + 
                (rating.reliability || 0) + 
                (rating.deadlines || 0)
            ) / 4;
            
            html += `
                <div class="p-4 bg-white border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-gray-900">
                            ${Utils.formatDateDisplay(rating.date)}
                        </span>
                        <span class="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                            ${avg.toFixed(1)}/5
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Quality</span>
                            <div class="flex items-center gap-1">
                                ${renderStars(rating.quality || 0)}
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Punctuality</span>
                            <div class="flex items-center gap-1">
                                ${renderStars(rating.punctuality || 0)}
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Reliability</span>
                            <div class="flex items-center gap-1">
                                ${renderStars(rating.reliability || 0)}
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Deadlines</span>
                            <div class="flex items-center gap-1">
                                ${renderStars(rating.deadlines || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        $list.html(html);
    };

    /**
     * Render star rating
     */
    const renderStars = (value) => {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= value) {
                html += `<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
            } else {
                html += `<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
            }
        }
        return html;
    };

    // ============================================
    // 🔢 CALCULATION HELPERS
    // ============================================

    /**
     * Calculate all summaries
     */
    const calculateSummaries = () => {
        const summaries = {
            totalDays: attendanceRecords.length,
            presentDays: attendanceRecords.filter(a => a.status === 'On Time' || a.status === 'Present').length,
            lateDays: attendanceRecords.filter(a => a.status === 'Late').length,
            absentDays: attendanceRecords.filter(a => a.status === 'Absent').length,
            leaveDays: attendanceRecords.filter(a => a.status === 'On Leave').length,
            averageRating: calculateAverageRating()
        };
        
        renderSummaryCards(summaries);
        populateAttendanceFilters();
    };

    /**
     * Calculate average rating across all rating records
     */
    const calculateAverageRating = () => {
        if (ratings.length === 0) return 0;
        
        let totalScore = 0;
        let count = 0;
        
        ratings.forEach(r => {
            const values = [r.quality, r.punctuality, r.reliability, r.deadlines]
                .filter(v => v !== null && v !== undefined && v !== '');
            
            if (values.length > 0) {
                totalScore += values.reduce((sum, v) => sum + Number(v), 0);
                count += values.length;
            }
        });
        
        return count > 0 ? totalScore / count : 0;
    };

    /**
     * Populate attendance filter dropdowns
     */
    const populateAttendanceFilters = () => {
        // Get unique years and months from attendance
        const years = new Set();
        const months = new Set();
        
        attendanceRecords.forEach(a => {
            const date = new Date(a.date);
            years.add(date.getFullYear());
            months.add(date.getMonth() + 1);
        });
        
        // Populate year filter
        let yearOptions = '<option value="all">All Years</option>';
        [...years].sort((a, b) => b - a).forEach(year => {
            yearOptions += `<option value="${year}">${year}</option>`;
        });
        $(SELECTORS.attendanceFilterYear).html(yearOptions);
        
        // Populate month filter
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let monthOptions = '<option value="all">All Months</option>';
        [...months].sort((a, b) => a - b).forEach(month => {
            monthOptions += `<option value="${month}">${monthNames[month - 1]}</option>`;
        });
        $(SELECTORS.attendanceFilterMonth).html(monthOptions);
    };

    // ============================================
    // 📑 TAB HANDLING
    // ============================================

    /**
     * Switch to a different tab
     */
    const switchTab = (tabName) => {
        activeTab = tabName;
        
        // Update tab buttons
        $(SELECTORS.tabButtons).removeClass('border-primary-500 text-primary-600').addClass('border-transparent text-gray-500');
        $(`[data-tab="${tabName}"]`).removeClass('border-transparent text-gray-500').addClass('border-primary-500 text-primary-600');
        
        // Update tab contents
        $(SELECTORS.tabContents).addClass('hidden');
        $(`#${tabName}Content`).removeClass('hidden');
        
        // Render tab content
        switch (tabName) {
            case 'attendance':
                renderAttendanceList();
                break;
            case 'leave':
                renderLeaveList();
                break;
            case 'performance':
                renderTaskList();
                break;
            case 'ratings':
                renderRatingsChart();
                renderRatingsList();
                break;
        }
    };

    // ============================================
    // 📝 TASK MODAL
    // ============================================

    /**
     * Open task modal for add/edit
     */
    const openTaskModal = (taskId = null) => {
        editingTaskId = taskId;
        
        // Reset form
        $(SELECTORS.taskForm)[0]?.reset();
        clearFormErrors(SELECTORS.taskForm);
        
        if (taskId) {
            // Edit mode
            const task = tasks.find(t => t.taskId === taskId);
            if (task) {
                $(SELECTORS.taskModalTitle).text('Edit Task');
                $(SELECTORS.taskId).val(task.taskId);
                $(SELECTORS.taskTitle).val(task.title || '');
                $(SELECTORS.taskDescription).val(task.notes || '');
                $(SELECTORS.taskDeadline).val(task.deadline || '');
                $(SELECTORS.taskStatus).val(task.status || 'Pending');
                $(SELECTORS.taskScore).val(task.score || '');
                $(SELECTORS.btnDeleteTask).removeClass('hidden');
                $(SELECTORS.btnSaveTask).text('Update Task');
            }
        } else {
            // Add mode
            $(SELECTORS.taskModalTitle).text('Add New Task');
            $(SELECTORS.taskId).val('');
            $(SELECTORS.taskStatus).val('Pending');
            $(SELECTORS.btnDeleteTask).addClass('hidden');
            $(SELECTORS.btnSaveTask).text('Add Task');
        }
        
        // Show modal
        $(SELECTORS.taskModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.taskModal).find('.modal-content').removeClass('scale-95 opacity-0');
            $(SELECTORS.taskTitle).focus();
        }, 10);
    };

    /**
     * Close task modal
     */
    const closeTaskModal = () => {
        const modal = $(SELECTORS.taskModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
            editingTaskId = null;
        }, 200);
    };

    /**
     * Save task
     */
    const saveTask = async () => {
        if (isSaving) return;
        
        // Validate
        const title = $(SELECTORS.taskTitle).val().trim();
        if (!title) {
            Utils.showToast('Task title is required', 'error');
            $(SELECTORS.taskTitle).addClass('border-red-500');
            return;
        }
        
        const taskData = {
            memberId: memberId,
            title: title,
            notes: $(SELECTORS.taskDescription).val().trim(),
            deadline: $(SELECTORS.taskDeadline).val(),
            status: $(SELECTORS.taskStatus).val(),
            score: $(SELECTORS.taskScore).val()
        };
        
        try {
            isSaving = true;
            updateSaveButton(SELECTORS.btnSaveTask, true);
            
            if (editingTaskId) {
                // Update existing task
                await API.updateTask(editingTaskId, taskData);
                Utils.showToast('Task updated successfully!', 'success');
            } else {
                // Add new task
                await API.addTask(taskData);
                Utils.showToast('Task added successfully!', 'success');
            }
            
            closeTaskModal();
            await loadTasks();
            renderTaskList();
            calculateSummaries();
            
        } catch (error) {
            CONFIG.logError('Failed to save task:', error);
            Utils.showToast(error.message || 'Failed to save task', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(SELECTORS.btnSaveTask, false, editingTaskId ? 'Update Task' : 'Add Task');
        }
    };

    /**
     * Delete task
     */
    const deleteTask = async () => {
        if (!editingTaskId) return;
        
        const confirmed = await Utils.showConfirm(
            'Are you sure you want to delete this task?',
            'Delete Task'
        );
        
        if (!confirmed) return;
        
        try {
            await API.deleteTask(editingTaskId);
            Utils.showToast('Task deleted', 'success');
            closeTaskModal();
            await loadTasks();
            renderTaskList();
            calculateSummaries();
        } catch (error) {
            CONFIG.logError('Failed to delete task:', error);
            Utils.showToast(error.message || 'Failed to delete task', 'error');
        }
    };

    // ============================================
    // ⭐ RATING MODAL
    // ============================================

    /**
     * Open rating modal
     */
    const openRatingModal = () => {
        // Reset form
        $(SELECTORS.ratingForm)[0]?.reset();
        
        // Set defaults
        $(SELECTORS.ratingModalTitle).text('Add Rating');
        $(SELECTORS.ratingDate).val(Utils.formatDate(new Date()));
        
        // Set slider values
        [
            { slider: SELECTORS.ratingQuality, value: SELECTORS.ratingQualityValue },
            { slider: SELECTORS.ratingPunctuality, value: SELECTORS.ratingPunctualityValue },
            { slider: SELECTORS.ratingReliability, value: SELECTORS.ratingReliabilityValue },
            { slider: SELECTORS.ratingDeadlines, value: SELECTORS.ratingDeadlinesValue }
        ].forEach(({ slider, value }) => {
            $(slider).val(3);
            $(value).text('3');
        });
        
        // Show modal
        $(SELECTORS.ratingModal).removeClass('hidden').addClass('flex');
        setTimeout(() => {
            $(SELECTORS.ratingModal).find('.modal-content').removeClass('scale-95 opacity-0');
        }, 10);
    };

    /**
     * Close rating modal
     */
    const closeRatingModal = () => {
        const modal = $(SELECTORS.ratingModal);
        modal.find('.modal-content').addClass('scale-95 opacity-0');
        
        setTimeout(() => {
            modal.removeClass('flex').addClass('hidden');
        }, 200);
    };

    /**
     * Save rating
     */
    const saveRating = async () => {
        if (isSaving) return;
        
        const ratingData = {
            memberId: memberId,
            date: $(SELECTORS.ratingDate).val() || Utils.formatDate(new Date()),
            quality: parseInt($(SELECTORS.ratingQuality).val()) || 0,
            punctuality: parseInt($(SELECTORS.ratingPunctuality).val()) || 0,
            reliability: parseInt($(SELECTORS.ratingReliability).val()) || 0,
            deadlines: parseInt($(SELECTORS.ratingDeadlines).val()) || 0
        };
        
        try {
            isSaving = true;
            updateSaveButton(SELECTORS.btnSaveRating, true);
            
            await API.addRating(ratingData);
            Utils.showToast('Rating added successfully!', 'success');
            
            closeRatingModal();
            await loadRatings();
            renderRatingsChart();
            renderRatingsList();
            calculateSummaries();
            
        } catch (error) {
            CONFIG.logError('Failed to save rating:', error);
            Utils.showToast(error.message || 'Failed to save rating', 'error');
        } finally {
            isSaving = false;
            updateSaveButton(SELECTORS.btnSaveRating, false, 'Add Rating');
        }
    };

    // ============================================
    // 🔧 UI HELPERS
    // ============================================

    /**
     * Show/hide loading overlay
     */
    const showLoading = (show) => {
        if (show) {
            $(SELECTORS.loadingOverlay).removeClass('hidden');
        } else {
            $(SELECTORS.loadingOverlay).addClass('hidden');
        }
    };

    /**
     * Show error state
     */
    const showError = (message) => {
        $(SELECTORS.pageContainer).addClass('hidden');
        $(SELECTORS.errorContainer).removeClass('hidden').html(`
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
                <p class="text-gray-500 mb-6">${Utils.escapeHtml(message)}</p>
                <a href="members.html" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    Back to Directory
                </a>
            </div>
        `);
    };

    /**
     * Update save button state
     */
    const updateSaveButton = (selector, loading, text = 'Save') => {
        const $btn = $(selector);
        
        if (loading) {
            $btn.prop('disabled', true).html(`
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving...
            `);
        } else {
            $btn.prop('disabled', false).text(text);
        }
    };

    /**
     * Clear form error states
     */
    const clearFormErrors = (formSelector) => {
        $(`${formSelector} input, ${formSelector} select, ${formSelector} textarea`)
            .removeClass('border-red-500');
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Tab navigation
        $(SELECTORS.tabButtons).on('click', function() {
            const tab = $(this).data('tab');
            switchTab(tab);
        });
        
        // Attendance filters
        $(SELECTORS.attendanceFilterMonth).on('change', renderAttendanceList);
        $(SELECTORS.attendanceFilterYear).on('change', renderAttendanceList);
        
        // Task modal
        $(SELECTORS.btnAddTask).on('click', () => openTaskModal());
        $(SELECTORS.btnCloseTaskModal).on('click', closeTaskModal);
        $(SELECTORS.btnCancelTask).on('click', closeTaskModal);
        $(SELECTORS.btnSaveTask).on('click', saveTask);
        $(SELECTORS.btnDeleteTask).on('click', deleteTask);
        
        $(SELECTORS.taskForm).on('submit', function(e) {
            e.preventDefault();
            saveTask();
        });
        
        // Rating modal
        $(SELECTORS.btnAddRating).on('click', openRatingModal);
        $(SELECTORS.btnCloseRatingModal).on('click', closeRatingModal);
        $(SELECTORS.btnCancelRating).on('click', closeRatingModal);
        $(SELECTORS.btnSaveRating).on('click', saveRating);
        
        $(SELECTORS.ratingForm).on('submit', function(e) {
            e.preventDefault();
            saveRating();
        });
        
        // Rating sliders
        [
            { slider: SELECTORS.ratingQuality, value: SELECTORS.ratingQualityValue },
            { slider: SELECTORS.ratingPunctuality, value: SELECTORS.ratingPunctualityValue },
            { slider: SELECTORS.ratingReliability, value: SELECTORS.ratingReliabilityValue },
            { slider: SELECTORS.ratingDeadlines, value: SELECTORS.ratingDeadlinesValue }
        ].forEach(({ slider, value }) => {
            $(slider).on('input', function() {
                $(value).text($(this).val());
            });
        });
        
        // Modal backdrop clicks
        $(SELECTORS.taskModal).on('click', function(e) {
            if (e.target === this) closeTaskModal();
        });
        $(SELECTORS.ratingModal).on('click', function(e) {
            if (e.target === this) closeRatingModal();
        });
        
        // Edit member button
        $(SELECTORS.btnEditMember).on('click', function() {
            // Redirect to members page with edit action
            window.location.href = `members.html?edit=${memberId}`;
        });
        
        // Back to directory
        $(SELECTORS.btnBackToDirectory).on('click', function() {
            window.location.href = 'members.html';
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                if (!$(SELECTORS.taskModal).hasClass('hidden')) {
                    closeTaskModal();
                }
                if (!$(SELECTORS.ratingModal).hasClass('hidden')) {
                    closeRatingModal();
                }
            }
        });
        
        // Clear input errors on change
        $('input, select, textarea').on('input change', function() {
            $(this).removeClass('border-red-500');
        });
    };

    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        switchTab,
        openTaskModal,
        closeTaskModal,
        openRatingModal,
        closeRatingModal,
        
        // State getters
        getMember: () => member,
        getMemberId: () => memberId,
        getAttendance: () => [...attendanceRecords],
        getTasks: () => [...tasks],
        getRatings: () => [...ratings]
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    EmployeePage.init();
});