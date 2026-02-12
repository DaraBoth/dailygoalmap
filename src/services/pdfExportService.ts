import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Task } from '@/components/calendar/types';
import { SmartAnalyticsData } from './smartAnalyticsService';

export interface PDFExportOptions {
    goalTitle: string;
    goalDescription: string;
    targetDate?: string;
    tasks: Task[];
    analyticsData: SmartAnalyticsData;
    includeCharts?: boolean;
}

/**
 * Generate and download a PDF report of the analytics
 */
export async function exportAnalyticsToPDF(
    containerElement: HTMLElement,
    options: PDFExportOptions
): Promise<void> {
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Add header with gradient background
        pdf.setFillColor(99, 102, 241); // Primary color
        pdf.rect(0, 0, pageWidth, 40, 'F');

        // Add title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Analytics Report', margin, 20);

        // Add generation date
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const generatedDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        pdf.text(`Generated: ${generatedDate}`, margin, 30);

        yPosition = 50;

        // Goal Information Section
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Goal Overview', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(options.goalTitle, contentWidth);
        pdf.text(titleLines, margin, yPosition);
        yPosition += (titleLines.length * 7) + 5;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        const descLines = pdf.splitTextToSize(options.goalDescription, contentWidth);
        pdf.text(descLines, margin, yPosition);
        yPosition += (descLines.length * 6) + 10;

        if (options.targetDate) {
            const targetDateFormatted = new Date(options.targetDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            pdf.setFontSize(11);
            pdf.setTextColor(99, 102, 241);
            pdf.text(`Target Date: ${targetDateFormatted}`, margin, yPosition);
            yPosition += 10;
        }

        // Productivity Score Section
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Performance Metrics', margin, yPosition);
        yPosition += 10;

        // Draw productivity score box
        pdf.setFillColor(240, 240, 255);
        pdf.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'F');

        pdf.setFontSize(12);
        pdf.setTextColor(60, 60, 60);
        pdf.text('Productivity Score', margin + 5, yPosition + 10);

        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(`${options.analyticsData.productivityScore}/100`, margin + 5, yPosition + 20);

        // Velocity trend
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Trend: ${options.analyticsData.velocityTrend}`, pageWidth - margin - 40, yPosition + 15);

        yPosition += 35;

        // Task Summary
        const totalTasks = options.tasks.length;
        const completedTasks = options.tasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Task Summary', margin, yPosition);
        yPosition += 8;

        const summaryData = [
            { label: 'Total Tasks', value: totalTasks },
            { label: 'Completed', value: completedTasks },
            { label: 'Pending', value: totalTasks - completedTasks },
            { label: 'Completion Rate', value: `${completionRate}%` }
        ];

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        summaryData.forEach((item, index) => {
            const xPos = margin + (index % 2) * (contentWidth / 2);
            const yPos = yPosition + Math.floor(index / 2) * 8;
            pdf.setTextColor(80, 80, 80);
            pdf.text(`${item.label}:`, xPos, yPos);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(String(item.value), xPos + 40, yPos);
            pdf.setFont('helvetica', 'normal');
        });
        yPosition += 25;

        // Insights Section
        if (options.analyticsData.insights.length > 0) {
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('AI-Powered Insights', margin, yPosition);
            yPosition += 10;

            options.analyticsData.insights.forEach((insight, index) => {
                // Check if we need a new page for each insight
                if (yPosition > pageHeight - 40) {
                    pdf.addPage();
                    yPosition = margin;
                }

                // Color based on priority
                let bgColor: [number, number, number] = [240, 240, 240];
                let iconColor: [number, number, number] = [100, 100, 100];

                if (insight.priority === 'high') {
                    bgColor = [254, 226, 226]; // Red light
                    iconColor = [220, 38, 38];
                } else if (insight.priority === 'medium') {
                    bgColor = [254, 243, 199]; // Yellow light
                    iconColor = [217, 119, 6];
                } else {
                    bgColor = [220, 252, 231]; // Green light
                    iconColor = [34, 197, 94];
                }

                pdf.setFillColor(...bgColor);
                pdf.roundedRect(margin, yPosition, contentWidth, 20, 2, 2, 'F');

                // Priority badge
                pdf.setFillColor(...iconColor);
                pdf.roundedRect(margin + 5, yPosition + 5, 15, 5, 1, 1, 'F');
                pdf.setFontSize(8);
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');
                pdf.text(insight.priority.toUpperCase(), margin + 6, yPosition + 9);

                // Title
                pdf.setFontSize(11);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(insight.title, margin + 25, yPosition + 9);

                // Description
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(60, 60, 60);
                const descSplit = pdf.splitTextToSize(insight.description, contentWidth - 30);
                pdf.text(descSplit, margin + 5, yPosition + 15);

                yPosition += 20 + (descSplit.length > 1 ? (descSplit.length - 1) * 4 : 0) + 3;
            });
        }

        // Capture charts if requested
        if (options.includeCharts) {
            // Check if we need a new page
            if (yPosition > pageHeight - 100) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('Visual Analytics', margin, yPosition);
            yPosition += 10;

            // Find all chart containers
            const chartContainers = containerElement.querySelectorAll('[data-chart]');

            for (let i = 0; i < chartContainers.length; i++) {
                const chartElement = chartContainers[i] as HTMLElement;

                try {
                    const canvas = await html2canvas(chartElement, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = contentWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    // Check if we need a new page
                    if (yPosition + imgHeight > pageHeight - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + 10;
                } catch (error) {
                    console.error('Error capturing chart:', error);
                }
            }
        }

        // Add footer to all pages
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text(
                `Page ${i} of ${totalPages}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
            pdf.text(
                'Generated by Orbit',
                pageWidth - margin,
                pageHeight - 10,
                { align: 'right' }
            );
        }

        // Generate filename with proper format (simpler, no spaces in between for compatibility)
        const sanitizedTitle = (options.goalTitle || 'GoalReport')
            .trim()
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 30)
            .trim() || 'GoalReport';

        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const filename = `Analytics_${sanitizedTitle}_${dateStr}.pdf`;

        // Use ArrayBuffer for more reliable download
        const pdfData = pdf.output('arraybuffer');
        const blob = new Blob([pdfData], { type: 'application/pdf' });

        // Create download link with explicit content disposition
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        link.type = 'application/pdf';

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 250);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF report');
    }
}

/**
 * Preview PDF before downloading (opens in new tab)
 */
export async function previewAnalyticsPDF(
    containerElement: HTMLElement,
    options: PDFExportOptions
): Promise<void> {
    // This would generate the PDF and open it in a new tab instead of downloading
    // For now, we'll just download it
    await exportAnalyticsToPDF(containerElement, options);
}
