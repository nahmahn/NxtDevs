import { getAuthHeaders, handleResponse } from '@/lib/auth';

export interface ReportData {
    user_id: string;
    generated_at: string;
    period: {
        start: string;
        end: string;
        total_attempts: number;
    };
    topic_performance: Record<string, {
        accuracy: number;
        total_questions: number;
        correct_answers: number;
        average_time_seconds?: number;
        trend?: string;
    }>;
    difficulty_performance: Record<string, {
        accuracy: number;
        total_questions: number;
        correct_answers: number;
    }>;
    insights: {
        overall_assessment: string;
        overall_accuracy: number;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        generated_at: string;
    };
    charts: {
        accuracy_trend: Array<{ date: string; accuracy: number; questions: number }>;
        topic_radar: string[];
        topic_scores: number[];
    };
}

export interface Report {
    id: string;
    status: 'PENDING' | 'GENERATING' | 'GENERATED' | 'FAILED';
    report_type: string;
    created_at: string;
    updated_at?: string;
    error_message?: string;
    report_data?: ReportData;
}

export interface ReportGenerationResponse {
    message: string;
    report_id: string;
    task_id?: string;
    status: string;
    status_url: string;
}

export interface ReportListResponse {
    reports: Report[];
    total: number;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1` || 'http://localhost:8000/api/v1';

export const reportsApi = {
    // Generate a new report
    generateReport: async (reportType: string = 'performance_summary'): Promise<ReportGenerationResponse> => {
        const response = await fetch(`${API_URL}/reports/generate`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ report_type: reportType }),
        });
        return handleResponse(response);
    },

    // List all reports
    getReports: async (limit: number = 10, offset: number = 0): Promise<ReportListResponse> => {
        const response = await fetch(`${API_URL}/reports?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // Get specific report details
    getReport: async (reportId: string): Promise<Report> => {
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // Delete a report
    deleteReport: async (reportId: string): Promise<void> => {
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    // Download report PDF
    downloadReport: async (reportId: string): Promise<Blob> => {
        const response = await fetch(`${API_URL}/reports/${reportId}/download`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    }
};
