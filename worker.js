// worker.js

/**
 * 處理 CORS 請求頭，允許 Pages 網域存取
 * @param {Request} request
 * @param {Env} env
 */
function handleCors(request, env) {
    // 從環境變數中讀取 Access-Control-Allow-Origin
    const allowedOrigin = env.Access_Control_Allow_Origin || 'https://grade-query-system.pages.dev'; 
    
    const headers = {
        'Access-Control-Allow-Origin': allowedOrigin, 
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    return headers;
}

/**
 * 獲取所有學生資料 (包含 tasks 和 comments)
 */
async function handleGetStudents(env) {
    // 獲取所有學生基本資料
    const { results: studentsData } = await env.DB.prepare(
        "SELECT account, name, school, class, email FROM students"
    ).all();

    // 獲取所有任務資料
    const { results: tasksData } = await env.DB.prepare(
        "SELECT id, student_account, name, status, teacher_comment FROM tasks"
    ).all();

    // 獲取所有留言資料
    const { results: commentsData } = await env.DB.prepare(
        "SELECT id, task_id, sender, content, timestamp, is_recalled, is_blocked FROM comments"
    ).all();

    // 整理留言數據
    const commentsMap = commentsData.reduce((acc, comment) => {
        if (!acc[comment.task_id]) acc[comment.task_id] = [];
        acc[comment.task_id].push({
            id: comment.id,
            sender: comment.sender,
            content: comment.content,
            timestamp: comment.timestamp,
            isRecalled: comment.is_recalled === 1,
            isBlocked: comment.is_blocked === 1,
        });
        return acc;
    }, {});

    // 整理學生和任務數據
    const studentsMap = studentsData.reduce((acc, student) => {
        acc[student.account] = { 
            ...student, 
            tasks: [] 
        };
        return acc;
    }, {});

    tasksData.forEach(task => {
        const student = studentsMap[task.student_account];
        if (student) {
            student.tasks.push({
                id: task.id,
                name: task.name,
                status: task.status,
                teacherComment: task.teacher_comment,
                comments: commentsMap[task.id] || []
            });
        }
    });

    return new Response(JSON.stringify(studentsMap), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * 新增或更新單個學生資料及其所有任務 (POST/PUT /api/students)
 */
async function handleSaveStudent(request, env) {
    const data = await request.json();
    const { account, name, school, class: cls, email, tasks } = data;

    if (!account || !name) {
        return new Response(JSON.stringify({ error: "學號和姓名為必填欄位。" }), { status: 400 });
    }

    await env.DB.batch([
        // 學生基本資料
        env.DB.prepare(
            "INSERT OR REPLACE INTO students (account, name, school, class, email) VALUES (?, ?, ?, ?, ?)",
            [account, name, school, cls, email]
        ),
        
        // 刪除舊有任務
        env.DB.prepare(
            "DELETE FROM tasks WHERE student_account = ?", [account]
        ),

        // 插入新的任務清單
        ...(tasks || []).map(task => 
            env.DB.prepare(
                "INSERT INTO tasks (id, student_account, name, status, teacher_comment) VALUES (?, ?, ?, ?, ?)",
                [task.id, account, task.name, task.status, task.teacherComment]
            )
        ),
    ]);

    return new Response(JSON.stringify({ message: "學生資料更新成功" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * 刪除單個學生資料 (DELETE /api/students)
 */
async function handleDeleteStudent(request, env) {
    const { account } = await request.json();

    if (!account) {
        return new Response(JSON.stringify({ error: "缺少學號。" }), { status: 400 });
    }

    const stmt = env.DB.prepare("DELETE FROM students WHERE account = ?").bind(account);
    const result = await stmt.run();

    if (result.changes === 0) {
         return new Response(JSON.stringify({ error: "查無此學號或資料已刪除。" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: `學號 ${account} 資料已刪除。` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/**
 * 處理學生登入查詢 (POST /api/student-login)
 */
async function handleStudentLogin(request, env) {
    const { school, class: cls, account } = await request.json();

    const { results: studentsData } = await env.DB.prepare(
        "SELECT account, name, school, class, email FROM students WHERE school = ? AND class = ? AND account = ?"
    )
    .bind(school, cls, account)
    .all();

    if (!studentsData || studentsData.length === 0) {
        return new Response(JSON.stringify({ error: "查無此學生。" }), { status: 404 });
    }

    const student = studentsData[0];
    const studentAccount = student.account;
    
    // 查找該學生的任務和留言
    const { results: tasksData } = await env.DB.prepare(
        "SELECT id, student_account, name, status, teacher_comment FROM tasks WHERE student_account = ?"
    ).bind(studentAccount).all();
    
    const { results: commentsData } = await env.DB.prepare(
        "SELECT id, task_id, sender, content, timestamp, is_recalled, is_blocked FROM comments"
    ).all();

    const commentsMap = commentsData.reduce((acc, comment) => {
        if (!acc[comment.task_id]) acc[comment.task_id] = [];
        acc[comment.task_id].push({
            id: comment.id,
            sender: comment.sender,
            content: comment.content,
            timestamp: comment.timestamp,
            isRecalled: comment.is_recalled === 1,
            isBlocked: comment.is_blocked === 1,
        });
        return acc;
    }, {});
    
    student.tasks = [];
    tasksData.forEach(task => {
        student.tasks.push({
            id: task.id,
            name: task.name,
            status: task.status,
            teacherComment: task.teacher_comment,
            comments: commentsMap[task.id] || []
        });
    });

    return new Response(JSON.stringify(student), { status: 200, headers: { 'Content-Type': 'application/json' } });
}


/**
 * 留言操作 (POST /api/comment)
 */
async function handleComment(request, env) {
    const data = await request.json();
    const { action, task_id, sender, content, timestamp, comment_id } = data;
    
    if (!action) {
         return new Response(JSON.stringify({ error: "缺少 action 參數" }), { status: 400 });
    }

    try {
        let stmt;

        if (action === 'ADD') {
            if (!task_id || !sender || !content || !timestamp) throw new Error("缺少新增留言的必要參數");

            stmt = env.DB.prepare(
                "INSERT INTO comments (task_id, sender, content, timestamp) VALUES (?, ?, ?, ?)",
                [task_id, sender, content, timestamp]
            );

        } else if (action === 'RECALL' || action === 'BLOCK') {
            if (!comment_id) throw new Error(`缺少 ${action} 留言的 ID`);

            const column = action === 'RECALL' ? 'is_recalled' : 'is_blocked';
            
            stmt = env.DB.prepare(
                `UPDATE comments SET ${column} = 1 WHERE id = ?`,
                [comment_id]
            );
        } else {
            return new Response(JSON.stringify({ error: "無效的 action" }), { status: 400 });
        }

        await stmt.run();
        
        return new Response(JSON.stringify({ message: "操作成功", commentId: action === 'ADD' ? stmt.lastInsertRowId : comment_id }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}


// --- Worker 路由配置 ---
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = handleCors(request, env); // 傳入 env 供 CORS 使用
        
        if (request.method === 'OPTIONS') {
             return new Response(null, { headers: corsHeaders });
        }

        try {
            if (url.pathname === '/api/students') {
                if (request.method === 'GET') {
                    const response = await handleGetStudents(env);
                    return new Response(response.body, { status: response.status, headers: { ...response.headers, ...corsHeaders } });
                }
                if (request.method === 'POST' || request.method === 'PUT') {
                    const response = await handleSaveStudent(request, env);
                    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                }
                if (request.method === 'DELETE') {
                    const response = await handleDeleteStudent(request, env);
                    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                }
            }
            
            if (url.pathname === '/api/student-login' && request.method === 'POST') {
                const response = await handleStudentLogin(request, env);
                return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
            }
            
            if (url.pathname === '/api/comment' && request.method === 'POST') {
                const response = await handleComment(request, env);
                return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
            }

            return new Response('API Not Found', { status: 404, headers: corsHeaders });

        } catch (e) {
            return new Response(e.stack || e, { status: 500, headers: corsHeaders });
        }
    },
};
