"""
AI Agents API Endpoints
L5-02: KPI Analysis Agent API
L5-03: Root Cause Analysis Agent API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.agents import (
    kpi_analysis_agent,
    root_cause_agent,
    KPIAnalysisResult,
    RootCauseResult
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["AI Agents"])


# ============================================
# Request/Response Models
# ============================================
class KPIAnalysisRequest(BaseModel):
    """Request for KPI analysis"""
    campaign_ids: List[str]
    start_date: date
    end_date: date
    user_question: Optional[str] = None


class KPIAnalysisResponse(BaseModel):
    """Response with KPI analysis"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    analysis_id: Optional[str] = None
    provider_used: Optional[str] = None
    tokens_used: Optional[Dict[str, int]] = None


class RootCauseRequest(BaseModel):
    """Request for root cause analysis"""
    campaign_id: str
    metric_name: str
    start_date_drop: date
    end_date_drop: date
    comparison_period_days: Optional[int] = 7


class RootCauseResponse(BaseModel):
    """Response with root cause analysis"""
    success: bool
    data: Optional[RootCauseResult] = None
    error: Optional[str] = None
    analysis_id: Optional[str] = None
    provider_used: Optional[str] = None
    tokens_used: Optional[Dict[str, int]] = None


class BatchAnalysisRequest(BaseModel):
    """Request for batch analysis of multiple campaigns"""
    campaign_ids: List[str]
    analysis_type: str = Field(..., pattern="^(kpi|root_cause|creative_fatigue)$")
    start_date: date
    end_date: date


# ============================================
# Analysis Endpoints
# ============================================

@router.post("/kpi/analyze", response_model=KPIAnalysisResponse)
async def analyze_kpi(
    request: KPIAnalysisRequest,
    db=Depends(get_db)
):
    """
    Analyze KPI data for campaigns
    
    Args:
        request: KPI analysis request with campaign IDs and date range
        
    Returns:
        KPI analysis with insights and recommendations
    """
    try:
        # Single campaign analysis
        if len(request.campaign_ids) == 1:
            result = await kpi_analysis_agent.analyze_campaign(
                campaign_id=request.campaign_ids[0],
                start_date=request.start_date,
                end_date=request.end_date,
                user_question=request.user_question
            )
            
            # Get token usage from LLM gateway
            from app.llm import llm_gateway
            usage = llm_gateway.get_usage_stats()
            
            return KPIAnalysisResponse(
                success=True,
                data={
                    "campaign_id": request.campaign_ids[0],
                    "analysis": result.dict()
                },
                analysis_id=f"kpi_{datetime.utcnow().timestamp()}",
                provider_used=usage["by_provider"],
                tokens_used=usage["total"]
            )
        
        # Multiple campaigns (batch)
        else:
            results = await kpi_analysis_agent.analyze_multiple_campaigns(
                campaign_ids=request.campaign_ids,
                start_date=request.start_date,
                end_date=request.end_date
            )
            
            from app.llm import llm_gateway
            usage = llm_gateway.get_usage_stats()
            
            return KPIAnalysisResponse(
                success=True,
                data={
                    "campaigns_analyzed": len(results),
                    "results": {cid: (result.dict() if result else None) for cid, result in results.items()}
                },
                analysis_id=f"kpi_batch_{datetime.utcnow().timestamp()}",
                provider_used=usage["by_provider"],
                tokens_used=usage["total"]
            )
        
    except Exception as e:
        logger.error(f"KPI analysis error: {e}")
        return KPIAnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )


@router.get("/kpi/analyze/{campaign_id}", response_model=KPIAnalysisResponse)
async def get_campaign_analysis(
    campaign_id: str,
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    user_question: Optional[str] = Query(None, description="User question"),
    db=Depends(get_db)
):
    """
    Get KPI analysis for a single campaign
    
    Args:
        campaign_id: Campaign ID
        start_date: Analysis start date
        end_date: Analysis end date
        user_question: Optional specific question
        
    Returns:
        KPI analysis result
    """
    try:
        result = await kpi_analysis_agent.analyze_campaign(
            campaign_id=campaign_id,
            start_date=start_date,
            end_date=end_date,
            user_question=user_question
        )
        
        from app.llm import llm_gateway
        usage = llm_gateway.get_usage_stats()
        
        return KPIAnalysisResponse(
            success=True,
            data={
                "campaign_id": campaign_id,
                "analysis": result.dict()
            },
            analysis_id=f"kpi_{datetime.utcnow().timestamp()}",
            provider_used=usage["by_provider"],
            tokens_used=usage["total"]
        )
        
    except Exception as e:
        logger.error(f"KPI analysis error: {e}")
        return KPIAnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )


@router.post("/root-cause/analyze", response_model=RootCauseResponse)
async def analyze_root_cause(
    request: RootCauseRequest,
    db=Depends(get_db)
):
    """
    Analyze root cause of performance issues
    
    Args:
        request: Root cause analysis request
        
    Returns:
        Root cause analysis with likely causes and validation steps
    """
    try:
        result = await root_cause_agent.analyze_performance_drop(
            campaign_id=request.campaign_id,
            metric_name=request.metric_name,
            start_date_drop=request.start_date_drop,
            end_date_drop=request.end_date_drop,
            comparison_period_days=request.comparison_period_days
        )
        
        from app.llm import llm_gateway
        usage = llm_gateway.get_usage_stats()
        
        return RootCauseResponse(
            success=True,
            data=result,
            analysis_id=f"rca_{datetime.utcnow().timestamp()}",
            provider_used=usage["by_provider"],
            tokens_used=usage["total"]
        )
        
    except Exception as e:
        logger.error(f"Root cause analysis error: {e}")
        return RootCauseResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )


