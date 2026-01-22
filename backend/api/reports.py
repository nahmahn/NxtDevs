"""
Reports API Endpoints for Axiom
Provides async report generation and retrieval.
Ported from NxtDevs report.py endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from sqlmodel import Session, select
from backend.core.db import get_session
from backend.core.auth import get_current_user
from backend.models.user_state import User
from backend.models.report_models import (
    UserReport, ReportStatus, ReportRequest, ReportResponse,
    PENDING, GENERATING, GENERATED, FAILED
)

router = APIRouter(prefix="/reports", tags=["Reports"])


class GenerateReportResponse(BaseModel):
    """Response for report generation request."""
    message: str
    report_id: UUID
    task_id: Optional[str] = None
    status: str
    status_url: str


class ReportListItem(BaseModel):
    """Single report item in list."""
    id: UUID
    status: str
    report_type: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class ReportListResponse(BaseModel):
    """Response for listing reports."""
    reports: List[ReportListItem]
    total: int


class ReportDetailResponse(BaseModel):
    """Detailed report response."""
    id: UUID
    user_id: UUID
    status: str
    report_type: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    report_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    request: ReportRequest = ReportRequest(),
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Start asynchronous generation of a performance report.
    
    The report will be generated in the background using Celery.
    Poll the status endpoint to check when it's ready.
    
    Args:
        request: Report type and options
        db: Database session
        user: Authenticated user
        
    Returns:
        Report ID and status information
    """
    try:
        # Create a new report entry
        report = UserReport(
            user_id=user.id,
            status=PENDING,
            report_type=request.report_type
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        
        task_id = None
        
        # Try to start Celery task
        try:
            from backend.services.celery_tasks import generate_report_task
            task = generate_report_task.delay(str(user.id), str(report.id))
            task_id = task.id
            print(f"Started Celery task {task_id} for report {report.id}")
        except Exception as e:
            print(f"Celery not available, falling back to sync generation: {e}")
            # Fallback: Generate synchronously (not recommended for production)
            try:
                from backend.services.celery_tasks import _generate_report_sync
                report.status = GENERATING
                db.add(report)
                db.commit()
                
                _generate_report_sync(str(user.id), str(report.id), db)
                
                report = db.get(UserReport, report.id)
                report.status = GENERATED
                report.updated_at = datetime.utcnow()
                db.add(report)
                db.commit()
            except Exception as sync_error:
                report = db.get(UserReport, report.id)
                report.status = FAILED
                report.error_message = str(sync_error)
                report.updated_at = datetime.utcnow()
                db.add(report)
                db.commit()
                raise HTTPException(status_code=500, detail=f"Report generation failed: {sync_error}")
        
        return GenerateReportResponse(
            message="Report generation started",
            report_id=report.id,
            task_id=task_id,
            status=report.status,
            status_url=f"/api/v1/reports/{report.id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=ReportListResponse)
async def list_reports(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    List all reports for the authenticated user.
    
    Args:
        limit: Maximum number of reports to return
        offset: Number of reports to skip
        db: Database session
        user: Authenticated user
        
    Returns:
        List of reports with pagination info
    """
    # Count total
    count_statement = select(UserReport).where(UserReport.user_id == user.id)
    all_reports = db.exec(count_statement).all()
    total = len(all_reports)
    
    # Fetch paginated
    statement = select(UserReport).where(
        UserReport.user_id == user.id
    ).order_by(UserReport.created_at.desc()).offset(offset).limit(limit)
    
    reports = db.exec(statement).all()
    
    return ReportListResponse(
        reports=[
            ReportListItem(
                id=r.id,
                status=r.status,
                report_type=r.report_type,
                created_at=r.created_at,
                updated_at=r.updated_at
            )
            for r in reports
        ],
        total=total
    )


@router.get("/{report_id}", response_model=ReportDetailResponse)
async def get_report(
    report_id: UUID,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Get details and data for a specific report.
    
    Only the owner can access their reports.
    
    Args:
        report_id: Report UUID
        db: Database session
        user: Authenticated user
        
    Returns:
        Full report details including data if generated
    """
    report = db.get(UserReport, report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    response = ReportDetailResponse(
        id=report.id,
        user_id=report.user_id,
        status=report.status,
        report_type=report.report_type,
        created_at=report.created_at,
        updated_at=report.updated_at
    )
    
    if report.status == GENERATED and report.report_data:
        response.report_data = report.report_data
    elif report.status == FAILED:
        response.error_message = report.error_message
    
    return response


    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully"}


@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    """
    Download report as PDF.
    """
    try:
        from fastapi.responses import StreamingResponse
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.styles import getSampleStyleSheet
        
        # Prepare Data for Charts
        import matplotlib
        matplotlib.use('Agg') # Force non-interactive backend
        import matplotlib.pyplot as plt
        import numpy as np

        report = db.get(UserReport, report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        if report.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        if not report.report_data:
            # Create dummy data if missing (for testing)
            report.report_data = {
                'insights': {'overall_assessment': 'No data available.'},
                'period': {'total_attempts': 0}
            }

        # Generate PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        data = report.report_data
        
        # Helper to safe-chart
        def create_chart_image(plot_func):
            try:
                img_buffer = io.BytesIO()
                plot_func(img_buffer)
                img_buffer.seek(0)
                return Image(img_buffer)
            except Exception as e:
                print(f"Chart generation failed: {e}")
                return None

        # Chart 1: Accuracy Trend
        trend_img = None
        if 'charts' in data and 'accuracy_trend' in data['charts']:
            trend_data = data['charts']['accuracy_trend']
            if trend_data:
                def plot_trend(buf):
                    dates = [d['date'][:10] for d in trend_data]
                    accuracies = [d['accuracy'] for d in trend_data]
                    
                    fig, ax = plt.subplots(figsize=(6, 3))
                    ax.plot(dates, accuracies, marker='o', linestyle='-', color='#f97316', linewidth=2)
                    ax.fill_between(dates, accuracies, color='#f97316', alpha=0.1)
                    ax.set_title('Accuracy Trend', fontsize=10, fontweight='bold')
                    ax.set_ylim(0, 100)
                    ax.grid(True, linestyle='--', alpha=0.3)
                    plt.setp(ax.get_xticklabels(), rotation=45, fontsize=8)
                    plt.tight_layout()
                    fig.savefig(buf, format='png', dpi=100, transparent=True)
                    plt.close(fig)

                trend_img = create_chart_image(plot_trend)
                if trend_img:
                    trend_img.drawWidth = 400
                    trend_img.drawHeight = 200

        # Chart 2: Topic Performance
        topic_img = None
        if 'topic_performance' in data:
            def plot_topic(buf):
                topics = list(data['topic_performance'].keys())
                # Clean topic names
                topics_clean = [t.replace('_', ' ').title()[:15] for t in topics]
                scores = [data['topic_performance'][t]['accuracy'] for t in topics]
                
                if topics:
                    fig, ax = plt.subplots(figsize=(6, 4))
                    bars = ax.barh(topics_clean, scores, color='#3b82f6')
                    ax.set_title('Topic Mastery', fontsize=10, fontweight='bold')
                    ax.set_xlim(0, 100)
                    ax.axvline(x=50, color='gray', linestyle='--', alpha=0.5, linewidth=0.8)
                    ax.axvline(x=80, color='green', linestyle='--', alpha=0.5, linewidth=0.8)
                    ax.grid(axis='x', linestyle='--', alpha=0.3)
                    plt.tight_layout()
                    
                    # Color bars
                    for bar, score in zip(bars, scores):
                        if score >= 80: bar.set_color('#22c55e')
                        elif score < 50: bar.set_color('#ef4444')
                        else: bar.set_color('#eab308')

                    fig.savefig(buf, format='png', dpi=100, transparent=True)
                    plt.close(fig)

            topic_img = create_chart_image(plot_topic)
            if topic_img:
                topic_img.drawWidth = 400
                topic_img.drawHeight = 250

        # Chart 3: Difficulty Breakdown
        diff_img = None
        if 'difficulty_performance' in data:
            def plot_diff(buf):
                diffs = list(data['difficulty_performance'].keys())
                scores = [data['difficulty_performance'][d]['accuracy'] for d in diffs]
                
                if diffs:
                    fig, ax = plt.subplots(figsize=(4, 3))
                    colors_map = {'Easy': '#22c55e', 'Medium': '#eab308', 'Hard': '#ef4444'}
                    bar_colors = [colors_map.get(d, '#3b82f6') for d in diffs]
                    
                    ax.bar(diffs, scores, color=bar_colors, width=0.5)
                    ax.set_title('Difficulty Breakdown', fontsize=10, fontweight='bold')
                    ax.set_ylim(0, 100)
                    ax.grid(axis='y', linestyle='--', alpha=0.3)
                    plt.tight_layout()
                    
                    fig.savefig(buf, format='png', dpi=100, transparent=True)
                    plt.close(fig)

            diff_img = create_chart_image(plot_diff)
            if diff_img:
                diff_img.drawWidth = 300
                diff_img.drawHeight = 200

        # PDF Content Construction
        
        # 1. Header & Summary Stats
        elements.append(Paragraph(f"Performance Report: {report.report_type.replace('_', ' ').title()}", styles['Title']))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Generated for: {user.username} | Date: {report.created_at.strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Stats Table
        stats_data = []
        if 'period' in data:
            stats_data.append(['Total Attempts', str(data['period'].get('total_attempts', 0))])
        if 'insights' in data:
            stats_data.append(['Overall Accuracy', f"{data['insights'].get('overall_accuracy', 0)}%"])
            
        t = Table([['Metric', 'Value']] + stats_data, colWidths=[200, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#18181b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(t)
        elements.append(Spacer(1, 25))

        # 2. Assessment Section
        if 'insights' in data:
            elements.append(Paragraph("Overall Assessment", styles['Heading2']))
            elements.append(Paragraph(data['insights'].get('overall_assessment', 'N/A'), styles['Normal']))
            elements.append(Spacer(1, 20))

        # 3. Charts Section (Side by Side if possible, or vertically)
        elements.append(Paragraph("Performance Visualization", styles['Heading2']))
        
        if trend_img:
            elements.append(trend_img)
            elements.append(Spacer(1, 15))
            
        if topic_img:
            elements.append(topic_img)
            elements.append(Spacer(1, 15))
            
        if diff_img:
            elements.append(diff_img)
            elements.append(Spacer(1, 20))

        # 4. Recommendations & Strengths
        if 'insights' in data:
            # Strengths
            if 'strengths' in data['insights'] and data['insights']['strengths']:
                elements.append(Paragraph("Key Strengths", styles['Heading3']))
                for s in data['insights']['strengths']:
                    elements.append(Paragraph(f"<font color='green'>✓</font> {s}", styles['Normal']))
                elements.append(Spacer(1, 10))
                
            # Weaknesses / Recommendations
            if 'recommendations' in data['insights']:
                elements.append(Paragraph("Recommendations", styles['Heading3']))
                for rec in data['insights']['recommendations']:
                    elements.append(Paragraph(f"• {rec}", styles['Normal']))
                elements.append(Spacer(1, 12))

        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
