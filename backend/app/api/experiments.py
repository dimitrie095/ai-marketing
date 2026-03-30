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
import random

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


class VariantCreatePathRequest(BaseModel):
    """Used for POST /{experiment_id}/variants — experiment_id comes from the path."""
    name: str
    config: Dict[str, Any] = {}

    class Config:
        extra = "allow"


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
            campaign = await Campaign.find_one(Campaign.id == request.campaign_id)
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
        return {"status": "success", "data": {
            "id": experiment.id,
            "campaign_id": experiment.campaign_id,
            "name": experiment.name,
            "type": experiment.type,
            "status": experiment.status,
            "created_at": experiment.created_at,
            "updated_at": experiment.updated_at,
        }}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create experiment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    # End of create_experiment


@router.post("/{experiment_id}/variants", response_model=Dict[str, Any])
async def create_variant_for_experiment(
    experiment_id: str,
    request: VariantCreatePathRequest,
    db=Depends(get_db)
):
    """Create a variant directly under an experiment (no auth required for mock compat)."""
    try:
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
                if experiment:
                    variant = ExperimentVariant(
                        experiment_id=experiment_id,
                        name=request.name,
                        config=request.config
                    )
                    await variant.insert()
                    return {"status": "success", "data": {"id": variant.id, "experiment_id": experiment_id, "name": variant.name, "config": variant.config, "created_at": variant.created_at}}
            except Exception as e:
                logger.warning(f"DB variant creation failed: {e}")

        # Mock fallback
        mock = mock_experiments_storage.get(experiment_id)
        if mock:
            variant_id = f"var_mock_{int(datetime.utcnow().timestamp())}_{request.name}"
            variant_data = {"id": variant_id, "experiment_id": experiment_id, "name": request.name, "config": request.config, "created_at": datetime.utcnow()}
            if "variants" not in mock:
                mock["variants"] = []
            mock["variants"].append(variant_data)
            return {"status": "success", "data": variant_data}

        raise HTTPException(status_code=404, detail="Experiment not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create variant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{campaign_id}", response_model=Dict[str, Any])
async def get_campaign_experiments(
    campaign_id: str
):
    """
    Get all experiments for a campaign
    """
    logger.info(f"GET /campaign/{campaign_id} DB_AVAILABLE={DB_AVAILABLE}")
    
    # Collect experiments from database if available, serialized as dicts
    db_experiments = []
    if DB_AVAILABLE:
        try:
            raw = await Experiment.find({"campaign_id": campaign_id}).to_list()
            db_experiments = [
                {
                    "id": e.id,
                    "campaign_id": e.campaign_id,
                    "name": e.name,
                    "type": e.type,
                    "status": e.status,
                    "created_at": e.created_at,
                    "updated_at": e.updated_at,
                }
                for e in raw
            ]
        except Exception as e:
            logger.error(f"Failed to fetch experiments from DB: {e}")
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
        experiment = None
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
            except Exception:
                pass

        # Fall back to in-memory mock storage
        if not experiment:
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                return {"status": "success", "data": {"experiment": mock, "variants": [], "results": {}}}
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
        experiment = None
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
            except Exception:
                pass

        # Fall back to mock storage
        if not experiment:
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                if request.name is not None:
                    mock["name"] = request.name
                if request.status is not None:
                    mock["status"] = request.status
                mock["updated_at"] = datetime.utcnow()
                return {"status": "success", "data": mock}
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
        experiment = None
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
            except Exception:
                pass

        # Fall back to mock storage
        if not experiment:
            if experiment_id in mock_experiments_storage:
                del mock_experiments_storage[experiment_id]
                return {"status": "success", "message": "Experiment deleted"}
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


