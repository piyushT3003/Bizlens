from app.db.base import Base
from app.db.session import engine
import app.db.models  # Ensure all models are imported so Base.metadata knows them


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully.")
