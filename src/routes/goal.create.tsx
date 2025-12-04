import { createFileRoute } from '@tanstack/react-router';
import { TemplateSelectionPage } from '@/pages/TemplateSelection';

export const Route = createFileRoute('/goal/create')({
  component: TemplateSelectionPage,
});
