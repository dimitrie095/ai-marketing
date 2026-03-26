-- =============================================
-- AI Marketing Analytics & Decision Agent
-- PostgreSQL Database Schema
-- Version: 1.0
-- =============================================

-- Erweiterte Datenbank für Zeitzone Unterstützung
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. MARKETING ENTITÄTEN
-- =============================================

-- Kampagnen Tabelle
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,  -- Meta Ads Campaign ID
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED')),
    objective TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Index für schnelle Suchen
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_updated_at ON campaigns(updated_at);

-- Ad Sets Tabelle
CREATE TABLE ad_sets (
    id TEXT PRIMARY KEY,  -- Meta Ads Ad Set ID
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED')),
    daily_budget DECIMAL(12, 2),
    lifetime_budget DECIMAL(12, 2),
    optimization_goal TEXT,
    billing_event TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Indizes
CREATE INDEX idx_ad_sets_campaign_id ON ad_sets(campaign_id);
CREATE INDEX idx_ad_sets_status ON ad_sets(status);
CREATE INDEX idx_ad_sets_updated_at ON ad_sets(updated_at);

-- Ads Tabelle
CREATE TABLE ads (
    id TEXT PRIMARY KEY,  -- Meta Ads Ad ID
    ad_set_id TEXT NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED', 'IN_PROCESS')),
    creative_type TEXT,  -- IMAGE, VIDEO, CAROUSEL, ETC.
    image_hash TEXT,
    image_url TEXT,
    creative_spec JSONB,  -- JSON für flexible Creative Daten
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Indizes
CREATE INDEX idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ads_updated_at ON ads(updated_at);
CREATE INDEX idx_ads_creative_type ON ads(creative_type);

-- =============================================
-- 2. METRIKEN (KERN-TABELLE)
-- =============================================

CREATE TABLE metrics (
    date DATE NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'adset', 'ad')),
    entity_id TEXT NOT NULL,
    spend DECIMAL(15, 4) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    revenue DECIMAL(15, 4) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(10, 2) DEFAULT 0,
    engagement BIGINT DEFAULT 0,
    video_views BIGINT DEFAULT 0,
    video_p50_watched_actions BIGINT DEFAULT 0,  -- 50% watched
    video_p75_watched_actions BIGINT DEFAULT 0,  -- 75% watched
    video_p95_watched_actions BIGINT DEFAULT 0,  -- 95% watched
    video_p100_watched_actions BIGINT DEFAULT 0,  -- 100% watched
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, entity_type, entity_id)
);

-- Leistungs-Indizes für häufige Queries
CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_entity_id ON metrics(entity_id);
CREATE INDEX idx_metrics_entity_type ON metrics(entity_type);
CREATE INDEX idx_metrics_date_entity ON metrics(date, entity_type);
CREATE INDEX idx_metrics_spend ON metrics(spend) WHERE spend > 0;

-- Partitionierung für große Tabellen (optional, für sehr große Datensätze)
-- CREATE TABLE metrics_y2024m01 PARTITION OF metrics
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =============================================
-- 3. LLM KONFIGURATION (MULTI-LLM SUPPORT)
-- =============================================

CREATE TABLE llm_providers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- "OpenAI", "Kimi", "DeepSeek"
    base_url TEXT NOT NULL,
    docs_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Standard LLM Provider einfügen
