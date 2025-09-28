// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false; // 追蹤是否為教師模式
let students = {}; // 初始為空物件，等待 loadStudentData 執行

// --- 輔助函數：資料持久化 ---
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
            { item: "專題報告繳交", status: "未完成", teacherComment: "", studentComments: [] }
        ]
    }
};

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    // 如果沒有存儲的資料或解析失敗，使用預設資料並儲存
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// --- 學生查詢介面邏輯 ---

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
    
    document.getElementById('display-student-id').textContent = account.slice(0, 4) + '****';
    document.getElementById('display-name').textContent = studentInfo.name.charAt(0) + '**' + studentInfo.name.charAt(studentInfo.name.length - 1);
    document.getElementById('display-school').textContent = document.getElementById('school').value.trim();
    document.getElementById('display-class').textContent = document.getElementById('class').value.trim();
    
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
        // 確保 class name 只有中文和英文
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

// --- 整合式留言/審核彈窗邏輯 (略) ---

function showCommentModal(account, itemName) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    
    const task = students[account].tasks.find(t => t.item === itemName);
    if (!task) return;

    document.getElementById('modal-task-name').textContent = itemName;
    
    const listDiv = document.getElementById('modal-comments-list');
    listDiv.innerHTML = '';
    
    if (task.teacherComment) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[教師當前留言]</strong>: ${task.teacherComment}`;
        p.style.backgroundColor = '#eaf7ff'; 
        listDiv.appendChild(p);
    }
    
    task.studentComments.forEach(c => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>[${c.role} @ ${c.time}]</strong>: ${c.text}`;
        listDiv.appendChild(p);
    });
    
    const isStudent = !isAdminMode;

    const studentCommentArea = document.getElementById('modal-student-comment-area');
    studentCommentArea.style.display = isStudent ? 'block' : 'none';

    const submissionArea = document.getElementById('modal-submission-area');
    submissionArea.style.display = isStudent ? 'block' : 'none';

    if (isStudent) {
        const submissionBtn = submissionArea.querySelector('.submission-btn');
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
}

window.submitStudentCommentFromModal = function() {
    const commentText = document.getElementById('modal-new-student-comment').value.trim();

    if (!commentText || !currentTaskAccount || !currentTaskItem) {
        alert("請輸入留言內容。");
        return;
    }

    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (task) {
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "學生",
            text: commentText,
        });
        saveStudentData(students);
        alert(`對 [${currentTaskItem}] 的留言已提交。`);
        
        document.getElementById('modal-new-student-comment').value = '';
        showCommentModal(currentTaskAccount, currentTaskItem);
        if (!isAdminMode) {
             renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
        }
    }
}

window.confirmSubmissionFromModal = function() {
    if (!currentTaskAccount || !currentTaskItem) return;
    
    const task = students[currentTaskAccount].tasks.find(t => t.item === currentTaskItem);
    if (!task) return;

    if (confirm(`確定要將 [${currentTaskItem}] 狀態改為「審核中」嗎？`)) {
        task.status = "審核中";
        task.pendingReview = true;
        task.studentComments.push({
            time: new Date().toLocaleString(),
            role: "系統",
            text: "學生已提交項目等待審核。",
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

/** 修正: 確保能正確從教師登入頁返回學生登入頁面，修復按鈕失效問題 */
window.hideTeacherLogin = function() {
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('teacher-login-form').reset();
}

/** 修正: 確保教師登出後，正確顯示學生登入頁面，修復空白畫面問題 */
window.teacherLogout = function() {
    isAdminMode = false;
    document.getElementById('admin-container').classList.add('hidden');
    // 呼叫修正後的 hideTeacherLogin() 確保返回學生登入介面
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

function editStudent(account) {
    const student = students[account];
    if (!student) return;

    document.getElementById('student-original-account').value = account; 
    document.getElementById('new-account').value = account;
    document.getElementById('new-name').value = student.name;
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

    // 3. 教師留言
    const commentCell = row.insertCell();
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.value = task.teacherComment;
    commentInput.className = 'task-comment-input';
    commentCell.appendChild(commentInput);

    // 4. 留言紀錄按鈕
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    historyBtn.textContent = `留言 (${task.studentComments.length})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn';
    
    if (account) { 
        // 使用 itemInput.value.trim() 確保取得當前最新的項目名稱
        historyBtn.onclick = () => showCommentModal(account, itemInput.value.trim()); 
    } else {
        historyBtn.disabled = true; 
    }
    historyCell.appendChild(historyBtn);

    // 5. 操作
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.onclick = () => row.remove();
    actionCell.appendChild(removeBtn);

    const clearCommentBtn = document.createElement('button');
    clearCommentBtn.textContent = '清空學生留言';
    clearCommentBtn.type = 'button'; 
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
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}


function handleAddTaksClick() {
    const currentAccount = document.getElementById('new-account').value.trim();
    addTaskRow(undefined, currentAccount);
}

window.resetForm = function() {
    document.getElementById('admin-tasks-tbody').innerHTML = '';
    document.getElementById('student-original-account').value = '';
    document.getElementById('new-account').value = ''; // 確保清除帳號欄位
    document.getElementById('new-name').value = ''; // 確保清除姓名欄位
    document.getElementById('form-submit-btn').textContent = '新增學生';
}

function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('new-account').value.trim();
    const newName = document.getElementById('new-name').value.trim();

    if (!newAccount) { alert("帳號不能為空！"); return; }
    
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
    
    students[newAccount] = {
        name: newName,
        tasks: newTasks
    };
    
    saveStudentData(students);
    alert(`學生 ${newName} (帳號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);

    displayStudentList();
    
    // 如果是更新，則重新載入編輯模式，保持表單狀態
    if (originalAccount || document.getElementById('form-submit-btn').textContent === '更新學生資料') {
         editStudent(newAccount);
    } else {
        resetForm(); 
    }
}


/** 修正: 確保能正確顯示學生列表，修復舊學生消失和列表空白問題 */
function displayStudentList() {
    const tbody = document.querySelector('#student-list-table tbody');
    if (!tbody) return; // 安全檢查

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

function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (帳號: ${account}) 嗎？`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList(); 
        resetForm(); 
    }
}


// --- 初始化與事件監聽 (確保所有元素載入後才綁定事件) ---

document.addEventListener('DOMContentLoaded', function() {
    // 1. 載入資料
    students = loadStudentData(); 
    isAdminMode = false;
    
    // 2. 設定初始頁面狀態
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
    
    // 3. 綁定事件監聽器
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    // 綁定 + 新增項目 按鈕的點擊事件
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
    
    // 確保教師登入頁面的「返回學生登入」按鈕使用修正後的函數
    // 假設 index.html 中該按鈕是 <button onclick="hideTeacherLogin()" class="secondary-btn">返回學生登入</button>
});
