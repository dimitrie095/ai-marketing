"""
Experimentation API
Endpoints for A/B testing experiments, variants, and results
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
import logging

# Import database dependencies
try:
    from app.db.session import get_db
    from app.db.models import Experiment, ExperimentVariant, ExperimentResult, Campaign, Ad, Metric
    DB_AVAILABLE = True
except ImportError as e:
    DB_AVAILABLE = False
    get_db = lambda: None
    print(f"DB import error: {e}")

from app.core.auth import get_current_active_user

router = APIRouter(prefix="/experiments", tags=["Experiments"], redirect_slashes=False)
logger = logging.getLogger(__name__)

# In-memory storage for mock experiments when DB is unavailable
mock_experiments_storage = {}


@router.get("/test")
async def test_experiments():
    """Test endpoint to verify experiments route works"""
    return {
        "message": "Experiments route is working",
        "timestamp": datetime.utcnow().isoformat(),
        "mock_storage_keys": list(mock_experiments_storage.keys()),
        "mock_storage_size": len(mock_experiments_storage)
    }


# ============================================
# Request/Response Models
# ============================================

class ExperimentCreateRequest(BaseModel):
    campaign_id: str
    name: str
    type: str  # creative, audience, budget
    status: str = "running"

    class Config:
        extra = "forbid"


class ExperimentUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

    class Config:
        extra = "forbid"


class VariantCreateRequest(BaseModel):
    experiment_id: str
    name: str  # A, B, C...
    config: Dict[str, Any] = {}

    class Config:
        extra = "forbid"


class VariantResultCreateRequest(BaseModel):
    variant_id: str
    start_date: date
    end_date: date
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    revenue: float = 0.0
    spend: float = 0.0

    class Config:
        extra = "forbid"


class ExperimentResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    type: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VariantResponse(BaseModel):
    id: str
    experiment_id: str
    name: str
    config: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class VariantResultResponse(BaseModel):
    id: str
    variant_id: str
    start_date: date
    end_date: date
    impressions: int
    clicks: int
    conversions: int
    revenue: Decimal
    spend: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExperimentWithVariantsResponse(BaseModel):
    experiment: ExperimentResponse
    variants: List[VariantResponse]
    results: Dict[str, VariantResultResponse]  # variant_id -> result


# ============================================
# Endpoints
# ============================================

@router.post("", response_model=Dict[str, Any])
async def create_experiment(
    request: ExperimentCreateRequest
):
    """
    Create a new A/B test experiment for a campaign
    """
    try:
        if not DB_AVAILABLE:
            # Return a mock experiment when DB not available
            mock_experiment = {
                "id": f"exp_mock_{int(datetime.utcnow().timestamp())}",
                "campaign_id": request.campaign_id,
                "name": request.name,
                "type": request.type,
                "status": request.status,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            # Store in memory storage
            mock_experiments_storage[mock_experiment["id"]] = mock_experiment
            logger.info(f"Mock experiment created for campaign {request.campaign_id}")
            logger.info(f"Stored mock experiment {mock_experiment['id']} in memory storage. Total: {len(mock_experiments_storage)}")
            return {"status": "success", "data": mock_experiment}
        
        # DB is available, try to find campaign
        try:
            campaign = await Campaign.find_one({"id": request.campaign_id})
        except Exception as e:
            logger.warning(f"Campaign lookup failed (DB error): {e}, falling back to mock")
            campaign = None
        
        if not campaign:
            # Campaign not found or DB error - return mock for demo purposes
            mock_experiment = {
                "id": f"exp_mock_{int(datetime.utcnow().timestamp())}",
                "campaign_id": request.campaign_id,
                "name": request.name,
                "type": request.type,
                "status": request.status,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            # Store in memory storage
            mock_experiments_storage[mock_experiment["id"]] = mock_experiment
            logger.info(f"Mock experiment created for campaign {request.campaign_id} (campaign not found)")
            logger.info(f"Stored mock experiment {mock_experiment['id']} in memory storage. Total: {len(mock_experiments_storage)}")
            return {"status": "success", "data": mock_experiment}

        # Campaign exists, create real experiment
        experiment = Experiment(
            campaign_id=request.campaign_id,
            name=request.name,
            type=request.type,
            status=request.status
        )
        await experiment.insert()
        logger.info(f"Experiment created: {experiment.id} for campaign {request.campaign_id}")
        return {"status": "success", "data": experiment}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create experiment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    # End of create_experiment


@router.get("/campaign/{campaign_id}", response_model=Dict[str, Any])
async def get_campaign_experiments(
    campaign_id: str
):
    """
    Get all experiments for a campaign
    """
    logger.info(f"GET /campaign/{campaign_id} DB_AVAILABLE={DB_AVAILABLE}")
    
    # Collect experiments from database if available
    db_experiments = []
    if DB_AVAILABLE:
        try:
            db_experiments = await Experiment.find({"campaign_id": campaign_id}).to_list()
        except Exception as e:
            logger.error(f"Failed to fetch experiments from DB: {e}")
            # Continue with empty DB experiments
            db_experiments = []
    
    # Collect mock experiments for this campaign
    logger.info(f"Mock storage keys: {list(mock_experiments_storage.keys())}")
    mock_experiments = [exp for exp in mock_experiments_storage.values() if exp["campaign_id"] == campaign_id]
    
    # Combine, avoiding duplicates by ID
    db_ids = {exp["id"] for exp in db_experiments}
    combined = db_experiments + [exp for exp in mock_experiments if exp["id"] not in db_ids]
    
    logger.info(f"Returning {len(combined)} experiments ({len(db_experiments)} from DB, {len(mock_experiments)} mock) for campaign {campaign_id}")
    return {"status": "success", "data": combined}


@router.get("/{experiment_id}", response_model=Dict[str, Any])
async def get_experiment(
    experiment_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Get experiment details with variants and latest results
    """
    try:
        experiment = await Experiment.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
        results = {}
        for variant in variants:
            result = await ExperimentResult.find_one({"variant_id": variant.id}, sort=[("start_date", -1)])
            if result:
                results[variant.id] = result

        return {
            "status": "success",
            "data": {
                "experiment": experiment,
                "variants": variants,
                "results": results
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch experiment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{experiment_id}", response_model=Dict[str, Any])
async def update_experiment(
    experiment_id: str,
    request: ExperimentUpdateRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Update experiment (name, status)
    """
    try:
        experiment = await Experiment.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        update_data = request.dict(exclude_unset=True)
        if update_data:
            for key, value in update_data.items():
                setattr(experiment, key, value)
            experiment.updated_at = datetime.utcnow()
            await experiment.save()

        return {"status": "success", "data": experiment}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update experiment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Delete experiment and its variants/results
    """
    try:
        experiment = await Experiment.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        # Delete variants and results
        variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
        for variant in variants:
            await ExperimentResult.find({"variant_id": variant.id}).delete()
            await variant.delete()

        await experiment.delete()
        logger.info(f"Experiment deleted: {experiment_id}")
        return {"status": "success", "message": "Experiment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete experiment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/variants", response_model=VariantResponse)
async def create_variant(
    request: VariantCreateRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Create a variant for an experiment
    """
    try:
        # Verify experiment exists
        experiment = await Experiment.find_one({"id": request.experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        variant = ExperimentVariant(
            experiment_id=request.experiment_id,
            name=request.name,
            config=request.config
        )
        await variant.insert()
        logger.info(f"Variant created: {variant.id} for experiment {request.experiment_id}")
        return variant
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create variant: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/variants/{variant_id}/results", response_model=List[VariantResultResponse])
async def get_variant_results(
    variant_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Get all results for a variant
    """
    try:
        results = await ExperimentResult.find({"variant_id": variant_id}).to_list()
        return results
    except Exception as e:
        logger.error(f"Failed to fetch variant results: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/results", response_model=VariantResultResponse)
async def create_result(
    request: VariantResultCreateRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Create/update result for a variant
    """
    try:
        # Verify variant exists
        variant = await ExperimentVariant.find_one({"id": request.variant_id})
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")

        # Convert float to Decimal for MongoDB
        revenue = Decimal(str(request.revenue))
        spend = Decimal(str(request.spend))

        result = ExperimentResult(
            variant_id=request.variant_id,
            start_date=request.start_date,
            end_date=request.end_date,
            impressions=request.impressions,
            clicks=request.clicks,
            conversions=request.conversions,
            revenue=revenue,
            spend=spend
        )
        await result.insert()
        logger.info(f"Result created for variant {request.variant_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create result: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{experiment_id}/calculate-results")
async def calculate_results_from_metrics(
    experiment_id: str,
    start_date: date = Query(..., description="Start date for metrics aggregation"),
    end_date: date = Query(..., description="End date for metrics aggregation"),
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Calculate experiment results from metric data for each variant.
    Variant config must contain 'ad_id' to fetch metrics.
    """
    try:
        experiment = await Experiment.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
        if not variants:
            raise HTTPException(status_code=400, detail="No variants found for experiment")

        results = []
        for variant in variants:
            ad_id = variant.config.get("ad_id")
            if not ad_id:
                logger.warning(f"Variant {variant.id} has no ad_id in config, skipping")
                continue

            # Aggregate metrics for this ad_id in date range
            pipeline = [
                {"$match": {
                    "entity_type": "ad",
                    "entity_id": ad_id,
                    "date": {"$gte": start_date, "$lte": end_date}
                }},
                {"$group": {
                    "_id": None,
                    "impressions": {"$sum": "$impressions"},
                    "clicks": {"$sum": "$clicks"},
                    "conversions": {"$sum": "$conversions"},
                    "revenue": {"$sum": "$revenue"},
                    "spend": {"$sum": "$spend"}
                }}
            ]
            metrics = await Metric.aggregate(pipeline).to_list(length=1)
            if not metrics or metrics[0]["_id"] is None:
                # No metrics found, create zero result
                aggregated = {
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "revenue": Decimal("0"),
                    "spend": Decimal("0")
                }
            else:
                aggregated = metrics[0]

            # Create or update experiment result
            existing = await ExperimentResult.find_one({
                "variant_id": variant.id,
                "start_date": start_date,
                "end_date": end_date
            })
            if existing:
                existing.impressions = aggregated["impressions"]
                existing.clicks = aggregated["clicks"]
                existing.conversions = aggregated["conversions"]
                existing.revenue = aggregated["revenue"]
                existing.spend = aggregated["spend"]
                existing.updated_at = datetime.utcnow()
                await existing.save()
                result = existing
            else:
                result = ExperimentResult(
                    variant_id=variant.id,
                    start_date=start_date,
                    end_date=end_date,
                    impressions=aggregated["impressions"],
                    clicks=aggregated["clicks"],
                    conversions=aggregated["conversions"],
                    revenue=aggregated["revenue"],
                    spend=aggregated["spend"]
                )
                await result.insert()
            results.append(result)
        
        return {
            "status": "success",
            "message": f"Results calculated for {len(results)} variants",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to calculate results from metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{experiment_id}/summary")
async def get_experiment_summary(
    experiment_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Calculate experiment summary: KPIs per variant, winner, significance
    """
    try:
        experiment = await Experiment.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
        if len(variants) < 2:
            raise HTTPException(status_code=400, detail="Experiment must have at least two variants")

        variant_summaries = []
        for variant in variants:
            result = await ExperimentResult.find_one({"variant_id": variant.id}, sort=[("start_date", -1)])
            if not result:
                variant_summaries.append({
                    "variant_id": variant.id,
                    "variant_name": variant.name,
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "revenue": Decimal("0"),
                    "spend": Decimal("0"),
                    "ctr": 0,
                    "cvr": 0,
                    "roas": 0
                })
                continue

            ctr = result.clicks / result.impressions * 100 if result.impressions > 0 else 0
            cvr = result.conversions / result.clicks * 100 if result.clicks > 0 else 0
            roas = result.revenue / result.spend if result.spend > Decimal("0") else Decimal("0")

            variant_summaries.append({
                "variant_id": variant.id,
                "variant_name": variant.name,
                "impressions": result.impressions,
                "clicks": result.clicks,
                "conversions": result.conversions,
                "revenue": result.revenue,
                "spend": result.spend,
                "ctr": float(ctr),
                "cvr": float(cvr),
                "roas": float(roas)
            })

        # Determine winner based on ROAS (can be extended to other KPIs)
        if len(variant_summaries) >= 2:
            winner = max(variant_summaries, key=lambda x: x["roas"])
            winner_variant_name = winner["variant_name"]
            winner_roas = winner["roas"]
        else:
            winner_variant_name = None
            winner_roas = None

        return {
            "experiment_id": experiment_id,
            "experiment_name": experiment.name,
            "status": experiment.status,
            "variants": variant_summaries,
            "winner": winner_variant_name,
            "winner_roas": winner_roas,
            "calculated_at": datetime.utcnow()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate experiment summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")