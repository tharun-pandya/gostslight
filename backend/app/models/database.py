from sqlalchemy import create_engine, Column, String, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker
from ..config import settings

Base = declarative_base()

class Obj(Base):
    """Every private record is an AES-GCM blob. Only random ids + kind are plaintext."""
    __tablename__ = "objects"
    id = Column(String, primary_key=True)
    kind = Column(String, index=True)
    story_id = Column(String, index=True, nullable=True)
    blob = Column(LargeBinary)

_engine = None; _Session = None
def init_db():
    global _engine, _Session
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "audio").mkdir(exist_ok=True)
    _engine = create_engine(f"sqlite:///{settings.data_dir / 'ghostlight.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(_engine)
    _Session = sessionmaker(_engine, expire_on_commit=False)
def dispose_db():
    global _engine, _Session
    if _engine: _engine.dispose()
    _engine = None; _Session = None
def db():
    if _Session is None: init_db()
    return _Session()
