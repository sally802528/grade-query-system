// script.js - 完整整合版

// --- 預設資料設定與變數 ---

const TEACHER_PASSWORD = 'Teacher@admin';
const DEFAULT_STUDENTS = {
    'A123456789': { 
        account: 'A123456789', 
        name: '林書恩',
        // 修改為永靖高工、資訊二
        school: '永靖高工', 
        class: '資訊二',
        email: 'li***g@yvvs.edu.tw',
        tasks: [
            { id: 1, name: '基礎指令與C++基本能力', status: '已認證', teacherComment: '', comments: [] },
            { id: 2, name: '了解Arduino', status: '未完成', teacherComment: '', comments: [] }
        ]
    },
    'B987654321': { 
        account: 'B987654321', 
        name: '陳美玲',
        // 修改為永靖高工、資訊二
        school: '永靖高工', 
        class: '資訊二',
        email: 'ch***n@yvvs.edu.tw',
        tasks: [
            { id: 3, name: '網頁前端設計', status: '審核中', teacherComment: '請補交作品集。', comments: [] }
        ]
    }
};

let students = JSON.parse(localStorage.getItem('students')) || DEFAULT_STUDENTS;
let currentMode = 'student'; // 'student', 'admin'
let editingStudentId = null;
let currentTaskAccountId = null; // 儲存目前正在查看留言的學號
let currentTaskId = null; // 儲存目前正在查看留言的項目ID
let nextTaskId = 4; // 用於新增任務的唯一 ID

// --- 工具函式 ---

/** 儲存資料到 localStorage */
function saveStudents() {
    localStorage.setItem('students', JSON.stringify(students));
}

/** 遮擋姓名 */
function maskName(name) {
    if (name.length > 1) {
        const middle = '*'.repeat(name.length - 2);
        return name[0] + middle + name[name.length - 1];
    }
    return name;
}

/** 遮擋 Email */
function maskEmail(email) {
    const parts = email.split('@');
    if (parts.length === 2) {
        const localPart = parts[0];
        const domainPart = parts[1];
        if (localPart.length > 2) {
            return localPart[0] + '**' + localPart[localPart.length - 1] + '@' + domainPart;
        }
    }
    return email;
}