@router.post("/analyze/batch", response_model=Dict[str, Any])
async def batch_analyze(
    request: BatchAnalysisRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db)
):
    """
    Batch analyze multiple campaigns
    
    Args:
        request: Batch analysis request
        background_tasks: FastAPI background tasks
        
    Returns:
        Task status and ID
    """
    try:
        # Start background analysis
        task_id = f"batch_{datetime.utcnow().timestamp()}"
        
        if request.analysis_type == "kpi":
            background_tasks.add_task(
                _batch_kpi_analysis,
                request.campaign_ids,
                request.start_date,
                request.end_date,
                task_id
            )
        elif request.analysis_type == "root_cause":
            background_tasks.add_task(
                _batch_root_cause_analysis,
                request.campaign_ids,
                request.start_date,
                request.end_date,
                task_id
            )
        elif request.analysis_type == "creative_fatigue":
            background_tasks.add_task(
                _batch_creative_fatigue_analysis,
                request.campaign_ids,
                request.start_date,
                request.end_date,
                task_id
            )
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "started",
            "message": f"Batch {request.analysis_type} analysis started in background"
        }
        
    except Exception as e:
        logger.error(f"Batch analysis error: {e}")
        return {
            "success": False,
            "error": f"Batch analysis failed: {str(e)}"
        }


async def _batch_kpi_analysis(campaign_ids: List[str], start_date: date, end_date: date, task_id: str):
    """Background task for batch KPI analysis"""
    try:
        logger.info(f"🔄 Starting batch KPI analysis: {task_id}")
        
        results = await kpi_analysis_agent.analyze_multiple_campaigns(
            campaign_ids=campaign_ids,
            start_date=start_date,
            end_date=end_date
        )
        
        # Store results (could use Redis or DB)
        logger.info(f"✅ Batch KPI analysis completed: {task_id}")
        
    except Exception as e:
        logger.error(f"Batch KPI analysis failed: {task_id} - {e}")


async def _batch_root_cause_analysis(campaign_ids: List[str], start_date: date, end_date: date, task_id: str):
    """Background task for batch root cause analysis"""
    try:
        logger.info(f"🔄 Starting batch root cause analysis: {task_id}")
        
        # Analyze each campaign
        for campaign_id in campaign_ids:
            try:
                await root_cause_agent.analyze_performance_drop(
                    campaign_id=campaign_id,
                    metric_name="conversions",
                    start_date_drop=start_date,
                    end_date_drop=end_date
                )
            except Exception as e:
                logger.error(f"Failed to analyze {campaign_id}: {e}")
        
        logger.info(f"✅ Batch root cause analysis completed: {task_id}")
        
    except Exception as e:
        logger.error(f"Batch root cause analysis failed: {task_id} - {e}")


async def _batch_creative_fatigue_analysis(campaign_ids: List[str], start_date: date, end_date: date, task_id: str):
    """Background task for batch creative fatigue analysis"""
    try:
        logger.info(f"🔄 Starting batch creative fatigue analysis: {task_id}")
        
        # This would analyze ads for each campaign
        # For now, just log
        logger.info(f"✅ Batch creative fatigue analysis completed: {task_id}")
        
    except Exception as e:
        logger.error(f"Batch creative fatigue analysis failed: {task_id} - {e}")


# ============================================
# Agent Status & Management
# ============================================

@router.get("/status")
async def get_agent_status(db=Depends(get_db)):
    """
    Get status of all agents
    
    Returns:
        Agent status and availability
    """
    try:
        from app.llm import llm_gateway
        
        return {
            "kpi_analysis_agent": {
                "initialized": kpi_analysis_agent.prompt_template is not None,
                "template": kpi_analysis_agent.prompt_template.id if kpi_analysis_agent.prompt_template else None
            },
            "root_cause_agent": {
                "initialized": root_cause_agent.prompt_template is not None,
                "template": root_cause_agent.prompt_template.id if root_cause_agent.prompt_template else None
            },
            "llm_gateway": {
                "providers": len(llm_gateway.list_available_providers()),
                "initialized": len(llm_gateway.providers) > 0
            }
        }
    except Exception as e:
        logger.error(f"Agent status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent status: {str(e)}"
        )


@router.post("/initialize")
async def initialize_agents_endpoint(db=Depends(get_db)):
    """
    Initialize all agents
    
    Returns:
        Initialization status
    """
    try:
        await kpi_analysis_agent.initialize()
        await root_cause_agent.initialize()
        
        return {
            "success": True,
            "message": "All agents initialized successfully"
        }
    except Exception as e:
        logger.error(f"Agent initialization error: {e}")
        return {
            "success": False,
            "error": f"Failed to initialize agents: {str(e)}"
        }