// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const path = require('path');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;

// --- Database Setup ---
let db;

// Async function to set up the database connection and create the table
async function setupDatabase() {
    const dbPath = path.join(__dirname, 'database.db');
    console.log(`Tentando criar/abrir o banco de dados em: ${dbPath}`);
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Create the 'pessoas' table if it doesn't exist
    // A coluna 'cnsCpf' agora é UNIQUE para evitar duplicatas no nível do banco de dados
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pessoas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL,
            telefone TEXT,
            cnsCpf TEXT NOT NULL UNIQUE,
            nascimento TEXT,
            cep TEXT,
            logradouro TEXT,
            numero TEXT,
            bairro TEXT
        )
    `);
}

// Middlewares para permitir comunicação e uso de JSON
app.use(cors());
app.use(express.json());


// --- Rotas da API (Endpoints) ---

// [GET] /api/pessoas - Retorna todas as pessoas
app.get('/api/pessoas', async (req, res) => {
    try {
        const pessoas = await db.all('SELECT * FROM pessoas ORDER BY nome');
        res.json(pessoas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pessoas.', error: error.message });
    }
});

// [POST] /api/pessoas - Cria uma nova pessoa
app.post('/api/pessoas', async (req, res) => {
    const { nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro } = req.body;
    const sql = `INSERT INTO pessoas (nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        const result = await db.run(sql, [nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro]);
        const novaPessoa = await db.get('SELECT * FROM pessoas WHERE id = ?', result.lastID);
        res.status(201).json(novaPessoa);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Erro: CNS/CPF já cadastrado.', error: error.message });
        }
        res.status(500).json({ message: 'Erro ao criar pessoa.', error: error.message });
    }
});

// [PUT] /api/pessoas/:id - Atualiza uma pessoa existente
app.put('/api/pessoas/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro } = req.body;
    const sql = `UPDATE pessoas SET 
                    nome = ?, email = ?, telefone = ?, cnsCpf = ?, nascimento = ?, 
                    cep = ?, logradouro = ?, numero = ?, bairro = ?
                 WHERE id = ?`;
    try {
        const result = await db.run(sql, [nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro, id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pessoa não encontrada.' });
        }
        const pessoaAtualizada = await db.get('SELECT * FROM pessoas WHERE id = ?', id);
        res.json(pessoaAtualizada);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Erro: CNS/CPF já cadastrado em outro registro.', error: error.message });
        }
        res.status(500).json({ message: 'Erro ao atualizar pessoa.', error: error.message });
    }
});

// [DELETE] /api/pessoas/:id - Deleta uma pessoa
app.delete('/api/pessoas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.run('DELETE FROM pessoas WHERE id = ?', id);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Pessoa não encontrada.' });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar pessoa.', error: error.message });
    }
});

// [POST] /api/pessoas/batch-import - Importa múltiplos registros (para o CSV)
app.post('/api/pessoas/batch-import', async (req, res) => {
    const novosRegistros = req.body;
    const sql = `INSERT OR IGNORE INTO pessoas (nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let importadosCount = 0;
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const registro of novosRegistros) {
            const result = await db.run(sql, [registro.nome, registro.email, registro.telefone, registro.cnsCpf, registro.nascimento, registro.cep, registro.logradouro, registro.numero, registro.bairro]);
            if (result.changes > 0) importadosCount++;
        }
        await db.exec('COMMIT');
        res.status(201).json({ message: `${importadosCount} registros importados com sucesso.` });
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Erro durante a importação em massa.', error: error.message });
    }
});

// Inicia o banco de dados e, em seguida, o servidor
setupDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Conectado ao banco de dados SQLite.');
    });
}).catch(err => {
    console.error('Erro ao iniciar o banco de dados:', err);
});
