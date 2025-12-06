import { createFileRoute } from '@tanstack/react-router';
import GoalFormContainer from '@/components/goal-form/GoalFormContainer';

export const Route = createFileRoute('/goal/create-custom')({
  component: GoalFormContainer,
});
