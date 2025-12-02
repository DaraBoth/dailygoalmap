
import EnhancedLoading from "@/components/ui/enhanced-loading";

const LoadingGoal = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <EnhancedLoading
        variant="goal"
        message="Loading goal details..."
        className="min-h-[400px]"
      />
    </div>
  );
};

export default LoadingGoal;
