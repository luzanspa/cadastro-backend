// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // Importa o Pool do PostgreSQL

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Setup ---
// Configura o Pool de Conexões.
// Ele vai usar a variável de ambiente DATABASE_URL automaticamente quando estiver no Render.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Adiciona configuração SSL para conexões em produção no Render
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});


// Async function to set up the database connection and create the table
async function setupDatabase() {
    // Conecta ao banco de dados para verificar se está funcionando
    const client = await pool.connect();
    console.log('Conectado ao banco de dados PostgreSQL com sucesso!');
    
    // Cria a tabela 'pessoas' se ela não existir.
    // Note as pequenas mudanças na sintaxe para PostgreSQL.
    await client.query(`
        CREATE TABLE IF NOT EXISTS pessoas (
            id SERIAL PRIMARY KEY,
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
    client.release(); // Libera o cliente de volta para o pool
}

// Middlewares para permitir comunicação e uso de JSON
app.use(cors());
app.use(express.json());

// --- Servir Arquivos Estáticos (o Frontend) ---
// Esta linha diz ao Express para servir os arquivos da pasta atual (onde está o server.js)
// Isso fará com que o cadastro_pessoal.html seja acessível.
app.use(express.static(path.join(__dirname, 'public')));


// --- Rotas da API (Endpoints) ---

// [GET] /api/pessoas - Retorna todas as pessoas
app.get('/api/pessoas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pessoas ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
        res.status(500).json({ message: 'Erro ao buscar pessoas.', error: error.message });
    }
});

// [POST] /api/pessoas - Cria uma nova pessoa
app.post('/api/pessoas', async (req, res) => {
    try {
        const { nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro } = req.body;
        const sql = `INSERT INTO pessoas (nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING *`; // RETURNING * retorna a linha inserida
        const values = [nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro];
        const result = await pool.query(sql, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar pessoa:', error);
        if (error.code === '23505') { // Código de erro para violação de constraint UNIQUE no PostgreSQL
            return res.status(409).json({ message: 'Erro: CNS/CPF já cadastrado.', error: error.message });
        }
        res.status(500).json({ message: 'Erro ao criar pessoa.', error: error.message });
    }
});

// [PUT] /api/pessoas/:id - Atualiza uma pessoa existente
app.put('/api/pessoas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro } = req.body;
        const sql = `UPDATE pessoas SET 
                        nome = $1, email = $2, telefone = $3, cnsCpf = $4, nascimento = $5, 
                        cep = $6, logradouro = $7, numero = $8, bairro = $9
                     WHERE id = $10
                     RETURNING *`;
        const values = [nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro, id];
        const result = await pool.query(sql, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Pessoa não encontrada.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar pessoa:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Erro: CNS/CPF já cadastrado em outro registro.', error: error.message });
        }
        res.status(500).json({ message: 'Erro ao atualizar pessoa.', error: error.message });
    }
});

// [DELETE] /api/pessoas/:id - Deleta uma pessoa
app.delete('/api/pessoas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM pessoas WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Pessoa não encontrada.' });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        console.error('Erro ao deletar pessoa:', error);
        res.status(500).json({ message: 'Erro ao deletar pessoa.', error: error.message });
    }
});

// [POST] /api/pessoas/batch-import - Importa múltiplos registros (para o CSV)
app.post('/api/pessoas/batch-import', async (req, res) => {
    const client = await pool.connect();
    try {
        const novosRegistros = req.body;
        const sql = `INSERT INTO pessoas (nome, email, telefone, cnsCpf, nascimento, cep, logradouro, numero, bairro) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (cnsCpf) DO NOTHING`; // Ignora inserção se o cnsCpf já existir
        let importadosCount = 0;
        await client.query('BEGIN');
        for (const registro of novosRegistros) {
            const values = [registro.nome, registro.email, registro.telefone, registro.cnsCpf, registro.nascimento, registro.cep, registro.logradouro, registro.numero, registro.bairro];
            const result = await client.query(sql, values);
            if (result.rowCount > 0) importadosCount++;
        }
        await client.query('COMMIT');
        res.status(201).json({ message: `${importadosCount} registros importados com sucesso.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro na importação em massa:', error);
        res.status(500).json({ message: 'Erro durante a importação em massa.', error: error.message });
    } finally {
        client.release();
    }
});

// Inicia o banco de dados e, em seguida, o servidor
setupDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Erro ao iniciar o banco de dados:', err);
});