INSERT INTO llm_providers (name, base_url, docs_url) VALUES
    ('OpenAI', 'https://api.openai.com/v1', 'https://platform.openai.com/docs'),
    ('Kimi', 'https://api.moonshot.cn/v1', 'https://platform.moonshot.cn/docs'),
    ('DeepSeek', 'https://api.deepseek.com/v1', 'https://platform.deepseek.com/docs')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE llm_configs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,  -- "Production GPT-4", "Dev DeepSeek", etc.
    provider_id INTEGER NOT NULL REFERENCES llm_providers(id),
    model_name TEXT NOT NULL,  -- "gpt-4", "moonshot-v1-8k", "deepseek-chat"
    api_key_encrypted TEXT NOT NULL,
    max_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    cost_per_1k_input_tokens DECIMAL(10, 6) DEFAULT 0,
    cost_per_1k_output_tokens DECIMAL(10, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indizes
CREATE UNIQUE INDEX idx_llm_configs_is_default ON llm_configs(is_default) WHERE is_default = true;
CREATE INDEX idx_llm_configs_is_active ON llm_configs(is_active);
CREATE INDEX idx_llm_configs_provider_id ON llm_configs(provider_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER llm_configs_updated_at
    BEFORE UPDATE ON llm_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. CHAT & KONVERSATIONEN
-- =============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- Für späteres User Management
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    llm_config_id INTEGER REFERENCES llm_configs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- =============================================
-- 5. BACKGROUND JOBS & LOGGING
-- =============================================

CREATE TABLE sync_jobs (
    id SERIAL PRIMARY KEY,
    job_type TEXT NOT NULL,  -- 'campaigns', 'adsets', 'ads', 'metrics'
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_job_type ON sync_jobs(job_type);
CREATE INDEX idx_sync_jobs_started_at ON sync_jobs(started_at);

-- =============================================
-- 6. VIEWS FÜR REPORTING (OPTIONAL, FÜR PERFORMANCE)
-- =============================================

-- KPI View für schnelle Abfragen
CREATE VIEW vw_kpis AS
SELECT 
    date,
    entity_type,
    entity_id,
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    -- KPI Berechnungen (deterministisch!)
    CASE 
        WHEN impressions > 0 THEN clicks::DECIMAL / impressions
        ELSE 0 
    END AS ctr,
    CASE 
        WHEN clicks > 0 THEN spend / clicks
        ELSE 0 
    END AS cpc,
    CASE 
        WHEN spend > 0 THEN revenue / spend
        ELSE 0 
    END AS roas,
    CASE 
        WHEN clicks > 0 THEN conversions::DECIMAL / clicks
        ELSE 0 
    END AS cvr
FROM metrics;

-- View für Kampagnen-Performance
CREATE VIEW vw_campaign_performance AS
SELECT 
    c.id,
    c.name,
    c.status,
    SUM(m.spend) AS total_spend,
    SUM(m.impressions) AS total_impressions,
    SUM(m.clicks) AS total_clicks,
    SUM(m.conversions) AS total_conversions,
    SUM(m.revenue) AS total_revenue,
    -- Durchschnittliche KPIs
    CASE 
        WHEN SUM(m.impressions) > 0 THEN SUM(m.clicks)::DECIMAL / SUM(m.impressions)
        ELSE 0 
    END AS avg_ctr,
    CASE 
        WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks)
        ELSE 0 
    END AS avg_cpc,
    CASE 
        WHEN SUM(m.spend) > 0 THEN SUM(m.revenue) / SUM(m.spend)
        ELSE 0 
    END AS avg_roas,
    CASE 
        WHEN SUM(m.clicks) > 0 THEN SUM(m.conversions)::DECIMAL / SUM(m.clicks)
        ELSE 0 
    END AS avg_cvr,
    COUNT(DISTINCT m.date) AS days_active
FROM campaigns c
LEFT JOIN metrics m ON m.entity_type = 'campaign' AND m.entity_id = c.id
GROUP BY c.id, c.name, c.status;

-- =============================================
-- 7. GRUNDLEGENDE DATEN (SEEDING)
-- =============================================

-- Meta Ads API Referenz-Daten
CREATE TABLE meta_account_info (
    id TEXT PRIMARY KEY,  -- Ad Account ID
    name TEXT,
    currency TEXT DEFAULT 'EUR',
    timezone TEXT DEFAULT 'Europe/Berlin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. FUNKTIONEN FÜR BERECHNUNGEN
-- =============================================

-- Funktion für KPI-Berechnung (performance-optimiert)
CREATE OR REPLACE FUNCTION calculate_kpis(
    p_spend DECIMAL,
    p_impressions BIGINT,
    p_clicks BIGINT,
    p_conversions BIGINT,
    p_revenue DECIMAL
)
RETURNS TABLE (
    ctr DECIMAL,
    cpc DECIMAL,
    roas DECIMAL,
    cvr DECIMAL
) AS $$
BEGIN
    RETURN QUERY SELECT
        CASE 
            WHEN p_impressions > 0 THEN p_clicks::DECIMAL / p_impressions
            ELSE 0 
        END,
        CASE 
            WHEN p_clicks > 0 THEN p_spend / p_clicks
            ELSE 0 
        END,
        CASE 
            WHEN p_spend > 0 THEN p_revenue / p_spend
            ELSE 0 
        END,
        CASE 
            WHEN p_clicks > 0 THEN p_conversions::DECIMAL / p_clicks
            ELSE 0 
        END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- ANMERKUNGEN ZUR DATENBANK-OPTIMIERUNG
-- =============================================
-- 1. Partitionierung: Für sehr große metrics-Tabelle (Millionen von Zeilen)
--    ALTER TABLE metrics PARTITION BY RANGE (date);
-- 
-- 2. Materialized Views: Für tägliche Reports
--    CREATE MATERIALIZED VIEW daily_reports AS ...
--
-- 3. Connection Pooling: PgBouncer für Production
--
-- 4. Backup: Automatisierte tägliche Backups mit pg_dump
--
-- 5. Monitoring: pg_stat_statements für Query-Performance
