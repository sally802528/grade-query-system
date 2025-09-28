// 全域變數來追蹤當前模式
let isNewStudentMode = false;

// 1. 修復問題 3：新增學生切換鍵失效
function switchToNewStudentMode() {
    isNewStudentMode = true;
    
    // 清空所有主要輸入欄位
    document.getElementById('student-form').reset();
    
    // 清空所有成績項目
    document.getElementById('activity-list').innerHTML = '';
    
    // 更新標題和主要按鈕的文字
    document.querySelector('h2').textContent = '新增 / 編輯學生 (新增模式)';
    document.getElementById('update-btn').textContent = '新增學生';
    document.getElementById('update-btn').classList.add('btn-blue'); // 可選：樣式調整
    alert('已切換到新增學生模式，請輸入資料。');
}

// 重設表單
function resetForm() {
    // 這裡應根據實際需求，決定是清空表單還是重新載入原始資料
    if (confirm('確定要重設/取消編輯嗎？所有未儲存的變更將會遺失。')) {
        document.getElementById('student-form').reset();
        // 如果是編輯模式，則應重新載入原始資料
        if (!isNewStudentMode) {
            loadStudentData('yjvjs@314100'); // 範例：重新載入特定學生的資料
        } else {
            // 在新增模式下，只是清空
            switchToNewStudentMode(); 
        }
    }
}


// 2. 修復問題 4：空白項目名稱警告 (前端驗證)
function submitStudentData(isOnlyActivityUpdate) {
    // 檢查學號和姓名是否為空（基本驗證）
    if (!document.getElementById('account-id').value.trim() || !document.getElementById('student-name').value.trim()) {
        alert('錯誤：學號和姓名為必填欄位。');
        return;
    }

    const activityRows = document.querySelectorAll('#activity-list tr');
    let activityData = [];
    let hasEmptyActivityName = false;

    activityRows.forEach(row => {
        const nameInput = row.querySelector('.item-name-input');
        const statusSelect = row.querySelector('.item-status-select');
        
        const itemName = nameInput ? nameInput.value.trim() : '';
        
        // **核心修復邏輯：檢查項目名稱是否為空**
        if (itemName === '') {
            hasEmptyActivityName = true;
            nameInput.style.border = '2px solid red'; // 視覺警告
        } else {
            nameInput.style.border = ''; // 清除警告
        }

        activityData.push({
            name: itemName,
            status: statusSelect ? statusSelect.value : '未完成'
            // ... 其他項目資料
        });
    });

    if (hasEmptyActivityName) {
        alert('錯誤：部分活動/成績項目名稱為空白，請填寫或移除。');
        return;
    }

    // 這裡執行 AJAX 或 Fetch 請求，將 studentData 和 activityData 提交到後端 API
    console.log('提交資料:', { student: { id: document.getElementById('account-id').value, name: document.getElementById('student-name').value }, activities: activityData });
    // fetch('/api/update-student', { method: 'POST', body: JSON.stringify(...) })
}

// 輔助函式：新增一個項目行
function addNewActivityItem(name = '', status = '未完成', teacherComment = '無教師留言', commentCount = 0, isApproved = false) {
    const list = document.getElementById('activity-list');
    const newRow = list.insertRow();
    newRow.className = 'activity-row';

    newRow.innerHTML = `
        <td><input type="text" value="${name}" class="item-name-input" placeholder="輸入項目名稱"></td>
        <td>
            <select class="item-status-select">
                <option value="已認證" ${status === '已認證' ? 'selected' : ''}>已認證</option>
                <option value="審核中" ${status === '審核中' ? 'selected' : ''}>審核中</option>
                <option value="未完成" ${status === '未完成' ? 'selected' : ''}>未完成</option>
            </select>
        </td>
        <td>${teacherComment}</td>
        <td><button type="button" class="btn btn-secondary" onclick="openCommentModal('${name}')">留言 (${commentCount})</button></td>
        <td>
            <button type="button" class="btn btn-secondary" onclick="removeActivityItem(this)">移除</button>
            ${renderResubmitButton(status)} </td>
    `;
}

// 3. 修復問題 5：完成認證多出認證要求按鈕
function renderResubmitButton(status) {
    // 只有在 "未完成" 或需要重新提交流程的狀態下才顯示按鈕
    if (status === '已認證') {
        // 對於已認證的項目，不顯示重新提交審核按鈕
        return '';
    } else if (status === '審核中') {
         // 審核中也不需要，只顯示狀態
         return '';
    } else {
        // 假設 "未完成" 可以重新提交，或者您有 "退回" 狀態
        // return '<button type="button" class="btn btn-blue" style="margin-left: 5px;">重新提交審核</button>'; 
        return '';
    }
}

// 範例：在頁面載入時載入資料 (模擬編輯模式)
function loadStudentData(accountId) {
    // 這裡應該從後端 API 獲取學生資料
    document.getElementById('account-id').value = accountId;
    document.getElementById('student-name').value = '測試員';
    document.getElementById('update-btn').textContent = '更新學生資料';
    document.querySelector('h2').textContent = '新增 / 編輯學生 (編輯模式)';
    isNewStudentMode = false;
    
    // 載入模擬的成績項目
    document.getElementById('activity-list').innerHTML = '';
    addNewActivityItem('基礎指令與C++基本能力', '已認證', '無教師留言', 0);
    addNewActivityItem('了解Arduino', '未完成', '交作業...', 2);
}

// 頁面載入後執行
window.onload = function() {
    loadStudentData('yjvjs@314100'); // 預設載入一個學生資料進入編輯模式
};
