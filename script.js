// --- 常量設定 ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];
const COMMENT_CHAR_LIMIT = 300; 

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
            { item: "國文期中考", status: "已認證", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 1, time: new Date(Date.now() - 3600000).toLocaleString(), role: "教師", text: "作業完成得不錯！", isTeacher: true, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null },
              ]
            },
            { item: "數學作業繳交", status: "未完成", teacherComment: "", pendingReview: false,
              studentComments: [
                  { id: 3, time: new Date(Date.now() - 7200000).toLocaleString(), role: "學生", text: "我還在努力寫，請問截止日是什麼時候？", isTeacher: false, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null }
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
                  { id: 4, time: new Date(Date.now() - 1200000).toLocaleString(), role: "教師", text: "報告格式錯誤，請修改後重新提交。", isTeacher: true, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null }
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
            // 確保所有物件包含必要的預設屬性 (如 studentComments)
            Object.values(data).forEach(s => {
                s.tasks = s.tasks || [];
                s.tasks.forEach(t => {
                     t.studentComments = t.studentComments || []; 
                });
            });
            return data;
        }
    } catch (e) { 
        console.error("Failed to parse stored data, using default.", e); 
    }
    
    // 如果沒有資料或解析失敗，使用預設資料並儲存
    if (!storedData || Object.keys(JSON.parse(storedData) || {}).length === 0) {
        saveStudentData(DEFAULT_STUDENTS);
        return DEFAULT_STUDENTS;
    }
    return {}; // 不應該發生，但作為防呆
}
students = loadStudentData();

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadOriginalStudentData(account) {
    const student = students[account];
    if (student) {
        // 深層複製學生資料，作為取消編輯的快照
        originalStudentData = JSON.parse(JSON.stringify(student));
    } else {
        originalStudentData = null;
    }
}

function isFormModified() {
    const originalAccount = document.getElementById('student-original-account').value;
    
    // 如果不是編輯模式或沒有原始快照，則不算修改
    if (!originalStudentData || originalStudentData.account !== originalAccount) {
        return false; 
    }

    // 檢查基本資料是否修改
    if (originalStudentData.account !== document.getElementById('admin-account').value.trim() ||
        originalStudentData.name !== document.getElementById('admin-name').value.trim() ||
        originalStudentData.school !== document.getElementById('admin-school').value.trim() ||
        originalStudentData.class !== document.getElementById('admin-class').value.trim() ||
        (document.getElementById('admin-email') && originalStudentData.email !== document.getElementById('admin-email').value.trim())) {
        return true;
    }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    
    // 檢查項目數量是否修改
    if (taskRows.length !== originalStudentData.tasks.length) {
        return true;
    }

    // 檢查每個項目細節是否修改
    for (let i = 0; i < taskRows.length; i++) {
        const row = taskRows[i];
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        
        if (!itemInput || !statusSelect || !originalStudentData.tasks[i]) {
            continue; 
        }

        if (itemInput.value.trim() !== originalStudentData.tasks[i].item || 
            statusSelect.value !== originalStudentData.tasks[i].status) {
            return true;
        }
        
        // 檢查是否有新增或刪除留言 (通過比較儲存在 row 上的原始留言長度)
        const originalCommentsLength = JSON.parse(row.getAttribute('data-original-comments') || '[]').length;
        if (originalCommentsLength !== originalStudentData.tasks[i].studentComments.length) {
             return true;
        }
    }

    return false; 
}


/**
 * 處理「新增學生（切換）」按鈕的點擊。
 */
