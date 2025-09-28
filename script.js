// --- 常量設定 (保持不變) ---
const STUDENT_PASSWORD = "Qimei@admin";
const TEACHER_PASSWORD = "Teacher@admin";
const STORAGE_KEY = 'gradeQueryStudents';
const STATUS_OPTIONS = ["已認證", "認證失敗", "審核中", "未完成"];
const COMMENT_CHAR_LIMIT = 300; 

let currentTaskAccount = null;
let currentTaskItem = null;
let isAdminMode = false;
let students = {};
let originalStudentData = {}; 

// --- 輔助函數：資料持久化與預設資料 (保持不變) ---

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
                  { id: 2, time: new Date(Date.now() - 1800000).toLocaleString(), role: "學生", text: "謝謝老師！我下次會更好。", isTeacher: false, isBlocked: false, isRecalled: false, recalledBy: null, blockedBy: null },
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
            Object.values(data).forEach(s => {
                s.tasks.forEach(t => {
                     t.studentComments = t.studentComments || []; 
                     t.studentComments.forEach(c => {
                         c.id = c.id || Date.now() + Math.random();
                         c.recalledBy = c.recalledBy || null; 
                         c.blockedBy = c.blockedBy || null; 
                     });
                });
            });
            return data;
        }
    } catch (e) { console.error("Failed to parse stored data, using default.", e); }
    if (!storedData) {
        saveStudentData(DEFAULT_STUDENTS);
        return DEFAULT_STUDENTS;
    }
    return {}; 
}
students = loadStudentData();

function saveStudentData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadOriginalStudentData(account) {
    const student = students[account];
    if (student) {
        originalStudentData = JSON.parse(JSON.stringify(student));
    } else {
        originalStudentData = null;
    }
}

function isFormModified() {
    // ... (isFormModified 邏輯保持不變，用於切換時的警告)
    const originalAccount = document.getElementById('student-original-account').value;
    
    if (!originalStudentData || originalStudentData.account !== originalAccount) {
        return false; 
    }

    if (originalStudentData.account !== document.getElementById('admin-account').value.trim() ||
        originalStudentData.name !== document.getElementById('admin-name').value.trim() ||
        originalStudentData.school !== document.getElementById('admin-school').value.trim() ||
        originalStudentData.class !== document.getElementById('admin-class').value.trim() ||
        (document.getElementById('admin-email') && originalStudentData.email !== document.getElementById('admin-email').value.trim())) {
        return true;
    }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    if (taskRows.length !== originalStudentData.tasks.length) {
        return true;
    }

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
        
        const currentCommentsLength = JSON.parse(row.getAttribute('data-original-comments') || '[]').length;
        if (currentCommentsLength !== originalStudentData.tasks[i].studentComments.length) {
             return true;
        }
    }

    return false; 
}


/**
 * 修正切換到新增學生介面，並**確保徹底清空**。
 * 這個函數現在專用於由「新增學生（切換）」按鈕觸發。
 */
window.switchToNewStudentMode = function() {
    const isEditingMode = document.getElementById('form-submit-btn').textContent === '更新學生資料';
    
    if (isEditingMode && isFormModified()) {
        if (!confirm("您目前正在編輯中，資料尚未儲存。確定要放棄更改並切換到新增學生介面嗎？\n\n**您對舊學生資料的更改將被丟棄。**")) {
            return; 
        }
    }
    
    // 呼叫 resetForm 進行清空和模式切換 (不顯示 alert)
    resetForm(false); 
    
    // 確保清空後有一個空行可供輸入
    addTaskRow(); 
    
    alert("已切換到新增學生介面，請開始填寫新資料。");
}


// --- 學生查詢介面邏輯 (保持不變) ---
// ... (學生查詢邏輯)
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
             actionBtn.style.backgroundColor = '#2980b9';
        } else {
            actionBtn.textContent = '查看留言';
            actionBtn.className = 'secondary-btn';
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


// --- 教師介面切換與登入 (保持不變) ---
// ... (教師登入邏輯)

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
        
        // 確保進入管理介面時是新增模式 (並新增一個空白項目)
        resetForm(false); 
        addTaskRow();
    } else {
        errorMessage.textContent = '管理密碼錯誤，請重試。';
    }
}


