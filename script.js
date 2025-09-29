// 【最終程式碼】

const DATA_FILE_URL = './data/grades_encrypted.json';
const TEACHER_PASSWORD = 'Teacher@admin'; // 教師密碼仍然使用明文比對

let allStudents = {}; // 儲存解密後的資料

// ----------------------------------------------------------------------
// 1. 金鑰混淆層
// ----------------------------------------------------------------------
// 替換這裡為您的 Base64 加密金鑰的片段，增加提取難度。
const K_PARTS = [
    'a0VGM3NMM3pR',
    'N3lQZH',
    'g0NUVEMxNzlF',
    'TFNrVw==' 
]; 

function _K_EXTRACTOR_() {
    return K_PARTS.join('');
}


// ----------------------------------------------------------------------
// 2. 核心解密與資料載入
// ----------------------------------------------------------------------

async function decryptData(encryptedData) {
    const keyStr = atob(_K_EXTRACTOR_());
    const keyBytes = new TextEncoder().encode(keyStr);
    
    const key = await crypto.subtle.importKey(
        "raw", 
        keyBytes, 
        { name: "AES-CBC" }, 
        false, 
        ["decrypt"]
    );

    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));

    const decContent = await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv }, key, ct);
    
    return JSON.parse(new TextDecoder().decode(decContent));
}

async function loadData() {
    try {
        document.getElementById('status-message').textContent = '資料載入中，請稍候...';
        const response = await fetch(DATA_FILE_URL);
        if (!response.ok) throw new Error(`載入失敗: ${response.statusText}`);
        
        const encryptedJson = await response.json();
        allStudents = await decryptData(encryptedJson);
        document.getElementById('status-message').textContent = '資料載入完成。';
        return true;
    } catch (error) {
        document.getElementById('status-message').textContent = '資料載入失敗，請聯繫管理員。';
        console.error("Data Load Error:", error);
        return false;
    }
}


// ----------------------------------------------------------------------
// 3. PBKDF2 雜湊比對函數
// ----------------------------------------------------------------------

// 這裡我們需要一個函數來解析 PBKDF2 格式，並計算雜湊值
// 假設您的 pbkdf2Hash 格式為： 'hash:salt:iterations'
function parseAndVerifyHash(password, storedHash) {
    try {
        const parts = storedHash.split(':');
        const [hash, salt, iterations] = parts;
        
        // **使用 CryptoJS 進行 PBKDF2 雜湊比對**
        // 確保 keySize, iterations, salt 與您本地加密時的參數一致！
        const keySize = 256 / 32; // 256位元 (32位元組)
        const computedHash = CryptoJS.PBKDF2(password, salt, { 
            keySize: keySize, 
            iterations: parseInt(iterations, 10),
            hasher: CryptoJS.algo.SHA256 // 假設您使用 SHA256 基礎雜湊
        }).toString();
        
        return computedHash === hash;
    } catch (e) {
        console.error("PBKDF2 驗證錯誤:", e);
        return false;
    }
}


// ----------------------------------------------------------------------
// 4. 登入與介面操作
// ----------------------------------------------------------------------

async function handleLogin() {
    if (Object.keys(allStudents).length === 0) {
        if (!(await loadData())) return;
    }

    const school = document.getElementById('school').value.trim();
    const studentClass = document.getElementById('class').value.trim();
    const account = document.getElementById('account').value.trim().toUpperCase();
    const password = document.getElementById('password').value;
    
    // 教師登入檢查
    if (school === '' && studentClass === '' && password === TEACHER_PASSWORD) {
        document.getElementById('status-message').textContent = '教師登入成功。';
        displayTeacherData();
        return;
    }

    // 學生登入檢查
    const student = allStudents[account];

    if (student && student.class === studentClass) {
        if (parseAndVerifyHash(password, student.pbkdf2Hash)) {
            displayStudentData(student);
        } else {
            alert('學號、班級或密碼錯誤。');
        }
    } else {
        alert('查無此學生資料或資訊錯誤。');
    }
}

function logout() {
    document.getElementById('student-container').style.display = 'none';
    document.getElementById('teacher-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('status-message').textContent = '';
    // 清空密碼欄位
    document.getElementById('password').value = '';
}


function displayStudentData(student) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('student-container').style.display = 'block';
    
    const infoDiv = document.getElementById('student-info');
    infoDiv.innerHTML = `
        <p><strong>學號:</strong> ${student.account}</p>
        <p><strong>姓名:</strong> ${student.name}</p>
        <p><strong>班級/科別:</strong> ${student.class}</p>
    `;

    const tasksDiv = document.getElementById('tasks-list');
    tasksDiv.innerHTML = '<h3>活動/成績列表</h3>';
    
    if (student.tasks && student.tasks.length > 0) {
        student.tasks.forEach(task => {
            tasksDiv.innerHTML += `
                <div class="task-item">
                    <p><strong>項目名稱:</strong> ${task.name}</p>
                    <p><strong>狀態/成績:</strong> ${task.status}</p>
                    <p><strong>教師評語:</strong> ${task.teacherComment || '無'}</p>
                </div>
            `;
        });
    } else {
        tasksDiv.innerHTML += '<p>目前無活動或成績資料。</p>';
    }
}

// ⚠️ 【警告】教師管理功能在這裡是無效的，無法儲存變更。
function displayTeacherData() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('teacher-container').style.display = 'block';
    
    const listDiv = document.getElementById('teacher-data-list');
    listDiv.innerHTML = '<h3>學生清單 (僅瀏覽)</h3>';

    Object.values(allStudents).forEach(student => {
        listDiv.innerHTML += `
            <div class="data-input" style="border: 1px solid #ccc; padding: 10px; margin-top: 5px;">
                <p><strong>學號:</strong> ${student.account}</p>
                <p><strong>姓名:</strong> ${student.name}</p>
                <p><strong>班級:</strong> ${student.class}</p>
                <p><strong>任務數:</strong> ${student.tasks ? student.tasks.length : 0}</p>
                <button disabled>編輯 (儲存無效)</button>
                <button disabled>刪除 (無效)</button>
            </div>
        `;
    });
}


// ----------------------------------------------------------------------
// 5. 初始載入
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', loadData);
