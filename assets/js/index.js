/**
 * SquidX HRM — Dashboard Page Controller
 * ========================================
 * Handles all dashboard functionality including:
 * - Summary cards (employees, attendance, tasks)
 * - Today's attendance snapshot
 * - Monthly attendance chart
 * - Department distribution chart
 * - Latest check-ins list
 * - Quick access links
 * 
 * Dependencies:
 *   - jQuery
 *   - Chart.js
 *   - /config/sheet-config.js
 *   - /assets/js/api.js
 *   - /assets/js/utils.js
 */

const DashboardPage = (function() {
    'use strict';

    // ============================================
    // 📦 STATE VARIABLES
    // ============================================

    /**
     * Application settings from Google Sheets
     */
    let settings = {};

    /**
     * All members data
     */
    let members = [];

    /**
     * Active members only
     */
    let activeMembers = [];

    /**
     * Today's attendance records
     */
    let todayRecords = [];

    /**
     * Attendance records for current month (for charts)
     */
    let monthRangeRecords = [];

    /**
     * All ratings data
     */
    let ratings = [];

    /**
     * All tasks data
     */
    let tasks = [];

    /**
     * Today's date in YYYY-MM-DD format
     */
    let today = '';

    /**
     * Chart instances
     */
    let charts = {
        attendance: null,
        department: null
    };

    /**
     * Loading state flag
     */
    let isLoading = false;

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================

    /**
     * Chart color palette
     */
    const CHART_COLORS = {
        primary: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        purple: '#8B5CF6',
        pink: '#EC4899',
        teal: '#14B8A6',
        palette: [
            '#6366F1', '#10B981', '#F59E0B', '#EF4444',
            '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
            '#F97316', '#06B6D4', '#84CC16', '#A855F7'
        ]
    };

    /**
     * Status badge configurations
     */
    const STATUS_CONFIG = {
        'On Time': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
        'Present': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
        'Late': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
        'Absent': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
        'On Leave': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
        'Half Day': { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' }
    };

    // ============================================
    // 🎯 DOM SELECTORS
    // ============================================

    const SELECTORS = {
        // Loading
        loadingOverlay: '#dashboardLoadingOverlay',
        pageContainer: '#dashboardContainer',
        
        // Summary Cards
        cardTotalEmployees: '#cardTotalEmployees',
        cardPresentToday: '#cardPresentToday',
        cardLateToday: '#cardLateToday',
        cardAbsentToday: '#cardAbsentToday',
        cardAvgRating: '#cardAvgRating',
        cardTasksDueToday: '#cardTasksDueToday',
        
        // Progress indicators
        presentProgress: '#presentProgress',
        lateProgress: '#lateProgress',
        absentProgress: '#absentProgress',
        
        // Lists
        latestCheckinsList: '#latestCheckinsList',
        departmentDistributionList: '#departmentDistributionList',
        upcomingTasksList: '#upcomingTasksList',
        
        // Charts
        attendanceChart: '#attendanceChart',
        departmentChart: '#departmentChart',
        
        // Action Buttons
        btnRefreshDashboard: '#btnRefreshDashboard',
        
        // Date Display
        todayDateDisplay: '#todayDateDisplay',
        
        // Quick Stats
        quickStatsContainer: '#quickStatsContainer'
    };

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize the dashboard
     */
    const init = async () => {
        CONFIG.log('Initializing Dashboard...');
        
        try {
            // Show loading state
            showLoading(true);
            
            // Get today's date
            today = Utils.getToday();
            updateDateDisplay();
            
            // Load all data in parallel
            await Promise.all([
                loadSettings(),
                loadMembers(),
                loadTodayAttendance(),
                loadMonthAttendanceRange(),
                loadRatings(),
                loadTasks()
            ]);
            
            // Calculate statistics
            const stats = calculateTodayStats();
            
            // Render all sections
            renderSummaryCards(stats);
            renderLatestCheckins();
            renderDepartmentDistribution();
            renderUpcomingTasks();
            
            // Render charts
            renderAttendanceChart();
            renderDepartmentChart();
            
            // Setup event listeners
            setupEventListeners();
            
            // Hide loading
            showLoading(false);
            
            CONFIG.log('Dashboard initialized successfully');
            
        } catch (error) {
            CONFIG.logError('Failed to initialize Dashboard:', error);
            showLoading(false);
            Utils.showToast('Failed to load dashboard. Please refresh.', 'error');
            renderErrorState();
        }
    };

    /**
     * Refresh all dashboard data
     */
    const refreshDashboard = async () => {
        if (isLoading) return;
        
        try {
            showLoading(true);
            
            // Update today's date
            today = Utils.getToday();
            updateDateDisplay();
            
            // Reload all data
            await Promise.all([
                loadSettings(),
                loadMembers(),
                loadTodayAttendance(),
                loadMonthAttendanceRange(),
                loadRatings(),
                loadTasks()
            ]);
            
            // Re-calculate and render
            const stats = calculateTodayStats();
            renderSummaryCards(stats);
            renderLatestCheckins();
            renderDepartmentDistribution();
            renderUpcomingTasks();
            renderAttendanceChart();
            renderDepartmentChart();
            
            showLoading(false);
            Utils.showToast('Dashboard refreshed', 'success');
            
        } catch (error) {
            CONFIG.logError('Failed to refresh dashboard:', error);
            showLoading(false);
            Utils.showToast('Failed to refresh. Please try again.', 'error');
        }
    };

    // ============================================
    // 📥 DATA LOADERS
    // ============================================

    /**
     * Load application settings
     */
    const loadSettings = async () => {
        try {
            settings = await API.getSettings();
            CONFIG.log('Settings loaded');
        } catch (error) {
            CONFIG.logError('Failed to load settings:', error);
            // Use defaults
            settings = {
                StartTime: '09:00',
                LateGracePeriod: '10',
                WorkingDays: 'Mon,Tue,Wed,Thu,Fri',
                WorkingHoursPerDay: '8',
                PaidLeavePerMonth: '2'
            };
        }
    };

    /**
     * Load all members
     */
    const loadMembers = async () => {
        try {
            members = await API.getAllMembers();
            activeMembers = members.filter(m => m.status === 'Active');
            CONFIG.log(`Loaded ${members.length} members (${activeMembers.length} active)`);
        } catch (error) {
            CONFIG.logError('Failed to load members:', error);
            members = [];
            activeMembers = [];
        }
    };

    /**
     * Load today's attendance records
     */
    const loadTodayAttendance = async () => {
        try {
            todayRecords = await API.getAttendanceByDate(today);
            
            // Sort by punch-in time (most recent first)
            todayRecords = sortCheckinsByTime(todayRecords);
            
            CONFIG.log(`Loaded ${todayRecords.length} attendance records for today`);
        } catch (error) {
            CONFIG.logError('Failed to load today attendance:', error);
            todayRecords = [];
        }
    };

    /**
     * Load attendance records for the current month
     */
    const loadMonthAttendanceRange = async () => {
        try {
            const start = getMonthStart(today);
            const end = getMonthEnd(today);
            
            monthRangeRecords = await API.getAttendanceRange(start, end);
            CONFIG.log(`Loaded ${monthRangeRecords.length} records for current month`);
        } catch (error) {
            CONFIG.logError('Failed to load month attendance:', error);
            monthRangeRecords = [];
        }
    };

    /**
     * Load ratings data
     */
    const loadRatings = async () => {
        try {
            ratings = await API.getRatings();
            CONFIG.log(`Loaded ${ratings.length} ratings`);
        } catch (error) {
            CONFIG.logError('Failed to load ratings:', error);
            ratings = [];
        }
    };

    /**
     * Load tasks data
     */
    const loadTasks = async () => {
        try {
            tasks = await API.getPerformanceTasks();
            CONFIG.log(`Loaded ${tasks.length} tasks`);
        } catch (error) {
            CONFIG.logError('Failed to load tasks:', error);
            tasks = [];
        }
    };

    // ============================================
    // 🔢 SUMMARY CALCULATIONS
    // ============================================

    /**
     * Calculate today's attendance statistics
     * @returns {Object} Stats object
     */
    const calculateTodayStats = () => {
        const totalEmployees = activeMembers.length;
        const presentCount = todayRecords.filter(r => 
            r.status === 'On Time' || r.status === 'Present'
        ).length;
        const lateCount = todayRecords.filter(r => r.status === 'Late').length;
        const onLeaveCount = todayRecords.filter(r => r.status === 'On Leave').length;
        const halfDayCount = todayRecords.filter(r => r.status === 'Half Day').length;
        
        // Absent = total employees - everyone who has a record
        const absentCount = Math.max(0, totalEmployees - todayRecords.length);
        
        // Calculate average rating
        const avgRating = calculateAverageRating();
        
        // Calculate tasks due today
        const tasksDueToday = calculateTasksDueToday();
        
        return {
            totalEmployees,
            presentCount,
            lateCount,
            absentCount,
            onLeaveCount,
            halfDayCount,
            avgRating,
            tasksDueToday,
            attendanceRate: totalEmployees > 0 
                ? Math.round(((presentCount + lateCount) / totalEmployees) * 100) 
                : 0
        };
    };

    /**
     * Calculate average rating across all employees
     * @returns {number} Average rating (0-5)
     */
    const calculateAverageRating = () => {
        if (ratings.length === 0) return 0;
        
        let totalScore = 0;
        let count = 0;
        
        ratings.forEach(r => {
            const values = [r.quality, r.punctuality, r.reliability, r.deadlines]
                .filter(v => v !== null && v !== undefined && v !== '')
                .map(v => Number(v));
            
            if (values.length > 0) {
                totalScore += values.reduce((sum, v) => sum + v, 0);
                count += values.length;
            }
        });
        
        return count > 0 ? (totalScore / count) : 0;
    };

    /**
     * Calculate number of tasks due today
     * @returns {number} Count of tasks due today
     */
    const calculateTasksDueToday = () => {
        return tasks.filter(t => {
            if (t.status === 'Completed' || t.status === 'Cancelled') return false;
            if (!t.deadline) return false;
            return t.deadline === today;
        }).length;
    };

    // ============================================
    // 🎨 RENDER FUNCTIONS
    // ============================================

    /**
     * Render summary cards
     * @param {Object} stats - Calculated statistics
     */
    const renderSummaryCards = (stats) => {
        // Total Employees
        $(SELECTORS.cardTotalEmployees).text(stats.totalEmployees);
        
        // Present Today
        $(SELECTORS.cardPresentToday).text(stats.presentCount);
        
        // Late Today
        $(SELECTORS.cardLateToday).text(stats.lateCount);
        
        // Absent Today
        $(SELECTORS.cardAbsentToday).text(stats.absentCount);
        
        // Average Rating
        $(SELECTORS.cardAvgRating).text(stats.avgRating.toFixed(1));
        
        // Tasks Due Today
        $(SELECTORS.cardTasksDueToday).text(stats.tasksDueToday);
        
        // Update progress bars if they exist
        if (stats.totalEmployees > 0) {
            const presentPercent = Math.round((stats.presentCount / stats.totalEmployees) * 100);
            const latePercent = Math.round((stats.lateCount / stats.totalEmployees) * 100);
            const absentPercent = Math.round((stats.absentCount / stats.totalEmployees) * 100);
            
            $(SELECTORS.presentProgress).css('width', `${presentPercent}%`).attr('title', `${presentPercent}%`);
            $(SELECTORS.lateProgress).css('width', `${latePercent}%`).attr('title', `${latePercent}%`);
            $(SELECTORS.absentProgress).css('width', `${absentPercent}%`).attr('title', `${absentPercent}%`);
        }
    };

    /**
     * Render latest check-ins list
     */
    const renderLatestCheckins = () => {
        const $list = $(SELECTORS.latestCheckinsList);
        
        if (todayRecords.length === 0) {
            $list.html(`
                <div class="text-center py-8">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-sm">No check-ins recorded today</p>
                </div>
            `);
            return;
        }
        
        // Show latest 8 check-ins
        const latestCheckins = todayRecords.slice(0, 8);
        
        let html = '';
        
        latestCheckins.forEach(record => {
            const member = getMemberById(record.memberId);
            const memberName = record.memberName || member?.name || 'Unknown';
            const memberPhoto = record.memberPhoto || member?.photoURL || '';
            const department = record.department || member?.department || '';
            const memberLink = `employee.html?memberId=${record.memberId}`;
            const punchInTime = formatTime(record.punchIn);
            const statusBadge = renderStatusBadge(record.status);
            
            html += `
                <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                    <a href="${memberLink}" class="flex items-center gap-3 flex-1 group">
                        <img class="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500 transition-all"
                             src="${memberPhoto || Utils.getAvatarUrl(memberName)}"
                             alt="${Utils.escapeHtml(memberName)}"
                             onerror="this.src='${Utils.getAvatarUrl(memberName)}'">
                        <div>
                            <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                                ${Utils.escapeHtml(memberName)}
                            </p>
                            <p class="text-xs text-gray-500">${Utils.escapeHtml(department)}</p>
                        </div>
                    </a>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-500 font-medium">${punchInTime}</span>
                        ${statusBadge}
                    </div>
                </div>
            `;
        });
        
        $list.html(html);
    };

    /**
     * Render department distribution list
     */
    const renderDepartmentDistribution = () => {
        const $list = $(SELECTORS.departmentDistributionList);
        
        if (activeMembers.length === 0) {
            $list.html(`
                <div class="text-center py-6">
                    <p class="text-gray-500 text-sm">No department data available</p>
                </div>
            `);
            return;
        }
        
        // Group by department
        const departments = {};
        activeMembers.forEach(member => {
            const dept = member.department || 'Unassigned';
            if (!departments[dept]) {
                departments[dept] = { count: 0, present: 0 };
            }
            departments[dept].count++;
            
            // Check if present today
            const hasAttendance = todayRecords.find(r => r.memberId === member.memberId);
            if (hasAttendance) {
                departments[dept].present++;
            }
        });
        
        // Sort by count descending
        const sortedDepts = Object.entries(departments)
            .sort((a, b) => b[1].count - a[1].count);
        
        let html = '';
        const colors = CHART_COLORS.palette;
        
        sortedDepts.forEach(([dept, data], index) => {
            const color = colors[index % colors.length];
            const percentage = Math.round((data.count / activeMembers.length) * 100);
            const attendanceRate = data.count > 0 
                ? Math.round((data.present / data.count) * 100) 
                : 0;
            
            html += `
                <div class="flex items-center justify-between py-2">
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
                        <span class="text-sm text-gray-700">${Utils.escapeHtml(dept)}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-medium text-gray-900">${data.count}</span>
                        <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full rounded-full" style="width: ${percentage}%; background-color: ${color}"></div>
                        </div>
                        <span class="text-xs text-gray-500 w-8 text-right">${percentage}%</span>
                    </div>
                </div>
            `;
        });
        
        $list.html(html);
    };

    /**
     * Render upcoming tasks list
     */
    const renderUpcomingTasks = () => {
        const $list = $(SELECTORS.upcomingTasksList);
        
        if (!$list.length) return;
        
        // Filter and sort upcoming tasks
        const upcomingTasks = tasks
            .filter(t => {
                if (t.status === 'Completed' || t.status === 'Cancelled') return false;
                if (!t.deadline) return false;
                return t.deadline >= today;
            })
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 5);
        
        if (upcomingTasks.length === 0) {
            $list.html(`
                <div class="text-center py-6">
                    <p class="text-gray-500 text-sm">No upcoming tasks</p>
                </div>
            `);
            return;
        }
        
        let html = '';
        
        upcomingTasks.forEach(task => {
            const member = getMemberById(task.memberId);
            const memberName = task.memberName || member?.name || 'Unassigned';
            const memberLink = `employee.html?memberId=${task.memberId}`;
            const isToday = task.deadline === today;
            const isOverdue = task.deadline < today;
            
            let deadlineClass = 'text-gray-600';
            let deadlineLabel = Utils.formatDateDisplay(task.deadline);
            
            if (isToday) {
                deadlineClass = 'text-amber-600 font-medium';
                deadlineLabel = 'Today';
            } else if (isOverdue) {
                deadlineClass = 'text-red-600 font-medium';
                deadlineLabel = 'Overdue';
            }
            
            html += `
                <div class="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                    <div class="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">${Utils.escapeHtml(task.title)}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <a href="${memberLink}" class="text-xs text-primary-600 hover:underline">${Utils.escapeHtml(memberName)}</a>
                            <span class="text-gray-300">•</span>
                            <span class="text-xs ${deadlineClass}">${deadlineLabel}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        $list.html(html);
    };

    // ============================================
    // 📊 CHART FUNCTIONS
    // ============================================

    /**
     * Render attendance trend chart
     */
    const renderAttendanceChart = () => {
        const canvas = document.getElementById('attendanceChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.attendance) {
            charts.attendance.destroy();
        }
        
        // Prepare data for last 14 days
        const chartData = prepareAttendanceChartData();
        
        const ctx = canvas.getContext('2d');
        
        charts.attendance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Present',
                        data: chartData.present,
                        borderColor: CHART_COLORS.success,
                        backgroundColor: `${CHART_COLORS.success}20`,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Late',
                        data: chartData.late,
                        borderColor: CHART_COLORS.warning,
                        backgroundColor: `${CHART_COLORS.warning}20`,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Absent',
                        data: chartData.absent,
                        borderColor: CHART_COLORS.danger,
                        backgroundColor: `${CHART_COLORS.danger}20`,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
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
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'white',
                        titleColor: '#1F2937',
                        bodyColor: '#4B5563',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#F3F4F6'
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    };

    /**
     * Prepare attendance chart data for last 14 days
     */
    const prepareAttendanceChartData = () => {
        const labels = [];
        const present = [];
        const late = [];
        const absent = [];
        
        const totalEmployees = activeMembers.length;
        
        // Get last 14 days
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = Utils.formatDate(date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            
            labels.push(`${dayName} ${dayNum}`);
            
            // Get records for this day
            const dayRecords = monthRangeRecords.filter(r => r.date === dateStr);
            
            const presentCount = dayRecords.filter(r => 
                r.status === 'On Time' || r.status === 'Present'
            ).length;
            const lateCount = dayRecords.filter(r => r.status === 'Late').length;
            const absentCount = Math.max(0, totalEmployees - dayRecords.length);
            
            present.push(presentCount);
            late.push(lateCount);
            absent.push(absentCount);
        }
        
        return { labels, present, late, absent };
    };

    /**
     * Render department distribution chart
     */
    const renderDepartmentChart = () => {
        const canvas = document.getElementById('departmentChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (charts.department) {
            charts.department.destroy();
        }
        
        // Group by department
        const departments = {};
        activeMembers.forEach(member => {
            const dept = member.department || 'Unassigned';
            departments[dept] = (departments[dept] || 0) + 1;
        });
        
        const sortedDepts = Object.entries(departments)
            .sort((a, b) => b[1] - a[1]);
        
        if (sortedDepts.length === 0) {
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        charts.department = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedDepts.map(([dept]) => dept),
                datasets: [{
                    data: sortedDepts.map(([, count]) => count),
                    backgroundColor: CHART_COLORS.palette.slice(0, sortedDepts.length),
                    borderColor: 'white',
                    borderWidth: 2,
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
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'white',
                        titleColor: '#1F2937',
                        bodyColor: '#4B5563',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    };

    // ============================================
    // 🎨 UI HELPERS
    // ============================================

    /**
     * Render status badge HTML
     * @param {string} status - Attendance status
     * @returns {string} HTML string
     */
    const renderStatusBadge = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG['Present'];
        
        return `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}">
                <span class="w-1.5 h-1.5 rounded-full ${config.dot}"></span>
                ${Utils.escapeHtml(status)}
            </span>
        `;
    };

    /**
     * Show/hide loading overlay
     */
    const showLoading = (show) => {
        isLoading = show;
        
        const $overlay = $(SELECTORS.loadingOverlay);
        const $container = $(SELECTORS.pageContainer);
        
        if (show) {
            $overlay.removeClass('hidden');
            $container.addClass('opacity-50 pointer-events-none');
        } else {
            $overlay.addClass('hidden');
            $container.removeClass('opacity-50 pointer-events-none');
        }
    };

    /**
     * Update date display
     */
    const updateDateDisplay = () => {
        const displayDate = new Date(today).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        $(SELECTORS.todayDateDisplay).text(displayDate);
    };

    /**
     * Render error state
     */
    const renderErrorState = () => {
        $(SELECTORS.pageContainer).html(`
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
                <p class="text-gray-500 mb-6">An error occurred while loading the dashboard data.</p>
                <button onclick="location.reload()" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    Refresh Page
                </button>
            </div>
        `);
    };

    // ============================================
    // 🔧 UTILITY FUNCTIONS
    // ============================================

    /**
     * Get member by ID
     * @param {string} memberId - Member ID
     * @returns {Object|null} Member object or null
     */
    const getMemberById = (memberId) => {
        return members.find(m => m.memberId === memberId) || null;
    };

    /**
     * Sort check-ins by punch-in time (most recent first)
     * @param {Array} records - Attendance records
     * @returns {Array} Sorted records
     */
    const sortCheckinsByTime = (records) => {
        return [...records].sort((a, b) => {
            const timeA = a.punchIn ? parseTimeToMinutes(a.punchIn) : 0;
            const timeB = b.punchIn ? parseTimeToMinutes(b.punchIn) : 0;
            return timeB - timeA; // Most recent first
        });
    };

    /**
     * Parse time string to minutes since midnight
     * @param {string} timeStr - Time string (HH:MM)
     * @returns {number} Minutes since midnight
     */
    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        
        const parts = timeStr.split(':');
        if (parts.length < 2) return 0;
        
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        
        return hours * 60 + minutes;
    };

    /**
     * Format time string to display format (e.g., "9:25 AM")
     * @param {string} timeStr - Time string (HH:MM)
     * @returns {string} Formatted time
     */
    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12 || 12;
        
        return `${hours}:${minutes} ${period}`;
    };

    /**
     * Get first day of month for a date
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {string} First day of month (YYYY-MM-DD)
     */
    const getMonthStart = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    };

    /**
     * Get last day of month for a date
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {string} Last day of month (YYYY-MM-DD)
     */
    const getMonthEnd = (dateStr) => {
        const date = new Date(dateStr);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return Utils.formatDate(lastDay);
    };

    // ============================================
    // 🎧 EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners
     */
    const setupEventListeners = () => {
        // Refresh button
        $(SELECTORS.btnRefreshDashboard).on('click', function() {
            refreshDashboard();
        });
        
        // Also support navbar refresh button if it exists
        $('#btnRefresh').on('click', function() {
            refreshDashboard();
        });
        
        // Auto-refresh every 5 minutes (optional)
        // setInterval(refreshDashboard, 5 * 60 * 1000);
    };

    // ============================================
    // 📤 PUBLIC API
    // ============================================

    return {
        init,
        refresh: refreshDashboard,
        
        // State getters
        getMembers: () => [...members],
        getActiveMembers: () => [...activeMembers],
        getTodayRecords: () => [...todayRecords],
        getSettings: () => ({ ...settings }),
        
        // Utilities
        getMemberById,
        formatTime,
        calculateTodayStats
    };

})();

// ============================================
// 🚀 DOCUMENT READY
// ============================================

$(document).ready(function() {
    DashboardPage.init();
});