"""
Prompt Engineering Framework
L5-01: Prompt Templates, Versioning, A/B Testing
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel
from enum import Enum
import re
import json
import logging
from app.db.models_llm import PromptTemplate as PromptTemplateDB

logger = logging.getLogger(__name__)


class PromptType(Enum):
    """Verschiedene Arten von Prompts"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    KPI_ANALYSIS = "kpi_analysis"
    ROOT_CAUSE = "root_cause"
    RECOMMENDATION = "recommendation"


class PromptStatus(Enum):
    """Status eines Prompt Templates"""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class PromptVariable(BaseModel):
    """Definition einer Variablen in einem Prompt Template"""
    name: str
    description: Optional[str] = None
    type: str = "string"
    required: bool = True
    default_value: Optional[Any] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PromptMetrics(BaseModel):
    """Performance-Metriken eines Prompts (für A/B Testing)"""
    usage_count: int = 0
    average_response_time: float = 0.0
    average_tokens_used: int = 0
    average_cost: float = 0.0
    user_satisfaction: float = 0.0  # 0-5 Sterne
    success_rate: float = 1.0  # 0-1 ( erfolgreiche Antworten / Gesamt )
    last_used: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PromptTemplate(BaseModel):
    """Prompt Template mit Variablen und Versionierung"""
    id: str
    name: str
    description: Optional[str] = None
    type: PromptType
    version: str
    status: PromptStatus = PromptStatus.DRAFT
    
    # Template mit {{variablen}} im Jinja-Stil
    template: str
    variables: List[PromptVariable] = []
    
    # A/B Testing
    is_test_version: bool = False
    test_group_size: float = 0.5  # Proportion der Nutzer für dieser Version
    parent_template_id: Optional[str] = None
    
    # Performance
    metrics: PromptMetrics = PromptMetrics()
    
    # Metadaten
    created_by: str
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None
    tags: List[str] = []
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def render(self, variables: Dict[str, Any]) -> str:
        """
        Rendert das Template mit den gegebenen Variablen
        
        Args:
            variables: Dictionary mit Variablen-Werten
            
        Returns:
            Gerenderter Prompt String
            
        Raises:
            ValueError: Wenn eine required Variable fehlt
        """
        # Prüfe required Variablen
        for var in self.variables:
            if var.required and var.name not in variables:
                raise ValueError(f"Erforderliche Variable fehlt: {var.name}")
        
        # Setze Default-Werte
        rendered_vars = {}
        for var in self.variables:
            if var.name in variables:
                rendered_vars[var.name] = variables[var.name]
            elif var.default_value is not None:
                rendered_vars[var.name] = var.default_value
            elif var.required:
                raise ValueError(f"Erforderliche Variable fehlt: {var.name}")
            else:
                rendered_vars[var.name] = ""
        
        # Rendere Template
        try:
            return self._render_template(self.template, rendered_vars)
        except Exception as e:
            logger.error(f"Fehler beim Rendern des Prompts {self.id}: {e}")
            raise
    
    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """
        Interne Template-Rendering-Funktion
        Unterstützt einfache {{variable}} Syntax
        """
        result = template
        
        # Ersetze {{variable}} mit Werten
        for var_name, var_value in variables.items():
            pattern = r"\{\{\s*" + re.escape(var_name) + r"\s*\}\}"
            replacement = str(var_value)
            result = re.sub(pattern, replacement, result)
        
        # Warnung für ungenutzte Variablen
        unused_vars = re.findall(r"\{\{\s*(\w+)\s*\}\}", result)
        if unused_vars:
            logger.warning(f"Ungenutzte Variablen im Prompt {self.id}: {unused_vars}")
        
        return result
    
    def get_required_variables(self) -> List[str]:
        """Gibt Liste aller required Variablen zurück"""
        return [var.name for var in self.variables if var.required]
    
    def get_all_variables(self) -> List[str]:
        """Gibt Liste aller Variablen zurück"""
        return [var.name for var in self.variables]
    
    def extract_variables_from_template(self) -> List[str]:
        """Extrahiert alle {{variablen}} aus dem Template"""
        pattern = r"\{\{\s*(\w+)\s*\}\}"
        return list(set(re.findall(pattern, self.template)))
    
    def validate(self) -> List[str]:
        """
        Validiert das Template
        
        Returns:
            Liste von Fehlermeldungen (leer = valid)
        """
        errors = []
        
        # Prüfe auf leeres Template
        if not self.template or not self.template.strip():
            errors.append("Template darf nicht leer sein")
        
        # Extrahiere Variablen aus Template
        template_vars = self.extract_variables_from_template()
        defined_vars = self.get_all_variables()
        
        # Prüfe auf undefinierte Variablen
        for var in template_vars:
            if var not in defined_vars:
                errors.append(f"Variable '{var}' wird im Template verwendet, ist aber nicht definiert")
        
        # Prüfe auf undefinierte required Variablen
        required_vars = self.get_required_variables()
        for var in required_vars:
            if var not in template_vars:
                errors.append(f"Required Variable '{var}' wird nicht im Template verwendet")
        
        return errors


