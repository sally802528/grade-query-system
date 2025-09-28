// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudentsV2'; // 使用新 key 避免舊資料干擾
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};
let originalStudentData = null; // 儲存編輯前的快照

// --- 輔助函數：資料持久化與預設資料 ---

const DEFAULT_STUDENTS = {
    'A123456789': { 
        account: 'A123456789', 
        name: '林書恩',
        school: '奇美高中',
        class: '二年甲班',
        email: 'li***g@qimei.edu.tw',
        tasks: [
            { item: "國文期中考", status: "已認證", pendingReview: false,
              studentComments: [
                  { id: 1, time: new Date(Date.now() - 3600000).toLocaleString(), isTeacher: true, text: "作業完成得不錯！", isRecalled: false, isBlocked: false },
              ]
            },
            { item: "數學作業繳交", status: "未完成", pendingReview: false,
              studentComments: [
                  { id: 3, time: new Date(Date.now() - 7200000).toLocaleString(), isTeacher: false, text: "我還在努力寫，請問截止日是什麼時候？", isRecalled: false, isBlocked: false }
              ] 
            },
            { item: "期末專題報告", status: "認證失敗", pendingReview: false,
              studentComments: [
                  { id: 4, time: new Date(Date.now() - 1200000).toLocaleString(), isTeacher: true, text: "報告格式錯誤，請修改後重新提交。", isRecalled: false, isBlocked: false }
              ] 
            },
        ]
    },
    // 修復問題 1/6: 確保預設資料中沒有空白學號
    'B987654321': { 
        account: 'B987654321', 
        name: '陳美玲',
        school: '奇美高中',
        class: '二年甲班',
        email: 'ch***n@qimei.edu.tw',
        tasks: []
    }
};

let nextCommentId = 100; // 留言 ID 計數器

function loadStudentData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    try {
        const data = JSON.parse(storedData);
        if (data && Object.keys(data).length > 0) {
            // 找出最大的 comment ID 以避免重複
            Object.values(data).forEach(s => s.tasks.forEach(t => t.studentComments.forEach(c => {
                if (c.id >= nextCommentId) nextCommentId = c.id + 1;
            })));
            return data;
        }
    } catch (e) { 
        console.error("Failed to parse stored data, using default.", e); 
    }
    
    // 如果沒有資料或解析失敗，使用預設資料並儲存
    saveStudentData(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
}
students = loadStudentData();

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTask(account, itemName) {
    const student = students[account];
    if (!student) return null;
    return student.tasks.find(t => t.item === itemName);
}

// --- 學生查詢介面邏輯 (問題 6 修復) ---

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
        errorMessage.textContent = '登入失敗：學號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').style.display = 'none'; 
    document.getElementById('result-container').classList.remove('hidden');
    
    // 修復問題 6 邏輯：確保學號和姓名正確顯示
    document.getElementById('display-student-id').textContent = studentInfo.account;
    const name = studentInfo.name || '';
    const maskedName = name.length > 2 ? name.charAt(0) + '**' + name.charAt(name.length - 1) : name;
    document.getElementById('display-name').textContent = maskedName;
    
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
        actionBtn.style.marginTop = '0';
        
        // 修復問題 5 邏輯：已認證不顯示提交審核按鈕
        if (data.status === '未完成' || data.status === '認證失敗') {
             actionBtn.textContent = '提交審核 / 查看留言';
             actionBtn.className = 'primary-btn';
        } else if (data.status === '審核中') {
             actionBtn.textContent = '審核中 / 查看留言';
             actionBtn.className = 'primary-btn';
             actionBtn.style.backgroundColor = '#2980b9'; // 較深的藍色
        } else if (data.status === '已認證') {
             actionBtn.textContent = '查看留言'; // 已認證只顯示查看留言
             actionBtn.className = 'secondary-btn';
             actionBtn.style.backgroundColor = '#95a5a6';
             actionBtn.style.color = 'white';
        }

        actionBtn.onclick = () => showCommentModal(account, data.item, false); 
        actionCell.appendChild(actionBtn);
    });
}

