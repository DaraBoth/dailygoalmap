
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";

const GoalNotFound = () => {
  const { goToDashboard } = useRouterNavigation();
  
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md w-full bg-card rounded-lg shadow-md border border-border">
        <h1 className="text-4xl font-bold mb-4 text-primary">Goal Not Found</h1>
        <p className="text-foreground mb-8">The goal you're looking for doesn't exist or has been deleted.</p>
        <Button
          onClick={() => goToDashboard()}
          className="w-full"
          variant="default"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default GoalNotFound;