@router.patch("/{experiment_id}/status", response_model=Dict[str, Any])
async def update_experiment_status(
    experiment_id: str,
    status: str = Query(..., description="New status: running, paused, completed"),
    db=Depends(get_db)
):
    """Update experiment status without requiring full auth."""
    valid = {"running", "paused", "completed"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    try:
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
                if experiment:
                    experiment.status = status
                    experiment.updated_at = datetime.utcnow()
                    await experiment.save()
                    return {"status": "success", "data": experiment}
            except Exception as e:
                logger.warning(f"DB status update failed: {e}")

        mock = mock_experiments_storage.get(experiment_id)
        if mock:
            mock["status"] = status
            mock["updated_at"] = datetime.utcnow()
            return {"status": "success", "data": mock}

        raise HTTPException(status_code=404, detail="Experiment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{experiment_id}/run", response_model=Dict[str, Any])
async def run_experiment(
    experiment_id: str,
    db=Depends(get_db)
):
    """
    Execute an experiment: auto-generate simulated metrics for all variants,
    store the results, and return the summary.
    """
    try:
        # 1. Fetch variants
        variants = []
        if DB_AVAILABLE:
            try:
                raw = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
                variants = [{"id": str(v.id), "name": v.name} for v in raw]
            except Exception as e:
                logger.warning(f"DB variant fetch failed during run: {e}")

        if not variants:
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                variants = [{"id": v.get("id", v["name"]), "name": v["name"]} for v in mock.get("variants", [])]

        if not variants:
            raise HTTPException(status_code=404, detail="Experiment oder Varianten nicht gefunden")

        # 2. Generate simulated metrics per variant
        #    Variant A = control (baseline), Variant B = test (random uplift/downlift)
        base_impressions = random.randint(10000, 30000)
        base_ctr = random.uniform(0.025, 0.07)
        base_cvr = random.uniform(0.03, 0.10)
        base_aov = random.uniform(45.0, 120.0)
        base_cpc = random.uniform(0.35, 1.20)

        generated = []
        for i, variant in enumerate(variants):
            if i == 0:
                # Control: use base values
                factor = 1.0
            else:
                # Test variant: random ±25%
                factor = random.uniform(0.75, 1.30)

            impressions = int(base_impressions * random.uniform(0.92, 1.08))
            ctr = base_ctr * factor * random.uniform(0.95, 1.05)
            clicks = max(1, int(impressions * ctr))
            cvr = base_cvr * factor * random.uniform(0.95, 1.05)
            conversions = max(0, int(clicks * cvr))
            revenue = round(conversions * base_aov * random.uniform(0.90, 1.10), 2)
            spend = round(clicks * base_cpc * random.uniform(0.90, 1.10), 2)

            generated.append({
                "variant_name": variant["name"],
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conversions,
                "revenue": revenue,
                "spend": spend,
            })

        # 3. Persist results
        today = datetime.utcnow().date()
        for item in generated:
            vname = item["variant_name"]
            if DB_AVAILABLE:
                try:
                    raw_v = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
                    db_variant = next((v for v in raw_v if v.name == vname), None)
                    if db_variant:
                        existing = await ExperimentResult.find_one({"variant_id": db_variant.id})
                        if existing:
                            existing.impressions = item["impressions"]
                            existing.clicks = item["clicks"]
                            existing.conversions = item["conversions"]
                            existing.revenue = Decimal(str(item["revenue"]))
                            existing.spend = Decimal(str(item["spend"]))
                            existing.updated_at = datetime.utcnow()
                            await existing.save()
                        else:
                            res = ExperimentResult(
                                variant_id=db_variant.id,
                                start_date=today,
                                end_date=today,
                                impressions=item["impressions"],
                                clicks=item["clicks"],
                                conversions=item["conversions"],
                                revenue=Decimal(str(item["revenue"])),
                                spend=Decimal(str(item["spend"])),
                            )
                            await res.insert()
                except Exception as e:
                    logger.warning(f"DB result persist failed for {vname}: {e}")

            # Always write to mock storage as fallback / override
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                if "results" not in mock:
                    mock["results"] = {}
                mock["results"][vname] = {**item, "updated_at": datetime.utcnow().isoformat()}

        # 4. Update status to "running"
        if DB_AVAILABLE:
            try:
                exp = await Experiment.find_one(Experiment.id == experiment_id)
                if exp:
                    exp.status = "running"
                    exp.updated_at = datetime.utcnow()
                    await exp.save()
            except Exception as e:
                logger.warning(f"DB status update failed: {e}")
        mock = mock_experiments_storage.get(experiment_id)
        if mock:
            mock["status"] = "running"

        return {
            "status": "success",
            "message": "Experiment wurde ausgeführt. Simulierte Ergebnisse generiert.",
            "data": generated,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"run_experiment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{experiment_id}/variants", response_model=Dict[str, Any])
async def list_experiment_variants(
    experiment_id: str,
    db=Depends(get_db)
):
    """List all variants for an experiment."""
    try:
        variants = []
        if DB_AVAILABLE:
            try:
                variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
                variants = [{"id": v.id, "experiment_id": v.experiment_id, "name": v.name, "config": v.config, "created_at": v.created_at} for v in variants]
            except Exception as e:
                logger.warning(f"DB variant fetch failed: {e}")

        if not variants:
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                variants = mock.get("variants", [])

        return {"status": "success", "data": variants}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{experiment_id}/results/manual", response_model=Dict[str, Any])
async def record_variant_result_manual(
    experiment_id: str,
    variant_name: str = Query(...),
    impressions: int = Query(0),
    clicks: int = Query(0),
    conversions: int = Query(0),
    revenue: float = Query(0.0),
    spend: float = Query(0.0),
    db=Depends(get_db)
):
    """Record manual metrics for a variant by name."""
    try:
        today = datetime.utcnow().date()
        if DB_AVAILABLE:
            try:
                variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
                variant = next((v for v in variants if v.name == variant_name), None)
                if variant:
                    existing = await ExperimentResult.find_one({"variant_id": variant.id})
                    if existing:
                        existing.impressions = impressions
                        existing.clicks = clicks
                        existing.conversions = conversions
                        existing.revenue = Decimal(str(revenue))
                        existing.spend = Decimal(str(spend))
                        existing.updated_at = datetime.utcnow()
                        await existing.save()
                        return {"status": "success", "message": "Result updated"}
                    else:
                        result = ExperimentResult(
                            variant_id=variant.id,
                            start_date=today,
                            end_date=today,
                            impressions=impressions,
                            clicks=clicks,
                            conversions=conversions,
                            revenue=Decimal(str(revenue)),
                            spend=Decimal(str(spend))
                        )
                        await result.insert()
                        return {"status": "success", "message": "Result recorded"}
            except Exception as e:
                logger.warning(f"DB result recording failed: {e}")

        # Mock fallback
        mock = mock_experiments_storage.get(experiment_id)
        if mock:
            if "results" not in mock:
                mock["results"] = {}
            mock["results"][variant_name] = {
                "impressions": impressions, "clicks": clicks,
                "conversions": conversions, "revenue": revenue, "spend": spend,
                "updated_at": datetime.utcnow().isoformat()
            }
            return {"status": "success", "message": "Result recorded (mock)"}

        raise HTTPException(status_code=404, detail="Experiment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        experiment = await Experiment.find_one(Experiment.id == request.experiment_id)
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
        variant = await ExperimentVariant.find_one(ExperimentVariant.id == request.variant_id)
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
        experiment = await Experiment.find_one(Experiment.id == experiment_id)
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
        experiment = None
        if DB_AVAILABLE:
            try:
                experiment = await Experiment.find_one(Experiment.id == experiment_id)
            except Exception:
                pass

        # Fall back to in-memory mock storage
        if not experiment:
            mock = mock_experiments_storage.get(experiment_id)
            if mock:
                mock_variants = mock.get("variants", [])
                mock_results = mock.get("results", {})
                variant_summaries = []
                for v in mock_variants:
                    r = mock_results.get(v["name"], {})
                    imp = r.get("impressions", 0)
                    clk = r.get("clicks", 0)
                    conv = r.get("conversions", 0)
                    rev = float(r.get("revenue", 0))
                    spd = float(r.get("spend", 0))
                    ctr = clk / imp * 100 if imp > 0 else 0
                    cvr = conv / clk * 100 if clk > 0 else 0
                    roas = rev / spd if spd > 0 else 0
                    variant_summaries.append({
                        "variant_id": v.get("id", v["name"]),
                        "variant_name": v["name"],
                        "impressions": imp,
                        "clicks": clk,
                        "conversions": conv,
                        "revenue": rev,
                        "spend": spd,
                        "ctr": ctr,
                        "cvr": cvr,
                        "roas": roas,
                    })
                winner_name = None
                winner_roas = None
                if len(variant_summaries) >= 2:
                    w = max(variant_summaries, key=lambda x: x["roas"])
                    winner_name = w["variant_name"]
                    winner_roas = w["roas"]
                return {
                    "status": "success",
                    "data": {
                        "experiment_id": experiment_id,
                        "experiment_name": mock["name"],
                        "status": mock["status"],
                        "variants": variant_summaries,
                        "winner": winner_name,
                        "winner_roas": winner_roas,
                        "note": None if variant_summaries else "Dieses Experiment hat noch keine Varianten oder Ergebnisse.",
                        "calculated_at": datetime.utcnow(),
                    }
                }
            raise HTTPException(status_code=404, detail="Experiment not found")

        variants = await ExperimentVariant.find({"experiment_id": experiment_id}).to_list()
        if len(variants) < 2:
            # Return empty summary instead of error, so UI can show a meaningful state
            return {
                "status": "success",
                "data": {
                    "experiment_id": experiment_id,
                    "experiment_name": experiment.name,
                    "status": experiment.status,
                    "variants": [],
                    "winner": None,
                    "winner_roas": None,
                    "note": "Noch nicht genug Varianten für eine Auswertung (mind. 2 benötigt).",
                    "calculated_at": datetime.utcnow(),
                }
            }

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
            "status": "success",
            "data": {
                "experiment_id": experiment_id,
                "experiment_name": experiment.name,
                "status": experiment.status,
                "variants": variant_summaries,
                "winner": winner_variant_name,
                "winner_roas": winner_roas,
                "calculated_at": datetime.utcnow(),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate experiment summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")