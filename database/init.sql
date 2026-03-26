-- =============================================
-- PHASE 1: MINIMALES DATENBANK-SCHEMA
-- AI Marketing Analytics - INIT
-- =============================================

-- Erweiterte Datenbank für Zeitzone Unterstützung
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Kampagnen Tabelle (Phase 1: Nur essenzielle Felder)
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Ad Sets Tabelle
CREATE TABLE ad_sets (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_sets_campaign_id ON ad_sets(campaign_id);

-- Ads Tabelle
CREATE TABLE ads (
    id TEXT PRIMARY KEY,
    ad_set_id TEXT NOT NULL REFERENCES ad_sets(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ads_ad_set_id ON ads(ad_set_id);

-- Zentrale Metriken Tabelle (Phase 1: Nur Core KPI Felder)
CREATE TABLE metrics (
    date DATE NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'adset', 'ad')),
    entity_id TEXT NOT NULL,
    spend DECIMAL(15, 4) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    revenue DECIMAL(15, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, entity_type, entity_id)
);

CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_entity_id ON metrics(entity_id);

-- LLM Konfiguration (Phase 1: Minimal)
CREATE TABLE llm_configs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,  -- 'openai', 'kimi', 'deepseek'
    model_name TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BEISPIEL-DATEN (OPTIONAL - ZUM TESTEN)
-- =============================================

-- Beispiel Kampagne
INSERT INTO campaigns (id, name, status) VALUES 
    ('1234567890', 'Sommer Sale 2024', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Beispiel Ad Set
INSERT INTO ad_sets (id, campaign_id, name, status) VALUES 
    ('2345678901', '1234567890', 'DE - 18-35', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Beispiel Ad
INSERT INTO ads (id, ad_set_id, name, status) VALUES 
    ('3456789012', '2345678901', 'Creative A - Image', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Beispiel Metriken (letzte 7 Tage)
INSERT INTO metrics (date, entity_type, entity_id, spend, impressions, clicks, conversions, revenue) VALUES
    (CURRENT_DATE - INTERVAL '1 day', 'campaign', '1234567890', 100.50, 5000, 150, 10, 350.00),
    (CURRENT_DATE - INTERVAL '2 day', 'campaign', '1234567890', 95.20, 4800, 140, 8, 280.00),
    (CURRENT_DATE - INTERVAL '3 day', 'campaign', '1234567890', 110.75, 5200, 165, 12, 420.00);
