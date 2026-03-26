import sys
import traceback
sys.path.insert(0, '.')

try:
    from app.api import api_router
    print("✅ api_router imported successfully")
except Exception as e:
    print(f"❌ Error importing api_router: {e}")
    traceback.print_exc()