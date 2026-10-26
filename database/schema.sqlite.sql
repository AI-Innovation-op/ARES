-- ============================================================================
-- ESQUEMA SQLITE EMBEBIDO: A.R.E.S. v2.6 (Persistencia y Memoria Total)
-- Compatible con node:sqlite nativo en Node.js 24+
-- ============================================================================

-- 1. Tabla de Usuarios / Comandantes
CREATE TABLE IF NOT EXISTS commanders (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    alias TEXT NOT NULL DEFAULT 'Comandante',
    preferred_stacks TEXT NOT NULL DEFAULT '["TypeScript", "Node.js", "Vue.js", "PostgreSQL", "TailwindCSS"]',
    coding_conventions TEXT,
    locale TEXT NOT NULL DEFAULT 'es-PE',
    voice_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (NOW())
);

-- 2. Repositorios y Proyectos Administrados
CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    repo_url TEXT,
    architecture_pattern TEXT NOT NULL DEFAULT 'Clean + Hexagonal',
    doc_coverage_score REAL NOT NULL DEFAULT 0.00,
    solid_health_score REAL NOT NULL DEFAULT 0.00,
    last_synced_commit TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW())
);

-- 3. Bóveda del Escudo Aegis: Documentación Técnica y ADR
CREATE TABLE IF NOT EXISTS technical_documents (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    adr_number INTEGER,
    title TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    markdown_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TEXT NOT NULL DEFAULT (NOW()),
    updated_at TEXT NOT NULL DEFAULT (NOW())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_adr_number
    ON technical_documents (repository_id, adr_number) WHERE doc_type = 'ADR';

-- 4. Registro de Combate de la Espada Binaria: Auditorías de Código
CREATE TABLE IF NOT EXISTS code_audits (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_complexity TEXT,
    optimized_complexity TEXT,
    solid_score_before INTEGER,
    solid_score_after INTEGER,
    security_before TEXT,
    security_after TEXT,
    vulnerabilities_found TEXT NOT NULL DEFAULT '[]',
    refactored_code TEXT NOT NULL,
    audited_at TEXT NOT NULL DEFAULT (NOW())
);

-- 5. Conversaciones e Historial de Chat
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT NOT NULL DEFAULT '[]',
    pose_number INTEGER,
    created_at TEXT NOT NULL DEFAULT (NOW())
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- 6. Memoria Semántica Vectorial (RAG sobre código y documentación)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    file_path TEXT,
    chunk_text TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    embedding TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW())
);

-- 7. Telemetría del Protocolo Bio-Armadura
CREATE TABLE IF NOT EXISTS bio_telemetry_logs (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    continuous_coding_minutes INTEGER NOT NULL DEFAULT 0,
    hydration_level_pct INTEGER,
    stamina_pct INTEGER,
    detected_fatigue_level TEXT,
    spartan_intervention_triggered INTEGER NOT NULL DEFAULT 0,
    logged_at TEXT NOT NULL DEFAULT (NOW())
);

-- 8. Eventos de la Máquina de Estados (auditoría de poses y análisis de uso)
CREATE TABLE IF NOT EXISTS agent_state_events (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    commander_id TEXT NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    stance TEXT NOT NULL,
    pose_number INTEGER NOT NULL,
    trigger_source TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT (NOW())
);
