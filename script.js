// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};

// --- 輔助函數：資料持久化 ---
const DEFAULT_STUDENTS = {
    'A123456789': { 
        account: 'A123456789', 
        name: '林書恩',
        school: '奇美高中',
        class: '二年甲班',
        email: 'li***g@qimei.edu.tw',
        tasks: [
            { item: "國文期中考", status: "已認證", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 1, time: new Date(Date.now() - 3600000).toLocaleString(), role: "教師", text: "作業完成得不錯！", isTeacher: true, isBlocked: false, isRecalled: false },
                  { id: 2, time: new Date(Date.now() - 1800000).toLocaleString(), role: "學生", text: "謝謝老師！我下次會更好。", isTeacher: false, isBlocked: false, isRecalled: false },
              ]
            },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 3, time: new Date(Date.now() - 7200000).toLocaleString(), role: "學生", text: "我還在努力寫，請問截止日是什麼時候？", isTeacher: false, isBlocked: false, isRecalled: false }
              ] 
            },
        ]
    },
    'B987654321': { 
        account: 'B987654321', 
        name: '陳美玲',
        school: '奇美高中',
        class: '二年甲班',
        email: 'ch***n@qimei.edu.tw',
        tasks: [
            { item: "期末專題報告", status: "認證失敗", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 4, time: new Date(Date.now() - 1200000).toLocaleString(), role: "教師", text: "報告格式錯誤，請修改後重新提交。", isTeacher: true, isBlocked: false, isRecalled: false }
              ] 
            },
        ]
    }
};

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            // 確保資料結構與預期一致 (這裡不重複複雜的資料結構處理，假設它在上次修正後已穩定)
            // 但確保基本欄位存在
            Object.values(data).forEach(s => {
                s.account = s.account || '';
                s.school = s.school || '奇美高中';
                s.class = s.class || '二年甲班';
                s.email = s.email || 'li***g@qimei.edu.tw';
                s.tasks.forEach(t => {
                     // 確保每個留言都有 id 欄位 (用於收回/封鎖)
                     t.studentComments.forEach(c => c.id = c.id || Date.now() + Math.random());
                });
            });
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
students = loadStudentData(); // 立即載入資料

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// --- 學生查詢介面邏輯 (修正基本資料顯示) ---

function handleStudentLogin(event) {
    event.preventDefault();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const studentInfo = students[account];
    
    if (password !== STUDENT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }
    if (!studentInfo) {
        errorMessage.textContent = '登入失敗：帳號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    
    document.getElementById('display-student-id').textContent = studentInfo.account;
    document.getElementById('display-name').textContent = studentInfo.name.charAt(0) + '**' + studentInfo.name.charAt(studentInfo.name.length - 1);
    document.getElementById('display-school').textContent = studentInfo.school;
    document.getElementById('display-class').textContent = studentInfo.class;
    document.getElementById('display-email').textContent = studentInfo.email;

    renderTasks(studentInfo.tasks, account);
}

function renderTasks(tasks, account) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    
    tasks.forEach((data) => {
        const row = taskList.insertRow();
        
        row.insertCell().textContent = data.item;

        const statusCell = row.insertCell();
        const statusSpan = document.createElement('span');
        statusSpan.textContent = data.status;
        statusSpan.className = 'status-' + data.status.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
        statusCell.appendChild(statusSpan);

        const actionCell = row.insertCell();
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.style.padding = '5px 10px';
        actionBtn.style.width = 'auto';
        actionBtn.style.marginLeft = '0';
        actionBtn.style.marginTop = '0';
        
        if (data.status === '未完成' || data.status === '認證失敗') {
             actionBtn.textContent = '提交審核 / 查看留言';
             actionBtn.className = 'primary-btn';
        } else if (data.status === '審核中') {
             actionBtn.textContent = '審核中 / 查看留言';
             actionBtn.className = 'primary-btn';
             actionBtn.style.backgroundColor = 'blue';
        } else {
            actionBtn.textContent = '查看留言';
            actionBtn.className = 'secondary-btn';
        }
        
        actionBtn.onclick = () => showCommentModal(account, data.item);
        actionCell.appendChild(actionBtn);
    });
}