/** 取得當前時間字串 */
function getCurrentDateTime() {
    const now = new Date();
    // 格式化為 YYYY/MM/DD 下午/上午 HH:MM:SS
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
    
    const ampm = hour >= 12 ? '下午' : '上午';
    const displayHour = hour % 12 || 12; // 12 小時制
    
    return `${year}/${month}/${day} ${ampm}${displayHour}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

// --- 介面切換與登入/登出邏輯 ---

function showStudentLogin() {
    currentMode = 'student';
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('admin-login-container').classList.add('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
}

function showAdminLogin() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('admin-login-container').classList.remove('hidden');
    document.getElementById('admin-login-error').classList.add('hidden');
    document.getElementById('admin-password').value = '';
}

function showAdminInterface() {
    currentMode = 'admin';
    document.getElementById('admin-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.remove('hidden');
    renderStudentList();
    resetForm(false); // 重設表單並保持在新增模式
}

function logout() {
    showStudentLogin();
    alert('已成功登出查詢。');
}

function adminLogout() {
    showStudentLogin();
    alert('已成功登出教師介面。');
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const school = document.getElementById('school').value.trim();
    const cls = document.getElementById('class').value.trim();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    const student = students[account];

    if (student && student.school === school && student.class === cls && password === student.account) {
        // 學生密碼驗證成功
        displayStudentResult(student);
        errorMsg.classList.add('hidden');
    } else if (password === 'Qimei@admin') {
        // 萬用密碼
        if (student && student.school === school && student.class === cls) {
            displayStudentResult(student);
            errorMsg.classList.add('hidden');
        } else {
             // 帳號/班級/學校不匹配
            errorMsg.textContent = '學校、班級或學號不匹配，請檢查。';
            errorMsg.classList.remove('hidden');
        }
    } else {
        errorMsg.textContent = '帳號、班級或密碼錯誤。';
        errorMsg.classList.remove('hidden');
    }
});

document.getElementById('admin-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value.trim();
    const errorMsg = document.getElementById('admin-login-error');

    if (password === TEACHER_PASSWORD) {
        showAdminInterface();
        errorMsg.classList.add('hidden');
    } else {
        errorMsg.classList.remove('hidden');
    }
});

// --- 學生結果介面邏輯 (displayStudentResult) ---

/**
 * 顯示學生成績查詢結果。
 * @param {Object} student - 學生資料物件。
 */
function displayStudentResult(student) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');

    // 填充基本資料 (新增的欄位在這裡填充)
    document.getElementById('result-account').textContent = student.account;
    document.getElementById('result-name').textContent = maskName(student.name);
    document.getElementById('result-school').textContent = student.school; // 新增
    document.getElementById('result-class').textContent = student.class;   // 新增
    document.getElementById('result-email').textContent = maskEmail(student.email); // 新增

    const tasksTableBody = document.querySelector('#tasks-table-student tbody');
    tasksTableBody.innerHTML = '';
    
    // 排序任務：已認證/已完成 > 審核中 > 未完成
    const sortedTasks = [...student.tasks].sort((a, b) => {
        const statusOrder = { '已認證': 3, '審核中': 2, '未完成': 1 };
        return statusOrder[b.status] - statusOrder[a.status];
    });

    sortedTasks.forEach(task => {
        const row = tasksTableBody.insertRow();
        const statusClass = `status-${task.status}`;

        row.insertCell().textContent = task.name;
        row.insertCell().innerHTML = `<span class="${statusClass}">${task.status}</span>`;
        
        // 留言/操作欄位
        const commentCell = row.insertCell();
        commentCell.classList.add('task-actions');
        
        let actionsHtml = '';
        const commentCount = task.comments.filter(c => !c.isBlocked && !c.isRecalled).length;
        
        actionsHtml += `<button type="button" class="secondary-btn" style="margin-top: 0;" 
                        onclick="openCommentModal('${student.account}', ${task.id}, 'student')">
                        留言 (${commentCount})
                        </button>`;

        commentCell.innerHTML = actionsHtml;
    });
}

// --- 教師管理介面邏輯 ---

/** 渲染學生列表 */
function renderStudentList() {
    const listTableBody = document.querySelector('#student-list-table tbody');
    listTableBody.innerHTML = '';
    
    // 按帳號排序
    const sortedAccounts = Object.keys(students).sort();

    sortedAccounts.forEach(account => {
        const student = students[account];
        const row = listTableBody.insertRow();
        
        row.insertCell().textContent = student.account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        actionCell.innerHTML = `
            <button type="button" class="primary-btn" style="width: auto; margin: 5px;" onclick="editStudent('${account}')">編輯</button>
            <button type="button" class="danger-btn" style="width: auto; margin: 5px;" onclick="deleteStudent('${account}')">移除</button>
        `;
    });
}

/** 切換到新增模式 */
window.switchToNewStudentMode = function() {
    editingStudentId = null;
    document.getElementById('student-form-title').textContent = '新增學生';
    document.getElementById('submit-student-btn').textContent = '新增學生';
    document.getElementById('admin-account').readOnly = false;
    document.getElementById('submit-student-btn').classList.remove('hidden');
    
    // 清空表單，使用預設值
    window.resetForm(false);
}

/** 重設或取消編輯 */
window.resetForm = function(showAlert = true) {
    if (editingStudentId && showAlert) {
        if (!confirm('你確定要取消編輯嗎？所有未儲存的變更將會遺失。')) {
            return;
        }
    }
    
    document.getElementById('student-form').reset();
    document.getElementById('tasks-table-admin tbody').innerHTML = ''; // 清空任務列表
    
    // 預設值
    document.getElementById('admin-school').value = '永靖高工';
    document.getElementById('admin-class').value = '資訊二';
    document.getElementById('admin-email').value = '';
    
    switchToNewStudentMode();
}

/** 編輯學生 */
window.editStudent = function(accountId) {
    const student = students[accountId];
    if (!student) return;

    editingStudentId = accountId;
    document.getElementById('student-form-title').textContent = `編輯學生: ${student.name}`;
    document.getElementById('submit-student-btn').textContent = '更新學生資料';
    document.getElementById('admin-account').readOnly = true;

    // 填充表單
    document.getElementById('admin-account').value = student.account;
    document.getElementById('admin-name').value = student.name;
    document.getElementById('admin-school').value = student.school;
    document.getElementById('admin-class').value = student.class;
    document.getElementById('admin-email').value = student.email;

    // 渲染任務
    renderAdminTasks(student.tasks);
}

/** 渲染教師介面的任務表格 */
function renderAdminTasks(tasks) {
    const tasksTableBody = document.querySelector('#tasks-table-admin tbody');
    tasksTableBody.innerHTML = '';

    tasks.forEach(task => {
        addTaskRow(task);
    });
    
    // 確保 nextTaskId 是目前最大的
    const maxId = tasks.reduce((max, task) => Math.max(max, task.id), 0);
    nextTaskId = maxId + 1;
}

/** 新增任務行 */
window.addTaskRow = function(task = null) {
    const isNew = !task;
    const taskId = isNew ? nextTaskId++ : task.id;
    const taskName = task ? task.name : '';
    const taskStatus = task ? task.status : '未完成';
    const teacherComment = task ? task.teacherComment : '';
    const commentCount = task ? task.comments.filter(c => !c.isBlocked && !c.isRecalled).length : 0;
    
    const tasksTableBody = document.querySelector('#tasks-table-admin tbody');
    const row = tasksTableBody.insertRow();
    row.setAttribute('data-task-id', taskId);

    // 項目名稱
    row.insertCell().innerHTML = `<input type="text" value="${taskName}" name="task-name-${taskId}" required>`;
    
    // 狀態
    row.insertCell().innerHTML = `
        <select name="task-status-${taskId}">
            <option value="已認證" ${taskStatus === '已認證' ? 'selected' : ''}>已認證</option>
            <option value="審核中" ${taskStatus === '審核中' ? 'selected' : ''}>審核中</option>
            <option value="未完成" ${taskStatus === '未完成' ? 'selected' : ''}>未完成</option>
        </select>
    `;
    
    // 教師留言狀態 (只讀顯示)
    row.insertCell().textContent = teacherComment || '無教師留言';
    
    // 留言記錄
    row.insertCell().innerHTML = `
        <button type="button" class="secondary-btn" style="width: auto; margin: 0; padding: 5px 10px;" 
            onclick="openCommentModal('${editingStudentId || 'new'}', ${taskId}, 'admin')">
            留言 (${commentCount})
        </button>
    `;

    // 移除按鈕
    row.insertCell().innerHTML = `
        <button type="button" class="secondary-btn danger-btn" style="width: auto; margin: 0; background-color: #95a5a6;" onclick="removeTaskRow(this)">移除</button>
    `;
    
    // 隱藏在新增模式下的留言按鈕，因為還沒有學號
    if (!editingStudentId) {
        row.querySelector('.secondary-btn[onclick*="openCommentModal"]').disabled = true;
        row.querySelector('.secondary-btn[onclick*="openCommentModal"]').textContent = '留言 (0)';
    }
}

/** 移除任務行 */
window.removeTaskRow = function(button) {
    const row = button.closest('tr');
    if (confirm('你確定要移除此項目嗎？此操作將無法復原。')) {
        row.remove();
    }
}

/** 提交學生表單 (新增/更新) */
document.getElementById('student-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const account = document.getElementById('admin-account').value.trim();
    const name = document.getElementById('admin-name').value.trim();
    const school = document.getElementById('admin-school').value.trim();
    const cls = document.getElementById('admin-class').value.trim();
    const email = document.getElementById('admin-email').value.trim();

    // 檢查帳號唯一性
    if (!editingStudentId && students[account]) {
        alert('錯誤：此帳號已存在。');
        return;
    }
    
    // 收集任務資料
    const taskRows = document.querySelectorAll('#tasks-table-admin tbody tr');
    const tasks = [];
    let hasError = false;

    taskRows.forEach(row => {
        const taskId = parseInt(row.getAttribute('data-task-id'));
        const taskNameInput = row.querySelector(`[name="task-name-${taskId}"]`);
        const taskStatusSelect = row.querySelector(`[name="task-status-${taskId}"]`);
        
        if (!taskNameInput.value.trim()) {
            alert('錯誤：項目名稱不能為空。');
            taskNameInput.focus();
            hasError = true;
            return;
        }

        let existingTask = (students[account] && students[account].tasks.find(t => t.id === taskId)) || {};
        
        tasks.push({
            id: taskId,
            name: taskNameInput.value.trim(),
            status: taskStatusSelect.value,
            // 保持現有的教師留言和評論，或者使用預設空值
            teacherComment: existingTask.teacherComment || '', 
            comments: existingTask.comments || []
        });
    });

    if (hasError) return;
    
    const isNew = !editingStudentId;
    
    // 更新或新增學生資料
    students[account] = {
        account,
        name,
        school,
        class: cls,
        email,
        tasks
    };
    
    saveStudents();
    renderStudentList();
    
    if (isNew) {
        alert('學生資料已成功新增！');
        // 切換到新增模式，清除表單
        switchToNewStudentMode();
    } else {
        alert('學生資料已成功更新！');
        // 重新編輯剛才的學生以更新任務狀態顯示
        editStudent(account); 
    }
});

/** 刪除學生 */
window.deleteStudent = function(accountId) {
    if (confirm(`你確定要永久刪除帳號 ${accountId} 的學生資料嗎？此操作無法復原。`)) {
        delete students[accountId];
        saveStudents();
        renderStudentList();
        
        // 如果刪除的剛好是正在編輯的學生
        if (editingStudentId === accountId) {
            switchToNewStudentMode();
        }
        alert('學生資料已刪除。');
    }
}

// --- 留言 Modal 邏輯 ---

/** 開啟留言視窗 */
window.openCommentModal = function(accountId, taskId, role) {
    if (accountId === 'new' && role === 'admin') {
        alert('請先儲存學生資料後才能新增或查看留言。');
        return;
    }
    
    currentTaskAccountId = accountId;
    currentTaskId = taskId;

    const student = students[accountId];
    const task = student.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('modal-title').textContent = `項目留言: ${task.name}`;
    
    // 顯示/隱藏新增留言區塊
    const newCommentArea = document.getElementById('new-comment-area');
    if (role === 'student' && task.status === '已認證') {
        // 學生已認證的項目不能再留言
        newCommentArea.classList.add('hidden');
    } else {
        newCommentArea.classList.remove('hidden');
    }

    renderCommentHistory(task.comments, role);
    
    document.getElementById('comment-modal').style.display = 'block';
}

/** 關閉留言視窗 */
window.closeModal = function() {
    document.getElementById('comment-modal').style.display = 'none';
    currentTaskAccountId = null;
    currentTaskId = null;
    document.getElementById('comment-input').value = '';
    
    // 留言完成後重新渲染管理介面任務列表，確保留言數更新
    if (currentMode === 'admin' && editingStudentId) {
         editStudent(editingStudentId);
    }
}

/** 渲染留言歷史記錄 */
function renderCommentHistory(comments, role) {
    const historyDiv = document.getElementById('comment-history');
    historyDiv.innerHTML = '';
    
    if (comments.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #7f8c8d;">目前沒有留言。</p>';
        return;
    }

    // 依時間倒序排序 (最新留言在最上方)
    const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedComments.forEach(comment => {
        const isTeacher = comment.sender === 'teacher';
        const senderLabel = isTeacher ? '教師' : '學生';
        let content = comment.content;
        
        let actionsHtml = '';
        let commentClass = isTeacher ? 'comment-teacher' : 'comment-student';
        
        if (comment.isBlocked) {
            commentClass = 'comment-blocked';
            content = `**${senderLabel}** 的留言已被教師屏障。`;
        } else if (comment.isRecalled) {
            commentClass = 'comment-recalled';
            content = `**${senderLabel}** 撤回了此留言。`;
        } else {
            // 可操作的留言
            if (role === 'admin') {
                // 教師可以屏障所有留言，可以撤回自己的留言
                if (isTeacher && !comment.isRecalled) {
                    actionsHtml += `<button type="button" class="secondary-btn" onclick="recallComment('${currentTaskAccountId}', ${currentTaskId}, '${comment.timestamp}')">撤回</button>`;
                }
                actionsHtml += `<button type="button" class="danger-btn" style="margin-left: 5px;" onclick="blockComment('${currentTaskAccountId}', ${currentTaskId}, '${comment.timestamp}')">屏障</button>`;
            } else if (role === 'student' && !isTeacher && !comment.isRecalled) {
                // 學生只能撤回自己的留言
                 actionsHtml += `<button type="button" class="secondary-btn" onclick="recallComment('${currentTaskAccountId}', ${currentTaskId}, '${comment.timestamp}')">撤回</button>`;
            }
        }
        
        const commentDiv = document.createElement('div');
        commentDiv.className = `comment ${commentClass}`;
        commentDiv.innerHTML = `
            <div>
                <strong>${senderLabel}</strong> (${comment.timestamp}):
                ${actionsHtml ? `<span class="comment-actions" style="float: right;">${actionsHtml}</span>` : ''}
            </div>
            <p>${content}</p>
        `;
        
        historyDiv.appendChild(commentDiv);
    });
}

/** 提交新留言 */
document.getElementById('submit-comment-btn').addEventListener('click', function() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();

    if (!content) {
        alert('留言內容不能為空。');
        return;
    }
    
    const student = students[currentTaskAccountId];
    const task = student.tasks.find(t => t.id === currentTaskId);
    if (!task) return;
    
    const sender = currentMode === 'admin' ? 'teacher' : 'student';
    
    const newComment = {
        sender: sender,
        content: content,
        timestamp: getCurrentDateTime(),
        isRecalled: false,
        isBlocked: false
    };

    task.comments.push(newComment);
    
    // 如果是教師留言，則更新教師留言狀態
    if (sender === 'teacher') {
        task.teacherComment = content.substring(0, 8) + '...'; // 截取前 8 個字元
    }
    
    saveStudents();
    input.value = '';
    
    // 重新渲染歷史記錄
    renderCommentHistory(task.comments, currentMode); 
});

/** 屏障留言 (僅限教師) */
window.blockComment = function(accountId, taskId, timestamp) {
    if (currentMode !== 'admin') return;
    if (!confirm('你確定要屏障此留言嗎？屏障後學生將看不到此內容。')) return;

    const student = students[accountId];
    const task = student.tasks.find(t => t.id === taskId);
    const comment = task.comments.find(c => c.timestamp === timestamp);
    
    if (comment) {
        comment.isBlocked = true;
        comment.isRecalled = false; // 屏障優先於撤回
        saveStudents();
        renderCommentHistory(task.comments, currentMode);
    }
}

/** 撤回留言 (發送者可以撤回) */
window.recallComment = function(accountId, taskId, timestamp) {
    const student = students[accountId];
    const task = student.tasks.find(t => t.id === taskId);
    const comment = task.comments.find(c => c.timestamp === timestamp);
    
    if (comment) {
        const senderLabel = comment.sender === 'teacher' ? '教師' : '學生';
        if (!confirm(`你確定要撤回此留言嗎？您將以 ${senderLabel} 的身份撤回。`)) return;

        // 檢查權限：教師模式只能撤回教師的留言，學生模式只能撤回學生的留言
        const canRecall = (currentMode === 'admin' && comment.sender === 'teacher') || 
                          (currentMode === 'student' && comment.sender === 'student');

        if (canRecall) {
            comment.isRecalled = true;
            comment.isBlocked = false; // 撤回取消屏障
            saveStudents();
            renderCommentHistory(task.comments, currentMode);
        } else {
             alert('錯誤：您沒有權限撤回此留言。');
        }
    }
}

// --- 初始化 ---

document.addEventListener('DOMContentLoaded', function() {
    // 初始化顯示學生登入介面
    showStudentLogin();
    
    // 確保 nextTaskId 的唯一性 (用於新增學生資料)
    Object.values(students).forEach(student => {
        student.tasks.forEach(task => {
            if (task.id >= nextTaskId) {
                nextTaskId = task.id + 1;
            }
        });
    });
});
