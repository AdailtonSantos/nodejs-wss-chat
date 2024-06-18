const mariadb = require('mariadb');
const bcrypt = require('bcrypt');

const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '@X14vb3k1',
    database: 'agentschat',
    connectionLimit: 5
});

async function login(username, pass) {
    if (!username || !pass) {
        return false;
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`SELECT * FROM users WHERE username = ?`, [username]);
        if (rows.length > 0) {
            const senhaCriptografada = rows[0].pass;
            const senhaValida = await bcrypt.compare(pass, senhaCriptografada);
            if(senhaValida){
                const user = await conn.query(`SELECT username, name, department, profilePicPath FROM users WHERE username = ?`, [username]);
                return user
            }
        } else {
            console.log("INVALIDO");
            return false;
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}

async function userRegister(username, name, department, pass) {
    const conn = await pool.getConnection();
    try {
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(pass, saltRounds);
        await conn.query(`INSERT INTO users (username, name, department, pass) VALUES (?, ?, ?, ?)`, [username, name, department, senhaCriptografada]);
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}

// async function resetarSenha(username, novaSenha, confirmacaoNovaSenha) {
//     let conn;
//     try {
//         conn = await pool.getConnection();
//         const rows = await conn.query(`SELECT * FROM usuarios WHERE usuario = ?`, [username]);
//         if (rows.length === 0) {
//             return false;
//         }
//         const saltRounds = 10;
//         const senhaCriptografada = await bcrypt.hash(novaSenha, saltRounds);
//         await conn.query(`UPDATE usuarios SET senha = ? WHERE usuario = ?`, [senhaCriptografada, username]);
//         return true;
//     } catch (err) {
//         throw err;
//     } finally {
//         if (conn) conn.end();
//     }
// }

async function saveIndividualMessage(message, content_type, sentBy, toUser, path, originalname) {
    const conn = await pool.getConnection();
    const query = `INSERT INTO messages (message, content_type, sentBy, toUser, path, originalname) VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await conn.query(query, [message, content_type, sentBy, toUser, path, originalname]);
    await conn.release();
    return result.insertId;
}

async function saveGroupMessage(message, content_type, sentBy, groupName, path, originalname) {
    const conn = await pool.getConnection();
    const query = `INSERT INTO groups (message, content_type, sentBy, groupName, path, originalname) VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await conn.query(query, [message, content_type, sentBy, groupName, path, originalname]);
    await conn.release();
    return result.insertId;
}

async function getIndividualMessages(sender, recipient) {
    const conn = await pool.getConnection();
    const query = "SELECT * FROM messages WHERE sentBy = ? AND toUser = ? OR toUser = ? AND sentBy = ?";
    const result = await conn.query(query, [sender, recipient, sender, recipient]);
    await conn.release();
    return result;
}

async function getGroupMessages(group) {
    const conn = await pool.getConnection();
    const query = "SELECT * FROM groups WHERE groupName = ?";
    const result = await conn.query(query, [group]);
    await conn.release();
    return result;
}

async function getUsersToList(name) {
    const conn = await pool.getConnection();
    const query = "SELECT name, department, profilePicPath FROM users where name != ?";
    const result = await conn.query(query, [name]);
    await conn.release();
    return result;
}

async function getUsers() {
    const conn = await pool.getConnection();
    const query = "SELECT name, department, profilePicPath FROM users";
    const result = await conn.query(query);
    await conn.release();
    return result;
}

async function getProfile(name) {
    const conn = await pool.getConnection();
    const query = "SELECT id, name, username, department, profilePicPath FROM users where name = ?";
    const result = await conn.query(query, [name]);
    await conn.release();
    return result;
}

async function updateUser(profilePicPath, id) {
    const conn = await pool.getConnection();
    const query = "UPDATE users SET profilePicPath = ? WHERE id = ?";
    const result = await conn.query(query, [profilePicPath, id]);
    await conn.release();
    return result;
}

module.exports = {
    login,
    userRegister,
    // resetarSenha,
    saveIndividualMessage,
    saveGroupMessage,
    getIndividualMessages,
    getGroupMessages,
    getUsersToList,
    getProfile,
    updateUser,
    getUsers
};