window.logout = function() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}

// --- 整合式留言/審核彈窗邏輯 ---

function renderComment(comment, task, isTeacherMode) {
    const p = document.createElement('p');
    p.classList.add('comment-item');
    p.setAttribute('data-comment-id', comment.id);

    // 區分教師留言顏色
    if (comment.isTeacher) {
        p.style.backgroundColor = '#eaf7ff'; 
        p.style.borderLeft = '4px solid #007bff';
    } else if (comment.role === '系統') {
        p.style.backgroundColor = '#f0f0f0';
        p.style.fontStyle = 'italic';
        p.style.color = '#888';
    }
    
    if (comment.isRecalled) {
        p.innerHTML = `[${comment.role}] 已收回此訊息`;
        p.style.color = 'red';
        p.style.fontStyle = 'italic';
        return p;
    }
    
    if (comment.isBlocked) {
        p.innerHTML = `<strong>[${comment.role} @ ${comment.time}]</strong>: <span style="font-size: 1.5em; color: black;">&#9608;&#9608;&#9608;&#9608;</span> (此留言已被老師封鎖)`;
        p.style.color = 'red';
        return p;
    }

    p.innerHTML = `<strong>[${comment.role} @ ${comment.time}]</strong>: ${comment.text}`;

    const actionDiv = document.createElement('div');
    actionDiv.style.float = 'right';

    // 封鎖按鈕 (僅教師模式)
    if (isTeacherMode && comment.role !== '系統') {
        const blockBtn = document.createElement('button');
        blockBtn.textContent = '封鎖';
        blockBtn.className = 'secondary-btn';
        blockBtn.style.marginLeft = '10px';
        blockBtn.style.padding = '2px 5px';
        blockBtn.style.marginTop = '0';
        blockBtn.onclick = () => blockComment(task.account, task.item, comment.id);
        actionDiv.appendChild(blockBtn);
    }

    // 收回按鈕 (學生只能收回自己的，教師可以收回所有非系統留言)
    const canRecall = (isTeacherMode && comment.role !== '系統') || (!isTeacherMode && comment.role === '學生' && !comment.isTeacher);

    if (canRecall) {
        const recallBtn = document.createElement('button');
        recallBtn.textContent = '收回';
        recallBtn.className = 'secondary-btn';
        recallBtn.style.marginLeft = '10px';
        recallBtn.style.padding = '2px 5px';
        recallBtn.style.marginTop = '0';
        recallBtn.onclick = () => recallComment(task.account, task.item, comment.id);
        actionDiv.appendChild(recallBtn);
    }
    
    p.appendChild(actionDiv);
    return p;
}


function showCommentModal(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    
    const student = students[account];
    const task = student.tasks.find(t => t.item === itemName);
    if (!task) return;

    document.getElementById('modal-task-name').textContent = itemName;
    
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';
    
    // 依時間升序排列並渲染
    task.studentComments
        .sort((a, b) => new Date(a.time) - new Date(b.time)) 
        .forEach(comment => {
            const commentElement = renderComment(comment, { account, item: itemName }, isAdminMode);
            listDiv.appendChild(commentElement);
        });

    const isStudent = !isAdminMode;
    document.getElementById('modal-student-comment-area').style.display = 'block'; // 學生和教師都需要留言區

    // 審核提交按鈕區域只在學生介面顯示
    document.getElementById('modal-submission-area').style.display = isStudent ? 'block' : 'none';

    if (isStudent) {
         const submissionBtn = document.querySelector('#modal-submission-area .submission-btn');
         const submissionMsg = document.getElementById('modal-submission-message');
         if (task.status === '未完成' || task.status === '認證失敗') {
             submissionBtn.textContent = '提交完成給教師審核';
             submissionBtn.style.display = 'inline-block';
             submissionMsg.textContent = `當前狀態為 ${task.status}。點擊下方按鈕將提交審核。`;
             submissionMsg.style.color = 'orange';
         } else {
             submissionBtn.style.display = 'none';
             submissionMsg.textContent = `當前狀態為 ${task.status}。無法再次提交。`;
             submissionMsg.style.color = 'gray';
         }
    }
    
    document.getElementById('modal-new-student-comment').value = '';
    document.getElementById('comment-history-modal').classList.remove('hidden');
    
    // 確保捲動到最底部
    listDiv.scrollTop = listDiv.scrollHeight;
}


