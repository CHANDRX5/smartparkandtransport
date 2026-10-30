"""SmartPark AI - Pytest Test Suite Configuration & Fixtures."""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_smartpark.db"
os.environ["APP_ENV"] = "testing"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-12345"

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User

TEST_DATABASE_URL = "sqlite:///./test_smartpark.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_smartpark.db"):
        try:
            os.remove("./test_smartpark.db")
        except Exception:
            pass


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(db_session):
    admin = db_session.query(User).filter_by(email="admin_test@smartpark.ai").first()
    if not admin:
        admin = User(
            email="admin_test@smartpark.ai",
            username="admin_tester",
            hashed_password=hash_password("AdminPass123!"),
            full_name="Admin Tester",
            role="admin",
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return create_access_token({"sub": str(admin.id), "role": admin.role})


@pytest.fixture
def user_token(db_session):
    user = db_session.query(User).filter_by(email="user_test@smartpark.ai").first()
    if not user:
        user = User(
            email="user_test@smartpark.ai",
            username="user_tester",
            hashed_password=hash_password("UserPass123!"),
            full_name="Citizen Tester",
            role="citizen",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return create_access_token({"sub": str(user.id), "role": user.role})


@pytest.fixture
def operator1_token(db_session):
    op1 = db_session.query(User).filter_by(email="operator1@smartpark.ai").first()
    if not op1:
        op1 = User(
            email="operator1@smartpark.ai",
            username="operator1",
            hashed_password=hash_password("OpPass123!"),
            full_name="Facility Owner 1",
            role="operator",
            is_active=True
        )
        db_session.add(op1)
        db_session.commit()
        db_session.refresh(op1)
    return create_access_token({"sub": str(op1.id), "role": op1.role})


@pytest.fixture
def operator2_token(db_session):
    op2 = db_session.query(User).filter_by(email="operator2@smartpark.ai").first()
    if not op2:
        op2 = User(
            email="operator2@smartpark.ai",
            username="operator2",
            hashed_password=hash_password("OpPass123!"),
            full_name="Facility Owner 2",
            role="operator",
            is_active=True
        )
        db_session.add(op2)
        db_session.commit()
        db_session.refresh(op2)
    return create_access_token({"sub": str(op2.id), "role": op2.role})
