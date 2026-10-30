"""SmartPark AI - Core Configuration"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Path to backend/.env file (robust across cwd)
_backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "SmartPark AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'smartpark.db')).replace('\\', '/')}"
    
    # JWT
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    
    # Razorpay
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    
    # Weather API (OpenWeatherMap)
    OPENWEATHER_API_KEY: Optional[str] = None
    WEATHER_API_KEY: Optional[str] = None
    WEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5"
    
    # OSRM Routing
    OSRM_API_URL: str = "https://router.project-osrm.org"
    
    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    @property
    def is_demo_mode(self) -> bool:
        return self.RAZORPAY_KEY_ID is None
    
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def effective_weather_api_key(self) -> Optional[str]:
        return self.OPENWEATHER_API_KEY or self.WEATHER_API_KEY

    def model_post_init(self, __context) -> None:
        # Keep both OPENWEATHER_API_KEY and WEATHER_API_KEY in sync
        if not self.WEATHER_API_KEY and self.OPENWEATHER_API_KEY:
            self.WEATHER_API_KEY = self.OPENWEATHER_API_KEY
        elif not self.OPENWEATHER_API_KEY and self.WEATHER_API_KEY:
            self.OPENWEATHER_API_KEY = self.WEATHER_API_KEY

    model_config = SettingsConfigDict(
        env_file=(_backend_env_path, ".env"),
        extra="ignore",
        case_sensitive=False
    )


settings = Settings()