// 修正：統一留言提交函數名稱
window.submitCommentFromModal = function() {
    const commentText = document.getElementById('modal-new-student-comment').value.trim();
    if (!commentText || !currentTaskAccount || !currentTaskItem) {
        alert("請輸入留言內容。");
        return;
    }
    
    const isTeacher = isAdminMode; 
    const role = isTeacher ? '教師' : '學生';

    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (task) {
        task.studentComments.push({
            id: Date.now() + Math.random(), 
            time: new Date().toLocaleString(),
            role: role,
            text: commentText,
            isTeacher: isTeacher,
            isBlocked: false,
            isRecalled: false
        });
        saveStudentData(students);
        alert(`對 [${currentTaskItem}] 的留言已提交。`);
        
        document.getElementById('modal-new-student-comment').value = '';
        showCommentModal(currentTaskAccount, currentTaskItem);
        // 如果是學生介面，需更新主列表狀態
        if (!isAdminMode) {
             renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
        }
    }
}

function recallComment(account, itemName, commentId) {
    if (!confirm("你確定要收回？收回後訊息將會刪除並顯示 [收回的人] 已收回此訊息。")) {
        return;
    }
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        // 學生只能收回自己的留言 (role === '學生' 且 isTeacher === false)
        if (!isAdminMode && comment.role === '學生' && !comment.isTeacher) {
            // pass
        } else if (!isAdminMode && (comment.role !== '學生' || comment.isTeacher)) {
             alert('您只能收回自己發送的留言！');
             return;
        }

        comment.isRecalled = true;
        comment.text = ""; 
        
        task.studentComments.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleString(),
            role: "系統",
            text: `[${comment.isTeacher ? '教師' : '學生'}] 已收回此訊息`,
            isTeacher: false,
            isBlocked: false,
            isRecalled: false
        });
        
        saveStudentData(students);
        showCommentModal(account, itemName);
    }
}

function blockComment(account, itemName, commentId) {
    if (!isAdminMode) return;
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isBlocked = true;
        saveStudentData(students);
        showCommentModal(account, itemName);
    }
}

window.confirmSubmissionFromModal = function() {
    // ... (保持不變) ...
    if (!currentTaskAccount || !currentTaskItem) return;
    
    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (!task) return;

    if (confirm(`確定要將 [${currentTaskItem}] 狀態改為「審核中」嗎？`)) {
        task.status = "審核中";
        task.pendingReview = true;
        task.studentComments.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleString(),
            role: "系統",
            text: "學生已提交項目等待審核。",
            isTeacher: false,
            isBlocked: false,
            isRecalled: false
        });
        saveStudentData(students);
        alert(`[${currentTaskItem}] 已成功提交審核！`);
        
        closeModal();
        if (!isAdminMode) {
             renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
        }
    }
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
    currentTaskAccount = null;
    currentTaskItem = null;
}

// --- 教師介面切換與登入 ---

function handleTeacherLoginClick() {
    isAdminMode = false;
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-error-message').textContent = ''; 
}

window.hideTeacherLogin = function() {
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('teacher-login-form').reset();
}

window.teacherLogout = function() {
    isAdminMode = false;
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); 
}

function handleTeacherLoginFormSubmit(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        isAdminMode = true; 
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList();
        resetForm();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

/** 修正: 確保載入新的欄位 ID */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    
    // 從 student 物件載入資料到 HTML 欄位 ID
    document.getElementById('admin-account').value = student.account || account; 
    document.getElementById('admin-name').value = student.name;
    document.getElementById('admin-school').value = student.school || '';
    document.getElementById('admin-class').value = student.class || '';
    document.getElementById('admin-email').value = student.email || '';
    
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    loadTasksToAdminTable(student.tasks, account); 
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

function loadTasksToAdminTable(tasks, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task, account);
    });
}