window.logout = function() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('login-form').reset();
}

// --- 教師介面切換與登入 ---

function handleTeacherLoginClick() {
    isAdminMode = false;
    document.getElementById('login-container').classList.add('hidden'); 
    document.getElementById('teacher-login-btn').style.display = 'none';
    document.getElementById('teacher-login-container').classList.remove('hidden');
    document.getElementById('teacher-login-form').reset();
    document.getElementById('teacher-error-message').textContent = ''; 
}

window.hideTeacherLogin = function() {
    isAdminMode = false; 
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block';
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
        resetForm(false); 
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

/**
 * 渲染教師管理介面下方的學生列表。
 * 修復問題 1 邏輯：確保學號存在時才渲染。
 */
function displayStudentList() {
    const tbody = document.getElementById('student-list-tbody');
    tbody.innerHTML = '';
    
    Object.values(students).forEach(student => {
        // 修復問題 1 邏輯：如果學號為空，則跳過此學生，不顯示在列表中
        if (!student.account) return; 
        
        const row = tbody.insertRow();
        
        row.insertCell().textContent = student.account; 
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯';
        editBtn.type = 'button';
        editBtn.className = 'primary-btn';
        editBtn.style.marginRight = '5px';
        editBtn.style.padding = '5px 10px';
        editBtn.style.marginTop = '0';
        editBtn.style.width = 'auto';
        editBtn.onclick = () => editStudent(student.account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.type = 'button';
        removeBtn.className = 'danger-btn'; 
        removeBtn.style.padding = '5px 10px';
        removeBtn.style.marginTop = '0';
        removeBtn.style.width = 'auto';
        removeBtn.onclick = () => removeStudent(student.account);
        actionCell.appendChild(removeBtn);
    });
}

window.removeStudent = function(account) {
    if (confirm(`確定要永久移除學號 ${account} 的學生資料嗎？此操作無法復原！`)) {
        if (originalStudentData && originalStudentData.account === account) {
             originalStudentData = null;
             resetForm(false);
        }
        
        delete students[account];
        saveStudentData(students);
        displayStudentList();
        alert(`學生 ${account} 已被移除。`);
    }
}


function editStudent(account) {
    const student = students[account];
    if (!student) return;

    // 深層複製快照
    originalStudentData = JSON.parse(JSON.stringify(student)); 
    
    document.getElementById('student-original-account').value = account; 
    
    document.getElementById('admin-account').value = student.account || ''; 
    document.getElementById('admin-name').value = student.name || '';
    document.getElementById('admin-school').value = student.school || '';
    document.getElementById('admin-class').value = student.class || '';
    document.getElementById('admin-email').value = student.email || '';
    
    document.getElementById('form-submit-btn').textContent = '更新學生資料';
    document.getElementById('form-submit-btn').style.backgroundColor = '#3498db';
    
    document.getElementById('switch-to-new-student-btn').classList.remove('hidden');
    
    loadTasksToAdminTable(student.tasks, account); 
    
    document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
}

function loadTasksToAdminTable(tasks, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        addTaskRow(task, account);
    });
    
    if (tasks.length === 0) {
        addTaskRow({}, account);
    }
}

