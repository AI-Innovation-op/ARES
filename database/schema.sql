-- ============================================================================
-- ARQUITECTURA DE DATOS: A.R.E.S. (PostgreSQL 16+ con extensión pgvector)
-- Archivo de migración independiente: schema.sql
-- Versión: 2.6
-- ============================================================================

-- Habilitar extensión para búsqueda de memoria vectorial (embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- gen_random_uuid() es nativo desde PostgreSQL 13: no hace falta uuid-ossp.

-- Función reutilizable para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Tabla de Usuarios / Comandantes
-- Perfil del desarrollador y sus preferencias técnicas
-- ----------------------------------------------------------------------------
CREATE TABLE commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias VARCHAR(100) NOT NULL DEFAULT 'Comandante',
    preferred_stacks JSONB NOT NULL DEFAULT '["TypeScript", "Node.js", "Vue.js", "PostgreSQL"]',
    coding_conventions TEXT,                              -- Reglas personalizadas de estilo y arquitectura
    locale VARCHAR(10) NOT NULL DEFAULT 'es-PE',
    voice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Repositorios y Proyectos Administrados
-- Cada proyecto protegido por A.R.E.S.
-- ----------------------------------------------------------------------------
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commander_id UUID NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    repo_url TEXT,
    architecture_pattern VARCHAR(100) NOT NULL DEFAULT 'Clean + Hexagonal',
    doc_coverage_score NUMERIC(5,2) NOT NULL DEFAULT 0.00
        CHECK (doc_coverage_score BETWEEN 0 AND 100),     -- % de cobertura documental (Escudo Aegis)
    solid_health_score NUMERIC(5,2) NOT NULL DEFAULT 0.00
        CHECK (solid_health_score BETWEEN 0 AND 100),     -- Salud del código (Espada Binaria)
    last_synced_commit VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Bóveda del Escudo Aegis: Documentación Técnica y ADR
-- Todo artefacto generado por A.R.E.S. nace como borrador (DRAFT)
-- ----------------------------------------------------------------------------
CREATE TABLE technical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL
        CHECK (doc_type IN ('README', 'ADR', 'RFC', 'OPENAPI', 'CHANGELOG', 'MERMAID_C4', 'DOCSTRINGS')),
    adr_number INTEGER,                                   -- Solo para doc_type = 'ADR' (ADR-001, ADR-002...)
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    markdown_content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'APPROVED', 'DEPRECATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único parcial: garantiza que no haya dos ADR con el mismo número por repositorio
CREATE UNIQUE INDEX uq_adr_number
    ON technical_documents (repository_id, adr_number) WHERE doc_type = 'ADR';

CREATE TRIGGER trg_technical_documents_touch
    BEFORE UPDATE ON technical_documents
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Registro de Combate de la Espada Binaria: Auditorías y Refactorizaciones
-- ----------------------------------------------------------------------------
CREATE TABLE code_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_complexity VARCHAR(30),                      -- Ej: O(n²)
    optimized_complexity VARCHAR(30),                     -- Ej: O(n)
    solid_score_before INTEGER CHECK (solid_score_before BETWEEN 0 AND 100),
    solid_score_after INTEGER CHECK (solid_score_after BETWEEN 0 AND 100),
    security_before VARCHAR(20),                          -- ALTA / MEDIA / CRITICA
    security_after VARCHAR(20),                           -- p. ej. BLINDADA
    vulnerabilities_found JSONB NOT NULL DEFAULT '[]',    -- Alertas OWASP detectadas
    refactored_code TEXT NOT NULL,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Conversaciones e Historial de Chat
-- Equivalente persistente del historial de la consola
-- ----------------------------------------------------------------------------
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commander_id UUID NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    title VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'model')),   -- Mismos roles que la API de Gemini
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]',                  -- Fuentes de grounding: [{uri, title}]
    pose_number SMALLINT CHECK (pose_number BETWEEN 1 AND 16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- 6. Memoria Semántica Vectorial (RAG sobre código y documentación)
-- La dimensión del vector (768) debe coincidir con el modelo de embeddings
-- ----------------------------------------------------------------------------
CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_type VARCHAR(40) NOT NULL
        CHECK (source_type IN ('CODE_AST_CHUNK', 'DOC_SECTION', 'PAST_SOLUTION')),
    file_path TEXT,
    chunk_text TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding_hnsw
    ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- 7. Telemetría del Protocolo Bio-Armadura (herencia evolucionada de CORI)
-- ----------------------------------------------------------------------------
CREATE TABLE bio_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commander_id UUID NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    continuous_coding_minutes INTEGER NOT NULL DEFAULT 0,
    hydration_level_pct INTEGER CHECK (hydration_level_pct BETWEEN 0 AND 100),
    stamina_pct INTEGER CHECK (stamina_pct BETWEEN 0 AND 100),
    detected_fatigue_level VARCHAR(20)
        CHECK (detected_fatigue_level IN ('OPTIMAL', 'MODERATE', 'HIGH', 'CRITICAL_BURNOUT')),
    spartan_intervention_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. Eventos de la Máquina de Estados (auditoría de poses y análisis de uso)
-- ----------------------------------------------------------------------------
CREATE TABLE agent_state_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commander_id UUID NOT NULL REFERENCES commanders(id) ON DELETE CASCADE,
    stance VARCHAR(20) NOT NULL
        CHECK (stance IN ('IDLE', 'SLASH', 'SHIELD', 'SPRINT', 'ERROR', 'VICTORY')),
    pose_number SMALLINT NOT NULL CHECK (pose_number BETWEEN 1 AND 16),
    trigger_source VARCHAR(30) NOT NULL
        CHECK (trigger_source IN ('CHAT', 'TAB', 'MODULE', 'BIO', 'MANUAL')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FIN DEL ESQUEMA
-- "Un código sin documentación es una fortaleza sin murallas." — A.R.E.S.
-- ============================================================================