/** 修正: 移除教師留言輸入框，修改標題 */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // 1. 項目名稱
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    itemCell.appendChild(itemInput);

    // 2. 狀態選擇
    const statusCell = row.insertCell();
    const statusSelect = document.createElement('select');
    statusSelect.className = 'task-status-select';
    STATUS_OPTIONS.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === task.status) {
            opt.selected = true;
        }
        statusSelect.appendChild(opt);
    });
    statusCell.appendChild(statusSelect);

    // 3. 教師留言狀態 (提示)
    const commentCell = row.insertCell();
    // 這裡只顯示提示，不放輸入框
    commentCell.textContent = '請點擊留言紀錄新增/修改';
    commentCell.style.color = '#888'; 

    // 4. 留言紀錄按鈕
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    historyBtn.textContent = `留言 (${task.studentComments.filter(c => !c.isRecalled && !c.isBlocked).length})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn';
    
    if (account) { 
        historyBtn.onclick = () => showCommentModal(account, itemInput.value.trim()); 
    } else {
        historyBtn.disabled = true; 
    }
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.onclick = () => {
        if (confirm("你確定要移除此項目嗎？此操作將無法復原。")) {
             row.remove();
        }
    };
    actionCell.appendChild(removeBtn);
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

function handleAddTaksClick() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    addTaskRow(undefined, currentAccount);
}

window.resetForm = function() {
    document.getElementById('admin-tasks-tbody').innerHTML = '';
    document.getElementById('student-original-account').value = '';
    
    // 清空所有基本資料欄位
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    document.getElementById('admin-school').value = '';
    document.getElementById('admin-class').value = '';
    document.getElementById('admin-email').value = '';
    
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

/** 修正: 確保從新的欄位 ID 抓取資料並保存 */
function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    if (!confirm("按下確定後將更新學生資料，移除/變更的操作將無法復原。請再次確認。")) {
        return;
    }
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('admin-account').value.trim(); 
    
    // 抓取所有基本資料
    const newName = document.getElementById('admin-name').value.trim();
    const newSchool = document.getElementById('admin-school').value.trim();
    const newClass = document.getElementById('admin-class').value.trim();
    const newEmail = document.getElementById('admin-email').value.trim();


    if (!newAccount) { alert("帳號不能為空！"); return; }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');

        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        const shouldClearComments = row.getAttribute('data-clear-comments') === 'true'; // 雖然清空按鈕已移除，但保留邏輯

        if (itemInput.value.trim()) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                teacherComment: "", 
                studentComments: shouldClearComments ? [] : originalComments,
                pendingReview: pendingReview
            });
        }
    });
    
    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        alert(`帳號 ${newAccount} 已存在，請使用其他帳號或先編輯現有資料。`);
        return;
    }
    
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    // 儲存所有欄位
    students[newAccount] = {
        account: newAccount,
        name: newName,
        school: newSchool,
        class: newClass,
        email: newEmail,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    displayStudentList();
    
    if (originalAccount || document.getElementById('form-submit-btn').textContent === '更新學生資料') {
         editStudent(newAccount);
    } else {
        resetForm(); 
    }
}


/** 編輯改名成開啟 */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    if (!tbody) return; 

    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '開啟'; 
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

function removeStudent(account, name) {
    if (confirm(`你確定要移除學生 ${name} (帳號: ${account}) 嗎？此操作將無法復原。`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); 
        resetForm(); 
    }
}


// --- 初始化與事件監聽 (確保所有元素載入後才綁定事件) ---

document.addEventListener('DOMContentLoaded', function() {
    // 這裡的 students 已經在檔案頂部執行 loadStudentData() 載入
    isAdminMode = false;
    
    // 設定初始頁面狀態
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
    
    // 綁定事件監聽器
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    // 綁定 + 新增項目 按鈕的點擊事件
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
});
