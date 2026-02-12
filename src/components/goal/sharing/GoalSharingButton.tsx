
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, RefreshCw, Users } from 'lucide-react';
import { useGoalSharing } from '@/hooks/useGoalSharing';
import { toast } from '@/hooks/use-toast';
import { GoalMembersList } from './GoalMembersList';
import { InviteUsers } from './InviteUsers';

interface GoalSharingButtonProps {
  goalId: string;
  goalTitle: string;
}

export const GoalSharingButton = ({ goalId, goalTitle }: GoalSharingButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserCreator, setIsUserCreator] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const {
    shareCode,
    isLoading,
    isRegenerating,
    fetchShareCode,
    regenerateShareCode,
    isCurrentUserCreator,
    getMemberCount
  } = useGoalSharing(goalId);

  useEffect(() => {
    if (isOpen) {
      // Fetch share code if dialog is opened
      if (!shareCode) {
        fetchShareCode();
      }

      // Check if user is creator when opening dialog
      isCurrentUserCreator().then(setIsUserCreator);

      // Get member count when dialog is opened
      getMemberCount().then(setMemberCount);
    }
  }, [isOpen, fetchShareCode, isCurrentUserCreator, getMemberCount, shareCode]);

  const copyShareCode = () => {
    if (!shareCode) return;

    navigator.clipboard.writeText(shareCode)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Share code copied to clipboard",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try copying manually",
          variant: "destructive",
        });
      });
  };

  const handleRegenerateCode = async () => {
    await regenerateShareCode();
    // After regenerating, update the member count as well
    const count = await getMemberCount();
    setMemberCount(count);
  };

  const toggleMembersView = () => {
    setShowMembers(!showMembers);
  };

  return (
    <>
      <button
        className="p-2 border bg-background/50 hover:bg-accent h-7 sm:h-8 px-1.5 sm:px-2 backdrop-blur-sm transition-all duration-200 rounded-xl flex items-center gap-1 sm:gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share "{goalTitle}"</DialogTitle>
            <DialogDescription>
              Share this goal with others to collaborate on tasks together.
            </DialogDescription>
          </DialogHeader>

          {!showMembers ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="grid flex-1 gap-2">
                  <label htmlFor="share-code" className="text-sm font-medium">
                    Share Code
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="share-code"
                      value={isLoading ? "Loading..." : shareCode || ""}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={isLoading || !shareCode}
                      onClick={copyShareCode}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy</span>
                    </Button>
                  </div>
                </div>
              </div>

              {isUserCreator && (
                <div className="flex flex-col gap-4 mt-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Invite Users</p>
                    <InviteUsers goalId={goalId} goalTitle={goalTitle} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Need a new share code? Anyone with the current code will still have access.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateCode}
                      disabled={isRegenerating}
                      className="w-full sm:w-auto"
                    >
                      {isRegenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate Share Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <GoalMembersList goalId={goalId} isCreator={isUserCreator} />
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={toggleMembersView}
              className="w-full mb-2 sm:mb-0 sm:w-auto"
            >
              <Users className="h-4 w-4 mr-2" />
              {showMembers ? "View Share Code" : "View Members"}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
