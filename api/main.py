import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

from routers import salary, reports
from scheduler import check_expiring_items, check_low_stock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Africa/Johannesburg")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(check_expiring_items, "cron", hour=7, minute=0, id="expiring_items")
    scheduler.add_job(check_low_stock, "cron", hour=7, minute=5, id="low_stock")
    scheduler.start()
    logger.info("Scheduler started")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(title="Service Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(salary.router, prefix="/api/salary")
app.include_router(reports.router, prefix="/api/reports")


@app.get("/health")
def health():
    return {"status": "ok"}
