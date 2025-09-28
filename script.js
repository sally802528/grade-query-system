// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

// --- 輔助函數：資料持久化 ---

/** 預設模擬資料 (包含新的狀態和留言結構) */
const DEFAULT_STUDENTS = {
    'A123456789': { 
        name: '林書恩',
        tasks: [
            { item: "國文期中考", status: "已認證", teacherComment: "表現優異，無須修改。", studentComments: [], pendingReview: false },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", studentComments: [], pendingReview: false },
            { item: "社團點名出席", status: "審核中", teacherComment: "待確認出席記錄", studentComments: [{ time: new Date().toLocaleString(), role: "學生", text: "已補交假單" }], pendingReview: true },
            { item: "期末專題報告", status: "認證失敗", teacherComment: "報告格式錯誤，請修改後重新提交。", studentComments: [], pendingReview: false },
        ]
    },
    'B987654321': { 
        name: '陳美玲',
        tasks: [
            { item: "國文期中考", status: "已認證", teacherComment: "", studentComments: [], pendingReview: false },
            { item: "專題報告繳交", status: "未完成", teacherComment: "", studentComments: [], pendingReview: false }
        ]
    }
};

/** 從 localStorage 載入資料。如果沒有，則使用預設模擬資料。 */
function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            return data;
        }
    } catch (e) {
        console.error("Failed to parse stored data, using default.", e);
    }
    // 如果沒有資料或解析失敗，就存入預設資料並返回
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}

/** 將學生資料存入 localStorage */
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 初始化時載入資料
let students = loadStudentData();


// --- 學生查詢介面邏輯 (重大調整：狀態互動與留言顯示) ---

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const school = document.getElementById('school').value.trim();
    const studentClass = document.getElementById('class').value.trim();
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const studentInfo = students[account];

    // 1. 密碼驗證 (略)
    if (password !== STUDENT_PASSWORD) {
        errorMessage.textContent = '登入失敗：密碼錯誤，請檢查。';
        return;
    }

    // 2. 帳號/資料驗證 (略)
    if (!studentInfo) {
        errorMessage.textContent = '登入失敗：帳號不存在，請檢查。';
        return;
    }

    // 3. 登入成功
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');

    // 4. 顯示基本資料 (略)
    const fullName = studentInfo.name;
    const maskedName = fullName.charAt(0) + '**' + fullName.charAt(fullName.length - 1);
    const maskedAccount = account.slice(0, 4) + '****';

    document.getElementById('display-student-id').textContent = maskedAccount;
    document.getElementById('display-name').textContent = maskedName;
    document.getElementById('display-school').textContent = school;
    document.getElementById('display-class').textContent = studentClass;
    
    // 5. 顯示成績與項目
    renderTasks(studentInfo.tasks, account);
});

/** 顯示學生查詢頁面的表格 */
function renderTasks(tasks, account) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    const commentSelect = document.getElementById('comment-task-select');
    commentSelect.innerHTML = '<option value="">請選擇要留言的項目</option>';
    
    tasks.forEach((data, index) => {
        const row = taskList.insertRow();
        
        // 1. 項目名稱 (並添加到留言選擇器)
        row.insertCell().textContent = data.item;
        commentSelect.innerHTML += `<option value="${data.item}">${data.item}</option>`;

        // 2. 狀態 (可點擊互動)
        const statusCell = row.insertCell();
        const statusSpan = document.createElement('span');
        statusSpan.textContent = data.status;
        statusSpan.className = 'status-' + data.status.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, ''); // 支援中文狀態

        if (data.status === '未完成' || data.status === '認證失敗') {
            statusSpan.onclick = () => confirmSubmission(account, data.item);
        }
        statusCell.appendChild(statusSpan);

        // 3. 教師留言
        const teacherCommentCell = row.insertCell();
        teacherCommentCell.textContent = data.teacherComment || '無';

        // 4. 學生留言 (顯示數量和點擊查看歷史)
        const studentCommentCell = row.insertCell();
        const commentCount = data.studentComments.length;
        if (commentCount > 0) {
            const historyLink = document.createElement('a');
            historyLink.href = '#';
            historyLink.textContent = `${commentCount} 則留言 (查看)`;
            historyLink.onclick = (e) => {
                e.preventDefault();
                showCommentHistory(data.item, data.studentComments);
            };
            studentCommentCell.appendChild(historyLink);
        } else {
            studentCommentCell.textContent = '無';
        }
    });
}

/** 學生點擊未完成/認證失敗時的彈窗邏輯 */
function confirmSubmission(account, itemName) {
    if (confirm(`您已確定完成 [${itemName}] 項目了嗎？點擊「確定」將提交給教師審核。`)) {
        const studentInfo = students[account];
        const task = studentInfo.tasks.find(t => t.item === itemName);

        if (task) {
            task.status = "審核中";
            task.pendingReview = true;
            task.studentComments.push({
                time: new Date().toLocaleString(),
                role: "系統",
                text: "學生已提交項目等待審核。",
            });
            saveStudentData(students);
            alert(`[${itemName}] 已成功提交審核！`);
            renderTasks(studentInfo.tasks, account); // 重新渲染表格
        }
    }
}

function logout() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}


