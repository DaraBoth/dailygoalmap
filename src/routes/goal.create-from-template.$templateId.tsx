import { createFileRoute } from '@tanstack/react-router';
import { TemplateFormPage } from '@/pages/TemplateForm';

export const Route = createFileRoute('/goal/create-from-template/$templateId')({
  component: TemplateFormPage,
});