function addTaskRow(task = { item: '', status: '未完成', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    row.setAttribute('data-original-item-name', task.item);

    // 1. 項目名稱
    const itemCell = row.insertCell();
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = task.item;
    itemInput.className = 'task-item-input';
    // 監聽 input 事件，一旦有內容就移除紅色邊框 (修復問題 4 的前端提示)
    itemInput.oninput = () => itemInput.style.border = ''; 
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
    const latestTeacherComment = (task.studentComments || []).slice().reverse().find(c => c.isTeacher && !c.isRecalled && !c.isBlocked);
    if (latestTeacherComment) {
        commentCell.textContent = latestTeacherComment.text.substring(0, 15) + (latestTeacherComment.text.length > 15 ? '...' : '');
        commentCell.title = latestTeacherComment.text;
    } else {
        commentCell.textContent = '無教師留言';
        commentCell.style.color = '#888'; 
    }

    // 4. 留言紀錄按鈕 
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    const activeComments = (task.studentComments || []).filter(c => !c.isRecalled && !c.isBlocked).length;
    historyBtn.textContent = `留言 (${activeComments})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn secondary-btn';
    historyBtn.style.marginTop = '0';
    historyBtn.style.padding = '5px 10px';
    historyBtn.style.width = 'auto';
    
    
    // 如果是新增模式下的未儲存狀態，禁用留言按鈕
    const isNewUnsavedRow = (account === '' && task.item === '');
    if (isNewUnsavedRow) {
        historyBtn.style.backgroundColor = '#ccc';
        historyBtn.onclick = () => alert('請先儲存學生資料後再開啟留言區！');
    } else {
        historyBtn.onclick = () => {
             const currentAccount = document.getElementById('admin-account').value.trim();
             const currentItemName = itemInput.value.trim();
             
             if (!currentAccount || !currentItemName) {
                 alert('請先確保學號和項目名稱已填寫。');
                 return;
             }
             
             // 為了確保開啟的是最新儲存的資料，在開啟前先嘗試提交表單
             // (這裡我們簡化處理，假設資料在表單提交時已更新)
             
             // 檢查該項目是否已儲存到 students 物件中
             if (!getTask(currentAccount, currentItemName)) {
                 alert('項目資料尚未儲存，請先點擊「更新學生資料」後再開啟留言區！');
                 return;
             }
             
             showCommentModal(currentAccount, currentItemName, true); 
        };
    }
    
    historyCell.appendChild(historyBtn);

    // 5. 操作 (移除)
    const actionCell = row.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.type = 'button'; 
    removeBtn.className = 'danger-btn';
    removeBtn.style.marginTop = '0';
    removeBtn.style.padding = '5px 10px';
    removeBtn.style.width = 'auto';
    
    removeBtn.onclick = () => {
        if (confirm(`確定要移除項目「${itemInput.value || '未命名項目'}」嗎？`)) {
             row.remove();
             // 確保至少留一個空行
             if (document.querySelectorAll('#admin-tasks-tbody tr').length === 0) {
                 addTaskRow();
             }
        }
    };
    actionCell.appendChild(removeBtn);
    
    // 儲存原始資料快照到行屬性中
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments || []));
    row.setAttribute('data-pending-review', task.pendingReview ? 'true' : 'false');
}

window.handleAddTaksClick = function() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    addTaskRow(undefined, currentAccount); 
}

/** * 修復問題 3 邏輯：處理「新增學生（切換）」按鈕的點擊
 */
window.switchToNewStudentMode = function() {
    const formSubmitBtn = document.getElementById('form-submit-btn');
    const isEditingMode = formSubmitBtn.textContent === '更新學生資料';
    
    if (isEditingMode && originalStudentData) {
        if (!confirm("您目前正在編輯中，確定要放棄更改並切換到新增學生介面嗎？")) {
            return; 
        }
    }
    
    // 執行徹底清空和模式切換 
    resetForm(false); 
    
    // 立即切換為新增模式 UI
    document.getElementById('form-submit-btn').textContent = '新增學生';
    document.getElementById('form-submit-btn').style.backgroundColor = '#3498db'; 
    document.getElementById('switch-to-new-student-btn').classList.add('hidden');
    originalStudentData = null; // 清除快照

    alert("已切換到新增學生介面。");
}


/** * 重設/取消編輯邏輯
 */
window.resetForm = function(showAlert = true) {
    const originalAccount = document.getElementById('student-original-account').value;
    const isEditingMode = document.getElementById('form-submit-btn').textContent === '更新學生資料' && originalAccount && originalStudentData;

    if (isEditingMode && originalStudentData) {
         // **編輯模式**：恢復為編輯前的資料
         document.getElementById('student-original-account').value = originalStudentData.account; 
         document.getElementById('admin-account').value = originalStudentData.account; 
         document.getElementById('admin-name').value = originalStudentData.name; 
         document.getElementById('admin-school').value = originalStudentData.school;
         document.getElementById('admin-class').value = originalStudentData.class;
         document.getElementById('admin-email').value = originalStudentData.email;
         loadTasksToAdminTable(originalStudentData.tasks, originalStudentData.account);
         
         document.getElementById('form-submit-btn').textContent = '更新學生資料';
         document.getElementById('form-submit-btn').style.backgroundColor = '#3498db';
         document.getElementById('switch-to-new-student-btn').classList.remove('hidden');
         
         if (showAlert) alert("已取消編輯，恢復為上次儲存的資料。");
         return; 
    }
    
    // **新增模式** 或 **沒有原始資料**：執行徹底清空 
    document.getElementById('admin-tasks-tbody').innerHTML = ''; 
    document.getElementById('student-original-account').value = ''; 
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    // 預設值保持
    document.getElementById('admin-school').value = '奇美高中';
    document.getElementById('admin-class').value = '二年甲班';
    document.getElementById('admin-email').value = '';
    
    document.getElementById('form-submit-btn').textContent = '新增學生';
    document.getElementById('form-submit-btn').style.backgroundColor = '#3498db'; 
    document.getElementById('switch-to-new-student-btn').classList.add('hidden');
    originalStudentData = null; 

    // 確保清空後有一個空行可供輸入
    addTaskRow(); 
    
    if (showAlert) alert("已重設表單。");
}


function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value.trim();
    const account = document.getElementById('admin-account').value.trim();
    const isUpdate = !!originalAccount; 

    // 修復問題 1 & 4 邏輯：學號與項目名稱的非空驗證
    if (!account) {
         alert('錯誤：學號欄位不得為空！');
         return;
    }
    if (!isUpdate || (isUpdate && originalAccount !== account)) {
         if (students[account]) {
             alert(`學號 ${account} 已存在，請使用不同的學號或進入編輯模式。`);
             return;
         }
    }

    const newStudentData = {
        account: account,
        name: document.getElementById('admin-name').value.trim(),
        school: document.getElementById('admin-school').value.trim(),
        class: document.getElementById('admin-class').value.trim(),
        email: document.getElementById('admin-email').value.trim(),
        tasks: []
    };
    
    let hasEmptyActivityName = false;

    // 收集項目資料
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        
        const itemName = itemInput ? itemInput.value.trim() : '';
        
        // 核心修復問題 4：項目名稱非空驗證
        if (itemName === '') {
            hasEmptyActivityName = true;
            itemInput.style.border = '2px solid red'; // 視覺警告
            return; // 跳過這個項目，但繼續檢查其他行
        } else {
             itemInput.style.border = '';
        }
        
        const status = statusSelect ? statusSelect.value : '未完成';
        
        let task = {
            item: itemName,
            status: status,
            pendingReview: row.getAttribute('data-pending-review') === 'true',
            // 編輯時保留原始留言，新增時為空
            studentComments: JSON.parse(row.getAttribute('data-original-comments') || '[]')
        };

        // 如果是編輯模式，嘗試從原始資料中匹配留言和狀態
        if (isUpdate && originalStudentData) {
             const originalTask = originalStudentData.tasks.find(t => t.item === itemName);
             if (originalTask) {
                 task.pendingReview = originalTask.pendingReview;
                 task.studentComments = originalTask.studentComments; // 確保使用最新的留言
             }
        }
        
        newStudentData.tasks.push(task);
    });

    if (hasEmptyActivityName) {
         alert('錯誤：部分活動/成績項目名稱為空白，請填寫或移除後再提交！');
         return;
    }
    
    // 處理更新模式下學號變動
    if (isUpdate && originalAccount !== account) {
        delete students[originalAccount]; 
    }
    
    students[account] = newStudentData;
    saveStudentData(students);

    if (isUpdate) {
        alert("學生資料已成功更新！");
        editStudent(account); // 重新載入編輯介面以更新快照和列表
    } else {
        alert("新學生資料已成功新增！");
        switchToNewStudentMode(); // 新增完成後切換回新增模式
    }

    displayStudentList(); // 更新底部的學生列表
}


// --- 整合式留言/審核彈窗邏輯 ---

window.showCommentModal = function(account, itemName, isModalAdminMode) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    const task = getTask(account, itemName);

    if (!task) {
        alert(`找不到學生 ${account} 的項目 ${itemName}！`);
        return;
    }
    
    const modal = document.getElementById('comment-history-modal');
    document.getElementById('modal-task-name').textContent = itemName;
    
    renderCommentList(task.studentComments, isModalAdminMode);

    // 處理留言輸入區
    const newCommentTextarea = document.getElementById('modal-new-comment');
    newCommentTextarea.placeholder = isModalAdminMode ? "輸入給學生的留言..." : "輸入您的留言...";
    newCommentTextarea.value = ''; 
    document.getElementById('submit-comment-btn').textContent = '提交留言';

    // 處理提交審核區
    const submissionArea = document.getElementById('modal-submission-area');
    const submissionBtn = submissionArea.querySelector('.submission-btn');
    const submissionMsg = document.getElementById('modal-submission-message');

    if (isModalAdminMode) {
        // 教師模式：只顯示留言區
        submissionArea.classList.add('hidden');
    } else {
        // 學生模式：顯示留言和審核區
        submissionArea.classList.remove('hidden');
        
        if (task.status === '審核中') {
            submissionMsg.textContent = '此項目已提交審核，請耐心等待教師回覆。';
            submissionBtn.style.display = 'none';
        } else if (task.status === '已認證') {
            // 修復問題 5 邏輯：已認證時，按鈕改為「重新提交審核」且允許點擊
            submissionMsg.textContent = '此項目已通過認證。';
            submissionBtn.textContent = '重新提交審核';
            submissionBtn.style.display = 'block';
        } else {
            submissionMsg.textContent = '完成後，請點擊下方按鈕提交審核。';
            submissionBtn.textContent = '提交完成/重新審核';
            submissionBtn.style.display = 'block';
        }
    }

    modal.style.display = 'block';
}

function renderCommentList(comments, isModalAdminMode) {
    const commentsList = document.getElementById('modal-comments-list');
    commentsList.innerHTML = '';
    
    // 只顯示未屏蔽的留言 (教師模式可以看到所有留言)
    const filteredComments = isModalAdminMode 
        ? comments 
        : comments.filter(c => !c.isBlocked); 

    const sortedComments = filteredComments.slice().reverse();
    
    if (sortedComments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: #888;">目前沒有留言紀錄。</p>';
        return;
    }

    sortedComments.forEach(comment => {
        const li = document.createElement('div');
        li.className = 'comment ' + (comment.isTeacher ? 'comment-teacher' : 'comment-student');
        li.setAttribute('data-comment-id', comment.id);

        let contentHTML = '';
        const role = comment.isTeacher ? '教師' : '學生';
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'comment-actions';

        if (comment.isRecalled) {
            contentHTML = `**此留言已被${comment.isTeacher ? '教師' : '發送者'}撤回。**`;
            li.classList.add('comment-recalled');
        } else if (comment.isBlocked) {
            contentHTML = `**此留言已被教師屏蔽。** (僅您可見)`;
            li.classList.add('comment-blocked');
        } else {
            contentHTML = `
                <strong>${role} (${comment.time}):</strong>
                <p style="white-space: pre-wrap; margin: 5px 0 0;">${comment.text}</p>
            `;
            
            // 留言操作按鈕邏輯
            if (isModalAdminMode) { // 教師模式
                 if (!comment.isBlocked) {
                     const blockBtn = createActionButton('屏蔽', 'danger-btn', () => blockComment(comment.id));
                     actionsDiv.appendChild(blockBtn);
                 }
                 if (comment.isTeacher && !comment.isRecalled) {
                     const recallBtn = createActionButton('撤回', 'secondary-btn', () => recallComment(comment.id));
                     actionsDiv.appendChild(recallBtn);
                 }
            } else { // 學生模式
                 if (!comment.isTeacher && !comment.isRecalled) {
                     const recallBtn = createActionButton('撤回', 'secondary-btn', () => recallComment(comment.id));
                     actionsDiv.appendChild(recallBtn);
                 }
            }
        }
        
        li.innerHTML = contentHTML;
        if (actionsDiv.children.length > 0) {
             li.appendChild(actionsDiv);
        }
        commentsList.appendChild(li);
    });
}

function createActionButton(text, className, onclickHandler) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = className;
    btn.style.width = 'auto';
    btn.style.padding = '3px 8px';
    btn.style.fontSize = '0.75em';
    btn.style.marginTop = '0';
    btn.onclick = onclickHandler;
    return btn;
}


// 修復問題 2 邏輯：留言提交
window.submitCommentFromModal = function() {
    const text = document.getElementById('modal-new-comment').value.trim();
    if (!text) {
        alert("留言內容不能為空！");
        return;
    }

    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const newComment = {
        id: nextCommentId++,
        time: new Date().toLocaleString(),
        isTeacher: isAdminMode,
        text: text,
        isRecalled: false,
        isBlocked: false,
    };

    task.studentComments.push(newComment);
    saveStudentData(students);

    document.getElementById('modal-new-comment').value = '';
    alert("留言已成功發送！");

    // 重新渲染 Modal 和主介面列表
    renderCommentList(task.studentComments, isAdminMode); 
    if (isAdminMode) {
        editStudent(currentTaskAccount);
    } else {
        renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
    }
}

window.recallComment = function(commentId) {
    if (!confirm("確定要撤回此留言嗎？")) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isRecalled = true;
        saveStudentData(students);
        
        // 重新渲染
        renderCommentList(task.studentComments, isAdminMode); 
        if (isAdminMode) editStudent(currentTaskAccount);
        else renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
    }
}

window.blockComment = function(commentId) {
    if (!confirm("確定要屏蔽此留言嗎？")) return;
    if (!isAdminMode) return; 
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isBlocked = true;
        saveStudentData(students);
        
        // 重新渲染
        renderCommentList(task.studentComments, isAdminMode);
        editStudent(currentTaskAccount);
    }
}

window.confirmSubmissionFromModal = function() {
    if (!confirm("您確定要將此項目提交審核嗎？")) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;
    
    // 如果狀態是已認證，允許重新提交
    if (task.status === '已認證' || task.status === '認證失敗' || task.status === '未完成') {
        task.status = '審核中';
        task.pendingReview = true;
        saveStudentData(students);
        
        alert(`項目「${currentTaskItem}」已成功提交審核！`);
    } else {
        alert('此項目目前狀態不允許提交審核。');
    }

    // 重新渲染學生介面
    renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
    closeModal();
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').style.display = 'none';
    currentTaskAccount = null;
    currentTaskItem = null;
}


// --- 初始化與事件監聽 ---

document.addEventListener('DOMContentLoaded', function() {
    isAdminMode = false;
    
    // 確保所有容器初始狀態正確
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').style.display = 'none';
    
    // 綁定所有表單和按鈕事件
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    // 進入頁面時，確保新增/編輯區為新增模式，並有一個空行
    resetForm(false); 
});