// --- 學生資料 CRUD 邏輯 (教師管理) ---

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
}

/** * 修正 2: 簡化留言按鈕邏輯，讓它直接嘗試開啟，並依賴 getTask 失敗時的警告。
 */
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
        commentCell.textContent = latestTeacherComment.text.substring(0, 15) + '...';
        commentCell.title = latestTeacherComment.text;
    } else {
        commentCell.textContent = '無教師留言';
        commentCell.style.color = '#888'; 
    }

    // 4. 留言紀錄按鈕 
    const historyCell = row.insertCell();
    const historyBtn = document.createElement('button');
    const activeComments = task.studentComments.filter(c => !c.isRecalled && !c.isBlocked).length;
    historyBtn.textContent = `留言 (${activeComments})`;
    historyBtn.type = 'button';
    historyBtn.className = 'comment-history-btn secondary-btn';
    historyBtn.style.marginTop = '0';
    historyBtn.style.padding = '5px 10px';
    
    
    if (account === '') {
        // 新增學生模式且還沒儲存
        historyBtn.textContent = '留言 (0)';
        historyBtn.style.backgroundColor = '#ccc';
        historyBtn.onclick = () => {
             alert('請先填寫學號並點擊「新增學生」儲存後，才能針對項目進行留言操作。');
        };
    } else {
        // 編輯模式
        historyBtn.onclick = () => {
             const currentAccount = document.getElementById('admin-account').value.trim();
             const currentItemName = itemInput.value.trim();
             
             if (!currentItemName) {
                 alert('項目名稱不能為空！');
                 return;
             }
             
             // 簡化邏輯：直接嘗試用當前表單中的學號和項目名稱開啟留言區
             // 如果找不到，showCommentModal 內的 getTask 會彈出警告
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
    
    removeBtn.onclick = () => {
        const itemName = itemInput.value.trim();
        const hasComments = task.studentComments.length > 0;
        
        if (itemName === '' && !hasComments) {
            row.remove();
        } else {
             const confirmMsg = "你確定要移除此項目嗎？更新資料後將無法復原。你可以點擊[重設/取消編輯]，將更新前資料恢復。";
             if (confirm(confirmMsg)) {
                  row.remove();
             }
        }
    };
    actionCell.appendChild(removeBtn);
    
    row.setAttribute('data-original-comments', JSON.stringify(task.studentComments));
    row.setAttribute('data-pending-review', task.pendingReview.toString());
}

function handleAddTaksClick() {
    const currentAccount = document.getElementById('admin-account').value.trim();
    // 即使在新增模式，也傳遞空字串作為 account
    addTaskRow(undefined, currentAccount); 
}

/** * 修正 1: 重設/取消編輯邏輯 (確保徹底清空且不再誤觸新增空行)
 * @param {boolean} showAlert - 是否顯示提示訊息
 */
window.resetForm = function(showAlert = true) {
    const originalAccount = document.getElementById('student-original-account').value;
    const isEditingMode = document.getElementById('form-submit-btn').textContent === '更新學生資料' && originalAccount;

    if (isEditingMode) {
         // 如果是編輯模式，則恢復為編輯前的資料
         if (originalStudentData) {
              document.getElementById('student-original-account').value = originalStudentData.account; 
              document.getElementById('admin-account').value = originalStudentData.account; 
              document.getElementById('admin-name').value = originalStudentData.name; 
              document.getElementById('admin-school').value = originalStudentData.school;
              document.getElementById('admin-class').value = originalStudentData.class;
              document.getElementById('admin-email').value = originalStudentData.email;
              loadTasksToAdminTable(originalStudentData.tasks, originalStudentData.account);
              
              if (showAlert) alert("已取消編輯，恢復為上次儲存的資料。");
              return; 
         }
    }
    
    // 如果不是編輯模式，或編輯模式下沒有原始資料，則執行徹底清空
    document.getElementById('admin-tasks-tbody').innerHTML = ''; 
    document.getElementById('student-original-account').value = ''; 
    document.getElementById('admin-account').value = ''; 
    document.getElementById('admin-name').value = ''; 
    document.getElementById('admin-school').value = '';
    document.getElementById('admin-class').value = '';
    document.getElementById('admin-email').value = '';
    
    // 立即切換為新增模式
    document.getElementById('form-submit-btn').textContent = '新增學生';
    document.getElementById('switch-to-new-student-btn').classList.add('hidden');
    originalStudentData = null; // 清除快照

    // 確保清空後有一個空行可供輸入 (這裡不再自動新增，因為是由新增切換按鈕處理)
    // 為了避免問題，我們在這裡還是補上一個空行，以符合 UI 期待
    addTaskRow(); 
    
    if (showAlert) alert("設定項已清空，已切換回新增學生模式。");
}

function handleStudentFormSubmit(event) {
    // ... (handleStudentFormSubmit 邏輯保持不變)
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    const isActualSubmit = event && event.type === 'submit';
    
    if (isActualSubmit && !confirm("按下確定後將更新學生資料，移除/變更的操作將無法復原。請再次確認。")) {
        return false;
    }
    
    const originalAccount = document.getElementById('student-original-account').value;
    const newAccount = document.getElementById('admin-account').value.trim(); 
    
    const newName = document.getElementById('admin-name').value.trim();
    const newSchool = document.getElementById('admin-school').value.trim();
    const newClass = document.getElementById('admin-class').value.trim();
    const newEmail = document.getElementById('admin-email').value.trim();

    if (!newAccount) { 
        if (isActualSubmit) alert("學號不能為空！"); 
        return false; 
    }
    
    const taskRows = document.querySelectorAll('#admin-tasks-tbody tr');
    const newTasks = [];
    let hasEmptyItem = false;

    taskRows.forEach(row => {
        const itemInput = row.querySelector('.task-item-input');
        const statusSelect = row.querySelector('.task-status-select');

        if (!itemInput.value.trim()) {
            hasEmptyItem = true;
            return; 
        }

        const originalComments = JSON.parse(row.getAttribute('data-original-comments') || '[]');
        const pendingReview = row.getAttribute('data-pending-review') === 'true';
        
        if (itemInput && itemInput.value.trim() && statusSelect) {
            newTasks.push({
                item: itemInput.value.trim(),
                status: statusSelect.value,
                teacherComment: "", 
                studentComments: originalComments, 
                pendingReview: pendingReview
            });
        }
    });

    if (hasEmptyItem) {
        if (isActualSubmit) alert("警告：有項目名稱不可為空。請填寫項目名稱或移除空白項目，再提交！");
        return false;
    }
    
    if ((!originalAccount || originalAccount !== newAccount) && students[newAccount]) {
        if (isActualSubmit) alert(`學號 ${newAccount} 已存在，請使用其他學號或先編輯現有資料。`);
        return false;
    }
    
    // 儲存邏輯
    if (originalAccount && originalAccount !== newAccount) {
        delete students[originalAccount];
    }
    
    students[newAccount] = {
        account: newAccount,
        name: newName,
        school: newSchool,
        class: newClass,
        email: newEmail,
        tasks: newTasks
    };
    
    saveStudentData(students);
    
    if (isActualSubmit) {
        alert(`學生 ${newName} (學號: ${newAccount}) 資料已成功 ${originalAccount ? '更新' : '新增'}！`);
    }

    displayStudentList();
    
    // 儲存成功後，重新載入編輯介面以更新原始資料快照
    editStudent(newAccount);
    
    return true;
}


function displayStudentList() {
    // ... (displayStudentList 邏輯保持不變)
    const tbody = document.getElementById('student-list-tbody'); 
    if (!tbody) return; 

    tbody.innerHTML = ''; 

    for (const account in students) {
        const student = students[account];
        const row = tbody.insertRow();
        
        row.insertCell().textContent = account; 
        row.insertCell().textContent = student.name;
        
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編輯'; 
        editBtn.className = 'primary-btn';
        editBtn.onclick = () => editStudent(account);
        actionCell.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '移除';
        removeBtn.className = 'logout-btn';
        removeBtn.style.backgroundColor = '#e74c3c';
        removeBtn.onclick = () => removeStudent(account, student.name);
        actionCell.appendChild(removeBtn);
    }
}

function removeStudent(account, name) {
    if (confirm(`確定要移除學生 ${name} (學號: ${account}) 的所有資料嗎？此操作無法復原！`)) {
        delete students[account];
        saveStudentData(students);
        displayStudentList();
        resetForm(false);
        alert(`${name} 的資料已移除。`);
    }
}

// --- 整合式留言/審核彈窗邏輯 (保持不變) ---

function getStudentName(account) {
    return students[account]?.name || '未知學生';
}

function getTask(account, itemName) {
    const student = students[account];
    if (!student) return null;
    return student.tasks.find(t => t.item === itemName);
}

function renderComment(comment, isModalAdminMode) {
    // ... (renderComment 邏輯保持不變)
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';
    commentDiv.style.backgroundColor = comment.isTeacher ? '#ecf0f1' : '#e8f6f3';
    
    const contentDiv = document.createElement('div');
    
    
    if (comment.isBlocked || comment.isRecalled) {
        commentDiv.style.backgroundColor = '#fcf8e3'; 
        const operatorName = comment.recalledBy || comment.blockedBy || (comment.isTeacher ? '教師' : getStudentName(currentTaskAccount));
        
        contentDiv.innerHTML = `
            <strong style="color:#555">${comment.role}</strong> (<small style="color:#888">${comment.time}</small>):<br>
            <span style="color:#555; text-decoration: line-through;">[原留言內容已隱藏]</span>
        `;
        
        const traceSpan = document.createElement('span');
        traceSpan.className = comment.isBlocked ? 'comment-blocked' : 'comment-recalled';
        
        if (comment.isBlocked) {
             traceSpan.innerHTML = `**[${operatorName}]** 屏蔽此留言`;
        } else if (comment.isRecalled) {
             traceSpan.innerHTML = `**[${operatorName}]** 撤回此留言`;
        }
        
        contentDiv.appendChild(traceSpan);
        commentDiv.appendChild(contentDiv);
        return commentDiv; 
    }
    
    contentDiv.innerHTML = `
        <strong>${comment.role}</strong> (<small>${comment.time}</small>):<br>
        ${comment.text.replace(/\n/g, '<br>')}
    `;
    commentDiv.appendChild(contentDiv);
    
    
    const actionContainer = document.createElement('div');
    actionContainer.className = 'comment-actions';
    
    let canShowAction = false;
    
    if (isModalAdminMode) {
        canShowAction = true; 
        
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        
        if (comment.isTeacher) {
            actionBtn.textContent = '撤回';
            actionBtn.className = 'secondary-btn';
            actionBtn.style.backgroundColor = '#f1c40f';
            actionBtn.onclick = () => recallComment(comment.id, currentTaskAccount, currentTaskItem, isModalAdminMode);
        } else {
            actionBtn.textContent = '屏蔽';
            actionBtn.className = 'logout-btn';
            actionBtn.style.backgroundColor = '#e74c3c';
            actionBtn.onclick = () => blockComment(comment.id, currentTaskAccount, currentTaskItem, isModalAdminMode);
        }
        actionContainer.appendChild(actionBtn);

    } 
    else if (!isModalAdminMode && !comment.isTeacher) {
         canShowAction = true;
         const recallBtn = document.createElement('button');
         recallBtn.textContent = '撤回';
         recallBtn.className = 'secondary-btn';
         recallBtn.onclick = () => recallComment(comment.id, currentTaskAccount, currentTaskItem, isModalAdminMode);
         actionContainer.appendChild(recallBtn);
    }
    
    if (canShowAction) {
        commentDiv.appendChild(actionContainer);
    }

    return commentDiv;
}

window.showCommentModal = function(account, itemName, isModalAdminMode) {
    currentTaskAccount = account;
    currentTaskItem = itemName;
    const task = getTask(account, itemName);

    if (!task) {
        // 如果找不到 task，可能是因為項目名稱在編輯模式下被修改但還沒儲存。
        alert(`找不到學生 ${account} 的項目 ${itemName}！請確保學號和項目名稱已儲存。`);
        return;
    }
    
    document.getElementById('modal-task-name').textContent = itemName;
    const commentsList = document.getElementById('modal-comments-list');
    commentsList.innerHTML = '';
    
    if (task.studentComments && task.studentComments.length > 0) {
        task.studentComments.slice().reverse().forEach(comment => {
            commentsList.appendChild(renderComment(comment, isModalAdminMode));
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: #888;">目前沒有留言紀錄。</p>';
    }

    const studentCommentArea = document.getElementById('modal-student-comment-area');
    const submissionArea = document.getElementById('modal-submission-area');
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    
    newCommentTextarea.placeholder = isModalAdminMode ? "輸入給學生的留言..." : "輸入您的留言...";
    newCommentTextarea.value = ''; 
    
    if (isModalAdminMode) {
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.add('hidden');
    } else {
        studentCommentArea.classList.remove('hidden');
        submissionArea.classList.remove('hidden');
        
        const submissionBtn = submissionArea.querySelector('.submission-btn');
        const submissionMsg = document.getElementById('modal-submission-message');
        
        if (task.status === '審核中') {
            submissionMsg.textContent = '此項目已提交審核，請耐心等待教師回覆。';
            submissionBtn.style.display = 'none';
        } else if (task.status === '已認證') {
            submissionMsg.textContent = '此項目已通過認證，若有疑問可留言聯繫教師。';
            submissionBtn.style.display = 'none';
        } else {
            submissionMsg.textContent = '完成後，請點擊下方按鈕提交審核。';
            submissionBtn.textContent = '提交完成/重新審核';
            submissionBtn.style.display = 'block';
        }
    }

    document.getElementById('comment-history-modal').classList.remove('hidden');
}

window.submitCommentFromModal = function() {
    // ... (submitCommentFromModal 邏輯保持不變)
    const newCommentTextarea = document.getElementById('modal-new-student-comment');
    const commentText = newCommentTextarea.value.trim();
    
    if (!commentText) {
        alert("留言內容不能為空。");
        return;
    }
    if (commentText.length > COMMENT_CHAR_LIMIT) {
         alert(`留言內容超出 ${COMMENT_CHAR_LIMIT} 字限制，請刪減後重新提交。`);
        return;
    }

    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;
    
    const isTeacherRole = document.getElementById('admin-container').classList.contains('hidden') ? false : isAdminMode;

    const newComment = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleString(),
        role: isTeacherRole ? "教師" : "學生",
        text: commentText,
        isTeacher: isTeacherRole,
        isBlocked: false,
        isRecalled: false,
        recalledBy: null,
        blockedBy: null
    };

    task.studentComments.push(newComment);
    
    saveStudentData(students);
    newCommentTextarea.value = '';
    
    showCommentModal(currentTaskAccount, currentTaskItem, isTeacherRole);
    
    if (isTeacherRole) {
        editStudent(currentTaskAccount); 
    } else {
        const studentInfo = students[currentTaskAccount];
        renderTasks(studentInfo.tasks, currentTaskAccount);
    }
}

// ... (recallComment, blockComment, confirmSubmissionFromModal, closeModal 邏輯保持不變)

window.recallComment = function(commentId, account, itemName, isModalAdminMode) {
    if (!confirm("確定要撤回此留言嗎？")) return;
    const task = getTask(account, itemName);
    if (!task) return; 
    
    const comment = task.studentComments.find(c => c.id === commentId);
    
    const canRecall = (comment.isTeacher && isModalAdminMode) || (!comment.isTeacher && !isModalAdminMode);
    
    if (comment && canRecall) {
        comment.isRecalled = true;
        comment.recalledBy = isModalAdminMode ? '教師' : getStudentName(account); 
        saveStudentData(students);
        showCommentModal(account, itemName, isModalAdminMode);
        if (isModalAdminMode) editStudent(account); 
        else {
             const studentInfo = students[account];
             renderTasks(studentInfo.tasks, account);
        }
    } else {
        alert("您沒有權限撤回此留言。");
    }
}

window.blockComment = function(commentId, account, itemName, isModalAdminMode) {
    if (!isModalAdminMode || !confirm("確定要屏蔽此留言嗎？此動作將對所有使用者隱藏。")) return;
    const task = getTask(account, itemName);
    if (!task) return; 
    
    const comment = task.studentComments.find(c => c.id === commentId);
    
    if (comment) {
        comment.isBlocked = true;
        comment.blockedBy = '教師'; 
        saveStudentData(students);
        showCommentModal(account, itemName, isModalAdminMode);
        editStudent(account); 
    }
}

window.confirmSubmissionFromModal = function() {
    const isTeacherRole = document.getElementById('admin-container').classList.contains('hidden') ? false : isAdminMode;

    if (isTeacherRole || !currentTaskAccount || !currentTaskItem) return;
    
    const task = getTask(currentTaskAccount, currentTaskItem);
    if (!task) return;
    
    if (task.status === '已認證') {
        alert("此項目已認證通過，無需重新提交。如需申訴請留言聯繫教師。");
        return;
    }
    
    if (confirm("確認要將此項目標記為「提交審核」嗎？")) {
        task.status = '審核中';
        task.pendingReview = true;
        
        task.studentComments.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleString(),
            role: "系統/學生",
            text: "已提交審核，請老師查收。",
            isTeacher: false,
            isBlocked: false,
            isRecalled: false,
            recalledBy: null,
            blockedBy: null
        });
        
        saveStudentData(students);
        
        const studentInfo = students[currentTaskAccount];
        renderTasks(studentInfo.tasks, currentTaskAccount);
        showCommentModal(currentTaskAccount, currentTaskItem, isTeacherRole);
    }
}

