from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, coupons, me, pois, reviews, stations

Base.metadata.create_all(bind=engine)

app = FastAPI(title="대전 트램 로컬 큐레이션 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)
app.include_router(pois.router)
app.include_router(coupons.router)
app.include_router(reviews.router)
app.include_router(auth.router)
app.include_router(me.router)


@app.get("/health")
def health():
    return {"status": "ok"}