window.switchToNewStudentMode = function() {
    const formSubmitBtn = document.getElementById('form-submit-btn');
    const isEditingMode = formSubmitBtn.textContent === '更新學生資料';
    
    if (isEditingMode && isFormModified()) {
        if (!confirm("您目前正在編輯中，資料尚未儲存。確定要放棄更改並切換到新增學生介面嗎？\n\n您對舊學生資料的更改將被丟棄。")) {
            return; 
        }
    }
    
    // 執行徹底清空和模式切換 (不顯示 alert)
    resetForm(false); 
    
    alert("已切換到新增學生介面，請開始填寫新資料。");
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
        errorMessage.textContent = '登入失敗：學號不存在，請檢查。';
        return;
    }
    
    errorMessage.textContent = '';
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('teacher-login-btn').style.display = 'none'; 
    document.getElementById('result-container').classList.remove('hidden');
    
    document.getElementById('display-student-id').textContent = studentInfo.account;
    
    // 姓名遮蔽處理
    const name = studentInfo.name || '';
    const maskedName = name.length > 2 ? name.charAt(0) + '**' + name.charAt(name.length - 1) : name;
    document.getElementById('display-name').textContent = maskedName;
    
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
             actionBtn.style.backgroundColor = '#2980b9';
        } else {
            actionBtn.textContent = '查看留言';
            actionBtn.className = 'secondary-btn';
        }
        
        // 學生介面點擊留言按鈕 (isModalAdminMode: false)
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
        
        // 【關鍵修正點】：在登入成功後，**必須**呼叫 displayStudentList()
        displayStudentList();
        
        // 進入管理介面時，執行一次重設，確保是新增模式
        resetForm(false); 
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

/**
 * 渲染教師管理介面下方的學生列表。
 */
