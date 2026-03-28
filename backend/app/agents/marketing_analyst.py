"""
Marketing Analyst Agents
L5-02: KPI Analysis Agent
L5-03: Root Cause Analysis Agent
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
import json
import re
from pydantic import BaseModel
from app.llm import llm_gateway, LLMProvider
from app.llm.prompts import prompt_framework, PromptType, PromptTemplate, PromptVariable
from app.services.kpi_service import KPIService
from app.db.models import Campaign, Metric, ProcessedData
import logging
import datetime as dt

logger = logging.getLogger(__name__)


class KPIAnalysisResult(BaseModel):
    """Result of KPI Analysis"""
    summary: str
    key_insights: List[str]
    strong_areas: List[str]
    weak_areas: List[str]
    recommendations: List[str]
    overall_score: float  # 0-100
    confidence: float  # 0-1
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RootCauseResult(BaseModel):
    """Result of Root Cause Analysis"""
    problem_summary: str
    likely_causes: List[Dict[str, Any]]
    evidence: List[str]
    validation_steps: List[str]
    priority_action: str
    confidence: float  # 0-1
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class KPIAnalysisAgent:
    """
    Agent for analyzing KPI data using AI
    - Processes campaign performance data
    - Generates insights and recommendations
    - Uses structured prompts
    """
    
    def __init__(self):
        self.name = "KPIAnalysisAgent"
        self.prompt_template = None
    
    async def initialize(self):
        """Initializes the agent with prompt templates"""
        try:
            # Try to load existing template or create default
            from app.llm.prompts import prompt_framework
            from app.db.session import is_db_available
            
            if is_db_available():
                self.prompt_template = await prompt_framework.get_template(
                    template_id="kpi_analysis_default"
                )
                
                if not self.prompt_template:
                    # Create default template
                    self.prompt_template = prompt_framework.get_default_template(
                        PromptType.KPI_ANALYSIS
                    )
                    await prompt_framework.create_template(self.prompt_template)
            else:
                # Use default template without DB
                self.prompt_template = prompt_framework.get_default_template(
                    PromptType.KPI_ANALYSIS
                )
                logger.info("KPIAnalysisAgent using default template (no DB)")
        
        except Exception as e:
            logger.warning(f"⚠️ KPIAnalysisAgent initialization warning: {e}")
            # Use in-memory default template
            from app.llm.prompts import prompt_framework
            self.prompt_template = prompt_framework.get_default_template(
                PromptType.KPI_ANALYSIS
            )
        
        logger.info(f"✅ KPIAnalysisAgent initialized")
    
    async def analyze_campaign(
        self,
        campaign_id: str,
        start_date: date,
        end_date: date,
        user_question: Optional[str] = None
    ) -> KPIAnalysisResult:
        """
        Analyzes campaign KPIs over a date range
        
        Args:
            campaign_id: Campaign ID
            start_date: Start date for analysis
            end_date: End date for analysis
            user_question: Optional specific question from user
            
        Returns:
            KPIAnalysisResult with insights
        """
        try:
            # Get campaign data
            campaign = await Campaign.get(campaign_id)
            if not campaign:
                raise ValueError(f"Campaign {campaign_id} not found")
            
            # Get KPI data
            kpi_data = await KPIService.get_kpi_for_entity(
                entity_type="campaign",
                entity_id=campaign_id,
                start_date=start_date,
                end_date=end_date
            )
            
            if kpi_data["status"] == "error":
                raise ValueError(f"Failed to get KPI data: {kpi_data['message']}")
            
            data = kpi_data["data"]
            
            # Prepare variables for prompt
            variables = {
                "campaign_name": campaign.name,
                "date_range": f"{start_date} to {end_date}",
                "ctr": str(data.get("ctr", "N/A")),
                "cpc": str(data.get("cpc", "N/A")),
                "roas": str(data.get("roas", "N/A")),
                "conversions": str(data.get("conversions", "N/A")),
                "impressions": str(data.get("impressions", "N/A")),
                "clicks": str(data.get("clicks", "N/A")),
                "spend": str(data.get("spend", "N/A")),
                "revenue": str(data.get("revenue", "N/A")),
                "roi": str(data.get("roi", "N/A"))
            }
            
            # Add user question if provided
            if user_question:
                variables["user_question"] = user_question
                # Modify template to include user question
                template = self.prompt_template.template + f"\n\nSpezifische Frage des Nutzers: {{{{user_question}}}}"
                temp_template = PromptTemplate(
                    id=f"{self.prompt_template.id}_custom",
                    name=f"{self.prompt_template.name} (Custom)",
                    description=self.prompt_template.description,
                    type=self.prompt_template.type,
                    version=self.prompt_template.version,
                    template=template,
                    variables=self.prompt_template.variables + [
                        PromptVariable(name="user_question", description="User question", required=False)
                    ],
                    created_by="agent"
                )
            else:
                temp_template = self.prompt_template
            
            # Render prompt
            prompt = temp_template.render(variables)
            
            # Call LLM
            from app.llm.base import ChatCompletionRequest, ChatMessage
            
            chat_request = ChatCompletionRequest(
                messages=[
                    ChatMessage(role="user", content=prompt)
                ],
                temperature=0.3,  # Lower temperature for more analytical responses
                max_tokens=1000
            )
            
            response = await llm_gateway.chat_completion(chat_request)
            
            # Parse response
            analysis_text = response.choices[0]["message"]["content"]
            
            # Extract structured data from response
            result = self._parse_analysis_response(analysis_text)
            
            logger.info(f"✅ Campaign analysis completed for {campaign_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_campaign: {e}")
            raise
    
    async def analyze_multiple_campaigns(
        self,
        campaign_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, KPIAnalysisResult]:
        """
        Analyzes multiple campaigns and compares them
        
        Args:
            campaign_ids: List of campaign IDs
            start_date: Start date
            end_date: End date
            
        Returns:
            Dict mapping campaign_id to analysis result
        """
        results = {}
        
        for campaign_id in campaign_ids:
            try:
                result = await self.analyze_campaign(campaign_id, start_date, end_date)
                results[campaign_id] = result
            except Exception as e:
                logger.error(f"Failed to analyze campaign {campaign_id}: {e}")
                results[campaign_id] = None
        
        return results
    
    def _parse_analysis_response(self, response_text: str) -> KPIAnalysisResult:
        """
        Parse the LLM response into a structured format
        
        Args:
            response_text: Raw response from LLM
            
        Returns:
            KPIAnalysisResult with structured data
        """
        # Try to extract JSON if present
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return KPIAnalysisResult(**data)
            except:
                pass
        
        # Fallback: Parse sections from text
        lines = response_text.split('\n')
        
        summary = ""
        insights = []
        strong_areas = []
        weak_areas = []
        recommendations = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            lower_line = line.lower()
            
            # Identify sections
            if "zusammenfassung" in lower_line or "summary" in lower_line:
                current_section = "summary"
                continue
            elif "stärk" in lower_line or "strong" in lower_line:
                current_section = "strong"
                continue
            elif "schwäc" in lower_line or "weak" in lower_line:
                current_section = "weak"
                continue
            elif "empfehlung" in lower_line or "recommendation" in lower_line:
                current_section = "recommendations"
                continue
            elif "erkenntnis" in lower_line or "insight" in lower_line:
                current_section = "insights"
                continue
            
            # Add content to current section
            if current_section == "summary" and line:
                summary += line + " "
            elif current_section == "strong" and line.startswith("-"):
                strong_areas.append(line.strip("- ").strip())
            elif current_section == "weak" and line.startswith("-"):
                weak_areas.append(line.strip("- ").strip())
            elif current_section == "recommendations" and line.startswith("-"):
                recommendations.append(line.strip("- ").strip())
            elif current_section == "insights" and line.startswith("-"):
                insights.append(line.strip("- ").strip())
        
        # If nothing was parsed, treat entire response as summary
        if not summary and not insights and not strong_areas and not weak_areas and not recommendations:
            summary = response_text
        
        return KPIAnalysisResult(
            summary=summary.strip(),
            key_insights=insights if insights else ["Analyse abgeschlossen"],
            strong_areas=strong_areas if strong_areas else ["Daten verfügbar"],
            weak_areas=weak_areas if weak_areas else ["Keine signifikanten Probleme"],
            recommendations=recommendations if recommendations else ["Weiter beobachten"],
            overall_score=75.0,  # Default score
            confidence=0.8
        )


class RootCauseAnalysisAgent:
    """
    Agent for root cause analysis of performance issues
    - Identifies problems in campaign data
    - Finds likely causes
    - Provides validation steps
    """
    
    def __init__(self):
        self.name = "RootCauseAnalysisAgent"
        self.prompt_template = None
    
    async def initialize(self):
        """Initializes the agent with prompt templates"""
        try:
            from app.llm.prompts import prompt_framework
            from app.db.session import is_db_available
            
            if is_db_available():
                self.prompt_template = await prompt_framework.get_template(
                    template_id="root_cause_default"
                )
                
                if not self.prompt_template:
                    self.prompt_template = prompt_framework.get_default_template(
                        PromptType.ROOT_CAUSE
                    )
                    await prompt_framework.create_template(self.prompt_template)
            else:
                # Use default template without DB
                self.prompt_template = prompt_framework.get_default_template(
                    PromptType.ROOT_CAUSE
                )
                logger.info("RootCauseAnalysisAgent using default template (no DB)")
        
        except Exception as e:
            logger.warning(f"⚠️ RootCauseAnalysisAgent initialization warning: {e}")
            # Use in-memory default template
            from app.llm.prompts import prompt_framework
            self.prompt_template = prompt_framework.get_default_template(
                PromptType.ROOT_CAUSE
            )
        
        logger.info(f"✅ RootCauseAnalysisAgent initialized")
    
    async def analyze_performance_drop(
        self,
        campaign_id: str,
        metric_name: str,  # clicks, conversions, ctr, etc.
        start_date_drop: date,
        end_date_drop: date,
        comparison_period_days: int = 7
    ) -> RootCauseResult:
        """
        Analyzes a drop in performance for a specific metric
        
        Args:
            campaign_id: Campaign ID
            metric_name: Metric that dropped (clicks, conversions, ctr, etc.)
            start_date_drop: Start of the drop period
            end_date_drop: End of the drop period
            comparison_period_days: Days before drop to compare
            
        Returns:
            RootCauseResult with analysis
        """
        try:
            # Get campaign data
            campaign = await Campaign.get(campaign_id)
            if not campaign:
                raise ValueError(f"Campaign {campaign_id} not found")
            
            # Get data during drop period
            drop_period_data = await KPIService.get_kpi_for_entity(
                entity_type="campaign",
                entity_id=campaign_id,
                start_date=start_date_drop,
                end_date=end_date_drop
            )
            
            # Get data before drop (comparison period)
            start_comparison = start_date_drop - dt.timedelta(days=comparison_period_days)
            comparison_period_data = await KPIService.get_kpi_for_entity(
                entity_type="campaign",
                entity_id=campaign_id,
                start_date=start_comparison,
                end_date=start_date_drop
            )
            
            if drop_period_data["status"] == "error":
                raise ValueError(f"Failed to get drop period data: {drop_period_data['message']}")
            if comparison_period_data["status"] == "error":
                raise ValueError(f"Failed to get comparison data: {comparison_period_data['message']}")
            
            # Extract relevant metrics
            drop_data = drop_period_data["data"]
            comp_data = comparison_period_data["data"]
            
            # Calculate changes
            changes = {}
            for metric in ["ctr", "cpc", "roas", "conversions", "clicks"]:
                before = float(comp_data.get(metric, 0) or 0)
                after = float(drop_data.get(metric, 0) or 0)
                change_pct = ((after - before) / before * 100) if before > 0 else 0
                changes[f"{metric}_change"] = f"{change_pct:.1f}%"
            
            # Prepare prompt variables
            variables = {
                "problem_description": f"Drop in {metric_name} from {start_date_drop} to {end_date_drop}",
                "campaign_name": campaign.name,
                "date_range": f"{start_date_drop} to {end_date_drop}",
                "ctr_before": f"{comp_data.get('ctr', 0)}%",
                "ctr_after": f"{drop_data.get('ctr', 0)}%",
                "cpc_before": f"€{comp_data.get('cpc', 0)}",
                "cpc_after": f"€{drop_data.get('cpc', 0)}",
                "changes_made": ", ".join([f"{k}: {v}" for k, v in changes.items()])
            }
            
            # Render prompt
            prompt = self.prompt_template.render(variables)
            
            # Call LLM
            from app.llm.base import ChatCompletionRequest, ChatMessage
            
            chat_request = ChatCompletionRequest(
                messages=[
                    ChatMessage(role="user", content=prompt)
                ],
                temperature=0.2,  # Low temperature for analytical tasks
                max_tokens=1500
            )
            
            response = await llm_gateway.chat_completion(chat_request)
            
            # Parse response
            analysis_text = response.choices[0]["message"]["content"]
            result = self._parse_root_cause_response(analysis_text)
            
            logger.info(f"✅ Root cause analysis completed for {campaign_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_performance_drop: {e}")
            raise
    
    async def analyze_creative_fatigue(
        self,
        ad_id: str,
        lookback_days: int = 30
    ) -> RootCauseResult:
        """
        Analyzes if an ad is experiencing creative fatigue
        
        Args:
            ad_id: Ad ID
            lookback_days: Days to look back
            
        Returns:
            RootCauseResult with analysis
        """
        try:
            from datetime import timedelta
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=lookback_days)
            
            # Split into weeks for trend analysis
            weeks = []
            current_start = start_date
            
            while current_start < end_date:
                current_end = min(current_start + timedelta(days=7), end_date)
                
                week_data = await self._get_weekly_performance(ad_id, current_start, current_end)
                weeks.append(week_data)
                
                current_start = current_end
            
            # Analyze trends
            declining = self._analyze_declining_trend(weeks, ["ctr", "conversions", "engagement"])
            
            # Prepare variables
            variables = {
                "problem_description": f"Creative fatigue analysis for ad {ad_id}",
                "campaign_name": f"Ad {ad_id}",
                "date_range": f"{start_date} to {end_date}",
                "changes_made": f"Week-over-week performance: {declining}"
            }
            
            # Render prompt
            prompt = self.prompt_template.render(variables)
            
            # Call LLM
            chat_request = ChatCompletionRequest(
                messages=[
                    ChatMessage(role="user", content=prompt)
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            response = await llm_gateway.chat_completion(chat_request)
            
            # Parse response
            analysis_text = response.choices[0]["message"]["content"]
            result = self._parse_root_cause_response(analysis_text)
            
            logger.info(f"✅ Creative fatigue analysis completed for {ad_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_creative_fatigue: {e}")
            raise
    
    async def _get_weekly_performance(self, ad_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Gets weekly performance data for an ad"""
        kpi_data = await KPIService.get_kpi_for_entity(
            entity_type="ad",
            entity_id=ad_id,
            start_date=start_date,
            end_date=end_date
        )
        
        if kpi_data["status"] == "success":
            return {
                "week": f"{start_date} to {end_date}",
                "data": kpi_data["data"]
            }
        else:
            return {
                "week": f"{start_date} to {end_date}",
                "data": {},
                "error": kpi_data.get("message")
            }
    
    def _analyze_declining_trend(self, weeks: List[Dict], metrics: List[str]) -> str:
        """Analyzes if metrics are declining over weeks"""
        if len(weeks) < 2:
            return "Insufficient data for trend analysis"
        
        declining = []
        
        for metric in metrics:
            values = []
            for week in weeks:
                data = week.get("data", {})
                value = float(data.get(metric, 0) or 0)
                values.append(value)
            
            if len(values) >= 2 and all(values[i] >= values[i+1] for i in range(len(values)-1)):
                declining.append(f"{metric} declining: {values}")
            elif len(values) >= 2 and values[0] > values[-1]:
                declining.append(f"{metric} overall decline: {values[0]:.2f} -> {values[-1]:.2f}")
        
        return "; ".join(declining) if declining else "No significant declining trends"
    
    def _parse_root_cause_response(self, response_text: str) -> RootCauseResult:
        """Parses root cause analysis response"""
        # Try JSON extraction first
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return RootCauseResult(**data)
            except:
                pass
        
        # Parse structured text
        lines = response_text.split('\n')
        
        problem_summary = ""
        likely_causes = []
        evidence = []
        validation_steps = []
        priority_action = ""
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            lower = line.lower()
            
            # Identify sections
            if "zusammenfassung" in lower or "problem" in lower or "zusammen" in lower:
                current_section = "summary"
                continue
            elif "ursache" in lower or "cause" in lower:
                current_section = "causes"
                continue
            elif "beweis" in lower or "evidence" in lower or "indiz" in lower:
                current_section = "evidence"
                continue
            elif "validierung" in lower or "validation" in lower or "überprüfung" in lower:
                current_section = "validation"
                continue
            elif "priorität" in lower or "priority" in lower or "aktion" in lower:
                current_section = "priority"
                continue
            
            # Add to current section
            if current_section == "summary" and line:
                problem_summary += line + " "
            elif current_section == "causes" and line.startswith("-"):
                likely_causes.append({
                    "cause": line.strip("- ").strip(),
                    "probability": "medium"
                })
            elif current_section == "evidence" and line.startswith("-"):
                evidence.append(line.strip("- ").strip())
            elif current_section == "validation" and line.startswith("-"):
                validation_steps.append(line.strip("- ").strip())
            elif current_section == "priority" and line:
                priority_action = line
        
        # Defaults if nothing parsed
        if not likely_causes:
            likely_causes = [{
                "cause": "Insufficient data or time for analysis",
                "probability": "high"
            }]
        
        if not evidence:
            evidence = ["Performance metrics indicate a change"]
        
        if not validation_steps:
            validation_steps = [
                "Monitor performance for 3-5 more days",
                "Check external factors (seasonality, competition)",
                "Review recent changes to campaign"
            ]
        
        if not priority_action:
            priority_action = "Continue monitoring and gather more data"
        
        return RootCauseResult(
            problem_summary=problem_summary.strip() or "Performance issue detected",
            likely_causes=likely_causes,
            evidence=evidence,
            validation_steps=validation_steps,
            priority_action=priority_action,
            confidence=0.7 if likely_causes else 0.5
        )


# Global agent instances
kpi_analysis_agent = KPIAnalysisAgent()
root_cause_agent = RootCauseAnalysisAgent()


async def initialize_agents():
    """Initialize all agents"""
    try:
        await kpi_analysis_agent.initialize()
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize kpi_analysis_agent: {e}")
    
    try:
        await root_cause_agent.initialize()
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize root_cause_agent: {e}")
    
    logger.info("✅ All marketing analysis agents initialized")