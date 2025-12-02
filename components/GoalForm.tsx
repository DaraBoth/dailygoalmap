
import GoalFormContainer from "./goal-form/GoalFormContainer";

interface GoalFormProps {
  onSuccess: (goal: any) => void;
  initialData?: {
    title: string;
    description: string;
    target_date: string;
    goal_type: string;
    travel_details?: {
      destination?: string;
      accommodation?: string;
      transportation?: string;
      budget?: string;
      activities?: string[];
    };
  };
  compact?: boolean;
  onClose?: () => void;
  isEdit?: boolean;
  goalId?: string;
}

const GoalForm = ({ onSuccess, initialData, compact = false, onClose, isEdit = false, goalId }: GoalFormProps) => {
  return <GoalFormContainer onSuccess={onSuccess} initialData={initialData} compact={compact} onClose={onClose} isEdit={isEdit} goalId={goalId} />;
};

export default GoalForm;