// --- 學生留言提交邏輯 ---
window.submitStudentComment = function() {
    // 獲取當前登入的帳號 (從表單讀取)
    const account = document.getElementById('account').value.trim(); 
    if (!account) {
         // 如果登入帳號被清空 (理論上不會)，則阻止操作
        alert("請先登入！");
        return;
    }

    const selectedItem = document.getElementById('comment-task-select').value;
    const commentText = document.getElementById('new-student-comment').value.trim();

    if (!selectedItem || !commentText) {
        alert("請選擇項目並輸入留言內容！");
        return;
    }

    const task = students[account].tasks.find(t => t.item === selectedItem);
    if (task) {
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "學生",
            text: commentText,
        });
        saveStudentData(students);
        alert(`對 [${selectedItem}] 的留言已提交。`);
        document.getElementById('new-student-comment').value = '';
        renderTasks(students[account].tasks, account); // 重新渲染列表
    }
}


// --- 留言歷史彈窗邏輯 ---
function showCommentHistory(taskName, comments) {
    document.getElementById('modal-task-name').textContent = taskName;
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';

    comments.forEach(c => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[${c.role} @ ${c.time}]</strong>: ${c.text}`;
        listDiv.appendChild(p);
    });

    document.getElementById('comment-history-modal').classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
}

// --- 教師介面切換與登入 (略) ---

document.getElementById('teacher-login-btn').addEventListener('click', function() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-error-message').textContent = ''; 
});

function hideTeacherLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('teacher-login-form').reset();
}

function teacherLogout() {
    document.getElementById('admin-container').classList.add('hidden');
    hideTeacherLogin(); 
}

document.getElementById('teacher-login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const password = document.getElementById('teacher-password').value;
    const errorMessage = document.getElementById('teacher-error-message');

    if (password === TEACHER_PASSWORD) {
        errorMessage.textContent = '';
        document.getElementById('teacher-login-container').classList.add('hidden');
        document.getElementById('admin-container').classList.remove('hidden');
        displayStudentList();
        resetForm();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
});


// --- 學生資料 CRUD 邏輯 (包含表格處理) ---

/** 編輯學生 (將資料載入表單) */
function editStudent(account) {
    const student = students[account];
    if (!student) return;

    // 載入基本資料
    document.getElementById('student-original-account').value = account; 
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    
    // 載入成績/活動到表格
    loadTasksToAdminTable(student.tasks);
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

/** 將成績/活動載入到教師管理表格 */
function loadTasksToAdminTable(tasks) {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task);
    });
}

/** 新增一行成績/活動表格列 */
function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }) {
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

    // 3. 教師留言
    const commentCell = row.insertCell();
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.value = task.teacherComment;
    commentInput.className = 'task-comment-input';
    commentCell.appendChild(commentInput);

    // 4. 操作 (移除和清空留言)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; // 確保不會提交表單
    removeBtn.onclick = () => row.remove();
    actionCell.appendChild(removeBtn);

    const clearCommentBtn = document.createElement('button');
    clearCommentBtn.textContent = '清空學生留言';
    clearCommentBtn.type = 'button'; // 確保不會提交表單
    clearCommentBtn.style.marginTop = '5px';
    clearCommentBtn.onclick = () => {
        if (confirm(`確定清空 [${itemInput.value}] 的所有學生留言嗎？此操作將在儲存後生效。`)) {
            row.setAttribute('data-clear-comments', 'true');
            clearCommentBtn.textContent = '已標記清空';
            clearCommentBtn.disabled = true;
            clearCommentBtn.style.backgroundColor = 'lightgray';
        }
    };
    actionCell.appendChild(clearCommentBtn);
    
    // 隱藏原始數據，用於保存時合併
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

document.getElementById('add-task-btn').addEventListener('click', () => addTaskRow());

function resetForm() {
    document.getElementById('admin-tasks-tbody').innerHTML = ''; // 清空表格
    document.getElementById('student-original-account').value = '';
    document.getElementById('student-form').reset();
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

/** 處理新增/修改表單提交 - 從表格收集資料 */
document.getElementById('student-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('new-account').value.trim();
    const newName = document.getElementById('new-name').value.trim();

    if (!newAccount) { alert("帳號不能為空！"); return; }

    // 1. 收集表格中的成績/活動資料
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        const commentInput = row.querySelector('.task-comment-input');
        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        const shouldClearComments = row.getAttribute('data-clear-comments') === 'true';

        if (itemInput.value.trim()) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                teacherComment: commentInput.value.trim(),
                studentComments: shouldClearComments ? [] : originalComments, // 應用清空標記
                pendingReview: pendingReview
            });
        }
    });

    // 2. 帳號檢查與儲存
    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        alert(`帳號 ${newAccount} 已存在，請使用其他帳號或先編輯現有資料。`);
        return;
    }
    
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    students[newAccount] = {
        name: newName,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    resetForm(); 
    displayStudentList();
});


/** 顯示學生列表 */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account;
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯';
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

/** 移除學生 */
function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (帳號: ${account}) 嗎？`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); 
    }
}


// --- 初始化頁面狀態 ---
window.onload = function() {
    // 確保資料是最新狀態
    students = loadStudentData(); 

    // 確保頁面初始狀態正確
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
};
