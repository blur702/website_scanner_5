import logging
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
import time
import os

from app.api.routes import scan_router, search_router, regex_router, management_router, db_browser_router
from app.core.config import settings
from app.core.exceptions import WebsiteCheckerException
from app.core.database import init_db

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Website Checker API",
    description="API for checking websites for errors, performance issues, and more",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Exception handler
@app.exception_handler(WebsiteCheckerException)
async def website_checker_exception_handler(request: Request, exc: WebsiteCheckerException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "details": exc.details},
    )

# Include routers - API routes
app.include_router(scan_router, prefix=settings.API_PREFIX)
app.include_router(search_router, prefix=settings.API_PREFIX)
app.include_router(regex_router, prefix=settings.API_PREFIX)
app.include_router(management_router, prefix=settings.API_PREFIX)
app.include_router(db_browser_router, prefix=settings.API_PREFIX)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok", "timestamp": time.time()}

# API root endpoint - modified to use /api path
@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Welcome to the Website Checker API",
        "docs_url": "/docs",
        "version": "0.1.0"
    }

# Root endpoint should redirect to frontend
@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse("/index.html")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting Website Checker API on {settings.API_HOST}:{settings.API_PORT}")
    # Create necessary directories
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    logger.info(f"Storage directory: {settings.STORAGE_DIR}")
    
    # Initialize database
    init_db()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Website Checker API")

# Mount static files - this should be AFTER route definitions
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(static_dir):
    logger.info(f"Mounting frontend static files from: {static_dir}")
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found at: {static_dir}")
