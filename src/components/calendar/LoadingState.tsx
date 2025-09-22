
import EnhancedLoading from "@/components/ui/enhanced-loading";

const LoadingState = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <EnhancedLoading
        variant="calendar"
        message="Loading calendar data..."
        className="min-h-[300px]"
      />
    </div>
  );
};

export default LoadingState;
