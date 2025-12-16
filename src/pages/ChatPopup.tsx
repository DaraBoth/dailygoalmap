import React from 'react';
import GoalChatWidget from '@/components/goal/GoalChatWidget';
import { useSearch } from '@tanstack/react-router';

function parseUserInfo(userInfoParam: string | undefined): any {
    if (!userInfoParam) return null;
    try {
        return JSON.parse(decodeURIComponent(userInfoParam));
    } catch {
        return null;
    }
}

const ChatPopup: React.FC = () => {
    const { goalId, userInfo: userInfoParam } = useSearch({ from: '/chat-popup' });
    const userInfo = parseUserInfo(userInfoParam);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-full max-w-lg mx-auto">
                <GoalChatWidget goalId={goalId || ''} userInfo={userInfo} />
            </div>
        </div>
    );
};

export default ChatPopup;