window.closeModal = function() {
    document.getElementById('comment-history-modal').classList.add('hidden');
    currentTaskAccount = null;
    currentTaskItem = null;
}


// --- 初始化與事件監聽 ---

document.addEventListener('DOMContentLoaded', function() {
    isAdminMode = false;
    
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('teacher-login-btn').style.display = 'block'; 
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('teacher-login-container').classList.add('hidden');
    document.getElementById('admin-container').classList.add('hidden');
    document.getElementById('comment-history-modal').classList.add('hidden');
    
    // 確保這裡的 ID 是您 HTML 中「新增學生（切換）」按鈕的 ID
    document.getElementById('switch-to-new-student-btn').classList.add('hidden'); 
    
    document.getElementById('login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('teacher-login-btn').addEventListener('click', handleTeacherLoginClick);
    document.getElementById('teacher-login-form').addEventListener('submit', handleTeacherLoginFormSubmit);
    
    document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
    
    document.getElementById('add-task-btn').addEventListener('click', handleAddTaksClick);
    
    // 假設您的 HTML 中，「重設/取消編輯」按鈕的 ID 是 'reset-form-btn'
    // 如果不是，請您根據您的 HTML 調整此 ID！
    const resetButton = document.getElementById('reset-form-btn'); 
    if (resetButton) {
        // 綁定到修正後的 resetForm 函數，讓它能夠執行「取消編輯」的邏輯
        resetButton.addEventListener('click', () => resetForm(true));
    }
});
