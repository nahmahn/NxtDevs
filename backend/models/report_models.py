from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, JSON, Relationship
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

if TYPE_CHECKING:
    from backend.models.user_state import User


class ReportStatus(str, Enum):
    """Status states for report generation."""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    GENERATED = "GENERATED"
    FAILED = "FAILED"


class UserReportBase(SQLModel):
    """Base fields for UserReport."""
    status: str = Field(default=ReportStatus.PENDING.value, index=True)
    report_data: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON)
    error_message: Optional[str] = Field(default=None)


class UserReport(UserReportBase, table=True):
    """
    Stores generated performance reports for users.
    Reports are generated asynchronously via Celery tasks.
    """
    __tablename__ = "userreport"
    
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    
    # Relationship back to user
    user: Optional["User"] = Relationship(back_populates="reports")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Report metadata
    report_type: str = Field(default="performance", description="Type of report: performance, topic_analysis, etc.")
    

class ReportRequest(SQLModel):
    """Request schema for generating a report."""
    report_type: str = Field(default="performance")


class ReportResponse(SQLModel):
    """Response schema for report generation."""
    id: UUID
    status: str
    created_at: datetime
    report_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


# Convenience constants for backwards compatibility
PENDING = ReportStatus.PENDING.value
GENERATING = ReportStatus.GENERATING.value
GENERATED = ReportStatus.GENERATED.value
FAILED = ReportStatus.FAILED.value
