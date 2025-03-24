from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Dict, Any, Optional
import os

class Settings(BaseSettings):
    # API settings
    API_HOST: str = "localhost"
    API_PORT: int = 8000
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./website_checker.db"
    
    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]
    
    # Storage settings
    STORAGE_DIR: str = "./storage"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @field_validator("STORAGE_DIR", mode="before")
    @classmethod
    def create_storage_dir(cls, v):
        os.makedirs(v, exist_ok=True)
        return v
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 5
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Thread Pool Settings
    THREAD_POOL_MIN: int = 1
    THREAD_POOL_MAX: int = 16
    THREAD_POOL_DEFAULT: int = 4
    
    # File Storage
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")
    
    # Cache Settings
    CACHE_TTL: int = 300  # seconds
    
    # Test Configurations
    DEFAULT_TEST_CONFIG: Dict[str, Any] = {
        "max_urls": 100,
        "max_depth": 3,
        "user_agent": "WebsiteChecker/1.0",
        "timeout": 30,
        "verify_ssl": True,
        "follow_redirects": True,
        "screenshot_enabled": True,
    }
    
    # Update Config class to model_config for Pydantic v2
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }

# Create settings instance
settings = Settings()
