import sys
sys.path.insert(0, '.')
from app.main import app
from fastapi.routing import APIRoute

print('Total routes:', len(app.routes))
for route in app.routes:
    if isinstance(route, APIRoute):
        print(f'{route.path} [{route.methods}]')
    else:
        print(f'{type(route)}: {route}')

# Also check mounted routers
if hasattr(app, 'routes'):
    for route in app.routes:
        if hasattr(route, 'routes'):
            print(f'Subrouter: {route}')
            for subroute in route.routes:
                if isinstance(subroute, APIRoute):
                    print(f'  {subroute.path} [{subroute.methods}]')