function displayStudentList() {
    const tbody = document.getElementById('student-list-tbody');
    if (!tbody) {
        console.error("找不到學生列表的 tbody (id: student-list-tbody)");
        return;
    }
    tbody.innerHTML = '';
    
    // 遍歷所有學生資料
    Object.values(students).forEach(student => {
        const row = tbody.insertRow();
        
        // 1. 學號
        row.insertCell().textContent = student.account; 
        
        // 2. 姓名
        row.insertCell().textContent = student.name;
        
        // 3. 操作
        const actionCell = row.insertCell();
        
        // 編輯按鈕
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯';
        editBtn.type = 'button';
        editBtn.className = 'primary-btn';
        editBtn.style.marginRight = '5px';
        editBtn.style.padding = '5px 10px';
        editBtn.style.marginTop = '0';
        editBtn.style.backgroundColor = '#3498db'; 
        editBtn.onclick = () => editStudent(student.account);
        actionCell.appendChild(editBtn);

        // 移除按鈕
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.type = 'button';
        removeBtn.className = 'danger-btn'; 
        removeBtn.style.padding = '5px 10px';
        removeBtn.style.marginTop = '0';
        removeBtn.style.backgroundColor = '#e74c3c'; 
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

    loadOriginalStudentData(account); 
    
    document.getElementById('student-original-account').value = account; 
    
    document.getElementById('admin-account').value = student.account || account; 
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
    
    // 如果是新增模式且沒有項目，或編輯模式但沒有任何項目，則新增一個空白行
    if (tasks.length === 0) {
        addTaskRow({}, account);
    }
}

function addTaskRow(task = { item: '', status: '未完成', teacherComment: '', studentComments: [], pendingReview: false }, account = '') {
    const tbody = document.getElementById('admin-tasks-tbody');
    const row = tbody.insertRow();
    
    // 儲存原始項目名稱作為識別 
    row.setAttribute('data-original-item-name', task.item);

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
    const latestTeacherComment = task.studentComments.slice().reverse().find(c => c.isTeacher && !c.isRecalled && !c.isBlocked);
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
    
    
    // 判斷是否為「新增模式下的未儲存狀態」 (account 為空且 task.item 為空)
    const isNewUnsavedRow = (account === '' && task.item === '');
    
    if (isNewUnsavedRow) {
        historyBtn.textContent = '留言 (0)';
        historyBtn.style.backgroundColor = '#ccc';
        historyBtn.onclick = () => {
             alert('請先填寫學號與項目名稱，並點擊「新增學生」儲存後，才能針對項目進行留言操作。');
        };
    } else {
        // 編輯模式 或 新增模式下已儲存的項目 (有 account)
        historyBtn.onclick = () => {
             const currentAccount = document.getElementById('admin-account').value.trim();
             const currentItemName = itemInput.value.trim();
             
             if (!currentAccount) {
                 alert('學號不能為空！');
                 return;
             }
             if (!currentItemName) {
                 alert('項目名稱不能為空，請先填寫項目名稱！');
                 return;
             }
             
             // 必須透過 getTask 找到最新的儲存資料
             const taskCheck = getTask(currentAccount, currentItemName);
             if (!taskCheck) {
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
    removeBtn.className = 'secondary-btn';
    removeBtn.style.marginTop = '0';
    removeBtn.style.backgroundColor = '#95a5a6';
    removeBtn.style.color = 'white';
    
    removeBtn.onclick = () => {
        const itemName = itemInput.value.trim();
        const hasComments = (task.studentComments || []).length > 0;
        
        if (itemName === '' && !hasComments) {
            // 移除空白行
            row.remove();
        } else {
             const confirmMsg = `你確定要移除項目「${itemName || '未命名項目'}」嗎？更新資料後將無法復原。你可以點擊[重設/取消編輯]，將更新前資料恢復。`;
             if (confirm(confirmMsg)) {
                  row.remove();
                  // 如果移除的是唯一的空白行，則新增一個空白行
                  if (document.querySelectorAll('#admin-tasks-tbody tr').length === 0) {
                      addTaskRow();
                  }
             }
        }
    };
    actionCell.appendChild(removeBtn);
    
    // 儲存原始資料快照到行屬性中
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments || []));
    row.setAttribute('data-pending-review', task.pendingReview ? 'true' : 'false');
}

/**
 * 【新增項目】按鈕邏輯修正：確保每次點擊都新增一個空白行
 */
function handleAddTaksClick() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    addTaskRow(undefined, currentAccount); 
}

/** * 重設/取消編輯邏輯 (確保徹底清空或恢復)
 * @param {boolean} showAlert - 是否彈出提示
 */
window.resetForm = function(showAlert = true) {
    const originalAccount = document.getElementById('student-original-account').value;
    const isEditingMode = document.getElementById('form-submit-btn').textContent === '更新學生資料' && originalAccount && originalStudentData;

    if (isEditingMode) {
         // **編輯模式**：恢復為編輯前的資料
         if (originalStudentData) {
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
    }
    
    // **新增模式** 或 **編輯模式下沒有原始資料**：執行徹底清空 (重設)
    document.getElementById('admin-tasks-tbody').innerHTML = ''; 
    document.getElementById('student-original-account').value = ''; 
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    document.getElementById('admin-school').value = '';
    document.getElementById('admin-class').value = '';
    document.getElementById('admin-email').value = '';
    
    // 立即切換為新增模式 UI
    document.getElementById('form-submit-btn').textContent = '新增學生';
    document.getElementById('form-submit-btn').style.backgroundColor = '#3498db'; // 新增模式藍色
    document.getElementById('switch-to-new-student-btn').classList.add('hidden');
    originalStudentData = null; // 清除快照

    // 確保清空後有一個空行可供輸入
    addTaskRow(); 
    
    if (showAlert) alert("設定項已清空，已切換回新增學生模式。");
}


function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    const originalAccount = document.getElementById('student-original-account').value.trim();
    const account = document.getElementById('admin-account').value.trim();
    const isUpdate = !!originalAccount; 

    // 帳號重複檢查 (僅在新增模式或修改帳號時)
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

    // 收集項目資料
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');
        
        const itemName = itemInput ? itemInput.value.trim() : '';
        const status = statusSelect ? statusSelect.value : '未完成';
        
        if (itemName) {
            let task = {
                item: itemName,
                status: status,
                teacherComment: '', // 在此處不需要更新
                pendingReview: row.getAttribute('data-pending-review') === 'true',
                // 使用快照中的留言資料
                studentComments: JSON.parse(row.getAttribute('data-original-comments') || '[]')
            };

            // 如果是編輯模式，且是已存在的項目，則保留原始的留言/審核狀態
            if (isUpdate && originalStudentData) {
                 const originalTask = originalStudentData.tasks.find(t => t.item === itemName);
                 if (originalTask) {
                     task.teacherComment = originalTask.teacherComment;
                     task.pendingReview = originalTask.pendingReview;
                     // 再次確認使用原始的留言，防止在編輯表單時留言被清空
                     task.studentComments = originalTask.studentComments;
                 } else {
                     // 這是新增項目，重置留言快照 (以防萬一)
                     task.studentComments = [];
                 }
            }
            
            newStudentData.tasks.push(task);
        }
    });

    // 處理更新模式下學號變動
    if (isUpdate && originalAccount !== account) {
        delete students[originalAccount]; 
    }
    
    students[account] = newStudentData;
    saveStudentData(students);

    if (isUpdate) {
        alert("學生資料已成功更新！");
        loadOriginalStudentData(account); // 更新快照
        editStudent(account); // 重新載入編輯介面以更新列表中的留言計數等
    } else {
        alert("新學生資料已成功新增！");
        // 新增完成後切換回新增模式
        resetForm(false); 
    }

    displayStudentList(); // 更新底部的學生列表
}


