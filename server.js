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
    // Adicionando as novas colunas
    await client.query(`
        CREATE TABLE IF NOT EXISTS pessoas (
            id SERIAL PRIMARY KEY,
            data_cadastro TEXT,
            nome TEXT NOT NULL,
            email TEXT, -- Adicionado campo email
            cnsCpf TEXT NOT NULL UNIQUE,
            sexo TEXT,
            data_nascimento TEXT,
            nacionalidade TEXT,
            raca_cor TEXT, -- Novo campo
            etnia TEXT, -- Novo campo
            cep TEXT, -- Adicionado campo CEP
            logradouro TEXT,
            numero TEXT,
            bairro_corrego TEXT, -- Renomeado de 'bairro' para 'bairro_corrego'
            complemento TEXT, -- Novo campo
            cod_logradouro TEXT, -- Novo campo
            cidade TEXT, -- Novo campo
            uf TEXT, -- Novo campo adicionado
            telefone TEXT,
            data_atendimento TEXT, -- Novo campo
            local_atendimento TEXT, -- Novo campo
            distancia_km TEXT, -- Novo campo
            procedimentos TEXT, -- Novo campo
            horario TEXT, -- Novo campo
            tipo_atendimento TEXT, -- Novo campo
            tipo_atendimento_cod TEXT, -- Novo campo
            transporte TEXT, -- Novo campo
            motorista TEXT, -- Novo campo
            hora_saida TEXT, -- Novo campo
            paciente_principal TEXT, -- Novo campo
            acompanhantes_vinculados TEXT, -- Novo campo
            observacao TEXT -- Novo campo
        )
    `);
    client.release(); // Libera o cliente de volta para o pool
}

// Middlewares para permitir comunicação e uso de JSON
app.use(cors());
app.use(express.json());

// --- Servir Arquivos Estáticos (o Frontend) ---
// Esta linha diz ao Express para servir os arquivos da pasta atual (onde está o server.js)
// Isso fará com que o index.html seja acessível.
app.use(express.static(path.join(__dirname)));

// --- Rota Principal (Frontend) ---
// Garante que a rota raiz '/' sirva o arquivo index.html.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


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
        const { 
            data_cadastro, nome, email, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, telefone, data_atendimento, local_atendimento, 
            distancia_km, procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, 
            transporte, motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao 
        } = req.body;
        
        const sql = `INSERT INTO pessoas (
            data_cadastro, nome, email, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, telefone, data_atendimento, local_atendimento, 
            distancia_km, procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, 
            transporte, motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        ) RETURNING *`; 
        
        const values = [
            data_cadastro, nome, email, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, telefone, data_atendimento, local_atendimento, 
            distancia_km, procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, 
            transporte, motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao
        ];
        
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
        const { 
            data_cadastro, nome, email, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, telefone, data_atendimento, local_atendimento, 
            distancia_km, procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, 
            transporte, motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao 
        } = req.body;
        
        const sql = `UPDATE pessoas SET 
            data_cadastro = $1, nome = $2, email = $3, cnsCpf = $4, sexo = $5, data_nascimento = $6, 
            nacionalidade = $7, raca_cor = $8, etnia = $9, cep = $10, logradouro = $11, numero = $12, 
            bairro_corrego = $13, complemento = $14, cod_logradouro = $15, cidade = $16, uf = $17, telefone = $18, 
            data_atendimento = $19, local_atendimento = $20, distancia_km = $21, procedimentos = $22, 
            horario = $23, tipo_atendimento = $24, tipo_atendimento_cod = $25, transporte = $26, 
            motorista = $27, hora_saida = $28, paciente_principal = $29, acompanhantes_vinculados = $30, 
            observacao = $31
        WHERE id = $32
        RETURNING *`;
        
        const values = [
            data_cadastro, nome, email, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, telefone, data_atendimento, local_atendimento, 
            distancia_km, procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, 
            transporte, motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao, id
        ];
        
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
        // Colunas que serão inseridas. Certifique-se de que a ordem corresponde à do VALUES
        const sql = `INSERT INTO pessoas (
            data_cadastro, nome, email, telefone, cnsCpf, sexo, data_nascimento, nacionalidade, 
            raca_cor, etnia, cep, logradouro, numero, bairro_corrego, complemento, 
            cod_logradouro, cidade, uf, data_atendimento, local_atendimento, distancia_km, 
            procedimentos, horario, tipo_atendimento, tipo_atendimento_cod, transporte, 
            motorista, hora_saida, paciente_principal, acompanhantes_vinculados, observacao
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        ) ON CONFLICT (cnsCpf) DO NOTHING`; // Ignora inserção se o cnsCpf já existir
        
        let importadosCount = 0;
        await client.query('BEGIN');
        for (const registro of novosRegistros) {
            const values = [
                registro.data_cadastro, registro.nome, registro.email, registro.telefone, registro.cnsCpf, 
                registro.sexo, registro.data_nascimento, registro.nacionalidade, registro.raca_cor, 
                registro.etnia, registro.cep, registro.logradouro, registro.numero, registro.bairro_corrego, 
                registro.complemento, registro.cod_logradouro, registro.cidade, registro.uf, registro.data_atendimento, 
                registro.local_atendimento, registro.distancia_km, registro.procedimentos, registro.horario, 
                registro.tipo_atendimento, registro.tipo_atendimento_cod, registro.transporte, registro.motorista, 
                registro.hora_saida, registro.paciente_principal, registro.acompanhantes_vinculados, registro.observacao
            ];
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