class PromptVersion(BaseModel):
    """Version eines Prompt Templates"""
    version_id: str
    template_id: str
    version: str
    changes: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    created_by: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PromptABTest(BaseModel):
    """A/B Test Konfiguration"""
    test_id: str
    template_ids: List[str]  # IDs der Varianten
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "running"  # running, completed, paused
    traffic_split: Dict[str, float]  # template_id -> Proportion
    success_metric: str = "user_satisfaction"  # user_satisfaction, success_rate, cost
    winner_id: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PromptEngineeringFramework:
    """
    Haupt-Framework für Prompt Engineering
    - Verwaltet Templates
    - A/B Testing
    - Versionierung
    - Performance-Tracking
    """
    
    @staticmethod
    async def create_template(template: PromptTemplate) -> PromptTemplate:
        """Erstellt ein neues Prompt Template"""
        # Validiere Template
        errors = template.validate()
        if errors:
            raise ValueError(f"Template Validierung fehlgeschlagen: {errors}")
        
        # Speichere in DB - create Document instance from dict
        template_dict = template.dict()
        # Convert enum values to strings for DB storage
        template_dict['type'] = template.type.value if hasattr(template.type, 'value') else str(template.type)
        template_dict['status'] = template.status.value if hasattr(template.status, 'value') else str(template.status)
        
        db_template = PromptTemplateDB(**template_dict)
        await db_template.insert()
        logger.info(f"✅ Prompt Template erstellt: {template.id} v{template.version}")
        
        return template
    
    @staticmethod
    async def get_template(template_id: str, version: Optional[str] = None) -> Optional[PromptTemplate]:
        """Lädt ein Template aus der DB"""
        query = {"id": template_id}
        if version:
            query["version"] = version
        
        template_doc = await PromptTemplateDB.find_one(query, sort=[("version", -1)])
        
        if template_doc:
            # Convert Beanie Document to dict for Pydantic model
            template_dict = template_doc.model_dump() if hasattr(template_doc, 'model_dump') else template_doc.dict()
            return PromptTemplate(**template_dict)
        return None
    
    @staticmethod
    async def update_template(template_id: str, updates: Dict[str, Any], updated_by: str) -> Optional[PromptTemplate]:
        """Aktualisiert ein Template und erstellt neue Version"""
        # Lade bestehendes Template
        current = await PromptEngineeringFramework.get_template(template_id)
        if not current:
            raise ValueError(f"Template {template_id} nicht gefunden")
        
        # Erstelle neue Version
        new_version = PromptTemplate(
            id=current.id,
            name=updates.get("name", current.name),
            description=updates.get("description", current.description),
            type=updates.get("type", current.type),
            version=PromptEngineeringFramework._increment_version(current.version),
            status=updates.get("status", PromptStatus.DRAFT),
            template=updates.get("template", current.template),
            variables=updates.get("variables", current.variables),
            created_by=updated_by,
            updated_at=datetime.utcnow(),
            tags=updates.get("tags", current.tags)
        )
        
        # Validiere
        errors = new_version.validate()
        if errors:
            raise ValueError(f"Template Validierung fehlgeschlagen: {errors}")
        
        # Speichere neue Version
        await PromptEngineeringFramework.create_template(new_version)
        logger.info(f"✅ Template aktualisiert: {new_version.id} v{new_version.version}")
        
        return new_version
    
    @staticmethod
    async def list_templates(template_type: Optional[PromptType] = None, status: Optional[PromptStatus] = None) -> List[PromptTemplate]:
        """Listet Templates mit optionalen Filtern"""
        query = {}
        if template_type:
            query["type"] = template_type.value
        if status:
            query["status"] = status.value
        
        template_docs = await PromptTemplateDB.find(query).to_list()
        result = []
        for doc in template_docs:
            # Convert Beanie Document to dict for Pydantic model
            template_dict = doc.model_dump() if hasattr(doc, 'model_dump') else doc.dict()
            result.append(PromptTemplate(**template_dict))
        return result
    
    @staticmethod
    async def create_ab_test(
        name: str,
        template_ids: List[str],
        traffic_split: Optional[Dict[str, float]] = None
    ) -> PromptABTest:
        """Erstellt einen A/B Test"""
        # Validiere Templates
        templates = []
        for template_id in template_ids:
            template = await PromptEngineeringFramework.get_template(template_id)
            if not template:
                raise ValueError(f"Template {template_id} nicht gefunden")
            if template.status != PromptStatus.ACTIVE:
                raise ValueError(f"Template {template_id} ist nicht aktiv")
            templates.append(template)
        
        # Standard-Traffic-Verteilung (gleichmäßig)
        if not traffic_split:
            equal_share = 1.0 / len(template_ids)
            traffic_split = {tid: equal_share for tid in template_ids}
        else:
            # Normalisiere auf 1.0
            total = sum(traffic_split.values())
            traffic_split = {tid: share/total for tid, share in traffic_split.items()}
        
        # Erstelle Test
        import uuid
        test = PromptABTest(
            test_id=str(uuid.uuid4()),
            template_ids=template_ids,
            start_date=datetime.utcnow(),
            status="running",
            traffic_split=traffic_split
        )
        
        # Speichere in DB (TODO: DB Model)
        logger.info(f"✅ A/B Test erstellt: {test.test_id}")
        
        return test
    
    @staticmethod
    def evaluate_template_performance(template: PromptTemplate) -> float:
        """
        Bewertet die Performance eines Templates
        
        Returns:
            Score zwischen 0 und 1
        """
        metrics = template.metrics
        
        # Normalisierte Metriken
        if metrics.usage_count == 0:
            return 0.0
        
        # Kombinierter Score (kann angepasst werden)
        satisfaction_score = (metrics.user_satisfaction / 5.0) if metrics.user_satisfaction > 0 else 0.8
        success_score = metrics.success_rate
        cost_score = max(0, 1 - (metrics.average_cost / 0.01))  # Kosten-Bewertung
        
        # Gewichtete Kombination
        return (
            satisfaction_score * 0.4 +
            success_score * 0.4 +
            cost_score * 0.2
        )
    
    @staticmethod
    def _increment_version(version: str) -> str:
        """Erhöht die Versionsnummer (z.B. 1.0 -> 1.1)"""
        try:
            major, minor = map(int, version.split("."))
            return f"{major}.{minor + 1}"
        except:
            return "1.0"
    
    @staticmethod
    def get_default_template(template_type: PromptType) -> PromptTemplate:
        """Gibt ein Standard-Template für den gegebenen Typ zurück"""
        if template_type == PromptType.KPI_ANALYSIS:
            return PromptTemplate(
                id="kpi_analysis_default",
                name="KPI Analysis Default",
                description="Standard-Template für KPI-Analyse",
                type=PromptType.KPI_ANALYSIS,
                version="1.0",
                status=PromptStatus.ACTIVE,
                template="""Du bist ein Marketing-Analyse Experte. Analysiere die folgenden KPI für die Kampagne "{{campaign_name}}" vom {{date_range}}:

KPI-Daten:
- CTR: {{ctr}}%
- CPC: {{cpc}}€
- ROAS: {{roas}}
- Conversions: {{conversions}}

Bitte:
1. Fasse die Performance in 2-3 Sätzen zusammen
2. Identifiziere die stärksten und schwächsten Bereiche
3. Gib 2-3 konkrete Optimierungsempfehlungen

Antworte in Deutsch.""",
                variables=[
                    PromptVariable(name="campaign_name", description="Name der Kampagne", required=True),
                    PromptVariable(name="date_range", description="Datumsbereich", required=True),
                    PromptVariable(name="ctr", description="Click-Through Rate", required=True),
                    PromptVariable(name="cpc", description="Cost Per Click", required=True),
                    PromptVariable(name="roas", description="Return on Ad Spend", required=True),
                    PromptVariable(name="conversions", description="Anzahl Conversions", required=True),
                ],
                created_by="system"
            )
        
        elif template_type == PromptType.ROOT_CAUSE:
            return PromptTemplate(
                id="root_cause_default",
                name="Root Cause Analysis Default",
                description="Standard-Template für Root Cause Analysis",
                type=PromptType.ROOT_CAUSE,
                version="1.0",
                status=PromptStatus.ACTIVE,
                template="""Du bist ein Marketing-Analyse Experte. Führe eine Root Cause Analysis für folgendes Problem durch:

Problem: {{problem_description}}
Kampagne: {{campaign_name}}
Zeitraum: {{date_range}}

Relevante Daten:
- CTR vorher: {{ctr_before}}% / CTR nachher: {{ctr_after}}%
- CPC vorher: {{cpc_before}}€ / CPC nachher: {{cpc_after}}€
- Änderungen: {{changes_made}}

Bitte:
1. Identifiziere mögliche Ursachen basierend auf den ROI-Daten
2. Priorisiere die Ursachen nach Wahrscheinlichkeit
3. Gib Empfehlungen zur Validierung jeder Ursache

Antworte in Deutsch.""",
                variables=[
                    PromptVariable(name="problem_description", description="Beschreibung des Problems", required=True),
                    PromptVariable(name="campaign_name", description="Name der Kampagne", required=True),
                    PromptVariable(name="date_range", description="Zeitraum", required=True),
                    PromptVariable(name="ctr_before", description="CTR vorher", required=False, default_value="N/A"),
                    PromptVariable(name="ctr_after", description="CTR nachher", required=False, default_value="N/A"),
                    PromptVariable(name="cpc_before", description="CPC vorher", required=False, default_value="N/A"),
                    PromptVariable(name="cpc_after", description="CPC nachher", required=False, default_value="N/A"),
                    PromptVariable(name="changes_made", description="Durchgeführte Änderungen", required=False, default_value="None"),
                ],
                created_by="system"
            )
        
        else:
            raise ValueError(f"Kein Standard-Template definiert für Typ: {template_type}")


# Globaler Framework-Instance
prompt_framework = PromptEngineeringFramework()