// --- 整合式留言/審核彈窗邏輯 ---

function getTask(account, itemName) {
    const student = students[account];
    if (!student) return null;
    // 使用 find 確保項目名稱完全匹配
    return student.tasks.find(t => t.item === itemName);
}

window.showCommentModal = function(account, itemName, isModalAdminMode) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    const task = getTask(account, itemName);

    if (!task) {
        alert(`找不到學生 ${account} 的項目 ${itemName}！請確保學號和項目名稱已儲存。`);
        return;
    }
    
    const modal = document.getElementById('comment-history-modal');
    document.getElementById('modal-task-name').textContent = itemName;
    const commentsList = document.getElementById('modal-comments-list');
    commentsList.innerHTML = '';
    
    // 渲染留言
    const sortedComments = (task.studentComments || []).slice().reverse();
    if (sortedComments.length > 0) {
        sortedComments.forEach(comment => {
            commentsList.appendChild(renderComment(comment, isModalAdminMode));
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: #888;">目前沒有留言紀錄。</p>';
    }

    // 顯示留言輸入區和提交審核區
    const studentCommentArea = document.getElementById('modal-student-comment-area');
    const submissionArea = document.getElementById('modal-submission-area');
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    
    newCommentTextarea.placeholder = isModalAdminMode ? "輸入給學生的留言..." : "輸入您的留言...";
    newCommentTextarea.value = ''; 
    
    if (isModalAdminMode) {
        // 教師模式：只顯示留言區
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.add('hidden');
    } else {
        // 學生模式：顯示留言和審核區
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.remove('hidden');
        
        const submissionBtn = submissionArea.querySelector('.submission-btn');
        const submissionMsg = document.getElementById('modal-submission-message');
        
        if (task.status === '審核中') {
            submissionMsg.textContent = '此項目已提交審核，請耐心等待教師回覆。';
            submissionBtn.style.display = 'none';
        } else if (task.status === '已認證') {
            submissionMsg.textContent = '此項目已通過認證，若有疑問可留言聯繫教師。';
            submissionBtn.style.display = 'block'; // 允許重新提交審核
            submissionBtn.textContent = '重新提交審核';
        } else {
            submissionMsg.textContent = '完成後，請點擊下方按鈕提交審核。';
            submissionBtn.textContent = '提交完成/重新審核';
            submissionBtn.style.display = 'block';
        }
    }

    modal.style.display = 'block';
}

function renderComment(comment, isModalAdminMode) {
    const li = document.createElement('div');
    li.className = 'comment ' + (comment.isTeacher ? 'comment-teacher' : 'comment-student');
    li.setAttribute('data-comment-id', comment.id);

    if (comment.isRecalled) {
        li.classList.add('comment-recalled');
        li.innerHTML = `**此留言已被${comment.recalledBy}撤回。**`;
    } else if (comment.isBlocked) {
        li.classList.add('comment-blocked');
        li.innerHTML = `**此留言已被${comment.blockedBy}屏蔽。**`;
    } else {
        const role = comment.isTeacher ? '教師' : '學生';
        li.innerHTML = `
            <strong>${role} (${comment.time}):</strong>
            <p style="white-space: pre-wrap; margin: 5px 0 0;">${comment.text}</p>
        `;
        
        // 留言操作按鈕
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'comment-actions';
        
        if (isModalAdminMode) {
             // 教師可以屏蔽所有留言，撤回自己的留言
             if (!comment.isBlocked) {
                 const blockBtn = document.createElement('button');
                 blockBtn.textContent = '屏蔽';
                 blockBtn.className = 'danger-btn';
                 blockBtn.onclick = () => blockComment(comment.id);
                 actionsDiv.appendChild(blockBtn);
             }
             if (comment.isTeacher && !comment.isRecalled) {
                 const recallBtn = document.createElement('button');
                 recallBtn.textContent = '撤回';
                 recallBtn.className = 'secondary-btn';
                 recallBtn.onclick = () => recallComment(comment.id);
                 actionsDiv.appendChild(recallBtn);
             }
        } else {
             // 學生可以撤回自己的留言 (不是屏蔽/撤回狀態)
             if (!comment.isTeacher && !comment.isRecalled) {
                 const recallBtn = document.createElement('button');
                 recallBtn.textContent = '撤回';
                 recallBtn.className = 'secondary-btn';
                 recallBtn.onclick = () => recallComment(comment.id);
                 actionsDiv.appendChild(recallBtn);
             }
        }
        
        if (actionsDiv.children.length > 0) {
            li.appendChild(actionsDiv);
        }
    }
    
    return li;
}

window.recallComment = function(commentId) {
    if (!confirm("確定要撤回此留言嗎？撤回後將顯示內容已被撤回。")) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isRecalled = true;
        comment.recalledBy = isAdminMode ? '教師' : '發送者';
        saveStudentData(students);
        
        // 重新渲染 Modal
        if (!isAdminMode) {
             renderTasks(students[currentTaskAccount].tasks, currentTaskAccount);
        } else {
             // 教師模式更新編輯區的留言計數
             editStudent(currentTaskAccount);
        }
        showCommentModal(currentTaskAccount, currentTaskItem, isAdminMode); 
    }
}

window.blockComment = function(commentId) {
    if (!confirm("確定要屏蔽此留言嗎？屏蔽後學生將無法看到此留言。")) return;
    if (!isAdminMode) return; 
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;

    const comment = task.studentComments.find(c => c.id === commentId);
    if (comment) {
        comment.isBlocked = true;
        comment.blockedBy = '教師';
        saveStudentData(students);
        
        // 重新渲染 Modal
        editStudent(currentTaskAccount);
        showCommentModal(currentTaskAccount, currentTaskItem, isAdminMode);
    }
}

window.confirmSubmissionFromModal = function() {
    if (!confirm("您確定要將此項目提交審核嗎？提交後將更新狀態並等待教師處理。")) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;
    
    task.status = '審核中';
    task.pendingReview = true;
    saveStudentData(students);
    
    alert(`項目「${currentTaskItem}」已成功提交審核！`);
    
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
    
    const modal = document.getElementById('comment-history-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    document.getElementById('switch-to-new-student-btn').classList.add('hidden'); 
    
    // 綁定所有表單和按鈕事件
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    // 【新增項目】按鈕綁定修正
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
    
    // 進入頁面時，確保新增/編輯區為新增模式，並有一個空行
    resetForm(false); 
});
